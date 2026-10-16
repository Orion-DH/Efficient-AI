(() => {
  "use strict";

  const PAGE = 40;
  const MULTI = ["作用阶段", "削减对象", "技术手段", "目标与约束", "场景"];
  const SHORT = { "作用阶段": "作用阶段", "削减对象": "削减对象", "技术手段": "技术手段", "目标与约束": "目标约束", "场景": "场景" };
  const AWARD_RANK = { Oral: 0, Highlight: 1, Spotlight: 2, Poster: 3 };
  const NOTES = [["测量口径", "测量口径"], ["依赖假设", "依赖假设"], ["失效条件", "失效条件"], ["关联论文", "关联论文"]];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let DATA, PAPERS, FACETS, COLORS = {};
  const state = { q: "", sel: {}, branch: "", sort: "default", shown: PAGE };

  /* ---------- 状态与 URL ---------- */
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.q = p.get("q") || "";
    state.branch = p.get("branch") || "";
    state.sort = p.get("sort") || "default";
    for (const f of FACETS) state.sel[f] = new Set(p.getAll(f));
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.branch) p.set("branch", state.branch);
    if (state.sort !== "default") p.set("sort", state.sort);
    for (const f of FACETS) for (const v of state.sel[f]) p.append(f, v);
    const h = p.toString();
    history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
  }

  /* ---------- 筛选 ---------- */
  const values = (p, f) => (Array.isArray(p[f]) ? p[f] : p[f] ? [p[f]] : []);
  function matches(p, skip) {
    if (state.q) {
      const hay = (p["论文"] + " " + (p["方法分支"] || "")).toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t))) return false;
    }
    if (state.branch && p["方法分支"] !== state.branch && skip !== "branch") return false;
    for (const f of FACETS) {
      if (f === skip) continue;
      const s = state.sel[f];
      if (s.size && !values(p, f).some((v) => s.has(v))) return false;
    }
    return true;
  }
  const filtered = () => PAPERS.filter((p) => matches(p));
  const hasFilters = () => state.q || state.branch || FACETS.some((f) => state.sel[f].size);

  function toggle(f, v, single) {
    const s = state.sel[f];
    if (single) { const on = s.has(v); s.clear(); if (!on) s.add(v); }
    else s.has(v) ? s.delete(v) : s.add(v);
    state.shown = PAGE;
    update();
  }

  /* ---------- 渲染：筛选面板 ---------- */
  function optionOrder(f) {
    if (DATA.options[f]) return DATA.options[f].map((o) => o.name);
    const seen = [];
    for (const p of PAPERS) for (const v of values(p, f)) if (!seen.includes(v)) seen.push(v);
    if (f === "录用类型") seen.sort((a, b) => (AWARD_RANK[a] ?? 9) - (AWARD_RANK[b] ?? 9));
    return seen;
  }
  function counts(f) {
    const c = {};
    for (const p of PAPERS) if (matches(p, f)) for (const v of values(p, f)) c[v] = (c[v] || 0) + 1;
    return c;
  }
  function renderFacets() {
    const html = FACETS.map((f) => {
      const c = counts(f), s = state.sel[f];
      const opts = optionOrder(f).filter((v) => c[v] || s.has(v) || PAPERS.some((p) => values(p, f).includes(v)));
      const clear = s.size ? `<button class="facet-clear" data-clear="${esc(f)}">清空</button>` : "";
      let body;
      if (f === "成本主类") {
        const total = PAPERS.filter((p) => matches(p, f)).length;
        body = `<div class="list"><button class="${s.size ? "" : "on"}" data-all="${esc(f)}"><span>全部</span><span class="n">${total}</span></button>` +
          opts.map((v) => `<button class="${s.has(v) ? "on" : ""}" data-f="${esc(f)}" data-v="${esc(v)}" data-single="1"><span>${esc(v)}</span><span class="n">${c[v] || 0}</span></button>`).join("") + "</div>";
      } else {
        body = `<div class="chips">` + opts.map((v) =>
          `<button class="chip ${s.has(v) ? "on" : ""} ${c[v] ? "" : "zero"}" data-f="${esc(f)}" data-v="${esc(v)}">${esc(v)} <span class="n">${c[v] || 0}</span></button>`).join("") + "</div>";
      }
      return `<section class="facet"><div class="facet-head"><span class="facet-title">${esc(f)}</span>${clear}</div>${body}</section>`;
    }).join("");
    $("facets").innerHTML = html;
  }

  /* ---------- 渲染：成本知识地图 ---------- */
  function renderMap(list) {
    const groups = {};
    for (const p of list) for (const m of values(p, "成本主类")) {
      (groups[m] ||= { n: 0, b: {} }).n++;
      const b = p["方法分支"] || "未标注";
      groups[m].b[b] = (groups[m].b[b] || 0) + 1;
    }
    const order = optionOrder("成本主类").filter((m) => groups[m]);
    $("map-grid").innerHTML = order.length ? order.map((m) => {
      const g = groups[m], cls = tagClass("成本主类", m);
      const items = Object.entries(g.b).sort((a, b) => b[1] - a[1]).map(([b, n]) =>
        `<li><button class="${state.branch === b ? "on" : ""}" data-branch="${esc(b)}"><span>${esc(b)}</span><span>${n}</span></button></li>`).join("");
      return `<div class="map-col"><h3><button class="tag ${cls}" data-f="成本主类" data-v="${esc(m)}" data-single="1">${esc(m)}</button><span class="n">(${g.n})</span></h3><ul>${items}</ul></div>`;
    }).join("") : `<p class="empty">没有符合条件的论文。</p>`;
  }

  /* ---------- 渲染：卡片 ---------- */
  function tagClass(f, v) {
    const c = COLORS[f]?.[v];
    return c ? `hue-${c.hue} l-${c.lightness}` : "hue-Gray l-Lighter";
  }
  function tags(f, list) {
    return list.map((v) => `<button class="tag ${tagClass(f, v)}" data-f="${esc(f)}" data-v="${esc(v)}" title="按「${esc(v)}」筛选">${esc(v)}</button>`).join("");
  }
  function card(p) {
    const link = p["原文链接"] || p["录用依据"];
    const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(p["论文"])}</a>` : esc(p["论文"]);
    const award = p["录用类型"] && p["录用类型"] !== "Poster";
    const meta = [
      `#${p["编号"]}`, values(p, "成本主类").join(" / "), p["方法分支"], p["会议"],
    ].filter(Boolean).map(esc).concat(
      award ? `<span class="award">${esc(p["录用类型"])}</span>` : esc(p["录用类型"] || ""),
    ).filter(Boolean).join(" · ");
    const rows = MULTI.filter((f) => values(p, f).length)
      .map((f) => `<span class="k">${SHORT[f]}：</span><div class="tags">${tags(f, values(p, f))}</div>`).join("");
    const need = p["训练需求"] ? `<span class="k">训练需求：</span><div class="tags"><span class="tag ${p["训练需求"].startsWith("待") ? "hue-Gray l-Lighter" : "hue-Yellow l-Lighter"}">${esc(p["训练需求"])}</span></div>` : "";
    const notes = NOTES.filter(([k]) => p[k]).map(([k, label]) => `<div class="note"><h4>${label}</h4><p>${esc(p[k])}</p></div>`).join("");
    const src = p["来源笔记"] ? `<div class="note"><h4>来源笔记</h4><p><a href="${esc(p["来源笔记"])}" target="_blank" rel="noopener">在飞书中打开</a> · ${esc(p["阅读状态"] || "")}</p></div>` : "";
    const details = notes || src ? `<details class="details"><summary>展开详情</summary>${notes}${src}</details>` : "";
    return `<article class="card">
      <div class="card-head">
        <h2>${title}</h2>
        <div class="card-actions">
          ${p["原文链接"] ? `<a class="btn primary" href="${esc(p["原文链接"])}" target="_blank" rel="noopener">阅读原文</a>` : ""}
          ${p["录用依据"] ? `<a class="btn" href="${esc(p["录用依据"])}" target="_blank" rel="noopener">官方录用依据</a>` : ""}
          <button class="btn icon" data-copy="${esc(p["论文"])}" title="复制标题" aria-label="复制标题">⧉</button>
        </div>
      </div>
      <p class="meta">${meta}</p>
      ${p["削减成本说明"] ? `<p class="summary">${esc(p["削减成本说明"])}</p>` : ""}
      <div class="rows">${rows}${need}</div>
      ${details}
    </article>`;
  }
  function sorted(list) {
    if (state.sort === "title") return [...list].sort((a, b) => a["论文"].localeCompare(b["论文"]));
    if (state.sort === "award") return [...list].sort((a, b) => (AWARD_RANK[a["录用类型"]] ?? 9) - (AWARD_RANK[b["录用类型"]] ?? 9));
    return list;
  }
  function renderActive() {
    const items = [];
    if (state.q) items.push(`<button class="chip" data-unq="1">搜索：${esc(state.q)} ✕</button>`);
    if (state.branch) items.push(`<button class="chip" data-branch="${esc(state.branch)}">方法分支：${esc(state.branch)} ✕</button>`);
    for (const f of FACETS) for (const v of state.sel[f]) items.push(`<button class="chip" data-f="${esc(f)}" data-v="${esc(v)}">${esc(f)}：${esc(v)} ✕</button>`);
    $("active-filters").innerHTML = items.join("");
  }

  function update() {
    const list = sorted(filtered());
    $("match").innerHTML = `匹配 <b>${list.length}</b> / ${PAPERS.length} 篇`;
    $("clear-all").hidden = !hasFilters();
    $("cards").innerHTML = list.slice(0, state.shown).map(card).join("");
    $("more").hidden = list.length <= state.shown;
    $("more").textContent = `加载更多（还有 ${list.length - state.shown} 篇）`;
    $("empty").hidden = list.length > 0;
    $("search").value = state.q;
    $("sort").value = state.sort;
    renderFacets();
    renderMap(list);
    renderActive();
    writeHash();
  }

  /* ---------- 事件 ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.copy) {
      navigator.clipboard?.writeText(t.dataset.copy).then(() => { t.textContent = "✓"; setTimeout(() => (t.textContent = "⧉"), 1200); });
      return;
    }
    if (t.dataset.f) return toggle(t.dataset.f, t.dataset.v, !!t.dataset.single);
    if (t.dataset.all || t.dataset.clear) { state.sel[t.dataset.all || t.dataset.clear].clear(); state.shown = PAGE; return update(); }
    if (t.dataset.branch !== undefined) { state.branch = state.branch === t.dataset.branch ? "" : t.dataset.branch; state.shown = PAGE; return update(); }
    if (t.dataset.unq) { state.q = ""; return update(); }
  });
  $("clear-all").addEventListener("click", () => {
    state.q = ""; state.branch = ""; for (const f of FACETS) state.sel[f].clear(); state.shown = PAGE; update();
  });
  $("more").addEventListener("click", () => { state.shown += PAGE; update(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; update(); });
  let timer;
  $("search").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; update(); }, 150);
  });
  const sidebar = $("sidebar"), scrim = $("scrim");
  const setDrawer = (open) => { sidebar.classList.toggle("open", open); scrim.classList.toggle("open", open); };
  $("toggle-filters").addEventListener("click", () => setDrawer(!sidebar.classList.contains("open")));
  window.addEventListener("hashchange", () => { if (PAPERS) { readHash(); state.shown = PAGE; update(); } });
  scrim.addEventListener("click", () => setDrawer(false));

  /* ---------- 启动 ---------- */
  fetch("data/papers.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((d) => {
      DATA = d; PAPERS = d.papers; FACETS = d.facets;
      for (const [f, opts] of Object.entries(d.options)) COLORS[f] = Object.fromEntries(opts.map((o) => [o.name, o]));
      $("updated").textContent = `数据更新于 ${d.updated} · 共 ${PAPERS.length} 篇`;
      readHash();
      update();
    })
    .catch(() => { $("cards").innerHTML = `<p class="empty">数据加载失败，请刷新重试。</p>`; });
})();
