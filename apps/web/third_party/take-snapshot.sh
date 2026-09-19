#!/bin/zsh
# 生成 SigNoz v0.97.0 只读参考快照（设计文档 §7.1）。
# 来源：~/develop/open-source/signoz @ v0.97.0（只读，禁止修改）。
# 产物：apps/web/third_party/signoz-0.97.0/（不参与构建，仅供语义对照）。
set -euo pipefail

REF="${SIGNOZ_REF_REPO:-$HOME/develop/open-source/signoz}"
TAG="${SIGNOZ_REF_TAG:-v0.97.0}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/third_party/signoz-0.97.0"

if [[ ! -d "$REF/.git" ]]; then
  echo "参考仓库不存在：$REF" >&2
  exit 1
fi

# 校验 tag
SHA=$(git -C "$REF" rev-parse "$TAG") || exit 1
echo "快照 $TAG ($SHA)"

rm -rf "$OUT"
mkdir -p "$OUT"

# 查询语义核心 + 渲染对照（纯参考，不编译）
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
# SigNoz 参考快照（只读）

- tag：$TAG
- sha：$SHA
- 取自：\`$REF\`（\`git archive\` 导出，未做任何修改）
- 用途：查询语义对照（见 \`../PATCHES.md\` 映射表），不参与构建。
EOF

echo "快照已生成：$OUT"
