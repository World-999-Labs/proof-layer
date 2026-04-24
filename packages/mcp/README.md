# @proof-layer/mcp

**Cryptographic AI governance for any MCP-aware host.**
Drop signed, hash-chained, independently verifiable receipts into Claude Desktop, Cursor, Cline, or any other Model Context Protocol client with a single config entry.

> Built by [WORLD999_LABS](https://prooflayer.world999labs.com).
> *Renamed from `@veridocs/mcp` (April 2026). Legacy `VERIDOCS_*` environment variables are still accepted — see [Migration](#migrating-from-veridocsmcp) below.*

```bash
npx -y @proof-layer/mcp
```

---

## What this is

`@proof-layer/mcp` is the official MCP server for [Proof Layer](https://prooflayer.world999labs.com) — the cryptographic governance layer for AI agents. Once installed, it gives any MCP-aware AI assistant the ability to:

- Submit agent action proposals for governance evaluation **before** they execute
- Receive signed `EXECUTE` / `BLOCK` / `REVIEW` / `SHADOW` verdicts
- Retrieve and cryptographically verify receipts on demand
- Create and operate under scoped, time-bounded delegation plans

Every receipt is Ed25519-signed, hash-chained, and independently verifiable offline using only the published public key at `/v1/public-key`. For client-side verification with zero dependencies, install [`@proof-layer/verify`](https://www.npmjs.com/package/@proof-layer/verify).

---

## Quick start — Claude Desktop

Add this block to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "proof-layer": {
      "command": "npx",
      "args": ["-y", "@proof-layer/mcp"],
      "env": {
        "PROOF_LAYER_API_KEY": "pl_live_...",
        "PROOF_LAYER_API_URL": "https://prooflayer.world999labs.com"
      }
    }
  }
}
```

Restart Claude Desktop. Ask: *"List my recent Proof Layer receipts."* — Claude will call `pl_list_receipts` and return your audit chain.

Get an API key at [prooflayer.world999labs.com](https://prooflayer.world999labs.com).

---

## Cursor / Cline / other MCP hosts

The same `command` / `args` / `env` block works in any MCP-aware host. Place it in the host's MCP server configuration file under whatever key the host uses (e.g. `mcpServers` in Cursor).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PROOF_LAYER_API_KEY` | yes | Your `pl_live_...` key. Get one at [prooflayer.world999labs.com](https://prooflayer.world999labs.com). |
| `PROOF_LAYER_API_URL` | no | Defaults to `https://prooflayer.world999labs.com`. Override for self-hosted or staging environments. |
| `PROOF_LAYER_TELEMETRY` | no | Set to `off` to disable the anonymous install/heartbeat ping. See [Telemetry & privacy](#telemetry--privacy) below. |

**Legacy `VERIDOCS_*` environment variables are still read** if the corresponding `PROOF_LAYER_*` variable is unset. Existing Claude Desktop configurations using `VERIDOCS_API_KEY` continue to work without modification. New installs should use the `PROOF_LAYER_*` names.

---

## Telemetry & privacy

This package sends one anonymous install ping on startup, plus periodic anonymous heartbeats while running. The ping contains:

- A locally-generated random install ID (cannot be linked back to you)
- The package version (e.g. `1.0.0`)
- The MCP host name (e.g. `claude-desktop`, `cursor`, `cline`)
- Your operating system family (e.g. `darwin`, `linux`, `win32`)
- Approximate country code derived from your IP (e.g. `US`, `DE`)

We do **not** collect: your IP address (only the derived country, then discarded), your name, your email, your prompts, your receipts, your API key, your file paths, your machine name, or any other environment variables.

**To disable**, add `"PROOF_LAYER_TELEMETRY": "off"` to the `env` block in your MCP host config. (Legacy `"VERIDOCS_TELEMETRY": "off"` still works.) The flag is checked on every startup.

The install ID is stored at `~/.proof-layer/install-id`. If you previously ran `@veridocs/mcp`, the existing ID at `~/.veridocs/install-id` is migrated forward on first run so install identity is preserved across the rename.

Raw pings are retained for 90 days then aggregated and deleted. Full policy: [PRIVACY.md](https://github.com/World-999-Labs/proof-layer/blob/main/PRIVACY.md).

The `@proof-layer/verify` package sends nothing — it runs entirely offline.

---

## Tools exposed

The server registers eight tools, all prefixed `pl_`:

| Tool | What it does |
|---|---|
| `pl_evaluate` | Submit an action proposal — returns a signed receipt with verdict `EXECUTE` / `BLOCK` / `REVIEW` / `SHADOW`. |
| `pl_get_receipt` | Fetch a single receipt by its UUID. |
| `pl_verify_receipt` | Cryptographically verify a receipt's Ed25519 signature and key status. |
| `pl_list_receipts` | List recent receipts; filter by `agent_id` and `verdict`. |
| `pl_usage` | Current quota usage, credit balance, billing cycle, and plan tier. |
| `pl_list_policy_packs` | List all governance policy packs with the active one flagged. |
| `pl_create_plan` | Human approves a scoped, time-bounded plan covering future agent actions. |
| `pl_delegate` | Agent requests authorization to perform a specific action under a plan. |

Full schema for each tool is exposed via `ListToolsRequestSchema` — your MCP host will discover them automatically.

---

## How it fits

```
Your AI assistant (Claude Desktop / Cursor / Cline)
        ↓ MCP (stdio)
@proof-layer/mcp                       ← this package
        ↓ HTTPS
Proof Layer kernel
        ↓
Signed receipt → hash chain → verifiable offline
```

Before any consequential action — sending email, modifying data, executing payment, deleting records — the assistant calls `pl_evaluate`. Proof Layer evaluates against your active policy pack and returns a verdict plus a signed receipt. The assistant proceeds only when the verdict is `EXECUTE`.

---

## Verification

Receipts are independently verifiable using only Ed25519 standard library calls and the public key at `https://prooflayer.world999labs.com/v1/public-key`. No SDK or account required. For the dependency-free verifier:

```bash
npm install @proof-layer/verify
```

See [the main Proof Layer repo](https://github.com/World-999-Labs/proof-layer) for the full verification protocol and offline tooling.

---

## Migrating from `@veridocs/mcp`

If you're already running `@veridocs/mcp@1.2.x`, migration is a one-line config change:

**Before:**
```json
{
  "mcpServers": {
    "veridocs": {
      "command": "npx",
      "args": ["-y", "@veridocs/mcp"],
      "env": {
        "VERIDOCS_API_KEY": "vd_live_..."
      }
    }
  }
}
```

**After:**
```json
{
  "mcpServers": {
    "proof-layer": {
      "command": "npx",
      "args": ["-y", "@proof-layer/mcp"],
      "env": {
        "PROOF_LAYER_API_KEY": "vd_live_..."
      }
    }
  }
}
```

Your existing `vd_live_...` API key continues to work — only the env variable name changed. Tool names changed from `vd_*` to `pl_*` but they're discovered dynamically by the MCP host, so no further config edits are required.

The `@veridocs/mcp` package remains installable via npm but is deprecated and will not receive new features. Critical security fixes will be backported through 2026-Q3.

---

## License

MIT — © WORLD999_LABS

Built by [Proof Layer](https://prooflayer.world999labs.com).
