/**
 * @proof-layer/verify
 *
 * Standalone, zero-dependency offline verifier for Proof Layer receipt bundles.
 *
 * Accepts NDJSON exported from GET /v1/receipts/export and a public key PEM
 * obtained from GET /v1/public-key. Runs entirely offline — no network,
 * no Proof Layer infrastructure required.
 *
 * Usage:
 *   import { verifyBundle, verifyReceipt } from "@proof-layer/verify";
 *
 *   const result = verifyBundle(ndjsonString, publicKeyPem);
 *   // { pass: 10, fail: 0, total: 10, chainBroken: false, merkleRoot: "abc…" }
 */

import { createPublicKey, verify as cryptoVerify, createHash } from "node:crypto";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BundleLine extends Record<string, unknown> {
  payloadHash:         string;
  previousReceiptHash: string;
  seq:                 number;
  signature: {
    algorithm: string;
    keyId:     string;
    value:     string;
  };
}

export interface VerifyBundleResult {
  pass:         number;
  fail:         number;
  total:        number;
  chainBroken:  boolean;
  merkleRoot:   string | null;
  firstFailSeq: number | null;
  errors:       string[];
}

export interface VerifyReceiptResult {
  valid:        boolean;
  seq:          number;
  receiptId:    string | undefined;
  payloadHash:  string;
  error?:       string;
}

// ─── Canonicalization (must match server/packages/core/src/hash.ts exactly) ──

function stableStringify(val: unknown): string {
  if (val === null)      return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "boolean") return String(val);
  if (typeof val === "number")  return String(val);
  if (typeof val === "string")  return JSON.stringify(val);
  if (Array.isArray(val)) {
    return "[" + val.map(stableStringify).join(",") + "]";
  }
  if (typeof val === "object") {
    const keys  = Object.keys(val as object).sort();
    const pairs = keys.map(k => `${JSON.stringify(k)}:${stableStringify((val as Record<string, unknown>)[k])}`);
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(val);
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ─── Merkle root ────────────────────────────────────────────────────────────

export function computeMerkleRoot(hashes: string[]): string | null {
  if (hashes.length === 0) return null;
  let layer: Uint8Array[] = hashes.map(h => Buffer.from(h, "hex"));
  while (layer.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left  = layer[i];
      const right = layer[i + 1] ?? layer[i];
      next.push(Buffer.from(sha256Hex(
        Buffer.from(left).toString("hex") + Buffer.from(right).toString("hex")
      ), "hex"));
    }
    layer = next;
  }
  return Buffer.from(layer[0]).toString("hex");
}

// ─── Single-receipt verification ───────────────────────────────────────────

/**
 * Verify a single receipt line.
 *
 * Strips `payloadHash`, `signature`, and `seq` from the object,
 * re-computes the SHA-256 hash over the stable-stringified canonical payload,
 * then verifies the Ed25519 signature over that hash.
 */
export function verifyReceipt(
  line: BundleLine,
  publicKeyPem: string,
): VerifyReceiptResult {
  const seq        = line.seq;
  const receiptId  = line.receiptId as string | undefined;
  const payloadHash = line.payloadHash;

  if (!line.signature?.value || !payloadHash) {
    return { valid: false, seq, receiptId, payloadHash, error: "missing signature or payloadHash" };
  }

  try {
    const { payloadHash: _ph, signature: _sig, seq: _seq, ...canonical } = line;
    const recomputed = sha256Hex(stableStringify(canonical));
    if (recomputed !== payloadHash) {
      return { valid: false, seq, receiptId, payloadHash, error: "payloadHash mismatch" };
    }
    const pubKey = createPublicKey(publicKeyPem);
    const valid  = cryptoVerify(
      null,
      Buffer.from(payloadHash),
      pubKey,
      Buffer.from(line.signature.value, "base64"),
    );
    return { valid, seq, receiptId, payloadHash, ...(valid ? {} : { error: "signature invalid" }) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, seq, receiptId, payloadHash, error: msg };
  }
}

// ─── Full bundle verification ───────────────────────────────────────────────

/**
 * Verify a complete NDJSON bundle exported from GET /v1/receipts/export.
 *
 * Each line must be a JSON object containing the full receipt including
 * `payloadHash`, `previousReceiptHash`, `signature`, and `seq`.
 *
 * @param ndjson        - Raw NDJSON string (one JSON object per line)
 * @param publicKeyPem  - Ed25519 public key in SPKI PEM format
 * @param options.initialPrevHash - Expected `previousReceiptHash` of the first
 *                        line (default: "genesis"). Set this when verifying a
 *                        partial export that does not start at seq 1.
 */
export function verifyBundle(
  ndjson: string,
  publicKeyPem: string,
  options: { initialPrevHash?: string } = {},
): VerifyBundleResult {
  const lines  = ndjson.trim().split("\n").filter(l => l.trim() !== "");
  const result: VerifyBundleResult = {
    pass:         0,
    fail:         0,
    total:        lines.length,
    chainBroken:  false,
    merkleRoot:   null,
    firstFailSeq: null,
    errors:       [],
  };

  if (lines.length === 0) return result;

  let prevHash = options.initialPrevHash ?? "genesis";
  const payloadHashes: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let parsed: BundleLine;
    try {
      parsed = JSON.parse(lines[i]) as BundleLine;
    } catch {
      result.fail++;
      result.chainBroken = true;
      result.errors.push(`line ${i + 1}: invalid JSON`);
      if (result.firstFailSeq === null) result.firstFailSeq = i + 1;
      continue;
    }

    const chainOk = parsed.previousReceiptHash === prevHash;
    if (!chainOk) {
      result.chainBroken = true;
      result.errors.push(`seq ${parsed.seq}: chain break — expected previousReceiptHash "${prevHash}", got "${parsed.previousReceiptHash}"`);
    }

    const sigResult = verifyReceipt(parsed, publicKeyPem);

    if (!chainOk || !sigResult.valid) {
      result.fail++;
      if (result.firstFailSeq === null) result.firstFailSeq = parsed.seq ?? i + 1;
      if (!sigResult.valid && sigResult.error) {
        result.errors.push(`seq ${parsed.seq}: ${sigResult.error}`);
      }
    } else {
      result.pass++;
      payloadHashes.push(parsed.payloadHash);
    }

    prevHash = parsed.payloadHash;
  }

  result.merkleRoot = computeMerkleRoot(payloadHashes);
  return result;
}
