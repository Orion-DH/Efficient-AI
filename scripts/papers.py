#!/usr/bin/env python3
"""维护 data/papers.json：导入新论文、校验数据。

data/papers.json 是网页唯一的数据源。用法：
    python3 scripts/papers.py import 新论文.csv   # 导入 CSV 或 JSON，按标题新增或更新
    python3 scripts/papers.py import 新论文.csv --dry-run   # 只预览，不写入
    python3 scripts/papers.py check                # 校验数据
    python3 scripts/papers.py template             # 生成 CSV 模板 templates/papers_template.csv

CSV 中多个标签用分号（; 或 ；）或竖线（|）分隔。文本列填 - 表示清空该字段。
"""
import argparse
import csv
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "papers.json"
TEMPLATE = ROOT / "templates" / "papers_template.csv"

TAG_FIELDS = ["成本主类", "作用阶段", "削减对象", "技术手段", "目标与约束", "场景"]
TEXT_FIELDS = ["论文", "会议", "轨道", "录用类型", "方法分支", "训练需求", "阅读状态",
               "原文链接", "录用依据", "来源笔记", "OpenReview链接",
               "削减成本说明", "测量口径", "依赖假设", "失效条件", "关联论文"]
COLUMNS = ["编号", "论文", "会议", "轨道", "录用类型", "成本主类", "方法分支", "作用阶段", "削减对象", "技术手段",
           "目标与约束", "场景", "训练需求", "阅读状态", "原文链接", "录用依据", "来源笔记", "OpenReview链接",
           "削减成本说明", "测量口径", "依赖假设", "失效条件", "关联论文"]
REQUIRED = ["论文", "会议", "成本主类"]
AWARDS = {"Oral", "Highlight", "Spotlight", "Poster"}
TRACKS = {"主会", "Findings", "Position", "期刊转会议", "Special Track"}
# 新标签自动配色时轮换使用的颜色
PALETTE = ["Blue", "Orange", "Purple", "Red", "Turquoise", "Yellow", "Lime", "Green", "Carmine", "Wathet"]
SPLIT = re.compile(r"\s*[;；|]\s*")


def load():
    return json.loads(DATA.read_text())


def save(data):
    data["updated"] = datetime.date.today().isoformat()
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))


def key(title):
    return re.sub(r"\W+", "", (title or "").lower())


def read_rows(path):
    path = Path(path)
    if path.suffix.lower() == ".json":
        rows = json.loads(path.read_text())
        return rows["papers"] if isinstance(rows, dict) else rows
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def normalize(row):
    """把一行输入整理成 papers.json 的格式；空单元格不出现在结果里。"""
    p = {}
    for k in TAG_FIELDS:
        v = row.get(k)
        if isinstance(v, str):
            v = [x for x in SPLIT.split(v.strip()) if x]
        if v:
            p[k] = list(dict.fromkeys(v))
    for k in TEXT_FIELDS:
        v = row.get(k)
        if v is not None and str(v).strip():
            p[k] = "" if str(v).strip() == "-" else str(v).strip()
    n = row.get("编号")
    if n not in (None, ""):
        p["编号"] = int(float(n))
    return p


def add_options(data, paper, log):
    for f in TAG_FIELDS:
        opts = data["options"].setdefault(f, [])
        names = {o["name"] for o in opts}
        for v in paper.get(f, []):
            if v not in names:
                hue = PALETTE[len(opts) % len(PALETTE)]
                opts.append({"name": v, "hue": hue, "lightness": "Lighter"})
                names.add(v)
                log.append(f"新标签：{f} › {v}（配色 {hue}）")


def blank(p):
    out = {k: [] for k in TAG_FIELDS}
    out.update({k: "" for k in TEXT_FIELDS})
    out["编号"] = None
    out.update(p)
    return out


