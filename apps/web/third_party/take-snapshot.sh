#!/bin/zsh
# Generate the SigNoz v0.97.0 read-only reference snapshot (design doc §7.1).
# Source: ~/develop/open-source/signoz @ v0.97.0 (read-only, do not modify).
# Output: apps/web/third_party/signoz-0.97.0/ (not part of the build, for semantic comparison only).
set -euo pipefail

REF="${SIGNOZ_REF_REPO:-$HOME/develop/open-source/signoz}"
TAG="${SIGNOZ_REF_TAG:-v0.97.0}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/third_party/signoz-0.97.0"

if [[ ! -d "$REF/.git" ]]; then
  echo "Reference repo not found: $REF" >&2
  exit 1
fi

# Verify tag
SHA=$(git -C "$REF" rev-parse "$TAG") || exit 1
echo "Snapshot $TAG ($SHA)"

rm -rf "$OUT"
mkdir -p "$OUT"

# Query-semantics core + rendering reference (reference only, never compiled)
git -C "$REF" archive "$TAG" \
  frontend/src/api/v5/queryRange \
  frontend/src/constants/queryBuilder.ts \
  frontend/src/types/api/v5/queryRange.ts \
  frontend/src/lib/getStartEndRangeTime.ts \
  frontend/src/lib/dashboard/getQueryResults.ts \
  frontend/src/container/NewDashboard \
  frontend/src/providers/Dashboard \
  frontend/src/container/TopNav/DateTimeSelectionV2 \
  pkg/query-service/app/http_handler.go \
  | tar -x -C "$OUT"

cat > "$OUT/SNAPSHOT.md" <<EOF
# SigNoz reference snapshot (read-only)

- tag: $TAG
- sha: $SHA
- taken from: \`$REF\` (exported via \`git archive\`, no modifications)
- purpose: query-semantics comparison (see \`../PATCHES.md\` mapping table), not part of the build.
EOF

echo "Snapshot generated: $OUT"
