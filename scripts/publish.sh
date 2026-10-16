#!/usr/bin/env bash
# 校验 data/papers.json，提交并推送到 GitHub，GitHub Pages 随后自动更新。
# 用法：./scripts/publish.sh ["提交说明"]
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/papers.py check

if git diff --quiet -- data/papers.json && git diff --cached --quiet -- data/papers.json; then
  echo "数据没有变化，无需推送。"
  exit 0
fi

git add data/papers.json
git commit -m "${1:-更新论文数据 $(date +%Y-%m-%d)}"
git push
echo "已推送，GitHub Pages 一两分钟后更新：https://orion-dh.github.io/Efficient-AI/"
