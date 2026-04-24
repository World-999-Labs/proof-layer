# Proof Layer

[![@proof-layer/mcp](https://img.shields.io/npm/v/@proof-layer/mcp.svg?label=%40proof-layer%2Fmcp&color=00e5ff)](https://www.npmjs.com/package/@proof-layer/mcp)
[![@proof-layer/verify](https://img.shields.io/npm/v/@proof-layer/verify.svg?label=%40proof-layer%2Fverify&color=7c3aed)](https://www.npmjs.com/package/@proof-layer/verify)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![MCP compatible](https://img.shields.io/badge/MCP-compatible-success.svg)](https://modelcontextprotocol.io)
[![Live deployment](https://img.shields.io/website?url=https%3A%2F%2Fprooflayer.world999labs.com%2Fhealth&label=live&up_message=healthy&down_message=down)](https://prooflayer.world999labs.com/health)

**Cryptographic governance receipts for AI agents.**
Issued *before* the agent acts. Ed25519-signed. Hash-chained. Verifiable offline.

> Built by [WORLD999_LABS](https://prooflayer.world999labs.com). Published on npm under `@proof-layer/*`. The legacy `@veridocs/*` package names continue to resolve and forward to the new ones.

---

## What this repo contains

This is the **public** half of Proof Layer — the parts you install and run on your own machine:

| Package | What it does | npm |
|---|---|---|
| [`@proof-layer/mcp`](./packages/mcp) | MCP server for Claude Desktop, Cursor, Cline, and any MCP-aware host | [![npm](https://img.shields.io/npm/v/@proof-layer/mcp.svg)](https://www.npmjs.com/package/@proof-layer/mcp) |
| [`@proof-layer/verify`](./packages/verify) | Standalone offline verifier — zero dependencies, audits any receipt bundle with just our public key | [![npm](https://img.shields.io/npm/v/@proof-layer/verify.svg)](https://www.npmjs.com/package/@proof-layer/verify) |

The **kernel** (governance engine, Gauntlet adversary/judge pipeline, billing, dashboard) is closed-source and runs at [prooflayer.world999labs.com](https://prooflayer.world999labs.com). Open-source clients + closed-source server is the same pattern Stripe, Resend, and Vercel use — you get full transparency on what runs locally and what data leaves your machine, while the proprietary server logic stays protected.

---

## Quick start

```bash
npx -y @proof-layer/mcp@latest
```

Drop into Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "proof-layer": {
      "command": "npx",
      "args": ["-y", "@proof-layer/mcp@latest"],
      "env": {
        "PROOF_LAYER_API_KEY": "pl_live_...",
        "PROOF_LAYER_API_URL": "https://prooflayer.world999labs.com"
      }
    }
  }
}
```

Restart Claude. Eight `pl_*` tools appear in the picker. Get an API key at [prooflayer.world999labs.com](https://prooflayer.world999labs.com).

> **Migrating from `@veridocs/mcp`?** No code changes required. The legacy package name continues to resolve, the legacy `vd_*` tool names continue to work alongside `pl_*`, and existing `VERIDOCS_API_KEY` / `VERIDOCS_API_URL` environment variables are still accepted. You can switch the package name and env-var names on your own schedule.

---

## Why pre-execution governance?

Most "AI safety" tools run *after* the model has acted — toxicity filters, output classifiers, post-hoc audit logs. By the time the alarm fires, the agent has already sent the email, merged the PR, or executed the trade.

Proof Layer flips this:

1. Agent proposes an action (e.g. *"send wire transfer for $50,000"*)
2. Proof Layer evaluates → returns signed verdict: `EXECUTE` / `BLOCK` / `REVIEW` / `SHADOW`
3. Receipt is written to a hash-chained, Ed25519-signed audit trail
4. Anyone with our public key can verify the entire chain offline — no trust in our infra required

A broken hash chain = tampering, immediately visible. A missing receipt = the agent acted without permission.

---

## Verifying receipts offline

Receipts are designed to outlive us. Here's how to verify a bundle without ever calling our API:

```typescript
import { verifyBundle } from "@proof-layer/verify";
import fs from "fs";

const bundle = fs.readFileSync("./receipts.ndjson", "utf8");
const publicKey = fs.readFileSync("./prooflayer-public-key.pem", "utf8");

const result = verifyBundle(bundle, publicKey);
console.log(result);
// { pass: 147, fail: 0, total: 147, chainBroken: false }
```

Public key is published at [prooflayer.world999labs.com/v1/public-key](https://prooflayer.world999labs.com/v1/public-key) and rotates on a published schedule.

---

## Resources

- 🌐 **Homepage:** https://prooflayer.world999labs.com
- 🎬 **Live demo (no signup):** https://prooflayer.world999labs.com/demo
- 📖 **MCP docs:** [packages/mcp/README.md](./packages/mcp/README.md)
- 🔒 **Privacy policy:** [PRIVACY.md](./PRIVACY.md)
- 🐛 **Report issues:** [GitHub Issues](https://github.com/World-999-Labs/proof-layer/issues)
- 💬 **Support:** support@world999labs.com

---

## License

MIT — see [LICENSE](./LICENSE).

The kernel and dashboard are proprietary and not included in this repo. The MCP server, verifier, and all client SDKs published under `@proof-layer/*` (and the legacy `@veridocs/*` names) are MIT-licensed.

---

## Contributing

Pull requests, issues, and feedback welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).
