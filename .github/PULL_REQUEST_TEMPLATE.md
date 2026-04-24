<!--
Thanks for opening a PR. A few quick checks before you click "Create".
-->

## What does this change?

<!-- One or two sentences. What does the diff do? -->

## Why?

<!-- Link the issue this resolves: "Closes #123". If there's no issue, briefly motivate the change. -->

## Which package is touched?

- [ ] `@proof-layer/mcp`
- [ ] `@proof-layer/verify`
- [ ] Repo-level docs / CI / both

## Checklist

- [ ] I built the affected package locally (`cd packages/<pkg> && npm run build`) and it succeeds.
- [ ] I ran the relevant tests (or added new ones) and they pass.
- [ ] I updated the package's `README.md` if user-facing behavior changed.
- [ ] If this changes the wire protocol with the kernel (server-side), I have an accompanying private-monorepo PR linked or a confirmation from a maintainer that the kernel is ready.
- [ ] I have **not** changed `package.json`'s `version` field — releases are cut by maintainers via tags.

## Screenshots / logs (optional)

<!--
For MCP server changes, a snippet of host-side output (Claude Desktop's tool list,
Cursor's MCP debug log, etc.) is gold. For verifier changes, before/after of
`verifyBundle` output on a known bundle.
-->
