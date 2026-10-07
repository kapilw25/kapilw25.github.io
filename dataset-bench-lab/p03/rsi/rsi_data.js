// Shared data for the two RSI dashboards (loop.html, rounds.html): the cliff search read as RRSI-style rounds
// (arXiv 2609.24972). Live source: bench/results/cliff_iterations.jsonl through the local server (re-read every 10 s);
// fallback: snapshot.js, written by docs/build_page.py at each build. Each row's "dash" block comes from
// bench/agentwalk/rsi_dash.py (backfill) or is written with the row.
(function () {
  var LIVE = "../../bench/results/cliff_iterations.jsonl";
  var TARGET = 47, DELTA = 10;                 // cliff depth target: 80% at 1-2 rooms to 33% at the longest; noise band in points
  var PARTS = [["scene", "scene drawn"], ["state", "state carried"], ["reading", "camera"], ["choices", "answer choices"],
               ["resync", "re-sync gates"], ["load", "length + load"], ["memory", "memory rules"]];
  var GATE = {base: "base harness", accepted: "accepted: new deepest cliff", unconfirmed: "fall measured, not admitted yet", no_gain: "no measured fall", screen: "killed at the single-step test",
              screen_pass: "passed the single-step test", critic: "stopped by the leak check", void: "void (stopped or invalid)",
              measure: "measurement, no proposal", running: "running"};

  function parse(text) {
    return text.split("\n").filter(function (l) { return l.trim(); }).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  }

  function derive(rows) {
    var best = null, stall = 0, out = [], blocked = {critic: 0, screen: 0, void: 0, no_gain: 0}, accepted = 0;
    rows.forEach(function (r, i) {
      var d = r.dash || {gate: r.status === "running" ? "running" : "measure", parts: []};
      if (d.gate === "base" && d.depth != null) best = d.depth;
      var newBest = false;
      if (d.gate === "accepted" && d.depth != null) { best = d.depth; newBest = true; accepted++; }
      if (blocked[d.gate] != null) blocked[d.gate]++;
      if (d.eval === "walk" || d.eval === "test") stall = newBest ? 0 : stall + 1;
      out.push({i: i + 1, id: r.iter, when: (r.date || "") + " " + (r.time_pdt || ""), kind: r.kind || "", hyp: r.hypothesis || "",
                settings: r.settings || {}, scores: r.scores || {}, cause: r.cause || "", next: r.next_steps || [], evidence: r.evidence || r.run || "",
                cost: r.cost_usd, status: r.status || "", late: r.logged_late || null, d: d, best: best, newBest: newBest, stall: stall,
                ledger: i});
    });
    var tried = {};
    out.forEach(function (x) { (x.d.parts || []).forEach(function (p) { tried[p] = true; }); });
    return {rounds: out, blocked: blocked, accepted: accepted, best: best, tried: tried,
            spent: rows.reduce(function (a, r) { return a + (r.cost_usd || 0); }, 0)};
  }

  function load(cb) {
    fetch(LIVE + "?t=" + Date.now(), {cache: "no-store"}).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.text();
    }).then(function (t) { cb(derive(parse(t)), "live"); })
      .catch(function () { cb(derive(window.RSI_SNAPSHOT || []), "snapshot"); });
  }

  function theme() {
    var t = new URLSearchParams(location.search).get("theme");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  }

  window.RSI = {load: load, derive: derive, TARGET: TARGET, DELTA: DELTA, PARTS: PARTS, GATE: GATE, theme: theme,
                esc: function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[m]; }); }};
})();

