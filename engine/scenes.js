// scenes.js: animated pictures for tests. A question uses one with  fig: { scene: "globe", ... }  (see README, Scenes).
// Every scene is plain data (no functions), drawn as SVG and animated with one shared timer.
// Tap a scene to pause or play it. With "reduce motion" switched on, scenes start paused.
(function () {
"use strict";
const R = Math.PI / 180;
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const f1 = n => Math.round(n * 10) / 10;
const REDUCE = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

const TX = {
  en: { eq: "Equator", tc: "Tropic of Cancer", tcap: "Tropic of Capricorn", ac: "Arctic Circle", anc: "Antarctic Circle", pm: "Prime Meridian", dl: "Date Line",
    np: "North Pole", sp: "South Pole", n: "N", s: "S", sun: "Sun", day: "day", night: "night", overhead: "Sun overhead (90°)", axis: "Earth's axis",
    mar: "21 March", jun: "21 June", sep: "23 September", dec: "21 December", overheadAt: "Sun overhead at", tropics: "Tropics",
    chamber: "Magma chamber", vent: "Vent", crater: "Crater", ash: "Ash cloud", lava: "Lava", layers: "Layers of ash and lava", magma: "Magma",
    mantle: "Mantle", oc: "Oceanic plate", cc: "Continental plate", trench: "Trench", ridge: "Mid-ocean ridge", sea: "Ocean", mountains: "Fold mountains",
    fault: "Fault", focus: "Focus (hypocentre)", epi: "Epicentre", waves: "Seismic waves", wave: "Tsunami wave", coast: "Coast", quake: "Earthquake",
    deep: "deep water: fast, low", shallow: "shallow water: wave grows", apart: "plates move apart", together: "plates move together", past: "plates slide past each other",
    newcrust: "new crust", sinks: "plate sinks and melts", spread: "same sunlight, bigger area", strong: "strong heating", weak: "weak heating" },
  de: { eq: "Äquator", tc: "Nördlicher Wendekreis", tcap: "Südlicher Wendekreis", ac: "Nördlicher Polarkreis", anc: "Südlicher Polarkreis", pm: "Nullmeridian", dl: "Datumsgrenze",
    np: "Nordpol", sp: "Südpol", n: "N", s: "S", sun: "Sonne", day: "Tag", night: "Nacht", overhead: "Sonne im Zenit (90°)", axis: "Erdachse",
    mar: "21. März", jun: "21. Juni", sep: "23. September", dec: "21. Dezember", overheadAt: "Sonne im Zenit bei", tropics: "Tropen",
    chamber: "Magmakammer", vent: "Schlot", crater: "Krater", ash: "Aschewolke", lava: "Lava", layers: "Asche- und Lavaschichten", magma: "Magma",
    mantle: "Erdmantel", oc: "Ozeanische Platte", cc: "Kontinentale Platte", trench: "Tiefseegraben", ridge: "Mittelozeanischer Rücken", sea: "Ozean", mountains: "Faltengebirge",
    fault: "Verwerfung", focus: "Erdbebenherd (Hypozentrum)", epi: "Epizentrum", waves: "Erdbebenwellen", wave: "Tsunamiwelle", coast: "Küste", quake: "Erdbeben",
    deep: "tiefes Wasser: schnell, flach", shallow: "flaches Wasser: Welle wird hoch", apart: "Platten bewegen sich auseinander", together: "Platten bewegen sich aufeinander zu", past: "Platten gleiten aneinander vorbei",
    newcrust: "neue Kruste", sinks: "Platte taucht ab und schmilzt", spread: "gleiches Sonnenlicht, größere Fläche", strong: "starke Erwärmung", weak: "schwache Erwärmung" }
};

// ---------- shared timer ----------
const live = new Set();
let raf = 0, last = 0;
function loop(now) {
  raf = 0;
  if (now - last > 30) {                           // about 30 frames per second is plenty
    last = now;
    live.forEach(s => {
      if (!s.el.isConnected) { live.delete(s); return; }
      if (!s.paused) { s.t += Math.min(0.1, (now - (s.prev || now)) / 1000); s.draw(s.t); }
      s.prev = now;
    });
  }
  if (live.size) raf = requestAnimationFrame(loop);
}
function run(s) { live.add(s); if (!raf) raf = requestAnimationFrame(loop); }

function svgOpen(w, h, label) {
  return '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(label) + '">';
}
// Label with a soft halo so it stays readable on any background.
const lab = (x, y, t, o) => {
  o = o || {};
  return '<text x="' + f1(x) + '" y="' + f1(y) + '" class="sc-lab' + (o.cls ? " " + o.cls : "") + '" text-anchor="' + (o.a || "start") + '"' +
    (o.fill ? ' style="fill:' + o.fill + '"' : "") + ">" + esc(t) + "</text>";
};
const arrowDefs = id => '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';

// Region of the unit disk where test(x, y, z) is true, as thin vertical strips (x right, y up, z toward viewer).
function region(cx, cy, r, test) {
  let d = "";
  const N = Math.round(r * 2);
  for (let i = 0; i < N; i++) {
    const x = -1 + (i + 0.5) / N * 2, h = Math.sqrt(Math.max(0, 1 - x * x)), M = 160;
    let inside = false, y0 = 0;
    for (let k = 0; k <= M; k++) {
      const y = -h + 2 * h * k / M, z = Math.sqrt(Math.max(0, 1 - x * x - y * y)), ok = k < M && test(x, y, z);
      if (ok && !inside) { inside = true; y0 = y; }
      if (!ok && inside) {
        inside = false;
        const X = cx + (x - 1 / N) * r, w = 2 / N * r + 0.6;
        d += "M" + f1(X) + " " + f1(cy - y * r) + "h" + f1(w) + "V" + f1(cy - y0 * r) + "h" + f1(-w) + "z";
      }
    }
  }
  return d;
}
function stars(w, h, n, seed) {
  let s = "", v = seed || 7;
  const rnd = () => (v = (v * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) s += '<circle cx="' + f1(rnd() * w) + '" cy="' + f1(rnd() * h) + '" r="' + f1(0.4 + rnd() * 0.9) + '" fill="#fff" opacity="' + f1(0.3 + rnd() * 0.6) + '"/>';
  return s;
}
const LINES = { eq: 0, tc: 23.5, tcap: -23.5, ac: 66.5, anc: -66.5 };
function lineSet(g) {
  let want = g.lines || ["eq"];
  if (typeof want === "string") want = [want];
  const out = new Set();
  want.forEach(w => {
    if (w === "equator") out.add("eq");
    else if (w === "tropics") { out.add("tc"); out.add("tcap"); }
    else if (w === "polar") { out.add("ac"); out.add("anc"); }
    else if (w === "all") ["eq", "tc", "tcap", "ac", "anc", "pm"].forEach(x => out.add(x));
    else if (w === "meridian") out.add("pm");
    else if (w === "dateline") out.add("dl");
    else out.add(w);                                  // eq, tc, tcap, ac, anc, pm, dl, grid
  });
  return out;
}
const lineColor = k => k === "eq" ? "#ff6b5a" : (k === "tc" || k === "tcap") ? "#ffd23f" : (k === "ac" || k === "anc") ? "#9fdcff" : "#ffffff";

// ---------- globe: a turning Earth with lines, marks, day and night ----------
// { scene:"globe", spin:20, lon:10, view:20, tilt:0, sun:"left", rays:false, lines:["equator","tropics"], band:"tropics",
//   hl:"tc", marks:[{lat:48.1, lon:11.6, label:"Munich"}], labels:true, deg:true, caption }
function globe(el, g, T) {
  const W = 420, H = 320, cx = 136, cy = 150, r = 112;
  const sun = g.sun || null, tilt = g.tilt || 0;
  const view = sun ? 0 : (g.view != null ? g.view : 20);
  const cl = Math.cos(view * R), sl = Math.sin(view * R);
  const L = lineSet(g), showLab = g.labels !== false;
  const spin = g.spin == null ? 20 : g.spin;
  let s = svgOpen(W, H, g.label || "Globe") + '<rect width="' + W + '" height="' + H + '" fill="#0b1a2b"/>' + stars(W, H, 40, 3);
  s += '<defs><radialGradient id="oc" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#4fa3e0"/><stop offset="1" stop-color="#1b4f86"/></radialGradient>' +
    '<clipPath id="disk"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath>' +
    '<linearGradient id="nightg" x1="0" x2="1"><stop offset="0" stop-color="#000814" stop-opacity="0.35"/><stop offset="0.12" stop-color="#000814" stop-opacity="0.62"/><stop offset="1" stop-color="#000814" stop-opacity="0.7"/></linearGradient></defs>';
  if (sun) {
    const sx = sun === "right" ? W - 10 : 10;
    s += '<circle cx="' + sx + '" cy="' + cy + '" r="40" fill="#ffd23f" opacity=".25"/><circle cx="' + sx + '" cy="' + cy + '" r="26" fill="#ffd23f"/>';
    s += lab(sun === "right" ? sx - 30 : sx + 30, cy - 34, T.sun, { a: sun === "right" ? "end" : "start", fill: "#ffd23f" });
  }
  if (g.rays && sun) {
    s += '<g class="sc-rays">';
    for (let k = -4; k <= 4; k++) {
      const y = cy + k * 26, dy = Math.abs(y - cy);
      if (dy >= r) continue;
      const hit = sun === "right" ? cx + Math.sqrt(r * r - dy * dy) : cx - Math.sqrt(r * r - dy * dy);
      s += '<line x1="' + (sun === "right" ? W - 40 : 40) + '" y1="' + y + '" x2="' + f1(hit) + '" y2="' + y + '" stroke="#ffd23f" stroke-width="2" stroke-dasharray="7 6" class="sc-dash"/>';
    }
    s += "</g>";
  }
  s += '<g transform="rotate(' + (sun === "right" ? tilt : -tilt) + " " + cx + " " + cy + ')">';
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#oc)"/>';
  s += '<g clip-path="url(#disk)"><path class="sc-land" fill="#5fa35a" stroke="#2f6b33" stroke-width=".6"/>';
  if (g.band) {                                     // shaded zone: "tropics" (between the tropics) or "polar" (beyond the polar circles)
    const lim = g.band === "polar" ? 66.5 : 23.5;
    const test = g.band === "polar" ? (x, y, z) => Math.abs(Math.asin(y * cl + z * sl) / R) > lim : (x, y, z) => Math.abs(Math.asin(y * cl + z * sl) / R) < lim;
    s += '<path d="' + region(cx, cy, r, test) + '" fill="#ffd23f" opacity=".3"/>';
  }
  s += '<g class="sc-lines"></g></g>';
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#9fd0ff" stroke-opacity=".5" stroke-width="1.5"/>';
  if (tilt || g.axis) {
    const top = cy - (r + 26) * cl, bot = cy + (r + 26) * cl;
    s += '<line x1="' + cx + '" y1="' + f1(top) + '" x2="' + cx + '" y2="' + f1(bot) + '" stroke="#fff" stroke-width="2" stroke-dasharray="5 4"/>';
    s += lab(cx + 6, top + 4, T.np, { fill: "#fff" });
    if (g.axisLabel) s += lab(cx + 6, top + 18, T.axis, { fill: "#cfe3f5", cls: "sm" });
  }
  s += '<g class="sc-marks"></g></g>';
  if (sun) {
    const night = "M" + cx + " " + (cy - r) + "A" + r + " " + r + " 0 0 1 " + cx + " " + (cy + r) + "Z";   // right half; mirrored when the Sun is on the right
    s += '<path d="' + night + '" fill="url(#nightg)" transform="' + (sun === "right" ? "scale(-1 1) translate(" + (-2 * cx) + " 0)" : "") + '"/>';
    s += lab(sun === "right" ? cx - r / 2 : cx + r / 2, cy + r + 20, T.night, { a: "middle", fill: "#9fb3c8" });
    s += lab(sun === "right" ? cx + r / 2 : cx - r / 2, cy + r + 20, T.day, { a: "middle", fill: "#ffd23f" });
    if (g.subsolar !== false && (g.rays || g.subsolar)) {
      const px = sun === "right" ? cx + r : cx - r;
      s += '<circle cx="' + px + '" cy="' + cy + '" r="6" fill="#ff6b5a" class="sc-pulse"/>';
      const lat = tilt;
      s += lab(W / 2, H - 10, T.overheadAt + " " + Math.abs(lat) + "° " + (lat >= 0 ? T.n : T.s) + (lat === 23.5 ? " (" + T.tc + ")" : lat === -23.5 ? " (" + T.tcap + ")" : lat === 0 ? " (" + T.eq + ")" : ""), { a: "middle", fill: "#ffd23f" });
    }
  }
  // line labels sit outside the globe on the right (left when the sun is on the right)
  const labs = [];
  if (showLab) ["ac", "tc", "eq", "tcap", "anc"].forEach(k => {
    if (!L.has(k)) return;
    const la = LINES[k] * R, a = sun === "right" ? -1 : 1;
    let x = a * Math.cos(la), y = Math.sin(la) * cl;
    const rot = (sun === "right" ? tilt : -tilt) * R;
    const X = cx + r * (x * Math.cos(rot) - (-y) * Math.sin(rot)), Y = cy + r * (x * Math.sin(rot) + (-y) * Math.cos(rot));
    labs.push([k, X, Y, a]);
  });
  labs.forEach(([k, X, Y, a]) => {
    const tx = a > 0 ? Math.max(X + 8, cx + r + 6) : Math.min(X - 8, cx - r - 6);
    const name = T[k] + (g.deg ? " " + Math.abs(LINES[k]) + "°" + (LINES[k] ? " " + (LINES[k] > 0 ? T.n : T.s) : "") : "");
    s += '<line x1="' + f1(X) + '" y1="' + f1(Y) + '" x2="' + f1(tx - (a > 0 ? 3 : -3)) + '" y2="' + f1(Y) + '" stroke="' + lineColor(k) + '" stroke-width="1"/>';
    s += lab(tx, Y + 4, name, { a: a > 0 ? "start" : "end", fill: lineColor(k), cls: g.hl === k ? "hl" : "sm" });
  });
  s += "</svg>";
  el.innerHTML = s;
  const land = el.querySelector(".sc-land"), lines = el.querySelector(".sc-lines"), marks = el.querySelector(".sc-marks");
  function P(lat, lon, lam) {
    const la = lat * R, lo = (lon - lam) * R;
    const X = Math.cos(la) * Math.sin(lo), Y = Math.sin(la), Z = Math.cos(la) * Math.cos(lo);
    return [X, Y * cl - Z * sl, Y * sl + Z * cl];
  }
  const sx = x => f1(cx + x * r), sy = y => f1(cy - y * r);
  function draw(t) {
    const lam = (g.lon != null ? g.lon : 10) + spin * t;
    if (window.LAND) {
      let d = "";
      window.LAND.forEach(ring => {
        let any = false, part = "";
        for (let i = 0; i < ring.length; i += 2) {
          let [x, y, z] = P(ring[i + 1], ring[i], lam);
          if (z < 0) { const n = Math.hypot(x, y) || 1; x /= n; y /= n; } else any = true;
          part += (i ? "L" : "M") + sx(x) + " " + sy(y);
        }
        if (any) d += part + "Z";
      });
      land.setAttribute("d", d);
    }
    let ls = "";
    const curve = (fn, col, w, dash, cls) => {
      let d = "", pen = false;
      for (let k = 0; k <= 180; k++) {
        const [x, y, z] = fn(k / 180);
        if (z < 0) { pen = false; continue; }
        d += (pen ? "L" : "M") + sx(x) + " " + sy(y); pen = true;
      }
      ls += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + (cls ? ' class="' + cls + '"' : "") + "/>";
    };
    if (L.has("grid")) {
      for (let lo = -180; lo < 180; lo += 30) curve(u => P(-90 + 180 * u, lo, lam), "#ffffff", 0.5);
      for (let la = -60; la <= 60; la += 30) if (la) curve(u => P(la, -180 + 360 * u, lam), "#ffffff", 0.5);
    }
    if (L.has("pm")) curve(u => P(-90 + 180 * u, 0, lam), "#ffffff", g.hl === "pm" ? 3.5 : 2, "", g.hl === "pm" ? "sc-glow" : "");
    if (L.has("dl")) curve(u => P(-90 + 180 * u, 180, lam), "#c9a7ff", 2, "6 4");
    ["eq", "tc", "tcap", "ac", "anc"].forEach(k => {
      if (!L.has(k)) return;
      curve(u => P(LINES[k], -180 + 360 * u, lam), lineColor(k), g.hl === k ? 3.8 : 2.2, k === "eq" ? "" : "7 5", g.hl === k ? "sc-glow" : "");
    });
    lines.innerHTML = ls;
    let ms = "";
    (g.marks || []).forEach((m, i) => {
      const [x, y, z] = P(m.lat, m.lon, lam);
      if (z < 0.05) return;
      ms += '<circle cx="' + sx(x) + '" cy="' + sy(y) + '" r="5.5" fill="' + (m.color || "#ff6b5a") + '" stroke="#fff" stroke-width="1.5"/>';
      ms += '<circle cx="' + sx(x) + '" cy="' + sy(y) + '" r="' + f1(7 + 6 * ((t * 1.2 + i * 0.3) % 1)) + '" fill="none" stroke="' + (m.color || "#ff6b5a") + '" opacity="' + f1(1 - ((t * 1.2 + i * 0.3) % 1)) + '"/>';
      if (m.label) ms += lab(Number(sx(x)) + 9, Number(sy(y)) - 7, m.label, { fill: "#fff" });
    });
    marks.innerHTML = ms;
  }
  return draw;
}

// ---------- orbit: the Earth goes round the Sun, the axis always points the same way ----------
// { scene:"orbit", period:16, seasons:true, at:null (or "jun", "dec", "mar", "sep" to stand still), caption }
function orbit(el, g, T) {
  const W = 420, H = 270, cx = 210, cy = 132, rx = 150, ry = 68, er = 20, tilt = 23.5;
  const pos = { dec: 0, mar: 90, jun: 180, sep: 270 };
  let s = svgOpen(W, H, g.label || "Orbit") + '<rect width="' + W + '" height="' + H + '" fill="#0b1a2b"/>' + stars(W, H, 45, 11);
  s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="#9fd0ff" stroke-opacity=".45" stroke-dasharray="4 5"/>';
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="#ffd23f" opacity=".2"/><circle cx="' + cx + '" cy="' + cy + '" r="26" fill="#ffd23f"/>' + lab(cx, cy + 4, T.sun, { a: "middle", fill: "#5a3b00" });
  Object.keys(pos).forEach(k => {
    const a = pos[k] * R, x = cx + rx * Math.cos(a), y = cy - ry * Math.sin(a);
    const ty = k === "mar" ? y - 32 : k === "sep" ? y + 42 : y + 46;
    s += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="3" fill="#9fd0ff"/>' + lab(x, ty, T[k], { a: "middle", fill: "#cfe3f5", cls: "sm" });
  });
  s += '<g class="sc-earth"></g>';
  s += lab(12, H - 12, g.note || "", { fill: "#cfe3f5", cls: "sm" }) + "</svg>";
  el.innerHTML = s;
  const E = el.querySelector(".sc-earth");
  const period = g.period || 16;
  const startA = g.at ? pos[g.at] : 0;
  function draw(t) {
    const a = (g.at ? startA : startA + 360 * t / period) * R;
    const x = cx + rx * Math.cos(a), y = cy - ry * Math.sin(a);
    const toSun = Math.atan2(cy - y, cx - x) / R;   // direction to the Sun, degrees on screen
    let e = '<g transform="translate(' + f1(x) + " " + f1(y) + ')">';
    e += '<circle r="' + er + '" fill="#3f8fd2"/>';
    e += '<g transform="rotate(' + tilt + ')">';                                   // axis leans to the right, always
    e += '<path d="M' + (-er) + ' 0H' + er + '" stroke="#ff6b5a" stroke-width="1.6"/>';
    const yt = -er * Math.sin(23.5 * R);
    e += '<path d="M' + f1(-er * Math.cos(23.5 * R)) + " " + f1(yt) + "H" + f1(er * Math.cos(23.5 * R)) + '" stroke="#ffd23f" stroke-width="1.2" stroke-dasharray="3 2"/>';
    e += '<path d="M' + f1(-er * Math.cos(23.5 * R)) + " " + f1(-yt) + "H" + f1(er * Math.cos(23.5 * R)) + '" stroke="#ffd23f" stroke-width="1.2" stroke-dasharray="3 2"/>';
    e += '<line y1="' + (-er - 10) + '" y2="' + (er + 10) + '" stroke="#fff" stroke-width="1.6"/><text y="' + (-er - 13) + '" class="sc-lab sm" text-anchor="middle" style="fill:#fff">' + T.n + "</text></g>";
    // night: the half turned away from the Sun
    e += '<path d="M0 ' + (-er) + "A" + er + " " + er + " 0 0 1 0 " + er + 'Z" fill="#000814" opacity=".62" transform="rotate(' + f1(toSun + 180) + ')"/>';
    e += "</g>";
    E.innerHTML = e;
  }
  return draw;
}

// ---------- rays: sunlight on a tilted Earth through the year (side view) ----------
// { scene:"rays", tilt:23.5 (fixed) or year:true (moves through the year), spread:true, period:12, caption }
function rays(el, g, T) {
  const W = 420, H = 290, cx = 215, cy = 135, r = 98;
  let s = svgOpen(W, H, g.label || "Sun rays") + '<rect width="' + W + '" height="' + H + '" fill="#0b1a2b"/>' + stars(W, H, 25, 5);
  s += '<circle cx="-10" cy="' + cy + '" r="70" fill="#ffd23f" opacity=".22"/><circle cx="-10" cy="' + cy + '" r="48" fill="#ffd23f"/>' + lab(8, cy - 56, T.sun, { fill: "#ffd23f" });
  s += '<g class="sc-raylines"></g><g class="sc-earth"></g><text class="sc-lab sc-title" x="' + (W / 2) + '" y="' + (H - 10) + '" text-anchor="middle" style="fill:#ffd23f"></text></svg>';
  el.innerHTML = s;
  const E = el.querySelector(".sc-earth"), RL = el.querySelector(".sc-raylines"), TT = el.querySelector(".sc-title");
  const period = g.period || 12;
  function draw(t) {
    const tilt = g.year ? 23.5 * Math.sin(2 * Math.PI * t / period) : (g.tilt || 0);
    const rot = -tilt;                                     // north pole leans toward the Sun (left) when tilt > 0
    let e = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#3f8fd2"/>';
    e += '<g transform="rotate(' + f1(rot) + " " + cx + " " + cy + ')">';
    ["ac", "tc", "eq", "tcap", "anc"].forEach(k => {
      const la = LINES[k] * R, y = cy - r * Math.sin(la), hw = r * Math.cos(la);
      e += '<line x1="' + f1(cx - hw) + '" y1="' + f1(y) + '" x2="' + f1(cx + hw) + '" y2="' + f1(y) + '" stroke="' + lineColor(k) + '" stroke-width="' + (k === "eq" ? 2 : 1.4) + '"' + (k === "eq" ? "" : ' stroke-dasharray="6 4"') + "/>";
      e += lab(cx + hw + 6, y + 4, T[k], { fill: lineColor(k), cls: "sm" });
    });
    e += '<line x1="' + cx + '" y1="' + (cy - r - 16) + '" x2="' + cx + '" y2="' + (cy + r + 16) + '" stroke="#fff" stroke-width="1.6" stroke-dasharray="5 4"/>';
    e += lab(cx + 5, cy - r - 18, T.np, { fill: "#fff", cls: "sm" });
    e += "</g>";
    e += '<path d="M' + cx + " " + (cy - r) + "A" + r + " " + r + " 0 0 1 " + cx + " " + (cy + r) + 'Z" fill="#000814" opacity=".6"/>';
    // the ray that hits at 90 degrees: the point of the Earth nearest to the Sun
    e += '<circle cx="' + (cx - r) + '" cy="' + cy + '" r="6" fill="#ff6b5a" class="sc-pulse"/>';
    E.innerHTML = e;
    let rl = "";
    const dash = (t * 30) % 13;
    for (let k = -3; k <= 3; k++) {
      const y = cy + k * 28, dy = Math.abs(y - cy), x2 = cx - Math.sqrt(r * r - dy * dy);
      rl += '<line x1="40" y1="' + y + '" x2="' + f1(x2) + '" y2="' + y + '" stroke="#ffd23f" stroke-width="' + (k ? 1.6 : 3) + '" stroke-dasharray="7 6" stroke-dashoffset="' + f1(-dash) + '"/>';
    }
    if (g.spread) {
      const beam = (yc, col, txt) => {
        const y1 = yc - 12, y2 = yc + 12;
        const xa = cx - Math.sqrt(r * r - (y1 - cy) ** 2), xb = cx - Math.sqrt(r * r - (y2 - cy) ** 2);
        rl += '<path d="M40 ' + y1 + "L" + f1(xa) + " " + y1 + "A" + r + " " + r + " 0 0 0 " + f1(xb) + " " + y2 + "L40 " + y2 + 'Z" fill="' + col + '" opacity=".35"/>';
        rl += '<path d="M' + f1(xa) + " " + y1 + "A" + r + " " + r + " 0 0 0 " + f1(xb) + " " + y2 + '" stroke="' + col + '" stroke-width="5" fill="none"/>';
        rl += lab(44, (yc < cy ? y1 - 6 : y2 + 14), txt, { fill: col, cls: "sm" });
      };
      beam(cy, "#ffd23f", T.strong);
      beam(cy - r + 22, "#ff9d5c", T.weak + ": " + T.spread);
    }
    RL.innerHTML = rl;
    const lat = Math.round(tilt * 10) / 10;
    TT.textContent = T.overheadAt + " " + Math.abs(lat).toFixed(1).replace(".0", "") + "° " + (lat >= 0 ? T.n : T.s) +
      (Math.abs(lat - 23.5) < 0.3 ? " · " + T.tc + " · " + T.jun : Math.abs(lat + 23.5) < 0.3 ? " · " + T.tcap + " · " + T.dec : Math.abs(lat) < 0.3 ? " · " + T.eq : "");
  }
  return draw;
}

// ---------- plates: plate boundaries in cross-section (kind: subduction, divergent, collision, transform) ----------
function plates(el, g, T) {
  const W = 420, H = 250, kind = g.kind || "subduction";
  let s = svgOpen(W, H, g.label || kind) + arrowDefs("pa");
  s += '<defs><linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f08a3e"/><stop offset="1" stop-color="#b8321e"/></linearGradient></defs>';
  if (kind === "transform") {
    s += '<rect width="' + W + '" height="' + H + '" fill="#d8c79a"/>';
    s += '<g class="sc-top"><rect x="-60" y="20" width="540" height="100" fill="#cdb983"/></g><g class="sc-bot"><rect x="-60" y="130" width="540" height="100" fill="#bfa877"/></g>';
    s += '<line x1="0" y1="125" x2="' + W + '" y2="125" stroke="#6b3f1d" stroke-width="3" stroke-dasharray="10 6"/>';
    s += lab(10, 118, T.fault, { cls: "dark" });
    s += '<g class="sc-q"></g>';
    s += '<line x1="140" y1="70" x2="260" y2="70" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/><line x1="280" y1="180" x2="160" y2="180" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/>';
    s += lab(W / 2, H - 8, T.past, { a: "middle", cls: "dark" });
  } else {
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#mt)"/>';
    s += '<rect width="' + W + '" height="72" fill="#cfe8f7"/>';
    if (kind === "subduction") {
      s += '<path d="M0 72H205L215 90H0Z" fill="#3d8fd1"/>' + lab(14, 86, T.sea, { fill: "#fff", cls: "sm" });
      s += '<path d="M0 90L200 92Q260 100 330 250H290Q240 125 195 116L0 114Z" fill="#6b6f7a"/>';
      s += '<path class="sc-move" d="M10 103L195 104Q245 112 300 230" fill="none" stroke="#c9ccd3" stroke-width="3" stroke-dasharray="12 10"/>';
      s += '<path d="M210 90L238 72H262L290 30L300 26L310 30L340 72H420V150L330 150Q280 120 230 104Z" fill="#a7814f"/>';
      s += '<path d="M290 30L300 40L310 30" fill="#b8321e"/>';
      s += '<g class="sc-magma"></g><g class="sc-ash"></g><g class="sc-q"></g>';
      s += lab(212, 108, T.trench, { cls: "dark sm", a: "middle" }) + lab(30, 132, T.oc, { cls: "light" }) + lab(412, 128, T.cc, { cls: "light", a: "end" }) + lab(20, H - 12, T.mantle, { cls: "light" });
      s += lab(248, 200, T.sinks, { cls: "light sm" });
      s += '<line x1="60" y1="60" x2="140" y2="60" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/><line x1="400" y1="60" x2="352" y2="60" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/>';
      s += lab(W / 2, 16, T.together, { a: "middle", cls: "dark" });
    } else if (kind === "divergent") {
      s += '<rect y="60" width="' + W + '" height="34" fill="#3d8fd1"/>' + lab(14, 78, T.sea, { fill: "#fff", cls: "sm" });
      s += '<path d="M0 94H190L200 80L206 94V124H0Z" fill="#6b6f7a"/><path d="M420 94H230L220 80L214 94V124H420Z" fill="#6b6f7a"/>';
      s += '<path class="sc-move" d="M200 108H6" fill="none" stroke="#c9ccd3" stroke-width="3" stroke-dasharray="12 10"/><path class="sc-move" d="M220 108H414" fill="none" stroke="#c9ccd3" stroke-width="3" stroke-dasharray="12 10"/>';
      s += '<path d="M200 124Q210 160 205 250H215Q210 160 220 124Z" fill="#ff7a2f"/>';
      s += '<path class="sc-conv" d="M200 230C120 230 90 150 180 140" fill="none" stroke="#ffe0b8" stroke-width="2.5" stroke-dasharray="8 7" marker-end="url(#pa)"/><path class="sc-conv" d="M220 230C300 230 330 150 240 140" fill="none" stroke="#ffe0b8" stroke-width="2.5" stroke-dasharray="8 7" marker-end="url(#pa)"/>';
      s += '<g class="sc-magma"></g>';
      s += lab(210, 74, T.ridge, { a: "middle", cls: "dark sm" }) + lab(20, 118, T.oc, { cls: "light sm" }) + lab(400, 118, T.oc, { cls: "light sm", a: "end" }) + lab(20, H - 12, T.mantle, { cls: "light" });
      s += lab(228, 168, T.newcrust, { cls: "light sm" });
      s += '<line x1="160" y1="40" x2="80" y2="40" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/><line x1="260" y1="40" x2="340" y2="40" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/>';
      s += lab(W / 2, 16, T.apart, { a: "middle", cls: "dark" });
    } else {                                                     // collision
      s += '<path d="M0 72H170L210 72L250 72H420V150H0Z" fill="#a7814f"/>';
      s += '<g class="sc-mtn"><path d="M140 72L175 34L195 52L212 18L232 50L250 30L285 72Z" fill="#8a6a40" stroke="#5e4526"/><path d="M150 66Q180 52 210 66T270 66M158 60Q185 46 210 60T262 60" stroke="#5e4526" fill="none"/></g>';
      s += '<path d="M150 150Q210 230 270 150" fill="#9c7748"/>';
      s += lab(20, 120, T.cc, { cls: "light sm" }) + lab(400, 120, T.cc, { cls: "light sm", a: "end" }) + lab(20, H - 12, T.mantle, { cls: "light" }) + lab(210, 100, T.mountains, { a: "middle", cls: "light" });
      s += '<line x1="40" y1="40" x2="120" y2="40" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/><line x1="380" y1="40" x2="300" y2="40" stroke="#1b3a57" stroke-width="4" marker-end="url(#pa)"/>';
      s += lab(W / 2, 14, T.together, { a: "middle", cls: "dark" });
      s += '<g class="sc-q"></g>';
    }
  }
  s += "</svg>";
  el.innerHTML = s;
  const mv = el.querySelectorAll(".sc-move, .sc-conv"), mg = el.querySelector(".sc-magma"), ash = el.querySelector(".sc-ash"), q = el.querySelector(".sc-q"),
    top = el.querySelector(".sc-top"), bot = el.querySelector(".sc-bot"), mtn = el.querySelector(".sc-mtn");
  function draw(t) {
    mv.forEach(p => p.setAttribute("stroke-dashoffset", f1(-(t * 18) % 22)));
    if (mg) {
      let m = "";
      for (let i = 0; i < 6; i++) {
        const u = (t * 0.35 + i / 6) % 1;
        if (kind === "subduction") { const x = 290 + 10 * Math.sin(i), y = 200 - u * 165; m += '<circle cx="' + f1(x + 6 * Math.sin(u * 9)) + '" cy="' + f1(y) + '" r="' + f1(5 - u * 2) + '" fill="#ff7a2f" opacity="' + f1(1 - u * 0.4) + '"/>'; }
        else { const y = 240 - u * 150; m += '<circle cx="' + f1(210 + 4 * Math.sin(u * 12 + i)) + '" cy="' + f1(y) + '" r="' + f1(5 - u * 2.5) + '" fill="#ffb347" opacity="' + f1(1 - u * 0.5) + '"/>'; }
      }
      mg.innerHTML = m;
    }
    if (ash) {
      let a = "";
      for (let i = 0; i < 10; i++) { const u = (t * 0.25 + i / 10) % 1; a += '<circle cx="' + f1(300 + Math.sin(i * 2.3) * 30 * u) + '" cy="' + f1(26 - u * 26) + '" r="' + f1(3 + u * 7) + '" fill="#555" opacity="' + f1(0.7 - u * 0.6) + '"/>'; }
      ash.innerHTML = a;
    }
    if (q) {
      const u = (t * 0.6) % 1, x = kind === "subduction" ? 232 : kind === "transform" ? 210 : 210, y = kind === "subduction" ? 112 : kind === "transform" ? 125 : 150;
      q.innerHTML = '<circle cx="' + x + '" cy="' + y + '" r="' + f1(4 + u * 30) + '" fill="none" stroke="#fff" stroke-width="2" opacity="' + f1(1 - u) + '"/><path d="M' + x + " " + (y - 7) + "l2 5 5 0-4 3 2 6-5-4-5 4 2-6-4-3 5 0z" + '" fill="#ffd23f" stroke="#7a4b00" stroke-width=".6"/>';
    }
    if (top) { const off = (t * 10) % 60; top.setAttribute("transform", "translate(" + f1(off - 30) + " 0)"); bot.setAttribute("transform", "translate(" + f1(30 - off) + " 0)"); }
    if (mtn) mtn.setAttribute("transform", "translate(0 72) scale(1 " + f1(0.55 + 0.45 * Math.min(1, (t % 10) / 8)) + ") translate(0 -72)");
  }
  return draw;
}

// ---------- volcano: cross-section of a stratovolcano with an eruption ----------
function volcano(el, g, T) {
  const W = 420, H = 280;
  let s = svgOpen(W, H, g.label || "Volcano") + '<rect width="' + W + '" height="' + H + '" fill="#cfe8f7"/>';
  s += '<path d="M0 200L120 200L190 70H230L300 200L420 200V280H0Z" fill="#8f7454"/>';
  for (let i = 1; i <= 4; i++) s += '<path d="M' + (120 - i * 8) + " " + (200 - i * 0) + "L" + (190 - i * 3) + " " + (70 + i * 26) + '" stroke="#6f5638" fill="none"/><path d="M' + (300 + i * 8) + " 200L" + (230 + i * 3) + " " + (70 + i * 26) + '" stroke="#6f5638" fill="none"/>';
  s += '<ellipse cx="210" cy="250" rx="70" ry="22" fill="#d9481c"/><path d="M203 250V78H217V250Z" fill="#e8611f"/>';
  s += '<g class="sc-lava"></g><g class="sc-ash"></g><g class="sc-bub"></g>';
  s += lab(210, 274, T.chamber, { a: "middle", cls: "light" }) + lab(226, 160, T.vent, { cls: "light" }) + lab(240, 66, T.crater, { cls: "dark" });
  s += lab(320, 30, T.ash, { cls: "dark" }) + lab(296, 150, T.lava, { cls: "dark" }) + lab(18, 228, T.layers, { cls: "light sm" });
  s += "</svg>";
  el.innerHTML = s;
  const lava = el.querySelector(".sc-lava"), ash = el.querySelector(".sc-ash"), bub = el.querySelector(".sc-bub");
  function draw(t) {
    const u = (t * 0.2) % 1;
    lava.innerHTML = '<path d="M214 72L250 140L268 186" stroke="#ff5a1f" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="' + f1(u * 140) + ' 400"/>' +
      '<path d="M206 72L176 130L160 170" stroke="#ff5a1f" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="' + f1(((u + 0.35) % 1) * 110) + ' 400"/>';
    let a = "";
    for (let i = 0; i < 14; i++) { const v = (t * 0.22 + i / 14) % 1; a += '<circle cx="' + f1(210 + Math.sin(i * 1.7) * 60 * v + 20 * v) + '" cy="' + f1(70 - v * 66) + '" r="' + f1(4 + v * 12) + '" fill="#4a4a4a" opacity="' + f1(0.75 - v * 0.6) + '"/>'; }
    ash.innerHTML = a;
    let b = "";
    for (let i = 0; i < 5; i++) { const v = (t * 0.5 + i / 5) % 1; b += '<circle cx="' + f1(210 + 3 * Math.sin(v * 15 + i)) + '" cy="' + f1(245 - v * 170) + '" r="3" fill="#ffd166" opacity="' + f1(1 - v * 0.5) + '"/>'; }
    bub.innerHTML = b;
  }
  return draw;
}

// ---------- quake: focus, epicentre and seismic waves ----------
function quake(el, g, T) {
  const W = 420, H = 260, fx = 210, fy = 190, gy = 70;
  let s = svgOpen(W, H, g.label || "Earthquake") + '<defs><clipPath id="ground"><rect y="' + gy + '" width="' + W + '" height="' + (H - gy) + '"/></clipPath></defs>';
  s += '<rect width="' + W + '" height="' + H + '" fill="#cfe8f7"/><rect y="' + gy + '" width="' + W + '" height="' + (H - gy) + '" fill="#a88a63"/>';
  s += '<rect y="' + (gy + 50) + '" width="' + W + '" height="50" fill="#9a7c56"/><rect y="' + (gy + 140) + '" width="' + W + '" height="60" fill="#8d6f4b"/>';
  s += '<line x1="150" y1="' + (H) + '" x2="270" y2="' + gy + '" stroke="#5a3b1d" stroke-width="3" stroke-dasharray="9 5"/>' + lab(256, gy + 26, T.fault, { cls: "light sm" });
  s += '<g clip-path="url(#ground)" class="sc-w"></g><g class="sc-h"></g>';
  s += '<path d="M' + fx + " " + (fy - 9) + "l3 6 7 0-5 4 2 7-7-4-7 4 2-7-5-4 7 0z" + '" fill="#ffd23f" stroke="#7a4b00"/>';
  s += '<line x1="' + fx + '" y1="' + (fy - 12) + '" x2="' + fx + '" y2="' + (gy + 4) + '" stroke="#fff" stroke-dasharray="3 4"/>';
  s += '<circle cx="' + fx + '" cy="' + gy + '" r="6" fill="#ff6b5a" stroke="#fff" stroke-width="2"/>';
  s += lab(fx + 16, fy + 4, T.focus, { cls: "light" }) + lab(fx + 10, gy - 10, T.epi, { cls: "dark" }) + lab(18, H - 12, T.waves, { cls: "light sm" });
  s += "</svg>";
  el.innerHTML = s;
  const w = el.querySelector(".sc-w"), h = el.querySelector(".sc-h");
  function draw(t) {
    let c = "";
    for (let i = 0; i < 4; i++) { const u = (t * 0.45 + i / 4) % 1; c += '<circle cx="' + fx + '" cy="' + fy + '" r="' + f1(8 + u * 230) + '" fill="none" stroke="#fff" stroke-width="2.4" opacity="' + f1(0.9 - u * 0.85) + '"/>'; }
    w.innerHTML = c;
    let hs = "";
    [60, 120, 300, 360].forEach((x, i) => {
      const d = Math.abs(x - fx), amp = 3 * Math.max(0, 1 - d / 200) + 0.6, sh = amp * Math.sin(t * 22 + i);
      hs += '<g transform="translate(' + f1(x + sh) + " " + gy + ')"><rect x="-12" y="-26" width="24" height="26" fill="#f5efe6" stroke="#6b5a45"/><path d="M-15 -26L0 -40L15 -26Z" fill="#b8321e"/></g>';
    });
    h.innerHTML = hs;
  }
  return draw;
}

// ---------- tsunami: seafloor quake, wave travels to the coast and grows ----------
function tsunami(el, g, T) {
  const W = 420, H = 260, sea = 90;
  const floor = x => x < 300 ? 220 - Math.max(0, x - 140) * 0.75 : 100 - (x - 300) * 0.6;
  let fl = "M0 " + H;
  for (let x = 0; x <= W; x += 6) fl += "L" + x + " " + f1(floor(x));
  fl += "L" + W + " " + H + "Z";
  let s = svgOpen(W, H, g.label || "Tsunami") + '<rect width="' + W + '" height="' + H + '" fill="#cfe8f7"/>';
  s += '<path class="sc-sea" fill="#3d8fd1"/><path d="' + fl + '" fill="#a88a63"/>';
  s += '<path d="M380 ' + f1(floor(380)) + 'l8 -18 8 18z" fill="#2f6b33"/><path d="M360 ' + f1(floor(360) - 2) + 'h14v-14h-14z" fill="#f5efe6" stroke="#6b5a45"/>';
  s += '<g class="sc-q"></g>';
  s += lab(70, 250, T.quake, { cls: "light" }) + lab(60, 120, T.deep, { cls: "light sm" }) + lab(250, 72, T.shallow, { cls: "dark sm" }) + lab(395, 64, T.coast, { cls: "dark", a: "end" });
  s += lab(W / 2, 18, T.wave, { a: "middle", cls: "dark" }) + "</svg>";
  el.innerHTML = s;
  const S = el.querySelector(".sc-sea"), q = el.querySelector(".sc-q");
  function draw(t) {
    const u = (t * 0.12) % 1, c = 80 + u * 290;
    let d = "M0 " + H + "L0 " + sea;
    for (let x = 0; x <= W; x += 4) {
      const depth = Math.max(0, floor(x) - sea), A = 4 + 34 * Math.max(0, 1 - depth / 130);
      const y = sea - A * Math.exp(-(((x - c) / (18 + depth * 0.25)) ** 2));
      d += "L" + x + " " + f1(Math.min(floor(x), y));
    }
    S.setAttribute("d", d + "L" + W + " " + H + "Z");
    const v = (t * 0.7) % 1;
    q.innerHTML = '<circle cx="90" cy="222" r="' + f1(4 + v * 26) + '" fill="none" stroke="#fff" stroke-width="2" opacity="' + f1(1 - v) + '"/><path d="M90 214l2 5 5 0-4 3 2 6-5-4-5 4 2-6-4-3 5 0z" fill="#ffd23f" stroke="#7a4b00" stroke-width=".6"/>';
  }
  return draw;
}

// ---------- flow: a system as boxes and arrows with moving dots (e.g. endoscope → camera → monitor) ----------
// { scene:"flow", nodes:[{id:"a", label:"Endoscope", sub:"optics", img:"../../media/x.png", pos:[10,50], color:1}], links:[{from:"a", to:"b", label:"image"}], cols:3 }
function flow(el, g, T) {
  const N = g.nodes || [], W = 420, cols = g.cols || Math.min(N.length, 3), rowsN = Math.ceil(N.length / cols);
  const hasImg = N.some(n => n.img), bh = hasImg ? 92 : 54, bw = Math.min(112, (W - 20 - (cols - 1) * 52) / cols);
  const H = g.h || (rowsN * (bh + 46) - 6);
  const palette = ["#1b3a57", "#1f6fb8", "#1d7f47", "#b8322b", "#8a5a00", "#6b3fa0"];
  const P = {};
  N.forEach((n, i) => {
    let x, y;
    if (n.pos) { x = n.pos[0] / 100 * W; y = n.pos[1] / 100 * H; }
    else { const r = Math.floor(i / cols); let c = i % cols; if (r % 2 && !g.noSnake) c = cols - 1 - c; x = 10 + bw / 2 + c * (bw + (W - 20 - cols * bw) / Math.max(1, cols - 1)); if (cols === 1) x = W / 2; y = 20 + bh / 2 + r * (bh + 46); }
    P[n.id] = { x, y, n };
  });
  const wrap = (t, n) => { const w = String(t).split(" "), out = [""]; w.forEach(x => { if ((out[out.length - 1] + " " + x).trim().length > n && out[out.length - 1]) out.push(x); else out[out.length - 1] = (out[out.length - 1] + " " + x).trim(); }); return out.slice(0, 3); };
  let s = svgOpen(W, H, g.label || "System") + arrowDefs("fa");
  const edge = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, k = d => { const sx = Math.abs(dx) > 1e-6 ? (bw / 2 + 4) / Math.abs(dx) : 1e9, sy = Math.abs(dy) > 1e-6 ? (bh / 2 + 4) / Math.abs(dy) : 1e9; return Math.min(sx, sy); };
    const t = k();
    return [a.x + dx * t, a.y + dy * t, b.x - dx * t, b.y - dy * t];
  };
  (g.links || []).forEach((l, i) => {
    const a = P[l.from], b = P[l.to]; if (!a || !b) return;
    const [x1, y1, x2, y2] = edge(a, b);
    s += '<path id="fl' + i + '" class="sc-link" d="M' + f1(x1) + " " + f1(y1) + "L" + f1(x2) + " " + f1(y2) + '" stroke="var(--muted)" stroke-width="2" fill="none" marker-end="url(#fa)"/>';
    if (l.label) s += lab((x1 + x2) / 2 + (Math.abs(y2 - y1) > Math.abs(x2 - x1) ? 8 : 0), (y1 + y2) / 2 - (Math.abs(y2 - y1) > Math.abs(x2 - x1) ? 0 : 9), l.label, { a: Math.abs(y2 - y1) > Math.abs(x2 - x1) ? "start" : "middle", cls: "ink sm" });
  });
  s += '<g class="sc-dots"></g>';
  N.forEach(n => {
    const p = P[n.id], col = palette[(n.color || 1) - 1] || palette[0], x0 = p.x - bw / 2, y0 = p.y - bh / 2;
    s += '<g class="sc-node' + (g.hl === n.id ? " hl" : "") + '"><rect x="' + f1(x0) + '" y="' + f1(y0) + '" width="' + f1(bw) + '" height="' + bh + '" rx="10" fill="var(--surface)" stroke="' + col + '" stroke-width="' + (g.hl === n.id ? 4 : 2) + '"/>';
    let ty = y0 + 20;
    if (n.img) { s += '<image href="' + esc(n.img) + '" x="' + f1(x0 + 6) + '" y="' + f1(y0 + 5) + '" width="' + f1(bw - 12) + '" height="44" preserveAspectRatio="xMidYMid meet"/>'; ty = y0 + 64; }
    const lines = wrap(n.label, Math.max(8, Math.floor(bw / 7.2)));
    lines.forEach((ln, k) => { s += '<text x="' + f1(p.x) + '" y="' + f1(ty + k * 14 - (n.img ? 0 : (lines.length - 1) * 7) + (n.img ? 0 : 6)) + '" text-anchor="middle" class="sc-lab ink" style="fill:' + col + '">' + esc(ln) + "</text>"; });
    if (n.sub) s += '<text x="' + f1(p.x) + '" y="' + f1(y0 + bh - 6) + '" text-anchor="middle" class="sc-lab ink sm">' + esc(n.sub) + "</text>";
    s += "</g>";
  });
  s += "</svg>";
  el.innerHTML = s;
  const paths = [...el.querySelectorAll(".sc-link")], dots = el.querySelector(".sc-dots");
  function draw(t) {
    let d = "";
    paths.forEach((p, i) => {
      let len = 0; try { len = p.getTotalLength(); } catch (e) {}
      if (!len) return;
      for (let k = 0; k < 2; k++) { const u = (t * 0.5 + k / 2 + i * 0.13) % 1, pt = p.getPointAtLength(u * len); d += '<circle cx="' + f1(pt.x) + '" cy="' + f1(pt.y) + '" r="4" fill="var(--signal)" stroke="var(--ink)" stroke-width=".8"/>'; }
    });
    dots.innerHTML = d;
  }
  return draw;
}

// ---------- picture: a photo or drawing with numbered pins ----------
// { scene:"picture", img:"../../media/x.png", alt:"…", pins:[[30,40,"1"],[70,20,"2"]], hl:"2" }
function picture(el, g) {
  let s = '<div class="sc-pic"><img src="' + esc(g.img) + '" alt="' + esc(g.alt || "") + '">';
  (g.pins || []).forEach(([x, y, t]) => { s += '<span class="sc-pin' + (String(g.hl) === String(t) ? " hl" : "") + '" style="left:' + x + "%;top:" + y + '%">' + esc(t) + "</span>"; });
  el.innerHTML = s + "</div>";
  return null;
}

const KINDS = { globe, orbit, rays, plates, volcano, quake, tsunami, flow, picture };

window.Scenes = {
  kinds: Object.keys(KINDS),
  html(g, lang) {
    const data = Object.assign({ lang: lang || "en" }, g);
    return '<figure class="scene-box"><div class="scene" data-scene="' + esc(JSON.stringify(data)) + '"></div>' + (g.caption ? "<figcaption>" + g.caption + "</figcaption>" : "") + "</figure>";
  },
  mount(root) {
    (root || document).querySelectorAll(".scene:not([data-on])").forEach(el => {
      el.dataset.on = "1";
      let g; try { g = JSON.parse(el.dataset.scene); } catch (e) { return; }
      const fn = KINDS[g.scene]; if (!fn) { el.textContent = "Unknown scene: " + g.scene; return; }
      const T = Object.assign({}, TX[g.lang === "de" ? "de" : "en"], g.text || {});
      const draw = fn(el, g, T);
      if (!draw) return;
      const st = { el, draw, t: g.start || 0, paused: REDUCE || g.still === true };
      draw(st.t || 0.01);
      if (g.still === true) return;
      el.classList.toggle("paused", st.paused);
      el.addEventListener("click", e => { e.stopPropagation(); st.paused = !st.paused; st.prev = 0; el.classList.toggle("paused", st.paused); });
      run(st);
    });
  }
};
})();
