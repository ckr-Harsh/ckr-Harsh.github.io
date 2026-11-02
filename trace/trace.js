(() => {
  const { P, REDUCE, esc, layerColor, duration, ym, renderIntro, renderPanel, selectedFromHash, setHash, onPick } = window.Common;
  const $ = id => document.getElementById(id);
  const T0 = 2021, T1 = 2027, PLAY_MS = 2400;
  const pct = y => ((y - T0) / (T1 - T0)) * 100;
  const ROLE_COLOR = { intern: "var(--l-people)", mts1: "var(--l-api)", mts2: "var(--l-ai)" };
  const MILESTONES = [["intern", "joined", "end"], ["mts1", "full-time", "start"], ["mts2", "promoted", "mid"]];
  const all = [...P.items, ...P.roles];
  const byId = Object.fromEntries(all.map(s => [s.id, s]));
  const root = { from: P.START, to: P.NOW };
  let mode = P.roles.some(r => r.id === location.hash.slice(1)) ? "role" : "layer";
  let selected = selectedFromHash(all, P.items[0].id);
  let playT = REDUCE ? P.NOW : P.START, raf;

  renderIntro($("intro"), { path: "scan", label: "View as a scan" });

  const span = (s, color, cls = "") => `<div class="span ${cls}${s.to >= P.NOW ? " live" : ""}" data-from="${s.from}" data-to="${s.to}" style="left:${pct(s.from)}%;background:${color};color:${color}"><small>${duration(s)}</small></div>`;
  const row = (s, color, label) => `
    <div class="row${s.id === selected ? " sel" : ""}" data-id="${s.id}" data-from="${s.from}" data-to="${s.to}" tabindex="0" role="button" aria-pressed="${s.id === selected}">
      <div class="name"><span class="dot" style="background:${color}"></span>${esc(label)}</div>
      <div class="lane">${span(s, color)}</div>
    </div>`;

  function render() {
    const list = mode === "layer" ? P.items : P.roles;
    const ticks = [2021, 2022, 2023, 2024, 2025, 2026].map(y => `<span style="left:${pct(y)}%">${y}</span>`).join("");
    const marks = MILESTONES.map(([id, label, align]) => `<span class="ms-label ${align}" style="left:${pct(byId[id].from)}%">${label}</span>
      <button type="button" class="ms${id === selected ? " sel" : ""}" data-id="${id}" style="left:${pct(byId[id].from)}%" aria-label="${esc(byId[id].name)}, ${ym(byId[id].from)}"></button>`).join("");
    let html = `<div class="axis"><div style="padding-left:14px">span</div><div class="ticks">${ticks}</div></div>
      <div class="row" data-from="${root.from}" data-to="${root.to}"><div class="name"><span class="dot" style="background:var(--fg)"></span>GET /harsh</div><div class="lane">${span(root, "var(--fg)", "root")}${marks}</div></div>`;
    if (mode === "layer") {
      for (const l of P.layers) {
        const spans = P.items.filter(i => i.layer === l).sort((a, b) => a.from - b.from);
        if (spans.length) html += `<div class="group" style="color:${layerColor(l)}">${l}</div>` + spans.map(s => row(s, layerColor(l), s.name)).join("");
      }
    } else {
      html += P.roles.map(r => row(r, ROLE_COLOR[r.id], r.name)).join("");
    }
    html += `<div class="head${playT >= P.NOW ? " done" : ""}"></div><div class="cursor"><b></b></div>`;
    $("grid").innerHTML = html;
    $("count").textContent = list.length + 1;
    $("meta").textContent = `${list.length + 1} spans · 2021-03 → now`;
    $("by-layer").setAttribute("aria-pressed", mode === "layer");
    $("by-role").setAttribute("aria-pressed", mode === "role");
    renderPanel($("panel"), byId[selected]);
    paint();
  }

  // Grow every span up to the playhead time.
  function paint() {
    $("grid").style.setProperty("--p", (pct(playT) / 100).toFixed(4));
    for (const el of $("grid").querySelectorAll(".span")) {
      const from = +el.dataset.from, to = Math.min(+el.dataset.to, playT);
      el.style.width = Math.max(0, pct(to) - pct(from)) + "%";
      el.style.visibility = playT >= from ? "visible" : "hidden";
      el.firstElementChild.style.visibility = playT >= +el.dataset.to || playT >= P.NOW ? "visible" : "hidden";
    }
  }

  function play() {
    cancelAnimationFrame(raf);
    if (REDUCE) { playT = P.NOW; $("rec").textContent = "● LIVE"; $("rec").classList.add("off"); return render(); }
    const t0 = performance.now();
    $("rec").textContent = "● REC"; $("rec").classList.remove("off");
    $("grid").querySelector(".head")?.classList.remove("done");
    const tick = now => {
      const k = Math.min(1, (now - t0) / PLAY_MS), e = 1 - Math.pow(1 - k, 2.2);
      playT = P.START + (P.NOW - P.START) * e;
      paint();
      if (k < 1) raf = requestAnimationFrame(tick);
      else { $("rec").textContent = "● LIVE"; $("rec").classList.add("off"); $("grid").querySelector(".head")?.classList.add("done"); }
    };
    raf = requestAnimationFrame(tick);
  }

  // Scrub: hovering the lanes shows a date and dims spans that were not active then.
  $("grid").addEventListener("mousemove", e => {
    const lane = $("grid").querySelector(".lane"); if (!lane) return;
    const r = lane.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    const cursor = $("grid").querySelector(".cursor");
    if (x < 0 || x > 1 || playT < P.NOW) { cursor.classList.remove("on"); clearDim(); return; }
    const y = T0 + x * (T1 - T0);
    $("grid").style.setProperty("--h", x.toFixed(4));
    const rows = $("grid").querySelectorAll(".row[data-id]");
    let active = 0;
    rows.forEach(rw => { const on = y >= +rw.dataset.from && y <= +rw.dataset.to; rw.classList.toggle("dim", !on); active += on; });
    cursor.firstElementChild.textContent = y > P.NOW ? "future" : `${ym(y)} · ${active} active`;
    cursor.classList.add("on");
  });
  const clearDim = () => $("grid").querySelectorAll(".row.dim").forEach(r => r.classList.remove("dim"));
  $("grid").addEventListener("mouseleave", () => { $("grid").querySelector(".cursor")?.classList.remove("on"); clearDim(); });

  $("by-layer").addEventListener("click", () => { mode = "layer"; render(); });
  $("by-role").addEventListener("click", () => { mode = "role"; render(); });
  $("replay").addEventListener("click", () => { playT = P.START; render(); play(); });
  onPick($("grid"), id => { selected = id; setHash(id); render(); });

  render();
  play();
  addEventListener("load", () => setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) $("perf").textContent = `page trace: DOM ready ${Math.round(nav.domContentLoadedEventEnd - nav.startTime)} ms · load ${Math.round(nav.loadEventEnd - nav.startTime)} ms`;
  }));
})();