// The left filter panel for the RSI pages (decided 2026-10-06): Amazon rule, as on the main dashboard - nothing ticked =
// everything, ticks in one group combine with OR, groups combine with AND; counts are what ticking that box would show.
//   RSI.panel(el, groups, sel, onChange): groups = [{k, l, items: [{v, l, match(row)}]}], rows filtered by RSI.pass(row, groups, sel)
(function () {
  var more = {};
  function pass(row, groups, sel, skip) {
    return groups.every(function (g) {
      if (g.k === skip || !(sel[g.k] || []).length) return true;
      return g.items.some(function (it) { return sel[g.k].indexOf(it.v) >= 0 && it.match(row); });
    });
  }
  function panel(el, rows, groups, sel, onChange, facts) {
    var any = groups.some(function (g) { return (sel[g.k] || []).length; }), e = RSI.esc;
    var h = '<div class="sd-h"><span>FILTERS</span>' + (any ? '<button type="button" data-clear="*">Clear all</button>' : "") + "</div>";
    if (facts && facts.length) h += '<div class="sd-facts">' + facts.map(function (f) { return "<b>" + e(f[0]) + "</b> " + e(f[1]); }).join(" · ") + "</div>";
    groups.forEach(function (g) {
      var on = sel[g.k] || [], items = g.items.map(function (it) {
        return {v: it.v, l: it.l, on: on.indexOf(it.v) >= 0, n: rows.filter(function (r) { return pass(r, groups, sel, g.k) && it.match(r); }).length};
      }), show = items;
      if (items.length > 7 && !more[g.k]) {
        show = items.filter(function (it) { return it.on || it.n; }).concat(items.filter(function (it) { return !(it.on || it.n); })).slice(0, 6);
        items.forEach(function (it) { if (it.on && show.indexOf(it) < 0) show.push(it); });
      }
      h += '<div class="sd-g"><h4><span>' + e(g.l) + "</span>" + (on.length ? '<button class="clr" type="button" data-clear="' + e(g.k) + '">Clear</button>' : "") + "</h4>" +
        show.map(function (it) {
          return '<label class="' + (it.n || it.on ? "" : "zero") + '"><input type="checkbox" data-g="' + e(g.k) + '" data-v="' + e(it.v) + '"' + (it.on ? " checked" : "") +
            "> <span>" + e(it.l) + '</span><span class="n">' + it.n + "</span></label>";
        }).join("") +
        (items.length > 7 ? '<button class="sd-more" type="button" data-more="' + e(g.k) + '">' + (more[g.k] ? "▲ See less" : "▼ See more (" + (items.length - show.length) + ")") + "</button>" : "") + "</div>";
    });
    el.innerHTML = h;
    el.onchange = function (ev) {
      var b = ev.target; if (!b.matches("input[data-g]")) return;
      var k = b.getAttribute("data-g"), v = b.getAttribute("data-v"), list = sel[k] = sel[k] || [], i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1); else list.push(v); onChange();
    };
    el.onclick = function (ev) {
      var m = ev.target.closest("[data-more]"), c = ev.target.closest("[data-clear]");
      if (m) { more[m.getAttribute("data-more")] = !more[m.getAttribute("data-more")]; onChange(); return; }
      if (!c) return; var k = c.getAttribute("data-clear");
      if (k === "*") Object.keys(sel).forEach(function (x) { sel[x] = []; }); else sel[k] = [];
      onChange();
    };
  }
  var css = ".sd-wrap{display:grid;grid-template-columns:230px minmax(0,1fr);gap:16px;align-items:start}" +
    ".side{position:sticky;top:8px;max-height:calc(100vh - 16px);overflow:auto;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:10px 12px;font-size:13px}" +
    ".sd-h{display:flex;justify-content:space-between;align-items:center;font-weight:700;letter-spacing:.05em;margin:0 0 6px}" +
    ".sd-h button,.sd-g button.clr,.sd-more{font:inherit;font-size:12px;font-weight:400;letter-spacing:0;background:none;border:0;color:var(--accent);cursor:pointer;padding:0}" +
    ".sd-facts{color:var(--muted);font-size:12px;margin:0 0 8px;line-height:1.55}.sd-facts b{color:var(--ink)}" +
    ".sd-g{border-top:1px solid var(--line);padding:8px 0 4px}.sd-g h4{font-size:13px;margin:0 0 4px;display:flex;justify-content:space-between;align-items:baseline}" +
    ".sd-g label{display:flex;align-items:flex-start;gap:6px;padding:2px 0;cursor:pointer;line-height:1.3}.sd-g label input{margin:2px 0 0}" +
    ".sd-g label .n{margin-left:auto;padding-left:6px;color:var(--muted);font-variant-numeric:tabular-nums}.sd-g label.zero{opacity:.45}" +
    "@media (max-width:820px){.sd-wrap{grid-template-columns:1fr}.side{position:static;max-height:none}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  RSI.panel = panel; RSI.pass = pass;
})();