def cmd_import(args):
    data = load()
    index = {key(p["论文"]): p for p in data["papers"]}
    next_no = max((p["编号"] or 0) for p in data["papers"]) + 1
    added, updated, log = 0, 0, []
    for i, row in enumerate(read_rows(args.file), 1):
        p = normalize(row)
        if not p.get("论文"):
            log.append(f"第 {i} 行没有论文标题，已跳过")
            continue
        old = index.get(key(p["论文"]))
        if old:
            changed = [k for k, v in p.items() if old.get(k) != v]
            if changed:
                old.update(p)
                updated += 1
                log.append(f"更新：{p['论文'][:60]}（{'、'.join(changed)}）")
            target = old
        else:
            target = blank(p)
            if target["编号"] is None:
                target["编号"], next_no = next_no, next_no + 1
            if not target["录用类型"]:
                target["录用类型"] = "Poster"
            if not target["轨道"]:
                target["轨道"] = "主会"
            data["papers"].append(target)
            index[key(p["论文"])] = target
            added += 1
            log.append(f"新增：#{target['编号']} {p['论文'][:60]}")
        add_options(data, target, log)

    print("\n".join(log) or "没有变化")
    print(f"\n新增 {added} 篇，更新 {updated} 篇，共 {len(data['papers'])} 篇")
    problems = validate(data)
    if problems:
        print("\n校验发现问题：\n" + "\n".join(problems))
    if args.dry_run:
        print("（预览模式，未写入）")
    elif added or updated:
        save(data)
        print(f"已写入 {DATA.relative_to(ROOT)}")


def validate(data):
    problems, seen = [], {}
    for p in data["papers"]:
        t = p.get("论文") or "（无标题）"
        for k in REQUIRED:
            if not p.get(k):
                problems.append(f"缺少{k}：{t[:60]}")
        if p.get("轨道") not in TRACKS:
            problems.append(f"轨道不规范（{p.get('轨道')}）：{t[:60]}")
        if p.get("录用类型") and p["录用类型"] not in AWARDS:
            problems.append(f"录用类型不规范（{p['录用类型']}）：{t[:60]}")
        for k in ("原文链接", "录用依据", "来源笔记", "OpenReview链接"):
            if p.get(k) and not p[k].startswith("http"):
                problems.append(f"{k}不是网址：{t[:60]}")
        k2 = key(t)
        if k2 in seen:
            problems.append(f"标题重复：{t[:60]}")
        seen[k2] = True
    return problems


def cmd_check(_):
    data = load()
    problems = validate(data)
    by_conf = {}
    for p in data["papers"]:
        by_conf[p["会议"]] = by_conf.get(p["会议"], 0) + 1
    print(f"共 {len(data['papers'])} 篇：" + "，".join(f"{k} {v}" for k, v in by_conf.items()))
    print("\n".join(problems) if problems else "校验通过")
    sys.exit(1 if problems else 0)


def cmd_template(_):
    TEMPLATE.parent.mkdir(parents=True, exist_ok=True)
    example = {
        "论文": "Example Paper Title", "会议": "ICLR 2027", "轨道": "主会", "录用类型": "Poster", "成本主类": "解码与生成效率",
        "方法分支": "投机解码与早退", "作用阶段": "LLM层内Attention/FFN与Decode计算", "削减对象": "输出Token、串行预测与去噪步数",
        "技术手段": "投机草稿接受与结构化并行", "目标与约束": "解码串行性、步数或去噪/搜索预算；完整回答/在线查询/pipeline耗时或吞吐",
        "场景": "LLM 通用与文本推理", "训练需求": "待核查", "阅读状态": "仅标题分类",
        "原文链接": "https://openreview.net/forum?id=xxxx", "录用依据": "https://iclr.cc/virtual/2027/poster/xxxx",
    }
    with TEMPLATE.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerow(example)
    print(f"已生成 {TEMPLATE.relative_to(ROOT)}（第二行是示例，导入前请删掉或替换）")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    imp = sub.add_parser("import", help="导入 CSV/JSON，按标题新增或更新论文")
    imp.add_argument("file")
    imp.add_argument("--dry-run", action="store_true", help="只预览，不写入")
    imp.set_defaults(func=cmd_import)
    sub.add_parser("check", help="校验数据").set_defaults(func=cmd_check)
    sub.add_parser("template", help="生成 CSV 模板").set_defaults(func=cmd_template)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
