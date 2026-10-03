// Design Ref: §2 Option C — vanilla JS, data in window.PROMPTS, state in hash + localStorage
(function () {
  "use strict";

  const PROMPTS = Array.isArray(window.PROMPTS) ? window.PROMPTS : null;
  const $ = (sel) => document.querySelector(sel);
  const el = {
    layout: $("#layout"),
    listBody: $("#list-body"),
    listEmpty: $("#list-empty"),
    search: $("#search"),
    themeBtn: $("#theme-btn"),
    backBtn: $("#back-btn"),
    detailEmpty: $("#detail-empty"),
    detailBody: $("#detail-body"),
    part: $("#d-part"),
    cat: $("#d-cat"),
    title: $("#d-title"),
    benefits: $("#d-benefits"),
    notice: $("#d-notice"),
    fields: $("#fields"),
    progress: $("#d-progress"),
    fillBtn: $("#fill-btn"),
    resetBtn: $("#reset-btn"),
    preview: $("#preview"),
    copyBtn: $("#copy-btn"),
    missing: $("#d-missing"),
    article: $("#d-article"),
    toast: $("#toast"),
  };

  const state = { current: null, values: {}, query: "" };
  const PLACEHOLDER = /\{\{(.+?)\}\}/g;

  // ---------- storage (Design §3.2, §6: tolerate unavailable storage) ----------
  const store = {
    get(key) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
    },
    del(key) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    },
  };
  const valuesKey = (id) => `pb:values:${id}`;

  // ---------- helpers ----------
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");

  let toastTimer = null;
  function toast(msg, isError) {
    el.toast.textContent = msg;
    el.toast.classList.toggle("error", !!isError);
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2000);
  }

  // ---------- compile (Design §4) ----------
  // Plan SC: 모든 {{키}}가 치환되고, 빈 값은 [확인 필요: 라벨]로 드러난다
  function compile(prompt, values) {
    const labelOf = {};
    prompt.fields.forEach((f) => { labelOf[f.key] = f.label || f.key; });
    const missing = [];
    const text = prompt.template.replace(PLACEHOLDER, (_, key) => {
      const v = (values[key] || "").trim();
      if (v) return v;
      if (!missing.includes(labelOf[key] || key)) missing.push(labelOf[key] || key);
      return `[확인 필요: ${labelOf[key] || key}]`;
    });
    const html = prompt.template
      .split(/(\{\{.+?\}\})/g)
      .map((chunk) => {
        const m = chunk.match(/^\{\{(.+?)\}\}$/);
        if (!m) {
          // bold section labels at line start
          return escapeHtml(chunk).replace(/(^|\n)(\[(?:역할|업무 배경|요청 사항|출력 형식|참고 자료|사용 전 안내)\])/g, (_, nl, lab) => `${nl}<span class="label">${lab}</span>`);
        }
        const key = m[1];
        const v = (values[key] || "").trim();
        return v
          ? `<mark>${escapeHtml(v)}</mark>`
          : `<mark class="missing">[확인 필요: ${escapeHtml(labelOf[key] || key)}]</mark>`;
      })
      .join("");
    return { text, html, missing };
  }

  // ---------- search (Design §4) ----------
  function search(query) {
    const q = norm(query);
    if (!q) return PROMPTS;
    return PROMPTS.filter((p) => {
      const hay = [p.id, p.title, p.category, p.partTitle, ...(p.benefits || []), ...p.fields.map((f) => f.label)];
      return hay.some((h) => norm(h).includes(q));
    });
  }

  // ---------- list ----------
  function renderList() {
    const items = search(state.query);
    el.listEmpty.hidden = items.length > 0;
    const byPart = new Map();
    items.forEach((p) => {
      if (!byPart.has(p.part)) byPart.set(p.part, { title: p.partTitle, items: [] });
      byPart.get(p.part).items.push(p);
    });
    const openPart = state.current ? state.current.part : [...byPart.keys()][0];
    const html = [...byPart.entries()].map(([part, g]) => {
      const open = state.query || part === openPart ? " open" : "";
      const cards = g.items.map((p) => `
        <button type="button" class="card" data-id="${p.id}" aria-current="${state.current && state.current.id === p.id}">
          ${p.category ? `<span class="card-cat">${escapeHtml(p.category)}</span>` : ""}
          <span class="card-title">${escapeHtml(p.title)}</span>
        </button>`).join("");
      return `
        <details class="part-group"${open}>
          <summary><span class="part-num">${part}</span>${escapeHtml(g.title)}<span class="part-count">${g.items.length}</span></summary>
          <div class="cards">${cards}</div>
        </details>`;
    }).join("");
    el.listBody.innerHTML = html;
  }

  // ---------- detail ----------
  function select(id, { pushHash = true } = {}) {
    const prompt = PROMPTS.find((p) => p.id === id);
    if (!prompt) return false;
    state.current = prompt;
    state.values = store.get(valuesKey(id)) || {};
    if (pushHash && location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);

    el.detailEmpty.hidden = true;
    el.detailBody.hidden = false;
    el.part.textContent = `PART ${prompt.part} · ${prompt.partTitle}`;
    el.cat.hidden = !prompt.category;
    el.cat.textContent = prompt.category || "";
    el.title.textContent = prompt.title;
    el.benefits.innerHTML = (prompt.benefits || []).map((b) => {
      const [before, after] = b.split("→");
      return after !== undefined
        ? `<li>${escapeHtml(before.trim())} → <b>${escapeHtml(after.trim())}</b></li>`
        : `<li>${escapeHtml(b)}</li>`;
    }).join("");
    el.notice.hidden = !prompt.notice;
    el.notice.textContent = prompt.notice || "";
    el.article.hidden = !prompt.article;
    el.article.textContent = prompt.article || "";

    el.fields.innerHTML = prompt.fields.map((f, i) => {
      const id = `f-${i}`;
      const val = escapeHtml(state.values[f.key] || "");
      const ph = f.example ? `예: ${escapeHtml(f.example)}` : "";
      const showKey = f.label && f.label !== f.key ? `<span class="key">[${escapeHtml(f.key)}]</span>` : "";
      const control = f.multiline
        ? `<textarea id="${id}" data-key="${escapeHtml(f.key)}" placeholder="${ph}" rows="3">${val}</textarea>`
        : `<input id="${id}" data-key="${escapeHtml(f.key)}" placeholder="${ph}" value="${val}">`;
      return `<div class="field" data-key="${escapeHtml(f.key)}"><label for="${id}">${escapeHtml(f.label || f.key)}${showKey}</label>${control}</div>`;
    }).join("");
    el.fields.querySelectorAll("textarea").forEach(autoGrow);

    renderPreview();
    renderList();
    el.layout.dataset.view = "detail";
    el.backBtn.hidden = false;
    window.scrollTo({ top: 0 });
    return true;
  }

  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight + 2, 320) + "px";
  }

  function renderPreview() {
    const p = state.current;
    if (!p) return;
    const { html, missing } = compile(p, state.values);
    el.preview.innerHTML = html;
    const filled = p.fields.filter((f) => (state.values[f.key] || "").trim()).length;
    el.progress.textContent = `${filled} / ${p.fields.length} 입력됨`;
    el.progress.classList.toggle("done", filled === p.fields.length);
    el.missing.hidden = missing.length === 0;
    el.missing.textContent = missing.length ? `미입력 ${missing.length}개는 [확인 필요]로 표시돼요` : "";
    el.fields.querySelectorAll(".field").forEach((row) => {
      row.classList.toggle("filled", !!(state.values[row.dataset.key] || "").trim());
    });
  }

  // ---------- copy (Design §4, §6) ----------
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext !== false) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function copyCurrent() {
    if (!state.current) return;
    const { text, missing } = compile(state.current, state.values);
    const ok = await copyText(text);
    if (ok) {
      el.copyBtn.classList.add("copied");
      el.copyBtn.textContent = "복사됐어요 ✓";
      setTimeout(() => { el.copyBtn.classList.remove("copied"); el.copyBtn.textContent = "프롬프트 복사"; }, 1600);
      toast(missing.length ? `복사됐어요. [확인 필요] ${missing.length}곳을 AI에서 채워주세요` : "복사됐어요. ChatGPT·Claude·Gemini에 붙여 넣으세요");
    } else {
      selectPreview();
      toast("자동 복사가 막혔어요. 선택된 미리보기를 Ctrl+C 로 복사하세요", true);
    }
  }

  function selectPreview() {
    const range = document.createRange();
    range.selectNodeContents(el.preview);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    el.preview.focus();
  }

  // ---------- theme ----------
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  function toggleTheme() {
    const saved = store.get("pb:theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const curDark = saved ? saved === "dark" : systemDark;
    const next = curDark ? "light" : "dark";
    store.set("pb:theme", next);
    applyTheme(next);
  }

  // ---------- events ----------
  el.listBody.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) select(card.dataset.id);
  });
  el.search.addEventListener("input", () => { state.query = el.search.value; renderList(); });
  el.fields.addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.key) return;
    state.values[t.dataset.key] = t.value;
    if (t.tagName === "TEXTAREA") autoGrow(t);
    store.set(valuesKey(state.current.id), state.values);
    renderPreview();
  });
  el.fillBtn.addEventListener("click", () => {
    if (!state.current) return;
    state.current.fields.forEach((f) => {
      if (f.example && !(state.values[f.key] || "").trim()) state.values[f.key] = f.example;
    });
    store.set(valuesKey(state.current.id), state.values);
    select(state.current.id);
    toast("예시 값으로 채웠어요. 내 상황에 맞게 바꿔주세요");
  });
  el.resetBtn.addEventListener("click", () => {
    if (!state.current) return;
    state.values = {};
    store.del(valuesKey(state.current.id));
    select(state.current.id);
    toast("입력값을 지웠어요");
  });
  el.copyBtn.addEventListener("click", copyCurrent);
  el.backBtn.addEventListener("click", () => { el.layout.dataset.view = "list"; });
  el.themeBtn.addEventListener("click", toggleTheme);
  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && (!state.current || state.current.id !== id)) select(id, { pushHash: false });
  });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); el.search.focus(); el.search.select(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); copyCurrent(); }
    if (e.key === "Escape" && document.activeElement === el.search) { el.search.value = ""; state.query = ""; renderList(); }
  });

  // ---------- init ----------
  if (!PROMPTS || !PROMPTS.length) {
    el.detailEmpty.innerHTML = "<p>프롬프트 데이터를 불러오지 못했어요. <code>data/prompts.js</code> 파일이 있는지 확인해주세요.</p>";
    el.listEmpty.hidden = false;
    el.listEmpty.textContent = "데이터 없음";
    return;
  }
  applyTheme(store.get("pb:theme"));
  renderList();
  const initial = decodeURIComponent(location.hash.slice(1));
  if (initial && select(initial, { pushHash: false })) {
    // deep link
  } else if (window.matchMedia("(min-width: 900px)").matches) {
    select(PROMPTS[0].id);
  }
})();
