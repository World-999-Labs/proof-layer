# Privacy Policy — Proof Layer Open-Source Clients

_Last updated: 2026-04-24_

This document covers data collection by the **open-source clients in this repository** (`@proof-layer/mcp`, `@proof-layer/verify`). For the kernel and dashboard at [prooflayer.world999labs.com](https://prooflayer.world999labs.com), see the [main privacy policy](https://prooflayer.world999labs.com/privacy).

---

## Short version

`@proof-layer/mcp` sends one **anonymous install ping** when the server starts, plus periodic anonymous heartbeats while running. It contains:

- A locally-generated random install ID (cannot be linked back to you)
- The package version (e.g. `1.0.0`)
- The MCP host name (e.g. `claude-desktop`, `cursor`, `cline`)
- The operating system family (e.g. `darwin`, `linux`, `win32`)
- An approximate country code derived from your IP (e.g. `US`, `DE`)

We do **not** collect: your IP address (only the derived country, then discarded), your name, your email, your prompts, your receipts, your API key, your file paths, your machine name, or any environment variables other than `PROOF_LAYER_TELEMETRY` / `VERIDOCS_TELEMETRY`.

`@proof-layer/verify` sends **nothing**. It runs entirely offline.

## How to disable telemetry

Set the environment variable `PROOF_LAYER_TELEMETRY=off` in your MCP host config:

```json
{
  "mcpServers": {
    "proof-layer": {
      "command": "npx",
      "args": ["-y", "@proof-layer/mcp@latest"],
      "env": {
        "PROOF_LAYER_API_KEY": "pl_live_...",
        "PROOF_LAYER_TELEMETRY": "off"
      }
    }
  }
}
```

The legacy `VERIDOCS_TELEMETRY=off` flag is also still honored. When either flag is set, no pings are sent. The flag is checked on every startup.

## Why we collect this

We use the data to:
- Count active installations so we know if the package is being adopted
- See which MCP hosts are dominant so we can prioritize compatibility fixes
- Spot version-upgrade lag so we know when to deprecate old releases

We do not sell, share, or otherwise transfer any of this data to third parties.

## Retention

Anonymous telemetry pings are retained for **90 days** in raw form, then aggregated into daily counters and the raw rows are deleted. Aggregated counters (no identifiers) are retained indefinitely.

## Your rights (GDPR / CCPA)

Because the install ID is generated locally and never linked to a person, the data we collect is anonymous under GDPR Recital 26 and CCPA §1798.140(o). However, if you believe a specific install ID belongs to you, you can email [privacy@prooflayer.world999labs.com](mailto:privacy@prooflayer.world999labs.com) with the ID (visible in your `~/.proof-layer/install-id` file — or the legacy `~/.veridocs/install-id` file if you upgraded from `@veridocs/mcp`) and we will delete the corresponding rows within 30 days.

## API-key data

Separately from telemetry, when you use the `@proof-layer/mcp` server with a real API key, your action proposals are sent to the kernel for evaluation. That is not telemetry — it is the core service you are paying for. Data handling for that flow is covered in the [main privacy policy](https://prooflayer.world999labs.com/privacy).

## Changes to this policy

We will note any material changes at the top of this document and in the changelog of `@proof-layer/mcp`. Substantial expansions (new fields, new retention windows) require a major version bump on the package.

## Contact

[privacy@prooflayer.world999labs.com](mailto:privacy@prooflayer.world999labs.com) — we respond within 7 days.
