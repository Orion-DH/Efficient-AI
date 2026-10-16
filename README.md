# Efficient AI 论文检索

Efficient AI 论文的成本知识地图与检索页，部署在 GitHub Pages：
<https://orion-dh.github.io/Efficient-AI/>

## 页面功能

- 左侧筛选：会议、录用类型、成本主类、作用阶段、削减对象、技术手段、目标与约束、场景。同一维度内多选取并集，不同维度取交集，计数随其他筛选联动。
- 成本知识地图：按成本主类展示各方法分支的论文数，点击方法分支即可筛选。
- 论文卡片：原文、官方录用依据链接，彩色分类标签（点击标签即筛选），可展开精读笔记。
- 筛选条件会写进网址，复制链接即可分享当前筛选结果。

## 数据

所有论文都在 `data/papers.json`，网页只读这个文件。筛选标签、计数和知识地图都从数据自动生成，新增的会议、标签会自动出现在页面上。

> 现有 97 篇 CVPR 2026 论文从飞书多维表格迁移而来，之后不再与飞书同步。NeurIPS 2026 的 442 篇（仅按标题分类）因官方论文 PDF 尚未发布，暂时移除，可从 git 历史中的 `data/papers.json` 恢复。

### 字段

| 字段 | 说明 |
|---|---|
| 论文 | 标题，**必填**，也是去重依据 |
| 会议 | 如 `NeurIPS 2026`，**必填** |
| 成本主类 | **必填**，如 `解码与生成效率` |
| 录用类型 | `Oral` / `Highlight` / `Spotlight` / `Poster`，留空默认 `Poster` |
| 编号 | 留空则自动分配 |
| 方法分支 | 成本主类下的细分方向，用于知识地图 |
| 作用阶段、削减对象、技术手段、目标与约束、场景 | 多选标签 |
| 训练需求、阅读状态 | 短文本 |
| 原文链接 | 论文原文，优先用会议官网 PDF（如 CVF Open Access） |
| 录用依据、来源笔记 | 网址 |
| OpenReview链接 | OpenReview 页面，仅保存不显示 |
| 削减成本说明、测量口径、依赖假设、失效条件、关联论文 | 精读笔记，长文本 |

## 添加或修改论文

1. 生成模板：`python3 scripts/papers.py template`，得到 `templates/papers_template.csv`（可用 Excel / Numbers 编辑，第二行是示例）。
2. 每篇论文填一行，多个标签用分号 `;` / `；` 或竖线 `|` 分隔。只需填有内容的列；要清空某个文本字段时填 `-`。
3. 先预览，再导入：

```bash
python3 scripts/papers.py import 新论文.csv --dry-run
```

```bash
python3 scripts/papers.py import 新论文.csv
```

标题已存在的论文会被更新（只覆盖表里填了的列），新标题会新增。新出现的标签会自动加入筛选面板并分配颜色。也可以导入同样字段的 JSON 数组。

4. 发布：

```bash
./scripts/publish.sh
```

脚本会校验数据、提交并推送，GitHub Pages 一两分钟后更新。随时可以用 `python3 scripts/papers.py check` 单独校验。

## 本地预览

```bash
python3 -m http.server 8765
```

然后打开 <http://localhost:8765>。
