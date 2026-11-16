// quiz.js: small engine for offline tests. A test page sets window.TEST = {...} and then loads this file.
// Question types: mc (choice, options may be graphs), num (number), text (word or phrase),
// table (fill in cells), plot (tap points into a grid). Any question can show a graph (fig) or an info table.
(function () {
"use strict";
const T = window.TEST;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = h => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const KEY = "quiz:" + T.key;
// English interface for bilingual subjects (BiLi) and English tests: set ui: "en" in window.TEST.
const EN = {
  check: "Check", next: "Next", hint: "Hint", skip: "I don't know", pad: "Notepad", clear: "Clear",
  points: "points", right: "Correct!", wrong: "Not quite.", again: "Not right yet. Try again.",
  againHint: "Not right yet. Look at the hint and try again.",
  tableAgain: "The red fields are not right yet. Correct them.",
  plotAgain: "The red points are wrong or some points are missing. Tap a point to remove it.",
  solution: "Answer", yours: "Your answer", accent: "Correct, but check the accents:", typo: "Almost, check the spelling:",
  plotHelp: "Tap the crossing points of the grid to set points.", plotClear: "Clear points",
  endEyebrow: "Test finished", redo: "Practise mistakes", restart: "Start again", allAgain: "Do it all again",
  practise: "Practise these", resumed: "You are continuing where you stopped.", listen: "Listen",
  placeholder: "Type your answer …", ofFirst: "right on the first try", of: "of", sure: "Sure? Your progress will be lost.",
  grades: ["Excellent!", "Very good!", "Well done!", "Keep practising, you can do it!", "Practice makes perfect. Try again with hints!"]
};
const L = Object.assign({
  check: "Prüfen", next: "Weiter", hint: "Tipp", skip: "Weiß ich nicht", pad: "Notizblock", clear: "Löschen",
  points: "Punkte", right: "Richtig!", wrong: "Leider falsch.", again: "Noch nicht richtig. Versuch es nochmal.",
  againHint: "Noch nicht richtig. Schau dir den Tipp an und versuch es nochmal.",
  tableAgain: "Die roten Felder stimmen noch nicht. Verbessere sie.",
  plotAgain: "Die roten Punkte sitzen falsch oder es fehlen noch Punkte. Tippe einen Punkt an, um ihn zu entfernen.",
  solution: "Lösung", yours: "Deine Antwort", accent: "Richtig, aber achte auf die Akzente:", typo: "Fast richtig geschrieben:",
  plotHelp: "Tippe auf die Kreuzungspunkte im Gitter, um Punkte zu setzen.", plotClear: "Punkte löschen",
  endEyebrow: "Test geschafft", redo: "Fehler wiederholen", restart: "Von vorn beginnen", allAgain: "Nochmal alles",
  practise: "Das solltest du noch üben", resumed: "Du machst da weiter, wo du aufgehört hast.", listen: "Anhören",
  placeholder: "Antwort eingeben …", ofFirst: "beim ersten Versuch richtig", of: "von", sure: "Wirklich? Dein Stand geht verloren.",
  grades: ["Hervorragend!", "Sehr gut!", "Gut gemacht!", "Weiter üben, du schaffst das!", "Übung macht den Meister. Nochmal mit Tipps!"]
}, T.ui === "en" ? EN : {}, T.labels || {});
const TOUCH = (() => { try { return matchMedia("(hover: none) and (pointer: coarse)").matches; } catch (e) { return false; } })();

// ---------- numbers ----------
function parseNum(s) {
  s = String(s).trim().replace(/\s+/g, "").replace(/−/g, "-");
  s = s.replace(/^[^\d+\-.,]+/, "").replace(/[^\d.,/]+$/, "");
  const fr = s.match(/^(-?\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
  if (fr) return parseNum(fr[1]) / parseNum(fr[2]);
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");   // 1.250 = twelve hundred fifty
  return s && /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}
const fmt = n => Number(Number(n).toFixed(6)).toLocaleString("de-DE", { maximumFractionDigits: 6 });
function numOk(v, a, tol) {
  const x = parseNum(v);
  if (isNaN(x)) return false;
  return Math.abs(x - a) <= (tol != null ? tol : Math.max(1e-9, Math.abs(a) * 0.001));
}

// ---------- text ----------
const deacc = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const tnorm = s => String(s).toLowerCase().replace(/[’`´]/g, "'").replace(/[.,!?;:¡¿"“”„()]/g, " ").replace(/\s+/g, " ").trim();
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
  return p[n];
}
function textJudge(v, q) {
  const n = tnorm(v), acc = q.accept.map(tnorm);
  if (acc.includes(n)) return "exact";
  if (acc.some(a => deacc(a) === deacc(n))) return "accent";
  if (acc.some(a => a.length >= 5 && lev(deacc(a), deacc(n)) <= 1)) return "typo";
  return "";
}

// ---------- graphs ----------
let gid = 0;
function geom(g) {
  const W = g.w || 360, H = g.h || 270;
  const l = g.small ? 26 : 44, r = 14, t = g.yl && !g.small ? 26 : 12, b = g.xl && !g.small ? 42 : 26;
  const [x0, x1] = g.x, [y0, y1] = g.y;
  const X = x => l + (x - x0) / (x1 - x0) * (W - l - r);
  const Y = y => H - b - (y - y0) / (y1 - y0) * (H - b - t);
  const inv = (px, py) => [x0 + (px - l) / (W - l - r) * (x1 - x0), y0 + (H - b - py) / (H - b - t) * (y1 - y0)];
  return { g, W, H, l, r, t, b, x0, x1, y0, y1, X, Y, inv, id: "g" + (++gid) };
}
function fnPath(G, f, from, to) {
  const a = from != null ? from : G.x0, z = to != null ? to : G.x1, N = 220, lo = G.y0 - (G.y1 - G.y0), hi = G.y1 + (G.y1 - G.y0);
  let d = "", pen = false;
  for (let k = 0; k <= N; k++) {
    const x = a + (z - a) * k / N, y = f(x);
    if (!isFinite(y) || y < lo || y > hi) { pen = false; continue; }
    d += (pen ? "L" : "M") + G.X(x).toFixed(1) + " " + G.Y(y).toFixed(1); pen = true;
  }
  return d;
}
function graphSVG(G, extra) {
  const g = G.g, sx = g.sx || 1, sy = g.sy || 1, eps = 1e-9;
  let s = '<svg viewBox="0 0 ' + G.W + " " + G.H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(g.label || "Koordinatensystem") + '">';
  s += '<defs><clipPath id="' + G.id + '"><rect x="' + G.l + '" y="' + G.t + '" width="' + (G.W - G.l - G.r) + '" height="' + (G.H - G.t - G.b) + '"/></clipPath></defs>';
  const nx = Math.round((G.x1 - G.x0) / sx), ny = Math.round((G.y1 - G.y0) / sy);
  for (let i = 0; i <= nx; i++) { const x = G.X(G.x0 + i * sx); s += '<line class="g-grid" x1="' + x + '" y1="' + G.t + '" x2="' + x + '" y2="' + (G.H - G.b) + '"/>'; }
  for (let i = 0; i <= ny; i++) { const y = G.Y(G.y0 + i * sy); s += '<line class="g-grid" x1="' + G.l + '" y1="' + y + '" x2="' + (G.W - G.r) + '" y2="' + y + '"/>'; }
  const ax = G.y0 <= 0 && G.y1 >= 0 ? G.Y(0) : G.Y(G.y0), ay = G.x0 <= 0 && G.x1 >= 0 ? G.X(0) : G.X(G.x0);
  s += '<line class="g-axis" x1="' + G.l + '" y1="' + ax + '" x2="' + (G.W - G.r + 6) + '" y2="' + ax + '"/>';
  s += '<line class="g-axis" x1="' + ay + '" y1="' + (G.t - 6) + '" x2="' + ay + '" y2="' + (G.H - G.b) + '"/>';
  if (!g.nolabels) {
    const kx = g.lx || Math.max(1, Math.ceil(nx / (g.small ? 4 : 10))), ky = g.ly || Math.max(1, Math.ceil(ny / (g.small ? 4 : 8)));
    for (let i = 0; i <= nx; i += kx) { const v = G.x0 + i * sx; s += '<text class="g-txt" text-anchor="middle" x="' + G.X(v) + '" y="' + (ax + 15) + '">' + fmt(v) + "</text>"; }
    for (let i = ky; i <= ny; i += ky) { const v = G.y0 + i * sy; if (Math.abs(v) < eps) continue; s += '<text class="g-txt" text-anchor="end" x="' + (ay - 5) + '" y="' + (G.Y(v) + 4) + '">' + fmt(v) + "</text>"; }
  }
  if (g.xl && !g.small) s += '<text class="g-lab" text-anchor="end" x="' + (G.W - G.r) + '" y="' + (G.H - 6) + '">' + esc(g.xl) + "</text>";
  if (g.yl && !g.small) s += '<text class="g-lab" text-anchor="start" x="' + 4 + '" y="' + 14 + '">' + esc(g.yl) + "</text>";
  s += '<g clip-path="url(#' + G.id + ')">';
  (g.help || []).forEach(([x, y]) => { s += '<path class="g-help" d="M' + G.X(x) + " " + ax + "V" + G.Y(y) + "H" + ay + '"/>'; });
  (g.fns || []).forEach(fn => { s += '<path class="g-fn ' + (fn.cls || "") + '" d="' + fnPath(G, fn.f, fn.from, fn.to) + '"/>'; });
  s += "</g>";
  (g.pts || []).forEach(p => {
    s += '<circle class="g-pt" cx="' + G.X(p[0]) + '" cy="' + G.Y(p[1]) + '" r="' + (g.small ? 3.5 : 4.5) + '"/>';
    if (p[2]) s += '<text class="g-lab" x="' + (G.X(p[0]) + 7) + '" y="' + (G.Y(p[1]) - 7) + '">' + esc(p[2]) + "</text>";
  });
  (g.labels || []).forEach(([x, y, t]) => { s += '<text class="g-lab" x="' + G.X(x) + '" y="' + G.Y(y) + '">' + esc(t) + "</text>"; });
  return s + (extra || "") + "</svg>";
}
const graph = g => graphSVG(geom(g));

// ---------- tables ----------
function tableHTML(tb, live) {
  let h = '<div class="tblwrap"><table class="qtable">';
  if (tb.head) h += "<tr>" + tb.head.map((c, i) => "<th" + (i ? ' style="text-align:center"' : "") + ">" + c + "</th>").join("") + "</tr>";
  tb.rows.forEach((row, r) => {
    h += "<tr>" + row.map((c, i) => {
      const tag = i === 0 && !tb.plain ? "th" : "td";
      if (c && typeof c === "object") return "<" + tag + ">" + (live ? '<input ' + (c.t ? 'class="word" autocapitalize="off" spellcheck="false"' : 'inputmode="decimal"') +
        ' autocomplete="off" autocorrect="off" data-r="' + r + '" data-c="' + i + '" aria-label="Feld">' : "") + "</" + tag + ">";
      return "<" + tag + ">" + c + "</" + tag + ">";
    }).join("") + "</tr>";
  });
  return h + "</table></div>";
}
function tableCells(q) {
  const out = [];
  q.table.rows.forEach((row, r) => row.forEach((c, i) => { if (c && typeof c === "object") out.push({ r, i, c, el: document.querySelector('#area input[data-r="' + r + '"][data-c="' + i + '"]') }); }));
  return out;
}
// A cell is {a: number} or {t: ["word", "variant"]}.
const cellOk = (x) => x.c.t ? !!textJudge(x.el.value, { accept: x.c.t }) : numOk(x.el.value, x.c.a, x.c.tol);
const cellShow = (c) => c.show || (c.t ? c.t[0] : fmt(c.a));

// ---------- page ----------
const app = document.querySelector(".wrap") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "wrap" }));
app.innerHTML =
  '<header><span class="eyebrow">' + esc(T.eyebrow || "") + "</span><h1>" + esc(T.title) + "</h1>" + (T.intro ? '<p class="small" style="margin:4px 0 0">' + T.intro + "</p>" : "") + "</header>" +
  '<p class="small" id="resumed" hidden style="margin:0">' + esc(L.resumed) + "</p>" +
  '<div class="progress"><span id="pos"></span><div class="bar"><span id="barfill"></span></div><span id="pts"></span></div>' +
  '<article class="card" id="qcard"><div class="sign"><div class="meta"><span class="chip" id="c-part"></span></div><div class="prompt" id="prompt"></div></div>' +
  '<div class="edge" aria-hidden="true"></div><div class="body">' +
  '<div class="figure" id="fig" hidden></div><div id="info" hidden></div><div id="area"></div>' +
  '<div class="pad" id="pad" hidden><canvas></canvas><button class="btn" id="padClear">' + esc(L.clear) + "</button></div>" +
  '<div class="hintbox" id="hintbox" hidden></div><div class="fb" id="fb" hidden></div>' +
  '<div class="actions"><button class="btn ghost" id="padBtn" style="margin-right:auto">' + esc(L.pad) + "</button>" +
  '<button class="btn" id="hintBtn">' + esc(L.hint) + '</button><button class="btn ghost" id="skipBtn">' + esc(L.skip) + "</button>" +
  '<button class="btn primary" id="checkBtn">' + esc(L.check) + '</button><button class="btn primary" id="nextBtn" hidden>' + esc(L.next) + "</button></div>" +
  "</div></article>" +
  '<article class="card" id="endcard" hidden><div class="body end" id="endbody"></div></article>' +
  '<div><button class="btn ghost" id="restart">' + esc(L.restart) + "</button></div>";

const QS = T.questions;
let S, Q;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function newRun(order) {
  S = { n: QS.length, order: order || (T.shuffle ? shuffle(QS.map((_, i) => i)) : QS.map((_, i) => i)), i: 0, pts: 0, max: 0, first: {}, rep: {} };
  save(); $("#resumed").hidden = true; render();
}
const save = () => store.set(KEY + ":state", S);
const ptsText = n => fmt(n) + " " + L.points;
const cur = () => QS[S.order[S.i]];

function render() {
  if (S.i >= S.order.length) return renderEnd();
  $("#endcard").hidden = true; $("#qcard").hidden = false;
  const q = cur();
  Q = { tries: 0, hint: false, answered: false, user: new Map() };
  $("#prompt").innerHTML = q.prompt + (q.sub ? "<small>" + q.sub + "</small>" : "");
  $("#c-part").textContent = q.part || T.subject || ""; $("#c-part").hidden = !(q.part || T.subject);
  $("#pos").textContent = (S.i + 1) + " / " + S.order.length;
  $("#barfill").style.width = (100 * S.i / S.order.length) + "%";
  $("#pts").textContent = ptsText(S.pts);
  $("#fig").hidden = !q.fig; $("#fig").innerHTML = q.fig ? graph(q.fig) : "";
  const info = q.type !== "table" && q.table;
  $("#info").hidden = !info; $("#info").innerHTML = info ? tableHTML(q.table, false) : "";
  $("#hintbox").hidden = true; $("#hintbox").innerHTML = "";
  $("#fb").hidden = true; $("#fb").className = "fb";
  $("#hintBtn").hidden = !q.hint; $("#hintBtn").disabled = false;
  $("#skipBtn").hidden = false; $("#nextBtn").hidden = true;
  $("#checkBtn").hidden = q.type === "mc";
  padClear();
  const A = $("#area"); A.innerHTML = "";
  if (q.type === "mc") renderMC(q, A);
  else if (q.type === "num" || q.type === "text") {
    A.innerHTML = '<div class="answer-row"><input id="answer" ' + (q.type === "num" ? 'inputmode="decimal"' : 'autocapitalize="off" spellcheck="false"') +
      ' autocomplete="off" autocorrect="off" placeholder="' + esc(q.placeholder || L.placeholder) + '" aria-label="Antwort">' + (q.unit ? '<span class="unit">' + esc(q.unit) + "</span>" : "") + "</div>";
    if (!TOUCH) try { $("#answer").focus({ preventScroll: true }); } catch (e) {}
  } else if (q.type === "table") A.innerHTML = tableHTML(q.table, true);
  else if (q.type === "plot") renderPlot(q, A);
}

function renderMC(q, A) {
  const box = document.createElement("div"); box.className = "mc";
  let opts = q.options.map((o, k) => ({ o, k }));
  if (q.shuffle) shuffle(opts);
  opts.forEach(({ o, k }) => {
    const b = document.createElement("button");
    b.dataset.k = k;
    b.innerHTML = typeof o === "string" ? o : (o.fig ? graph(Object.assign({ small: true, w: 220, h: 170 }, o.fig)) : "") + "<span>" + (o.label || "") + "</span>";
    b.addEventListener("click", () => {
      if (Q.answered) return;
      if (k === q.answer) { b.classList.add("right"); return finish(true); }
      b.classList.add("wrong"); b.disabled = true;
      if (Q.tries === 0 && q.options.length > 2) { Q.tries = 1; near(q.hint ? L.againHint : L.again); return; }
      finish(false);
    });
    box.appendChild(b);
  });
  A.appendChild(box);
}

function renderPlot(q, A) {
  const G = geom(q.grid), sn = q.snap || [q.grid.sx || 1, q.grid.sy || 1];
  A.innerHTML = '<p class="small" style="margin:0 0 6px">' + esc(L.plotHelp) + '</p><div class="figure">' +
    graphSVG(G, '<g id="ug"></g><rect class="g-tap" x="' + (G.l - 10) + '" y="' + (G.t - 10) + '" width="' + (G.W - G.l - G.r + 20) + '" height="' + (G.H - G.t - G.b + 20) + '"/>') +
    '</div><div class="actions" style="justify-content:flex-start"><button class="btn ghost" id="plotClear">' + esc(L.plotClear) + "</button></div>";
  const svg = A.querySelector("svg");
  Q.G = G;
  svg.addEventListener("click", e => {
    if (Q.answered) return;
    const m = svg.getScreenCTM(); if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let [x, y] = G.inv(p.x, p.y);
    x = Math.round((x - G.x0) / sn[0]) * sn[0] + G.x0; y = Math.round((y - G.y0) / sn[1]) * sn[1] + G.y0;
    if (x < G.x0 || x > G.x1 || y < G.y0 || y > G.y1) return;
    const key = pkey(x, y);
    if (Q.user.has(key)) Q.user.delete(key); else Q.user.set(key, [x, y]);
    drawUser();
    $("#fb").hidden = true;
  });
  A.querySelector("#plotClear").addEventListener("click", () => { if (!Q.answered) { Q.user.clear(); drawUser(); } });
}
const pkey = (x, y) => Number(x.toFixed(6)) + "|" + Number(y.toFixed(6));
function drawUser(marks) {
  const G = Q.G, ug = document.getElementById("ug"); if (!ug) return;
  let s = "";
  if (marks && marks.after) s += '<path class="g-fn c3" clip-path="url(#' + G.id + ')" d="' + fnPath(G, marks.after.f, marks.after.from, marks.after.to) + '"/>';
  (marks && marks.miss || []).forEach(([x, y]) => { s += '<circle class="g-miss" cx="' + G.X(x) + '" cy="' + G.Y(y) + '" r="8"/>'; });
  Q.user.forEach(([x, y], k) => {
    const cls = marks && marks.ok ? (marks.ok.has(k) ? " ok" : " no") : "";
    s += '<circle class="g-user' + cls + '" cx="' + G.X(x) + '" cy="' + G.Y(y) + '" r="6.5"/>';
  });
  ug.innerHTML = s;
}

function near(msg) { const fb = $("#fb"); fb.hidden = false; fb.className = "fb near"; fb.innerHTML = '<span class="verdict">' + esc(msg) + "</span>"; if (Cur().hint) showHint(); }
const Cur = cur;
function shake(el) { if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

function check() {
  if (Q.answered) return next();
  const q = cur();
  if (q.type === "num" || q.type === "text") {
    const v = $("#answer").value;
    if (!v.trim()) return shake($("#answer"));
    let ok, how = "";
    if (q.type === "num") ok = numOk(v, q.answer, q.tol);
    else { how = textJudge(v, q); ok = !!how; }
    if (ok) return finish(true, v, how);
    if (Q.tries === 0) { Q.tries = 1; near(q.hint ? L.againHint : L.again); try { $("#answer").select(); } catch (e) {} return; }
    return finish(false, v);
  }
  if (q.type === "table") {
    const cells = tableCells(q);
    if (cells.every(x => !x.el.value.trim())) return shake($("#area .qtable"));
    let all = true;
    cells.forEach(x => { const ok = cellOk(x); x.el.classList.toggle("ok", ok); x.el.classList.toggle("no", !ok); if (!ok) all = false; });
    if (all) return finish(true);
    if (Q.tries === 0) { Q.tries = 1; near(L.tableAgain); return; }
    return finish(false);
  }
  if (q.type === "plot") {
    if (!Q.user.size) return shake($("#area svg"));
    const want = new Set(q.points.map(([x, y]) => pkey(x, y)));
    const okSet = new Set([...Q.user.keys()].filter(k => want.has(k)));
    const all = okSet.size === want.size && Q.user.size === want.size;
    if (all) { drawUser({ ok: okSet, after: q.after }); return finish(true); }
    drawUser({ ok: okSet });
    if (Q.tries === 0) { Q.tries = 1; near(L.plotAgain); return; }
    const miss = q.points.filter(([x, y]) => !Q.user.has(pkey(x, y)));
    drawUser({ ok: okSet, miss, after: q.after });
    return finish(false);
  }
}

function finish(ok, given, how) {
  const q = cur(), qi = S.order[S.i]; Q.answered = true;
  const soft = how === "accent" || how === "typo";
  const pts = ok ? (Q.tries === 0 && !Q.hint && !soft ? 1 : 0.5) : 0;
  if (!(qi in S.first)) { S.first[qi] = ok; S.max += 1; S.pts += pts; }
  if (!ok && (S.rep[qi] || 0) < 1) { S.rep[qi] = 1; S.order.splice(Math.min(S.order.length, S.i + 3), 0, qi); }
  save();
  let head = ok ? L.right + " +" + fmt(pts) : L.wrong;
  let body = "";
  if (q.type === "num") body += "<p><b>" + esc(L.solution) + ":</b> " + esc(q.show || fmt(q.answer) + (q.unit ? " " + q.unit : "")) + "</p>";
  if (q.type === "text") {
    if (soft) head += ' <span class="small">' + esc(how === "accent" ? L.accent : L.typo) + " <b>" + esc(q.accept[0]) + "</b></span>";
    if (!ok) body += "<p><b>" + esc(L.solution) + ":</b> " + esc(q.accept[0]) + "</p>";
    const sayText = q.say || (T.speech ? q.accept[0] : "");
    if (sayText) body += '<p><button class="btn" data-say="' + esc(sayText) + '">' + esc(L.listen) + "</button></p>";
  }
  if (!ok && given) body += '<p class="small">' + esc(L.yours) + ": „" + esc(given) + "“</p>";
  if (q.type === "mc") document.querySelectorAll("#area .mc button").forEach(b => { b.disabled = true; if (+b.dataset.k === q.answer) b.classList.add("right"); });
  if (q.type === "table") tableCells(q).forEach(x => {
    x.el.disabled = true;
    if (!cellOk(x)) { x.el.classList.add("no"); x.el.insertAdjacentHTML("afterend", '<span class="sol">' + esc(cellShow(x.c)) + "</span>"); }
  });
  if (q.type === "plot" && ok) drawUser({ ok: new Set(Q.user.keys()), after: q.after });
  if (q.type === "num" || q.type === "text") { $("#answer").disabled = true; }
  if (q.explain) body += '<div class="explain">' + q.explain + "</div>";
  const fb = $("#fb"); fb.hidden = false; fb.className = "fb " + (ok ? "good" : "bad");
  fb.innerHTML = '<span class="verdict">' + head + "</span>" + body;
  $("#checkBtn").hidden = true; $("#hintBtn").hidden = true; $("#skipBtn").hidden = true; $("#nextBtn").hidden = false;
  $("#pts").textContent = ptsText(S.pts);
  try { $("#nextBtn").focus({ preventScroll: true }); } catch (e) {}
}
function next() { S.i++; save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

function showHint() {
  const q = cur(); if (!q.hint || Q.answered) return;
  Q.hint = true; $("#hintbox").hidden = false; $("#hintbox").innerHTML = "<p><b>" + esc(L.hint) + ":</b> " + q.hint + "</p>"; $("#hintBtn").disabled = true;
}

function renderEnd() {
  $("#qcard").hidden = true; $("#endcard").hidden = false; $("#barfill").style.width = "100%";
  const ids = Object.keys(S.first).map(Number), right = ids.filter(i => S.first[i]).length, miss = ids.filter(i => !S.first[i]);
  const pct = S.max ? Math.round(100 * S.pts / S.max) : 0;
  const grade = L.grades[pct >= 92 ? 0 : pct >= 80 ? 1 : pct >= 65 ? 2 : pct >= 50 ? 3 : 4];
  let h = '<span class="eyebrow">' + esc(L.endEyebrow) + '</span><div class="big">' + pct + " %</div>" +
    '<p style="margin:0"><b>' + esc(T.grades ? T.grades(pct) : grade) + "</b> " + right + " " + L.of + " " + ids.length + " " + L.ofFirst + ", " + fmt(S.pts) + " " + L.of + " " + ptsText(S.max) + ".</p>";
  if (miss.length) h += "<h2>" + esc(L.practise) + '</h2><ul class="miss">' + miss.map(i => "<li>" + esc(strip(QS[i].prompt).slice(0, 110)) + "</li>").join("") + "</ul>";
  h += '<div class="actions" style="justify-content:flex-start">' + (miss.length ? '<button class="btn signal" id="redoMiss">' + esc(L.redo) + "</button>" : "") +
    '<button class="btn primary" id="allAgain">' + esc(L.allAgain) + "</button></div>";
  $("#endbody").innerHTML = h;
  if (window.Hub) Hub.report(S.pts, S.max);
  if (miss.length) $("#redoMiss").addEventListener("click", () => newRun(miss));
  $("#allAgain").addEventListener("click", () => newRun());
}

// ---------- scratch pad (finger or Apple Pencil) ----------
const cv = $("#pad canvas"); let ctx, drawing = false;
function padSize() {
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  if (!r.width) return;
  cv.width = r.width * d; cv.height = r.height * d; ctx = cv.getContext("2d"); ctx.scale(d, d);
  ctx.lineWidth = 2.2; ctx.lineCap = ctx.lineJoin = "round"; ctx.strokeStyle = getComputedStyle(document.body).color;
}
function padClear() { if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); }
const padPt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
cv.addEventListener("pointerdown", e => { if (!ctx) padSize(); drawing = true; cv.setPointerCapture(e.pointerId); const [x, y] = padPt(e); ctx.beginPath(); ctx.moveTo(x, y); });
cv.addEventListener("pointermove", e => { if (!drawing) return; const [x, y] = padPt(e); ctx.lineTo(x, y); ctx.stroke(); });
["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, () => { drawing = false; }));
$("#padBtn").addEventListener("click", () => { const p = $("#pad"); p.hidden = !p.hidden; store.set(KEY + ":pad", !p.hidden); if (!p.hidden) padSize(); });
$("#padClear").addEventListener("click", padClear);
if (store.get(KEY + ":pad", false)) { $("#pad").hidden = false; requestAnimationFrame(padSize); }

// ---------- speech ----------
function say(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const lang = T.speech || "en-GB", u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = .9;
    const v = speechSynthesis.getVoices().find(v => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------- wiring ----------
$("#checkBtn").addEventListener("click", check);
$("#nextBtn").addEventListener("click", next);
$("#skipBtn").addEventListener("click", () => {
  const q = cur();
  if (q.type === "plot") drawUser({ ok: new Set([...Q.user.keys()].filter(k => q.points.some(([x, y]) => pkey(x, y) === k))), miss: q.points.filter(([x, y]) => !Q.user.has(pkey(x, y))), after: q.after });
  finish(false);
});
$("#hintBtn").addEventListener("click", showHint);
$("#restart").addEventListener("click", e => {
  const b = e.currentTarget;
  if (b.dataset.armed) { delete b.dataset.armed; b.textContent = L.restart; newRun(); }
  else { b.dataset.armed = "1"; b.textContent = L.sure; setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = L.restart; } }, 4000); }
});
document.addEventListener("click", e => { const b = e.target.closest("[data-say]"); if (b) say(b.dataset.say); });
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !Q || $("#qcard").hidden) return;
  if (e.target.closest && e.target.closest(".pad")) return;
  if (Q.answered) { if (document.activeElement !== $("#nextBtn")) { e.preventDefault(); next(); } return; }
  if (e.target.tagName === "INPUT") { e.preventDefault(); check(); }
});

const saved = store.get(KEY + ":state", null);
if (saved && saved.n === QS.length && saved.i < saved.order.length && saved.i > 0) { S = saved; $("#resumed").hidden = false; render(); }
else newRun();
})();
