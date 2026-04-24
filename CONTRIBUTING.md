# Contributing to Proof Layer

Thanks for your interest. This repo holds the open-source clients (`@proof-layer/mcp`, `@proof-layer/verify`) — the kernel/server lives in a separate private repo.

## Reporting bugs

Open a [GitHub issue](https://github.com/World-999-Labs/proof-layer/issues) with:
- Package + version (`npm ls @proof-layer/mcp`)
- Host (Claude Desktop / Cursor / Cline / etc.) and version
- Reproduction steps
- A receipt ID if relevant — we can look it up server-side

If you're still on the legacy `@veridocs/*` packages, please mention that — those are deprecated but we still triage critical issues against them.

## Pull requests

We welcome PRs against:
- `packages/mcp` — new tools, bug fixes, host-specific compatibility
- `packages/verify` — performance, additional bundle formats, language ports

We do **not** accept PRs against:
- The kernel (closed source, separate repo)
- Anything that changes the wire protocol with the kernel — those need to be designed jointly

### Before opening a PR

1. Open an issue first to discuss non-trivial changes
2. Run `npm run build` in the affected package — it must succeed
3. Keep the diff focused — one PR per concern

## Releases

Releases are cut by maintainers via GitHub tags (`mcp-v1.x.y` for the MCP server, `verify-v1.x.y` for the verifier). Publishing to npm is automated via GitHub Actions — see `.github/workflows/publish.yml`.

## Security

Found a vulnerability? **Don't open a public issue.** Email security@prooflayer.world999labs.com — we respond within 48 hours and ship fixes within 7 days for critical issues.

## License

By contributing, you agree your contributions are licensed under MIT.
