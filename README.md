# Efficient AI 论文检索

CVPR 2026 与 NeurIPS 2026 Efficient AI 论文的成本知识地图与检索页，部署在 GitHub Pages：
<https://orion-dh.github.io/Efficient-AI/>

## 页面功能

- 左侧筛选：会议、录用类型、成本主类、作用阶段、削减对象、技术手段、目标与约束、场景。同一维度内多选取并集，不同维度取交集，计数随其他筛选联动。
- 成本知识地图：按成本主类展示各方法分支的论文数，点击方法分支即可筛选。
- 论文卡片：原文、官方录用依据链接，彩色分类标签（点击标签即筛选），可展开精读笔记。
- 筛选条件会写进网址，复制链接即可分享当前筛选结果。

## 数据来源

数据来自飞书多维表格「CVPR-2026-06 论文知识地图与检索库 › 论文总表」，导出为 `data/papers.json`。网页只读这个文件，不连接飞书。筛选标签和配色从数据里自动生成，表格里新增论文或标签后，重新导出即可。

## 更新数据

需要本机已安装并登录 [lark-cli](https://github.com/larksuite/cli)。

```bash
./scripts/update.sh
```

脚本会从飞书导出最新数据、提交并推送，GitHub Pages 会在一两分钟内自动更新。不想公开精读笔记字段时，运行 `./scripts/update.sh --no-notes`。

本地预览：

```bash
python3 -m http.server 8765
```

然后打开 <http://localhost:8765>。
