(() => {
  const { P, IMPACT, REDUCE, esc, renderIntro, renderPanel, copyEmail, selectedFromHash, setHash, onPick } = window.Common;
  const $ = id => document.getElementById(id);
  const items = P.items.map((it, i) => ({ ...it, hid: "HC-" + String(i + 1).padStart(2, "0") }));
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const types = ["All", ...new Set(items.map(i => i.type))];
  const count = t => items.filter(i => i.type === t).length;
  let filter = "All", found = 0, scanning = false, timer;
  let selected = selectedFromHash(items, items[0].id);
  // Matches the single-column breakpoint in base.css; there the panel sits under the selected row.
  const panel = $("panel"), panelHome = panel.parentNode, NARROW = matchMedia("(max-width: 860px)");

  renderIntro($("intro"), { path: "trace", label: "View as a trace" });

  /* ---- log + terminal ---- */
  const log = (cls, html) => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; $("log").append(d); $("log").scrollTop = $("log").scrollHeight; };
  const PRE = [
    ["dim", "$ discover --target harsh --deep"],
    ["", "→ resolving github.com/ckr-harsh … ok"],
    ["", "→ probing surfaces: ui · api · engine · ai · mcp · reports · people"],
    ["", "→ fingerprinting stack … angular, typescript, python, node, redis, postgres"]
  ];

  function scan() {
    clearTimeout(timer);
    scanning = true; found = 0; $("log").innerHTML = ""; $("prompt").hidden = true;
    $("state").textContent = "SCANNING"; $("state").classList.remove("done");
    if (REDUCE) { PRE.forEach(([c, t]) => log(c, esc(t))); found = items.length; return finish(); }
    let step = 0;
    const tick = () => {
      if (step < PRE.length) { log(PRE[step][0], esc(PRE[step][1])); step++; timer = setTimeout(tick, 260); return; }
      const it = items[found++];
      log("add", `  + ${it.hid}  <b>${esc(it.name)}</b>  <span class="sev ${it.impact}">${IMPACT[it.impact]}</span>`);
      render(it.id);
      if (found < items.length) timer = setTimeout(tick, 150); else timer = setTimeout(finish, 250);
    };
    render(); tick();
  }

  function finish() {
    scanning = false;
    log("hl", `→ ${count("AI")} AI systems · ${count("System")} platform systems · ${count("Open source")} open source · ${count("People")} people`);
    log("ok", `✓ ${items.length} assets discovered · 0 unmonitored`);
    log("dim", "type help to query the results");
    $("state").textContent = "COMPLETE"; $("state").classList.add("done");
    $("prompt").hidden = false;
    render();
  }

  const HELP = [
    ["ls [type]", "list assets, e.g. ls ai"],
    ["open <n|id>", "show an asset, e.g. open 3"],
    ["filter <type>", "ai · system · open source · people · all"],
    ["whoami", "who is this"],
    ["stack", "languages and tools"],
    ["contact", "copy my email"],
    ["trace", "switch to the trace view"],
    ["rescan · clear", ""]
  ];
  const matchType = q => types.find(t => t.toLowerCase() === q.toLowerCase());
  const findItem = q => items.find(i => i.id === q || i.hid.toLowerCase() === q.toLowerCase() || String(+i.hid.slice(3)) === q);

  function run(raw) {
    const line = raw.trim(); if (!line) return;
    log("cmd", esc(line));
    const [cmd, ...rest] = line.split(/\s+/), arg = rest.join(" ");
    switch (cmd.toLowerCase()) {
      case "help": HELP.forEach(([c, d]) => log("add", `  <b>${esc(c.padEnd(15))}</b>${esc(d)}`)); break;
      case "ls": {
        const t = arg ? matchType(arg) : "All";
        if (!t) { log("err", `no type "${esc(arg)}". try: ${types.slice(1).join(", ").toLowerCase()}`); break; }
        items.filter(i => t === "All" || i.type === t).forEach(i => log("add", `  ${i.hid}  <b>${esc(i.name)}</b>`));
        break;
      }
      case "open": case "cat": {
        const it = findItem(arg);
        if (!it) { log("err", `not found: ${esc(arg || "?")}. try open 1`); break; }
        if (filter !== "All" && it.type !== filter) filter = "All";
        select(it.id); log("ok", `→ opened ${it.hid} ${esc(it.name)}`); break;
      }
      case "filter": {
        const t = matchType(arg || "all");
        if (!t) { log("err", `no type "${esc(arg)}"`); break; }
        filter = t; render(); log("ok", `→ showing ${t === "All" ? "all assets" : t.toLowerCase()}`); break;
      }
      case "whoami": log("add", `  <b>${esc(P.profile.name)}</b> · ${esc(P.profile.role)} @ ${esc(P.profile.company)}`); log("add", "  " + esc(P.profile.summary)); break;
      case "stack": log("add", "  " + esc([...new Set(items.flatMap(i => i.stack))].join(" · "))); break;
      case "contact": case "email": copyEmail().then(ok => log("ok", `→ ${esc(P.profile.email)} ${ok ? "copied to clipboard" : "(select and copy)"}`)); break;
      case "trace": location.href = "../trace/" + (location.hash || ""); break;
      case "rescan": scan(); break;
      case "clear": $("log").innerHTML = ""; break;
      case "sudo": log("err", "nice try. this incident will be reported."); break;
      default: log("err", `command not found: ${esc(cmd)} · type help`);
    }
  }
  const past = []; let hi = 0;
  $("prompt").addEventListener("submit", e => { e.preventDefault(); const v = $("cmd").value; if (v.trim()) { past.push(v); hi = past.length; } $("cmd").value = ""; run(v); });
  $("cmd").addEventListener("keydown", e => {
    if (e.key === "ArrowUp" && hi > 0) { $("cmd").value = past[--hi]; e.preventDefault(); }
    if (e.key === "ArrowDown") { hi = Math.min(past.length, hi + 1); $("cmd").value = past[hi] || ""; e.preventDefault(); }
  });
  $("console").addEventListener("click", () => { if (!$("prompt").hidden && !getSelection().toString()) $("cmd").focus({ preventScroll: true }); });

  /* ---- table ---- */
  function select(id) {
    selected = id; setHash(id); render();
    if (NARROW.matches) $("rows").querySelector(".sel")?.scrollIntoView({ block: "start", behavior: REDUCE ? "auto" : "smooth" });
  }

  function render(fresh) {
    const visible = items.slice(0, found);
    $("filters").innerHTML = `<span class="label">filter</span>` + types.map(t =>
      `<button type="button" class="chip" data-f="${esc(t)}" aria-pressed="${t === filter}">${esc(t)}</button>`).join("");
    const rows = visible.filter(i => filter === "All" || i.type === filter);
    $("progress").style.width = (found / items.length * 100) + "%";
    $("meta").textContent = `${found}/${items.length} assets`;
    const sev = ["high", "med", "low"].map(s => [s, visible.filter(i => i.impact === s).length]);
    $("sevbar").innerHTML = sev.map(([s, n]) => `<span style="flex-grow:${n};background:var(--${{ high: "crit", med: "warn", low: "accent" }[s]})" title="${n} ${IMPACT[s].toLowerCase()}"></span>`).join("");
    $("stats").innerHTML = scanning
      ? sev.map(([s, n]) => `<span><b>${n}</b> ${IMPACT[s].toLowerCase()}</span>`).join("")
      : P.profile.stats.map(s => `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>`).join("");
    if (!rows.length) {
      $("rows").innerHTML = `<tr class="empty"><td colspan="5">${scanning ? "probing…" : "nothing matches this filter"}</td></tr>`;
      panelHome.append(panel);
      panel.innerHTML = `<span class="lbl">waiting for results</span>`;
      return;
    }
    const sel = rows.some(i => i.id === selected) ? selected : rows[0].id, narrow = NARROW.matches;
    $("rows").innerHTML = rows.map(i => `
      <tr data-id="${i.id}" tabindex="0" class="${i.id === sel ? "sel" : ""}${i.id === fresh ? " new" : ""}" aria-selected="${i.id === sel}">
        <td class="id">${i.hid}</td>
        <td><b>${esc(i.name)}</b></td>
        <td class="type">${esc(i.type)}</td>
        <td><span class="sev ${i.impact}">${IMPACT[i.impact]}</span></td>
        <td class="status${i.id === fresh ? " probe" : ""}">${i.id === fresh ? "probing…" : i.to >= P.NOW ? "● running" : "shipped"}</td>
      </tr>${narrow && i.id === sel ? `<tr class="detail"><td colspan="5"></td></tr>` : ""}`).join("");
    (narrow ? $("rows").querySelector(".detail td") : panelHome).append(panel);
    renderPanel(panel, byId[sel]);
  }

  $("filters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; render(); } });
  onPick($("rows"), select);
  NARROW.addEventListener("change", () => render());
  addEventListener("hashchange", () => { selected = selectedFromHash(items, selected); render(); });

  scan();
  addEventListener("load", () => setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) $("perf").textContent = `this page loaded in ${Math.round(nav.loadEventEnd - nav.startTime)} ms`;
  }));
})();
