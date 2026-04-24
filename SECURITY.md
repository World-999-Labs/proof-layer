# Security Policy

## Supported versions

| Package | Supported |
|---|---|
| `@proof-layer/mcp` ≥ 1.0.0 | ✅ |
| `@proof-layer/verify` ≥ 1.0.0 | ✅ |
| `@veridocs/mcp` (legacy) | ⚠️ critical fixes only |
| `@veridocs/verify` (legacy) | ⚠️ critical fixes only |

The legacy `@veridocs/*` scope continues to receive security patches but no new features. New installs should use `@proof-layer/*`.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.** Public disclosure before a fix is shipped puts every Proof Layer user at risk.

Email **security@prooflayer.world999labs.com** with:

1. The affected package and version (`npm ls @proof-layer/mcp`).
2. A description of the issue — what an attacker could do, and roughly how.
3. A reproducer if you have one. A failing test, a sample payload, or a short script is ideal; a written description is fine if a reproducer would itself be sensitive.
4. Whether you'd like credit in the advisory and how you'd like to be named.

You will get a response within **48 hours** (usually same-day during PT business hours). We will:

- Confirm we can reproduce the issue.
- Assign a severity (CVSS 3.1).
- Tell you our patch ETA — **7 days** for critical, **30 days** for high/medium.
- Coordinate a disclosure date with you.

We publish security advisories via [GitHub Security Advisories](https://github.com/World-999-Labs/proof-layer/security/advisories) once a fix is available.

## What is in scope

- **`@proof-layer/mcp`** — the MCP server in `packages/mcp/`. Including: argument handling, environment-variable handling, MCP protocol implementation, telemetry transport, the way it forwards proposals to the kernel.
- **`@proof-layer/verify`** — the offline verifier in `packages/verify/`. Including: Ed25519 signature verification logic, hash-chain validation, Merkle root computation, and any way to make `verifyBundle` return `pass` for an invalid bundle.
- **The publish supply chain** — anything in `.github/workflows/` that could be abused to publish a malicious version.

## What is out of scope

- The closed-source kernel and dashboard at `prooflayer.world999labs.com` — report those to the same address but expect a separate triage queue.
- DoS against the kernel via legitimate API calls — that is a billing/abuse problem, not a security vulnerability.
- Misconfigurations on a user's own machine (e.g. checking an API key into git) — please send those as docs feedback rather than a security report.
- Issues that require an attacker to already have shell access on the user's machine.

## Hall of fame

We acknowledge confirmed reporters in the GitHub Security Advisory and at https://prooflayer.world999labs.com/security. Bounty payments are case-by-case; we are a small team and pay when we can.
