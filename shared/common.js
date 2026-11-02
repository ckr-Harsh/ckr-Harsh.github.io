// Helpers shared by /scan and /trace: header, detail panel, deep links.
window.Common = (() => {
  const P = window.PORTFOLIO;
  const IMPACT = { high: "HIGH", med: "MEDIUM", low: "LOW" };
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const layerColor = l => `var(--l-${l})`;
  const duration = s => { const d = s.to - s.from; return d < 1 ? Math.max(1, Math.round(d * 12)) + "mo" : d.toFixed(1) + "y"; };
  const year = y => y >= P.NOW ? "now" : String(Math.floor(y));
  const ym = y => `${Math.floor(y)}-${String(Math.min(12, Math.floor((y % 1) * 12) + 1)).padStart(2, "0")}`;

  // Scrambles text into place left to right, like a value being decrypted.
  function decrypt(el, text, ms = 900) {
    if (REDUCE) { el.textContent = text; return; }
    const glyphs = "#%&$@01ABCDEFX/\\<>";
    const t0 = performance.now();
    const tick = now => {
      const k = Math.min(1, (now - t0) / ms), done = Math.floor(k * text.length);
      el.innerHTML = esc(text.slice(0, done)) + `<span class="scr">${[...text.slice(done)].map(c => c === " " ? " " : glyphs[Math.random() * glyphs.length | 0]).join("")}</span>`;
      if (k < 1) requestAnimationFrame(tick); else el.textContent = text;
    };
    requestAnimationFrame(tick);
  }

  function renderIntro(el, otherView) {
    const p = P.profile;
    el.innerHTML = `
      <span class="eyebrow">${esc(p.role)} · ${esc(p.company)} · ${esc(p.location)}</span>
      <h1 aria-label="${esc(p.name)}"></h1>
      <p>${esc(p.summary)}</p>
      <div class="contact">
        <span id="email">${esc(p.email)}</span><button type="button" id="copy">copy</button>
        ${p.links.map(l => `<a href="${l.url}" rel="noopener">${l.label}</a>`).join("")}
        <a class="switch-link" href="../${otherView.path}/">${esc(otherView.label)} →</a>
      </div>`;
    decrypt(el.querySelector("h1"), p.name);
    el.querySelector("#copy").addEventListener("click", e => copyEmail(e.target));
  }

  async function copyEmail(btn) {
    try { await navigator.clipboard.writeText(P.profile.email); if (btn) btn.textContent = "copied"; return true; }
    catch { getSelection().selectAllChildren(document.getElementById("email")); if (btn) btn.textContent = "selected"; return false; }
    finally { if (btn) setTimeout(() => (btn.textContent = "copy"), 1500); }
  }

  // Detail panel for an item or a role (roles have no type/impact/layer).
  let lastPanel = null;
  function renderPanel(el, s) {
    const head = s.layer ? `${esc(s.type)} · ${esc(s.layer)}` : "role";
    el.innerHTML = `
      <span class="lbl" style="color:${s.layer ? layerColor(s.layer) : "var(--accent)"}">${head}</span>
      <h2>${esc(s.name)}</h2>
      <dl class="kv">
        ${s.impact ? `<dt>impact</dt><dd><span class="sev ${s.impact}">${IMPACT[s.impact]}</span></dd>` : ""}
        <dt>active</dt><dd>${year(s.from)} → ${year(s.to)} · ${duration(s)}</dd>
        <dt>status</dt><dd style="color:${s.to >= P.NOW ? "var(--ok)" : "var(--muted)"}">${s.to >= P.NOW ? "● running" : "shipped"}</dd>
      </dl>
      <div><div class="lbl">problem</div><p>${esc(s.problem)}</p></div>
      <div><div class="lbl">what I did</div><p>${esc(s.did)}</p></div>
      <div class="outcome"><div class="lbl">outcome</div><p><b>${esc(s.outcome)}</b></p></div>
      <div class="tags">${s.stack.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      ${s.links ? `<div class="links">${s.links.map(l => `<a href="${l.url}" rel="noopener">${l.label} ↗</a>`).join("")}</div>` : ""}`;
    if (lastPanel !== s.id) { el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); lastPanel = s.id; }
  }

  // Row/span selection via #id so a single item can be linked directly.
  const selectedFromHash = (list, fallback) => list.find(s => s.id === location.hash.slice(1))?.id || fallback;
  const setHash = id => history.replaceState(null, "", "#" + id);

  // Enter/Space activates any [data-id] element inside root.
  function onPick(root, fn) {
    root.addEventListener("click", e => { const r = e.target.closest("[data-id]"); if (r) fn(r.dataset.id); });
    root.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const r = e.target.closest("[data-id]"); if (!r) return;
      e.preventDefault(); fn(r.dataset.id);
      root.querySelector(`[data-id="${r.dataset.id}"]`)?.focus();
    });
  }

  return { P, IMPACT, REDUCE, esc, layerColor, duration, ym, renderIntro, renderPanel, copyEmail, selectedFromHash, setHash, onPick };
})();
