#!/usr/bin/env bash
# 从飞书导出最新论文数据，提交并推送到 GitHub。
# 用法：./scripts/update.sh [--no-notes]
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/export_feishu.py "$@"

if git diff --quiet -- data/papers.json; then
  echo "数据没有变化，无需推送。"
  exit 0
fi

git add data/papers.json
git commit -m "更新论文数据 $(date +%Y-%m-%d)"
git push
echo "已推送，GitHub Pages 一两分钟后更新：https://orion-dh.github.io/Efficient-AI/"
