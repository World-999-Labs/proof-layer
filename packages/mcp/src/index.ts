#!/usr/bin/env node
/**
 * Proof Layer MCP Server
 *
 * Drop cryptographic AI governance into any MCP-aware host (Claude Desktop, Cursor,
 * Cline, etc.) with a single config entry. Every consequential agent action is
 * evaluated against policy before execution and issued an Ed25519-signed,
 * hash-chained receipt that anyone with the public key can verify offline.
 *
 * Quick start — Claude Desktop (~/.claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "proof-layer": {
 *       "command": "npx",
 *       "args": ["-y", "@proof-layer/mcp"],
 *       "env": {
 *         "PROOF_LAYER_API_KEY": "pl_live_...",
 *         "PROOF_LAYER_API_URL": "https://prooflayer.world999labs.com"
 *       }
 *     }
 *   }
 * }
 *
 * Environment variables (legacy VERIDOCS_* names still accepted):
 *   PROOF_LAYER_API_KEY   — required; your pl_live_... key (get one at prooflayer.world999labs.com)
 *   PROOF_LAYER_API_URL   — optional; defaults to https://prooflayer.world999labs.com
 *   PROOF_LAYER_TELEMETRY — optional; set to "off" to disable anonymous install ping
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { homedir, platform } from "os";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const PKG_VERSION = "1.0.0";
const API_KEY = process.env.PROOF_LAYER_API_KEY ?? process.env.VERIDOCS_API_KEY ?? "";
const BASE_URL = (process.env.PROOF_LAYER_API_URL ?? process.env.VERIDOCS_API_URL ?? "https://prooflayer.world999labs.com").replace(/\/$/, "");
const TELEMETRY_ENABLED = (process.env.PROOF_LAYER_TELEMETRY ?? process.env.VERIDOCS_TELEMETRY ?? "on").toLowerCase() !== "off";

if (!API_KEY) {
  process.stderr.write("[proof-layer-mcp] PROOF_LAYER_API_KEY is not set. Get a key at https://prooflayer.world999labs.com\n");
  process.exit(1);
}

// ─── Anonymous install telemetry ─────────────────────────────────────────────
// First run: generate a UUID, persist it under ~/.veridocs/install-id, and emit
// a one-time `mcp_install` event. Every subsequent boot emits `session_start`.
// Users can disable everything with VERIDOCS_TELEMETRY=off.
function detectHost(): string {
  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_USER) return "cursor";
  if (process.env.CLAUDE_DESKTOP || process.env.CLAUDE_CODE) return "claude-desktop";
  if (process.env.CLINE_VERSION) return "cline";
  const term = process.env.TERM_PROGRAM ?? "";
  if (term) return term.toLowerCase();
  return "unknown";
}

function loadOrCreateInstallId(): { id: string; isNew: boolean } {
  try {
    const newDir = join(homedir(), ".proof-layer");
    const newFile = join(newDir, "install-id");
    const oldFile = join(homedir(), ".veridocs", "install-id");

    // Try the new path first
    if (existsSync(newFile)) {
      const id = readFileSync(newFile, "utf8").trim();
      if (id) return { id, isNew: false };
    }

    // Migrate from the legacy @veridocs/mcp path if present.
    // Preserves install identity across the rename so anonymous metrics stay continuous.
    if (existsSync(oldFile)) {
      const id = readFileSync(oldFile, "utf8").trim();
      if (id) {
        try {
          mkdirSync(newDir, { recursive: true });
          writeFileSync(newFile, id, { mode: 0o600 });
        } catch {
          // If we can't write the new path (e.g. read-only home), still return the migrated ID.
        }
        return { id, isNew: false };
      }
    }

    // First-time install
    mkdirSync(newDir, { recursive: true });
    const id = randomUUID();
    writeFileSync(newFile, id, { mode: 0o600 });
    return { id, isNew: true };
  } catch {
    // If we can't persist (e.g. read-only home), still emit a per-process ID
    // so the install isn't double-counted across a single session.
    return { id: randomUUID(), isNew: true };
  }
}

async function emitTelemetry(): Promise<void> {
  if (!TELEMETRY_ENABLED) return;
  try {
    const { id, isNew } = loadOrCreateInstallId();
    const payload = {
      install_id:      id,
      event_type:      isNew ? "mcp_install" : "session_start",
      package_version: PKG_VERSION,
      host:            detectHost(),
      os:              platform(),
      node_version:    process.version,
    };
    // 1.5s timeout: never block server boot on a telemetry call.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    await fetch(`${BASE_URL}/api/telemetry/mcp-install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    }).catch(() => undefined);
    clearTimeout(timer);
  } catch {
    // Telemetry must never crash the MCP server.
  }
}

async function vd<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: T;
  try { json = JSON.parse(text) as T; }
  catch { throw new Error(`Proof Layer API returned non-JSON (${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) {
    const err = json as Record<string, string>;
    throw new Error(`Proof Layer API error ${res.status}: ${err.error ?? err.message ?? text.slice(0, 200)}`);
  }
  return json;
}

const tools: Tool[] = [
  {
    name: "pl_evaluate",
    description:
      "Submit an AI agent action proposal to Proof Layer for governance evaluation. " +
      "Returns a cryptographically-signed receipt with a verdict of EXECUTE, BLOCK, REVIEW, or SHADOW. " +
      "Use this before any consequential agent action (sending emails, modifying data, making payments, etc.).",
    inputSchema: {
      type: "object",
      required: ["action_type", "agent_id"],
      properties: {
        action_type: {
          type: "string",
          description: "Semantic name for the action (e.g. 'send_email', 'delete_record', 'make_payment')",
        },
        agent_id: {
          type: "string",
          description: "Identifier for the AI agent making the proposal",
        },
        parameters: {
          type: "object",
          description: "Action-specific parameters as a JSON object",
        },
        idempotency_key: {
          type: "string",
          description: "Optional unique key — same key returns the cached receipt",
        },
        guardian_timeout_policy: {
          type: "string",
          enum: ["fail_closed", "fail_open"],
          description: "What to do if the Guardian times out. Default: fail_closed (block the action)",
        },
      },
    },
  },
  {
    name: "pl_get_receipt",
    description: "Retrieve a Proof Layer audit receipt by its UUID. Returns the full receipt including verdict, signature, and policy pack hash.",
    inputSchema: {
      type: "object",
      required: ["receipt_id"],
      properties: {
        receipt_id: { type: "string", description: "UUID of the receipt to retrieve" },
      },
    },
  },
  {
    name: "pl_verify_receipt",
    description:
      "Cryptographically verify a Proof Layer receipt. Checks the Ed25519 signature and confirms " +
      "the signing key is ACTIVE. Returns valid: true/false with a reason.",
    inputSchema: {
      type: "object",
      required: ["receipt_id"],
      properties: {
        receipt_id: { type: "string", description: "UUID of the receipt to verify" },
      },
    },
  },
  {
    name: "pl_list_receipts",
    description: "List recent Proof Layer audit receipts for the authenticated tenant. Supports filtering by agent and verdict.",
    inputSchema: {
      type: "object",
      properties: {
        limit:    { type: "number", description: "Number of receipts to return (max 100, default 20)" },
        offset:   { type: "number", description: "Pagination offset (default 0)" },
        agent_id: { type: "string", description: "Filter by agent ID" },
        verdict:  { type: "string", enum: ["EXECUTE", "BLOCK", "REVIEW", "SHADOW"], description: "Filter by verdict" },
      },
    },
  },
  {
    name: "pl_usage",
    description:
      "Get current Proof Layer quota usage — receipts used, receipts remaining, credit balance, " +
      "billing cycle dates, and plan tier.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "pl_list_policy_packs",
    description: "List all governance policy packs for the authenticated tenant, including which one is currently active.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "pl_create_plan",
    description:
      "A human approves a governed plan — a scoped, time-bounded set of future actions across named agents. " +
      "Returns a plan_id and JTI that agents use to request delegation receipts via pl_delegate. " +
      "Scope patterns support wildcards: 'build:*' authorizes any action starting with 'build:'.",
    inputSchema: {
      type: "object",
      required: ["approver", "action", "scope"],
      properties: {
        approver: { type: "string", description: "Human identity approving the plan (email or user ID)" },
        action:   { type: "string", description: "Top-level label for the plan (e.g. 'deploy:api-v2')" },
        scope: {
          type: "array",
          items: { type: "string" },
          description: "Wildcard action patterns authorized under this plan (e.g. ['build:*', 'deploy:staging'])",
        },
        delegates_to: {
          type: "array",
          items: { type: "string" },
          description: "Agent IDs allowed to delegate under this plan (null = any agent)",
        },
        requires_checkpoint: {
          type: "array",
          items: { type: "string" },
          description: "Action patterns requiring explicit human re-approval before execution",
        },
        max_depth:   { type: "number", description: "Maximum delegation chain depth (default 2)" },
        ttl_seconds: { type: "number", description: "Plan lifetime in seconds (default 300 = 5 minutes)" },
      },
    },
  },
  {
    name: "pl_delegate",
    description:
      "An agent requests authorization to perform a specific action under a parent plan. " +
      "Returns 'ok' with a signed receipt (proceed with the action), " +
      "'checkpoint_required' (human must re-approve this specific action), or " +
      "'denied' (agent or action not authorized under the plan).",
    inputSchema: {
      type: "object",
      required: ["plan_id", "agent_id", "action"],
      properties: {
        plan_id:  { type: "string", description: "Plan UUID returned by pl_create_plan" },
        agent_id: { type: "string", description: "Identifier of the agent requesting delegation" },
        action:   { type: "string", description: "Specific action the agent wants to perform (e.g. 'build:docker')" },
      },
    },
  },
];

const server = new Server(
  { name: "proof-layer", version: PKG_VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  try {
    switch (name) {
      case "pl_evaluate": {
        const result = await vd("POST", "/v1/evaluate", {
          action_type: args.action_type,
          agent_id:    args.agent_id,
          parameters:  args.parameters ?? {},
          idempotency_key:          args.idempotency_key,
          guardian_timeout_policy:  args.guardian_timeout_policy ?? "fail_closed",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_get_receipt": {
        const result = await vd("GET", `/v1/receipts/${args.receipt_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_verify_receipt": {
        const result = await vd("GET", `/v1/receipts/${args.receipt_id}/verify`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_list_receipts": {
        const params = new URLSearchParams();
        if (args.limit)    params.set("limit",    String(args.limit));
        if (args.offset)   params.set("offset",   String(args.offset));
        if (args.agent_id) params.set("agent_id", String(args.agent_id));
        if (args.verdict)  params.set("verdict",  String(args.verdict));
        const result = await vd("GET", `/v1/receipts?${params}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_usage": {
        const result = await vd("GET", "/v1/usage");
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_list_policy_packs": {
        const result = await vd("GET", "/v1/policy-packs");
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_create_plan": {
        const result = await vd("POST", "/v1/plans", {
          approver:            args.approver,
          action:              args.action,
          scope:               args.scope,
          delegates_to:        args.delegates_to,
          requires_checkpoint: args.requires_checkpoint,
          max_depth:           args.max_depth,
          ttl_seconds:         args.ttl_seconds,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "pl_delegate": {
        const result = await vd("POST", `/v1/plans/${args.plan_id}/delegate`, {
          agent_id: args.agent_id,
          action:   args.action,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

// Fire-and-forget anonymous install/session ping (never blocks startup).
void emitTelemetry();

const transport = new StdioServerTransport();
await server.connect(transport);
