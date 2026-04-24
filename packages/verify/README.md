# @proof-layer/verify

**Standalone offline verifier for Proof Layer receipt bundles.**
Zero external dependencies. Runs anywhere Node.js 18+ runs.

```bash
npm install @proof-layer/verify
```

> Anyone with the public key can verify a Proof Layer receipt — without trusting Proof Layer, without a network connection, and without installing anything beyond this package.

---

## What this does

A Proof Layer receipt is an Ed25519-signed, hash-chained record of a governed AI agent action. This package verifies them — one at a time or as full chains — using only the Node.js standard library.

It checks three things:

1. **Signature integrity** — every receipt's Ed25519 signature validates against the published public key
2. **Chain integrity** — every receipt's `previousReceiptHash` matches the SHA-256 of the previous receipt's canonical form
3. **Payload integrity** — the `payloadHash` recorded in each receipt matches a fresh hash of its canonical content

If any of these fail, the verifier reports exactly which receipt and why.

---

## Quick start

### Verify a single receipt

```ts
import { verifyReceipt } from "@proof-layer/verify";

const result = verifyReceipt(receipt, publicKeyPem);
// → { valid: true, seq: 47, receiptId: "rcpt_…", payloadHash: "…" }
```

### Verify a full chain

```ts
import { verifyBundle } from "@proof-layer/verify";

const result = verifyBundle(ndjsonString, publicKeyPem);
// → {
//     pass: 147,
//     fail: 0,
//     total: 147,
//     chainBroken: false,
//     merkleRoot: "ab12…",
//     firstFailSeq: null,
//     errors: []
//   }
```

### Get a receipt bundle to verify

```bash
# Export your chain as NDJSON (one receipt per line)
curl -H "x-api-key: $PROOF_LAYER_API_KEY" \
  https://prooflayer.world999labs.com/v1/receipts/export \
  > chain.ndjson

# Fetch the public key (no auth required)
curl https://prooflayer.world999labs.com/v1/public-key \
  > public-key.pem
```

Then verify locally — the verifier never makes a network call.

---

## API

### `verifyReceipt(line, publicKeyPem)`

Verifies a single parsed receipt object. Returns:

```ts
interface VerifyReceiptResult {
  valid:        boolean;
  seq:          number;
  receiptId:    string | undefined;
  payloadHash:  string;
  error?:       string;
}
```

### `verifyBundle(ndjson, publicKeyPem, options?)`

Verifies a complete NDJSON receipt bundle. Each line must be a JSON object containing `payloadHash`, `previousReceiptHash`, `signature`, and `seq`. Returns:

```ts
interface VerifyBundleResult {
  pass:         number;
  fail:         number;
  total:        number;
  chainBroken:  boolean;
  merkleRoot:   string | null;
  firstFailSeq: number | null;
  errors:       string[];
}
```

Options:

- `initialPrevHash` — expected `previousReceiptHash` of the first line (default: `"genesis"`). Set when verifying a partial export that does not start at seq 1.

### `computeMerkleRoot(hashes)`

Computes the SHA-256 Merkle root of an array of hex-encoded hashes. Returns the root hex string, or `null` for an empty input.

---

## Why a separate verifier exists

The whole point of the receipt is that it is verifiable **without** trusting the system that issued it. That guarantee only holds if the verification code is independently inspectable, dependency-free, and small enough to read in one sitting.

This package is under 250 lines of TypeScript with zero runtime dependencies. The cryptographic primitives come from Node.js's built-in `crypto` module — the same module browsers, regulators, and security auditors already audit. Read the source. The math is the math.

---

## Independent implementation

If you don't want to run JavaScript at all, the [Proof Layer cryptographic specification](https://github.com/World-999-Labs/proof-layer/blob/main/spec/CRYPTOGRAPHIC_SPEC.md) is sufficient to implement an independent verifier in any language. Field list, canonicalization algorithm, chain linkage invariant, NDJSON format, key rotation protocol, and SHA-256 test vectors are all published. Independent implementations are welcome.

---

## License

MIT — © WORLD999_LABS

Built by [Proof Layer](https://prooflayer.world999labs.com).
