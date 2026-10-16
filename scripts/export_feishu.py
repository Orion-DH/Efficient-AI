#!/usr/bin/env python3
"""从飞书多维表格「论文总表」导出数据，生成网页使用的 data/papers.json。

依赖本机已登录的 lark-cli。用法：
    python3 scripts/export_feishu.py            # 包含精读笔记字段
    python3 scripts/export_feishu.py --no-notes # 不导出精读笔记字段
"""
import argparse
import datetime
import json
import re
import subprocess
import tempfile
from pathlib import Path

BASE_TOKEN = "XQcpbccUCaNMPVsU0xscpjdlnZA"
TABLE = "论文总表"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "papers.json"

# 网页上作为标签筛选的多选/单选字段，按展示顺序排列
FACETS = ["会议", "录用类型", "成本主类", "作用阶段", "削减对象", "技术手段", "目标与约束", "场景"]
SELECT_FIELDS = ["成本主类", "作用阶段", "削减对象", "技术手段", "目标与约束", "场景"]
LINK_FIELDS = ["原文链接", "录用依据", "来源笔记"]
BASIC_FIELDS = ["编号", "论文", "会议", "录用类型", "方法分支", "训练需求", "阅读状态"]
NOTE_FIELDS = ["削减成本说明", "测量口径", "依赖假设", "失效条件", "关联论文"]

MD_LINK = re.compile(r"^\[(?P<text>[^\]]*)\]\((?P<url>[^)]+)\)$")


def lark(*args):
    out = subprocess.run(["lark-cli", "base", *args], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def plain_url(value):
    """飞书文本字段里的链接形如 [url](url)，取出 url。"""
    if not value:
        return ""
    m = MD_LINK.match(value.strip())
    return m.group("url") if m else value.strip()


def export_options():
    fields = lark("+field-list", "--base-token", BASE_TOKEN, "--table-id", TABLE)["data"]["fields"]
    options = {}
    for f in fields:
        if f["name"] in SELECT_FIELDS:
            options[f["name"]] = [
                {"name": o["name"], "hue": o.get("hue", "Gray"), "lightness": o.get("lightness", "Lighter")}
                for o in f.get("options", [])
            ]
    return options


def export_records():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "records.ndjson"
        subprocess.run(
            ["lark-cli", "base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", TABLE,
             "--output", str(path), "--overwrite"],
            capture_output=True, text=True, check=True, cwd=tmp,
        )
        return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-notes", action="store_true", help="不导出精读笔记字段")
    args = ap.parse_args()

    options = export_options()
    papers = []
    for r in export_records():
        p = {k: r.get(k) for k in BASIC_FIELDS}
        p["编号"] = int(p["编号"]) if p["编号"] is not None else None
        for k in SELECT_FIELDS:
            p[k] = r.get(k) or []
        for k in LINK_FIELDS:
            p[k] = plain_url(r.get(k))
        if not args.no_notes:
            for k in NOTE_FIELDS:
                p[k] = r.get(k) or ""
        papers.append(p)

    papers.sort(key=lambda p: (p["会议"] != "NeurIPS 2026", p["编号"] or 0))
    data = {
        "updated": datetime.date.today().isoformat(),
        "facets": FACETS,
        "options": options,
        "notes": not args.no_notes,
        "papers": papers,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"导出 {len(papers)} 篇论文 → {OUT.relative_to(ROOT)}（精读笔记：{'是' if data['notes'] else '否'}）")


if __name__ == "__main__":
    main()
