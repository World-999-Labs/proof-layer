#!/usr/bin/env bash
# sync-from-private.sh
# Copies the latest @proof-layer/mcp and @proof-layer/verify package sources
# from the private monorepo into this public repo. Run from the private
# monorepo root:
#
#   bash public-repo/scripts/sync-from-private.sh
#
# Then commit + tag + push. GitHub Actions handles the npm publish.
#
# Excluded by design: node_modules, dist, .npmrc, *.log, *.tgz tarballs,
# tsconfig.json (workspace-only), and any pre-built artifacts. The public
# repo builds from source on every release.
#
# PRESERVED ACROSS SYNCS — this script must NEVER touch these paths under
# public-repo/ because they are owned by the public repo, not the private
# monorepo:
#   - public-repo/.github/                 (workflows, issue templates, PR template, social-preview.png)
#   - public-repo/SECURITY.md              (security disclosure policy)
#   - public-repo/CODEOWNERS               (review routing)
#   - public-repo/README.md                (badge row + curated narrative)
#   - public-repo/CONTRIBUTING.md
#   - public-repo/PRIVACY.md
#   - public-repo/LICENSE
#   - public-repo/scripts/                 (this file)
# The script only ever writes to public-repo/packages/{mcp,verify}/. The
# guard below asserts that invariant before doing any work.

set -euo pipefail

PRIVATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PUBLIC_ROOT="${PRIVATE_ROOT}/public-repo"

echo "Syncing from ${PRIVATE_ROOT} → ${PUBLIC_ROOT}"

# Snapshot the OSS-credibility files BEFORE the sync so we can verify they
# survived intact. If any of these go missing or change, the script aborts.
PRESERVE_PATHS=(
  ".github"
  "SECURITY.md"
  "CODEOWNERS"
  "README.md"
  "CONTRIBUTING.md"
  "PRIVACY.md"
  "LICENSE"
)
declare -A PRESERVE_HASH
for p in "${PRESERVE_PATHS[@]}"; do
  full="${PUBLIC_ROOT}/${p}"
  if [ -e "$full" ]; then
    PRESERVE_HASH[$p]=$(find "$full" -type f -print0 | sort -z | xargs -0 sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1)
  else
    PRESERVE_HASH[$p]="ABSENT"
    echo "  warn: preserved path ${p} not present before sync"
  fi
done

copy_filtered() {
  local src="$1"
  local dst="$2"
  mkdir -p "$dst"
  # Use tar to honor excludes without depending on rsync.
  tar -C "$src" \
      --exclude='node_modules' \
      --exclude='dist' \
      --exclude='.npmrc' \
      --exclude='*.log' \
      --exclude='*.tgz' \
      --exclude='tsconfig.json' \
      -cf - . | tar -C "$dst" -xf -
}

for pkg in mcp verify; do
  SRC="${PRIVATE_ROOT}/packages/${pkg}"
  DST="${PUBLIC_ROOT}/packages/${pkg}"

  if [ ! -d "$SRC" ]; then
    echo "  skip ${pkg} — source not found at ${SRC}"
    continue
  fi

  # Hard guard: refuse to operate on anything outside public-repo/packages/.
  case "$DST" in
    "${PUBLIC_ROOT}/packages/"*) : ;;
    *) echo "  refuse: destination ${DST} is outside packages/ — aborting"; exit 2 ;;
  esac

  echo "  syncing packages/${pkg}"
  rm -rf "$DST"
  copy_filtered "$SRC" "$DST"
done

# Verify the preserved paths survived untouched.
echo ""
echo "Verifying preserved files…"
preserve_failures=0
for p in "${PRESERVE_PATHS[@]}"; do
  full="${PUBLIC_ROOT}/${p}"
  if [ ! -e "$full" ] && [ "${PRESERVE_HASH[$p]}" != "ABSENT" ]; then
    echo "  FAIL: ${p} disappeared during sync"
    preserve_failures=$((preserve_failures + 1))
    continue
  fi
  if [ -e "$full" ]; then
    after=$(find "$full" -type f -print0 | sort -z | xargs -0 sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1)
    if [ "${PRESERVE_HASH[$p]}" != "ABSENT" ] && [ "$after" != "${PRESERVE_HASH[$p]}" ]; then
      echo "  FAIL: ${p} content changed during sync"
      preserve_failures=$((preserve_failures + 1))
    else
      echo "  ok:   ${p}"
    fi
  fi
done
if [ "$preserve_failures" -gt 0 ]; then
  echo "ABORT: ${preserve_failures} preserved path(s) were modified. Investigate before pushing."
  exit 3
fi

echo ""
echo "Done. Next steps:"
echo "  cd ${PUBLIC_ROOT}"
echo "  git add . && git commit -m 'sync: pull latest packages from private monorepo'"
echo "  git tag mcp-v\$(node -p \"require('./packages/mcp/package.json').version\")"
echo "  git push origin main --tags"
