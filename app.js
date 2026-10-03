// Design Ref: prompt-builder §2 Option C + consultant-ppt §2 Option C
// vanilla JS, data in window.PROMPTS (+ custom prompts in localStorage), state in hash + localStorage
(function () {
  "use strict";

  const BUILTIN = Array.isArray(window.PROMPTS) ? window.PROMPTS : null;
  const $ = (sel) => document.querySelector(sel);
  const el = {
    layout: $("#layout"),
    listBody: $("#list-body"),
    listEmpty: $("#list-empty"),
    search: $("#search"),
    themeBtn: $("#theme-btn"),
    backBtn: $("#back-btn"),
    profileBtn: $("#profile-btn"),
    profileLabel: $("#profile-label"),
    customBtn: $("#custom-btn"),
    detailEmpty: $("#detail-empty"),
    detailBody: $("#detail-body"),
    part: $("#d-part"),
    cat: $("#d-cat"),
    customBadge: $("#d-custom"),
    title: $("#d-title"),
    benefits: $("#d-benefits"),
    notice: $("#d-notice"),
    stepper: $("#stepper"),
    fields: $("#fields"),
    progress: $("#d-progress"),
    fillBtn: $("#fill-btn"),
    resetBtn: $("#reset-btn"),
    editBtn: $("#edit-btn"),
    preview: $("#preview"),
    copyBtn: $("#copy-btn"),
    prevBtn: $("#prev-btn"),
    nextBtn: $("#next-btn"),
    missing: $("#d-missing"),
    article: $("#d-article"),
    toast: $("#toast"),
    profileDialog: $("#profile-dialog"),
    profileForm: $("#profile-form"),
    profileClear: $("#profile-clear"),
    customDialog: $("#custom-dialog"),
    customForm: $("#custom-form"),
    customHeading: $("#custom-heading"),
    cId: $("#c-id"),
    cTitle: $("#c-title"),
    cCategory: $("#c-category"),
    cTemplate: $("#c-template"),
    cFields: $("#c-fields"),
    cCount: $("#c-count"),
    customDelete: $("#custom-delete"),
    customExport: $("#custom-export"),
    customImport: $("#custom-import"),
  };

  const state = { current: null, values: {}, query: "", profile: {}, custom: [] };
  const PLACEHOLDER = /\{\{(.+?)\}\}/g;
  const SECTION_LABELS = ["역할", "업무 배경", "요청 사항", "출력 형식", "참고 자료", "사용 전 안내"];
  const LABEL_RE = new RegExp(`(^|\\n)(\\[(?:${SECTION_LABELS.join("|")})\\])`, "g");
  const PROJECT_KEYS = {
    client: "클라이언트", industry: "산업·시장", project: "프로젝트 목적·범위",
    audience: "보고 대상·의사결정자", deckType: "보고 유형·분량", tone: "톤·언어",
  };
  const CUSTOM_PART = 99;
  const CUSTOM_PART_TITLE = "내 프롬프트";

  // ---------- storage (tolerate unavailable storage) ----------
  const store = {
    get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { toast("브라우저 저장 공간이 부족하거나 차단됐어요", true); return false; } },
    del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  };
  const valuesKey = (id) => `pb:values:${id}`;

  // ---------- helpers ----------
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const partSort = (a, b) => a.part - b.part || String(a.id).localeCompare(String(b.id), "ko", { numeric: true });

  let toastTimer = null;
  function toast(msg, isError) {
    el.toast.textContent = msg;
    el.toast.classList.toggle("error", !!isError);
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2200);
  }

  function openDialog(d) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
  function closeDialog(d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }

  // ---------- data access (Design consultant-ppt §4) ----------
  function allPrompts() { return [...BUILTIN, ...state.custom].sort(partSort); }
  function findPrompt(id) { return allPrompts().find((p) => p.id === id); }
  function labelOf(prompt) {
    const m = {};
    prompt.fields.forEach((f) => { m[f.key] = f.label || f.key; });
    return m;
  }

  // Plan SC: 값 해석 우선순위 — 사용자 입력 > 프로젝트 정보 > 빈 값
  function resolveValues(prompt, values) {
    const out = {};
    prompt.fields.forEach((f) => {
      let v = (values[f.key] || "").trim();
      if (!v && f.type === "project" && f.projectKey) v = (state.profile[f.projectKey] || "").trim();
      out[f.key] = v;
    });
    return out;
  }

  // ---------- compile ----------
  // Plan SC: 모든 {{키}}가 치환되고, 빈 값은 [확인 필요: 라벨]로 드러난다
  function compile(prompt, values) {
    const labels = labelOf(prompt);
    const missing = [];
    const text = prompt.template.replace(PLACEHOLDER, (_, key) => {
      const v = (values[key] || "").trim();
      if (v) return v;
      const lab = labels[key] || key;
      if (!missing.includes(lab)) missing.push(lab);
      return `[확인 필요: ${lab}]`;
    });
    const html = prompt.template
      .split(/(\{\{.+?\}\})/g)
      .map((chunk) => {
        const m = chunk.match(/^\{\{(.+?)\}\}$/);
        if (!m) return escapeHtml(chunk).replace(LABEL_RE, (_, nl, lab) => `${nl}<span class="label">${lab}</span>`);
        const v = (values[m[1]] || "").trim();
        return v
          ? `<mark>${escapeHtml(v)}</mark>`
          : `<mark class="missing">[확인 필요: ${escapeHtml(labels[m[1]] || m[1])}]</mark>`;
      })
      .join("");
    return { text, html, missing };
  }

  // ---------- search ----------
  function search(query) {
    const q = norm(query);
    const all = allPrompts();
    if (!q) return all;
    return all.filter((p) => {
      const hay = [p.id, p.title, p.category, p.partTitle, ...(p.benefits || []), ...(p.tags || []), ...p.fields.map((f) => f.label || f.key)];
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
    if (!state.query && !byPart.has(CUSTOM_PART)) byPart.set(CUSTOM_PART, { title: CUSTOM_PART_TITLE, items: [] });
    const openPart = state.current ? state.current.part : [...byPart.keys()][0];
    const html = [...byPart.entries()].map(([part, g]) => {
      const open = state.query || part === openPart ? " open" : "";
      const isCustom = part === CUSTOM_PART;
      const cards = g.items.map((p) => {
        const card = `
          <button type="button" class="card" data-id="${escapeHtml(p.id)}" aria-current="${!!(state.current && state.current.id === p.id)}">
            ${p.category ? `<span class="card-cat">${escapeHtml(p.category)}</span>` : ""}
            <span class="card-title">${escapeHtml(p.title)}</span>
          </button>`;
        if (!p.custom) return card;
        return `<div class="card-wrap">${card}
          <div class="card-actions">
            <button type="button" data-action="edit" data-id="${escapeHtml(p.id)}" title="편집">✎</button>
            <button type="button" data-action="delete" data-id="${escapeHtml(p.id)}" title="삭제">✕</button>
          </div></div>`;
      }).join("");
      const cta = isCustom ? `<div class="list-cta"><button type="button" class="ghost" data-action="new">＋ 내 프롬프트 만들기</button></div>` : "";
      const numLabel = isCustom ? `<span class="part-num star">★</span>` : `<span class="part-num">${part}</span>`;
      return `
        <details class="part-group"${open}>
          <summary>${numLabel}${escapeHtml(g.title)}<span class="part-count">${g.items.length}</span></summary>
          <div class="cards">${cards}</div>${cta}
        </details>`;
    }).join("");
    el.listBody.innerHTML = html;
  }

  // ---------- workflow (Design consultant-ppt §4 workflowSiblings / goStep) ----------
  function workflowSiblings(prompt) {
    if (!prompt.workflow) return [];
    return allPrompts().filter((p) => p.workflow && p.workflow.id === prompt.workflow.id).sort((a, b) => a.workflow.step - b.workflow.step);
  }
  function hasValues(id) {
    const v = store.get(valuesKey(id)) || {};
    return Object.values(v).some((x) => (x || "").trim());
  }
  function renderStepper(prompt) {
    const sibs = workflowSiblings(prompt);
    el.stepper.hidden = sibs.length === 0;
    el.prevBtn.hidden = el.nextBtn.hidden = sibs.length === 0;
    if (!sibs.length) return;
    el.stepper.innerHTML = sibs.map((p) => {
      const cls = ["step", p.id === prompt.id ? "current" : "", p.id !== prompt.id && hasValues(p.id) ? "done" : ""].join(" ");
      return `<button type="button" class="${cls}" data-id="${escapeHtml(p.id)}"><span class="step-n">${p.workflow.step}</span><span>${escapeHtml(p.workflow.label)}</span></button>`;
    }).join("");
    const idx = sibs.findIndex((p) => p.id === prompt.id);
    el.prevBtn.disabled = idx <= 0;
    el.nextBtn.disabled = idx >= sibs.length - 1;
  }
  function goStep(delta) {
    const sibs = workflowSiblings(state.current);
    const idx = sibs.findIndex((p) => p.id === state.current.id);
    const target = sibs[idx + delta];
    if (!target) return;
    // carry: same keys from current step into the target when the target is empty
    const tv = store.get(valuesKey(target.id)) || {};
    let carried = 0;
    target.fields.forEach((f) => {
      if (f.type === "previous") return;
      if (!(tv[f.key] || "").trim() && (state.values[f.key] || "").trim()) { tv[f.key] = state.values[f.key]; carried++; }
    });
    if (carried) store.set(valuesKey(target.id), tv);
    select(target.id);
    if (delta > 0) {
      const prevField = target.fields.find((f) => f.type === "previous");
      toast(prevField ? `${target.workflow.step}단계예요. 앞 단계 AI 결과를 맨 위 칸에 붙여 넣으세요` : `${target.workflow.step}단계로 이동했어요`);
    }
  }

  // ---------- detail ----------
  function fieldControl(f, i, val) {
    const id = `f-${i}`;
    const key = escapeHtml(f.key);
    const type = f.type || "text";
    const profileVal = type === "project" && f.projectKey ? (state.profile[f.projectKey] || "").trim() : "";
    let ph = f.example ? `예: ${escapeHtml(f.example)}` : "";
    if (profileVal) ph = escapeHtml(profileVal);
    if (type === "previous" && !f.example) ph = "AI 답변 전체를 붙여 넣으세요";
    const v = escapeHtml(val);
    const multiline = f.multiline || type === "previous";
    let control;
    if (type === "select") {
      const listId = `dl-${i}`;
      control = `<input id="${id}" data-key="${key}" list="${listId}" placeholder="${ph}" value="${v}">
        <datalist id="${listId}">${(f.options || []).map((o) => `<option value="${escapeHtml(o)}"></option>`).join("")}</datalist>`;
    } else if (multiline) {
      control = `<textarea id="${id}" data-key="${key}" placeholder="${ph}" rows="${type === "previous" ? 5 : 3}">${v}</textarea>`;
    } else {
      control = `<input id="${id}" data-key="${key}" placeholder="${ph}" value="${v}">`;
    }
    const badge = type === "project" ? `<span class="auto-badge">${profileVal ? "프로젝트 정보 자동 입력" : "프로젝트 정보에서 채워짐"}</span>` : "";
    const showKey = f.label && f.label !== f.key && type !== "project" ? `<span class="key">[${key}]</span>` : "";
    const hint = f.hint ? `<div class="hint-text">${escapeHtml(f.hint)}</div>` : "";
    const auto = type === "project" && profileVal && !val.trim() ? " auto" : "";
    return `<div class="field ${type}${auto}" data-key="${key}" data-type="${type}"><label for="${id}">${escapeHtml(f.label || f.key)}${showKey}${badge}</label>${hint}${control}</div>`;
  }

  function select(id, { pushHash = true } = {}) {
    const prompt = findPrompt(id);
    if (!prompt) return false;
    state.current = prompt;
    state.values = store.get(valuesKey(id)) || {};
    if (pushHash && location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);

    el.detailEmpty.hidden = true;
    el.detailBody.hidden = false;
    el.part.hidden = !!prompt.custom;
    el.part.textContent = prompt.custom ? "" : `PART ${prompt.part} · ${prompt.partTitle}`;
    el.cat.hidden = !prompt.category;
    el.cat.textContent = prompt.category || "";
    el.customBadge.hidden = !prompt.custom;
    el.editBtn.hidden = !prompt.custom;
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
    renderStepper(prompt);

    // previous-type fields first (Design §5.1)
    const ordered = prompt.fields.map((f, i) => ({ f, i })).sort((a, b) => (b.f.type === "previous") - (a.f.type === "previous"));
    el.fields.innerHTML = ordered.map(({ f, i }) => fieldControl(f, i, state.values[f.key] || "")).join("");
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
    ta.style.height = Math.min(ta.scrollHeight + 2, 360) + "px";
  }

  function renderPreview() {
    const p = state.current;
    if (!p) return;
    const resolved = resolveValues(p, state.values);
    const { html, missing } = compile(p, resolved);
    el.preview.innerHTML = html;
    const filled = p.fields.filter((f) => resolved[f.key]).length;
    el.progress.textContent = `${filled} / ${p.fields.length} 입력됨`;
    el.progress.classList.toggle("done", filled === p.fields.length);
    el.missing.hidden = missing.length === 0;
    el.missing.textContent = missing.length ? `미입력 ${missing.length}개는 [확인 필요]로 표시돼요` : "";
    el.fields.querySelectorAll(".field").forEach((row) => {
      const key = row.dataset.key;
      row.classList.toggle("filled", !!(state.values[key] || "").trim());
      if (row.dataset.type === "project") row.classList.toggle("auto", !!resolved[key] && !(state.values[key] || "").trim());
    });
  }

  // ---------- copy ----------
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext !== false) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }

  async function copyCurrent() {
    if (!state.current) return;
    const { text, missing } = compile(state.current, resolveValues(state.current, state.values));
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
    sel.removeAllRanges(); sel.addRange(range);
    el.preview.focus();
  }

  // ---------- profile (Design consultant-ppt §3.2 pb:project) ----------
  function renderProfileButton() {
    const client = (state.profile.client || "").trim();
    const any = Object.values(state.profile).some((v) => (v || "").trim());
    el.profileBtn.classList.toggle("set", any);
    el.profileLabel.textContent = client || (any ? "프로젝트 정보 ✓" : "프로젝트 정보");
  }
  function openProfile() {
    el.profileForm.querySelectorAll("[data-pkey]").forEach((i) => { i.value = state.profile[i.dataset.pkey] || ""; });
    openDialog(el.profileDialog);
  }
  function saveProfile() {
    const p = {};
    el.profileForm.querySelectorAll("[data-pkey]").forEach((i) => { p[i.dataset.pkey] = i.value.trim(); });
    state.profile = p;
    store.set("pb:project", p);
    renderProfileButton();
    if (state.current) select(state.current.id);
    toast("프로젝트 정보를 저장했어요. 해당 칸에 자동으로 들어가요");
  }

  // ---------- custom prompts (Design consultant-ppt §4 parseCustomTemplate / saveCustom) ----------
  const MULTILINE_HINT = /자료|데이터|내용|배경|목록|결과|원문|초안|예시|리스트|회의록|메모/;
  function parseCustomTemplate(src) {
    const keys = [];
    const template = String(src).replace(/\[([^\[\]\n]{1,60})\]/g, (whole, inner) => {
      const k = inner.trim();
      if (SECTION_LABELS.includes(k)) return whole;
      if (!keys.includes(k)) keys.push(k);
      return `{{${k}}}`;
    });
    const fields = keys.map((k) => ({ key: k, label: k, example: "", multiline: MULTILINE_HINT.test(k) }));
    return { template, fields };
  }
  function templateToEditable(template) { return template.replace(/\{\{(.+?)\}\}/g, "[$1]"); }
  // per-field example/multiline settings typed in the editor (survive re-renders while typing the template)
  let editorFieldMeta = {};
  function readEditorFieldMeta() {
    el.cFields.querySelectorAll(".xfield").forEach((row) => {
      editorFieldMeta[row.dataset.ckey] = {
        example: row.querySelector("[data-cex]").value,
        multiline: row.querySelector("[data-cml]").checked,
      };
    });
  }
  function renderExtracted() {
    readEditorFieldMeta();
    const { fields } = parseCustomTemplate(el.cTemplate.value);
    el.cCount.textContent = fields.length ? `${fields.length}개 · 예시는 입력칸의 안내 문구로 쓰여요` : "";
    el.cFields.innerHTML = fields.length
      ? fields.map((f, i) => {
          const meta = editorFieldMeta[f.key] || { example: "", multiline: f.multiline };
          return `<div class="xfield" data-ckey="${escapeHtml(f.key)}">
            <span class="chip">${escapeHtml(f.key)}</span>
            <input data-cex placeholder="예시 (선택)" value="${escapeHtml(meta.example)}">
            <label class="xcheck"><input type="checkbox" data-cml${meta.multiline ? " checked" : ""}> 여러 줄</label>
          </div>`;
        }).join("")
      : `<span class="chip warn">[대괄호]로 감싼 빈칸이 아직 없어요</span>`;
  }
  function openCustomEditor(prompt) {
    el.cId.value = prompt ? prompt.id : "";
    el.customHeading.textContent = prompt ? "내 프롬프트 편집" : "내 프롬프트 만들기";
    el.cTitle.value = prompt ? prompt.title : "";
    el.cCategory.value = prompt ? prompt.category : "";
    el.cTemplate.value = prompt ? templateToEditable(prompt.template) : "";
    el.customDelete.hidden = !prompt;
    editorFieldMeta = {};
    if (prompt) prompt.fields.forEach((f) => { editorFieldMeta[f.key] = { example: f.example || "", multiline: !!f.multiline }; });
    el.cFields.innerHTML = "";
    renderExtracted();
    openDialog(el.customDialog);
    setTimeout(() => el.cTitle.focus(), 50);
  }
  function saveCustom() {
    const { template, fields } = parseCustomTemplate(el.cTemplate.value.trim());
    const id = el.cId.value || `u-${Date.now().toString(36)}`;
    const existing = state.custom.find((p) => p.id === id);
    // apply example/multiline settings from the editor rows (Design §2.1 "예시 입력")
    readEditorFieldMeta();
    fields.forEach((f) => { const m = editorFieldMeta[f.key]; if (m) { f.example = m.example.trim(); f.multiline = m.multiline; } });
    const prompt = {
      id, part: CUSTOM_PART, partTitle: CUSTOM_PART_TITLE, custom: true,
      category: el.cCategory.value.trim(), title: el.cTitle.value.trim(),
      benefits: [], notice: "", fields, template, article: "",
    };
    if (!prompt.title || !template) return;
    if (existing) Object.assign(existing, prompt); else state.custom.push(prompt);
    if (!store.set("pb:custom", state.custom)) return;
    closeDialog(el.customDialog);
    if (!fields.length) toast("저장했어요. 빈칸이 없어서 그대로 복사만 돼요", false);
    else toast(existing ? "수정했어요" : "내 프롬프트를 추가했어요");
    select(id);
  }
  function deleteCustom(id) {
    const p = state.custom.find((x) => x.id === id);
    if (!p || !confirm(`"${p.title}" 프롬프트를 삭제할까요?`)) return;
    state.custom = state.custom.filter((x) => x.id !== id);
    store.set("pb:custom", state.custom);
    store.del(valuesKey(id));
    closeDialog(el.customDialog);
    if (state.current && state.current.id === id) {
      state.current = null;
      el.detailBody.hidden = true; el.detailEmpty.hidden = false;
      history.replaceState(null, "", location.pathname);
    }
    renderList();
    toast("삭제했어요");
  }
  function exportCustom() {
    if (!state.custom.length) { toast("내보낼 내 프롬프트가 없어요", true); return; }
    const blob = new Blob([JSON.stringify(state.custom, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `my-prompts-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importCustom(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("not array");
        let added = 0;
        arr.forEach((raw) => {
          if (!raw || typeof raw.title !== "string" || typeof raw.template !== "string") return;
          const { template, fields } = parseCustomTemplate(templateToEditable(raw.template));
          const id = typeof raw.id === "string" && raw.id.startsWith("u-") && !state.custom.some((p) => p.id === raw.id) ? raw.id : `u-${Date.now().toString(36)}${added}`;
          if (Array.isArray(raw.fields)) fields.forEach((f) => { const o = raw.fields.find((x) => x && x.key === f.key); if (o) { f.example = String(o.example || ""); f.multiline = !!o.multiline; } });
          state.custom.push({ id, part: CUSTOM_PART, partTitle: CUSTOM_PART_TITLE, custom: true, category: String(raw.category || ""), title: raw.title, benefits: [], notice: "", fields, template, article: "" });
          added++;
        });
        if (!added) throw new Error("empty");
        store.set("pb:custom", state.custom);
        renderList();
        toast(`${added}개를 가져왔어요`);
      } catch { toast("가져올 파일 형식이 올바르지 않아요", true); }
    };
    reader.readAsText(file);
  }

  // ---------- theme ----------
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  function toggleTheme() {
    const saved = store.get("pb:theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = (saved ? saved === "dark" : systemDark) ? "light" : "dark";
    store.set("pb:theme", next); applyTheme(next);
  }

  // ---------- events ----------
  el.listBody.addEventListener("click", (e) => {
    const act = e.target.closest("[data-action]");
    if (act) {
      if (act.dataset.action === "new") openCustomEditor(null);
      if (act.dataset.action === "edit") openCustomEditor(findPrompt(act.dataset.id));
      if (act.dataset.action === "delete") deleteCustom(act.dataset.id);
      return;
    }
    const card = e.target.closest(".card");
    if (card) select(card.dataset.id);
  });
  el.stepper.addEventListener("click", (e) => { const s = e.target.closest(".step"); if (s) select(s.dataset.id); });
  el.prevBtn.addEventListener("click", () => goStep(-1));
  el.nextBtn.addEventListener("click", () => goStep(1));
  el.search.addEventListener("input", () => { state.query = el.search.value; renderList(); });
  el.fields.addEventListener("submit", (e) => e.preventDefault()); // Enter in a single-input form must not reload
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
    const resolved = resolveValues(state.current, state.values);
    state.current.fields.forEach((f) => { if (f.example && !resolved[f.key]) state.values[f.key] = f.example; });
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
  el.editBtn.addEventListener("click", () => { if (state.current && state.current.custom) openCustomEditor(state.current); });
  el.copyBtn.addEventListener("click", copyCurrent);
  el.backBtn.addEventListener("click", () => { el.layout.dataset.view = "list"; });
  el.themeBtn.addEventListener("click", toggleTheme);

  el.profileBtn.addEventListener("click", openProfile);
  el.profileForm.addEventListener("submit", (e) => { e.preventDefault(); saveProfile(); closeDialog(el.profileDialog); });
  el.profileClear.addEventListener("click", () => { el.profileForm.querySelectorAll("[data-pkey]").forEach((i) => { i.value = ""; }); });

  el.customBtn.addEventListener("click", () => openCustomEditor(null));
  el.cTemplate.addEventListener("input", renderExtracted);
  el.customForm.addEventListener("submit", (e) => { e.preventDefault(); saveCustom(); });
  el.customDelete.addEventListener("click", () => { if (el.cId.value) deleteCustom(el.cId.value); });
  el.customExport.addEventListener("click", exportCustom);
  el.customImport.addEventListener("change", () => { const f = el.customImport.files[0]; if (f) importCustom(f); el.customImport.value = ""; });

  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeDialog(b.closest("dialog"))));

  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && (!state.current || state.current.id !== id)) select(id, { pushHash: false });
  });
  document.addEventListener("keydown", (e) => {
    const inDialog = !!e.target.closest("dialog");
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing && !inDialog) { e.preventDefault(); el.search.focus(); el.search.select(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !inDialog) { e.preventDefault(); copyCurrent(); }
    if (e.key === "Escape" && document.activeElement === el.search) { el.search.value = ""; state.query = ""; renderList(); }
  });

  // ---------- init ----------
  if (!BUILTIN || !BUILTIN.length) {
    el.detailEmpty.innerHTML = "<p>프롬프트 데이터를 불러오지 못했어요. <code>data/prompts.js</code> 파일이 있는지 확인해주세요.</p>";
    el.listEmpty.hidden = false;
    el.listEmpty.textContent = "데이터 없음";
    return;
  }
  state.profile = store.get("pb:project") || {};
  state.custom = (store.get("pb:custom") || []).filter((p) => p && p.id && p.template).map((p) => ({ ...p, part: CUSTOM_PART, partTitle: CUSTOM_PART_TITLE, custom: true, fields: p.fields || [], benefits: p.benefits || [] }));
  applyTheme(store.get("pb:theme"));
  renderProfileButton();
  renderList();
  const initial = decodeURIComponent(location.hash.slice(1));
  if (initial && select(initial, { pushHash: false })) {
    // deep link
  } else if (window.matchMedia("(min-width: 900px)").matches) {
    select(BUILTIN[0].id);
  }
})();
