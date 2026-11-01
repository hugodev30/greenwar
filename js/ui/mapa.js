// js/ui/mapa.js — Interface: desenho do mapa (SVG), camada de agitação, fichas dos exércitos, setas e frentes.
/* ---------- Mapa ---------- */
function changeNote(c){
  const st = MAP_DATA.states[c.uf], f = STORY.factions[c.to];
  if (c.to === "disputa") return `${c.uf} (${st.name}) entrou em disputa`;
  return `${c.uf} (${st.name}) passou para: ${f ? f.label : c.to}`;
}
function changeNotes(changes){
  if (!changes || !changes.length) return [];
  if (changes.length <= 4) return changes.map(changeNote);
  const groups = {};
  for (const c of changes) (groups[c.to] ||= []).push(c.uf);
  return Object.entries(groups).map(([to, ufs]) => ufs.length === 1 ? changeNote({ uf: ufs[0], to }) :
    (to === "disputa" ? `${ufs.join(", ")} entraram em disputa` : `${ufs.join(", ")} passaram para: ${STORY.factions[to] ? STORY.factions[to].label : to}`));
}
const LABEL_POS = { RN:[598,166], PB:[598,186], PE:[598,206], AL:[598,226], SE:[590,248], ES:[524,382], RJ:[480,446], DF:[406,310] };
// Fase 17 (2022): siglas do Nordeste pequeno DENTRO do estado (letra menor, sem linha até o mar); PE fica a oeste para não bater em Recife
const LABEL_IN = { RN:[549,170], PB:[547,191], PE:[503,212], AL:[549,228], SE:[537,244] };
// Escala "viridis" (perceptualmente uniforme, legível para daltônicos e em tons de cinza): roxo = calmo → verde → amarelo = revolta
const VIRIDIS = [[68,1,84],[72,40,120],[62,74,137],[49,104,142],[38,130,142],[31,158,137],[53,183,121],[109,205,89],[180,222,44],[253,231,37]];
function unrestColor(v){ const t = Math.max(0, Math.min(1, v / 100)) * (VIRIDIS.length - 1), i = Math.min(VIRIDIS.length - 2, Math.floor(t)), u = t - i, a = VIRIDIS[i], b = VIRIDIS[i + 1];
  return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * u)).join(",")})`; }
function unrestLabel(v){ return v >= 88 ? "revolta iminente" : v >= 62 ? "alta" : v >= 30 ? "tensa" : "calma"; }
function mapSVG(control, changed, opts){
  opts = opts || {};
  const ch = new Set((changed||[]).map(c => c.uf));
  const mil = opts.military && opts.g && !phaseOf(opts.g).noArmies;
  const tg = {};
  if (mil && opts.selArmy && opts.selArmy.side === "player" && !opts.static) for (const t of armyTargets(opts.g, opts.selArmy)) if (!opts.tgtMode || (opts.tgtMode === "atacar" ? t.type === "atacar" : t.type !== "atacar")) tg[t.uf] = t.type;
  let paths = "", labels = "";
  const neIn = !!(opts.g && typeof frontMode === "function" && frontMode(opts.g));
  for (const uf in MAP_DATA.states){
    const s = MAP_DATA.states[uf], f = STORY.factions[control[uf]] || STORY.factions[STORY.defaultFaction || "federal"];
    const fill = opts.mode === "agitacao" && opts.g ? unrestColor(opts.g.uf[uf].unrest) : facFill(control[uf]);
    const ia = opts.static ? "" : ` tabindex="0" role="button" aria-label="${esc(uf + " · " + s.name + ": " + (f ? f.label : control[uf]) + (opts.g ? ", agitação " + Math.round(opts.g.uf[uf].unrest) : "") + (tg[uf] ? ", destino possível: " + ORDER_LABEL[tg[uf]].toLowerCase() : ""))}"`;
    paths += `<path class="uf${ch.has(uf)?" changed":""}${opts.sel===uf?" sel":""}${control[uf]==="disputa"?" contested":""}${tg[uf] ? " tgt tgt-" + tg[uf] : ""}${opts.selArmy && opts.selArmy.uf === uf ? " origin" : ""}${opts.pend && opts.pend.to === uf ? " pend" : ""}" data-uf="${uf}" d="${s.d}" fill="${fill}"${ia}></path>`;
    const inn = neIn && LABEL_IN[uf], o = inn || LABEL_POS[uf], x = o ? o[0] : s.lx, y = o ? o[1] : s.ly;
    if (o && !inn) labels += `<line x1="${s.lx}" y1="${s.ly}" x2="${o[0]-10}" y2="${o[1]}"/>`;
    labels += `<text${inn ? ` class="ne"` : ""} x="${x}" y="${y}">${uf}</text>`;
    if (opts.mode === "agitacao" && opts.g) labels += `<text class="uv" x="${x}" y="${y + (MOBILE_MAP() ? 15 : 11)}">${Math.round(opts.g.uf[uf].unrest)}</text>`;
  }
  let L = { fronts: "", pulses: "", arrows: "", counters: "" }, w = 620;
  if (mil){
    L = militaryLayers(opts.g, control, { armies: opts.armies, arrows: opts.arrows !== undefined ? opts.arrows : currentArrows(opts.g), selArmy: opts.selArmy });
    if (opts.pend && opts.selArmy) L.arrows += arrowSVG(opts.selArmy.uf, opts.pend.to, orderArrowClass(opts.pend.type, "player") + " pv");
    const xs = [...L.counters.matchAll(/translate\(([\d.]+),/g)].map(m => +m[1]);
    if (xs.length) w = Math.max(620, Math.ceil(Math.max(...xs) + 24 * CNT_K()));
  }
  const FL = mil && opts.fronts && frontMode(opts.g) ? frontMapLayers(opts.g, control, w, opts) : null;
  if (FL && FL.w > w) w = FL.w;
  const aria = FL ? "Mapa de guerra do Brasil por estados, com os exércitos e as ordens" : `Mapa do Brasil por facção${mil ? ", com exércitos e ordens" : ""}`;
  return `<svg viewBox="0 0 ${w} ${MAP_DATA.size[1]+6}" class="${mil ? "milmap" : ""}${FL ? " fmap" : ""}${MOBILE_MAP() ? " small" : ""}" role="group" aria-label="${aria}. Use Tab para percorrer os estados; a descrição em texto está no botão Descrição do mapa.">${mil ? ARROW_DEFS : ""}${SET.cb || FL ? `<defs>${cbDefs()}${FL ? FL.defs + TARW_DEFS : ""}</defs>` : ""}${paths}${FL ? `<g class="funder">${FL.under}</g>` : ""}<g class="fx">${L.pulses}${L.fronts}</g>${labels}<g class="arrows">${L.arrows}${FL ? FL.over : ""}</g><g class="counters">${L.counters}${FL ? FL.badges : ""}</g></svg>`;
}
function legendHTML(control){
  const counts = {};
  for (const uf in control) counts[control[uf]] = (counts[control[uf]]||0) + 1;
  return Object.keys(STORY.factions).filter(k => counts[k] || (STORY.legendAlways||[]).includes(k))
    .map(k => `<span><i style="background:${STORY.factions[k].color}${cbSwatch(k)}"></i>${esc(STORY.factions[k].label)} (${counts[k]||0})</span>`).join("");
}
function renderMap(el, control, changed, withNotes, opts){
  const notes = withNotes && changed && changed.length ? `<div class="mapnotes">${changeNotes(changed).map(t => `<div>${esc(t)}</div>`).join("")}</div>` : "";
  const agit = opts && opts.mode === "agitacao";
  const milLeg = opts && opts.military && opts.g && frontMode(opts.g) ? (phaseOf(opts.g).war && opts.fronts && opts.g.war.fronts.length ? frontLegendHTML(opts.g) : phaseOf(opts.g).war ? `<div class="milleg" aria-hidden="true">
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H28" stroke="#1a0b06" stroke-width="6"/><path d="M2,5H28" stroke="#ff6a3d" stroke-width="3" stroke-dasharray="5 3"/></svg>linha de frente</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#f3c969" stroke-width="3"/><path d="M22,1L29,5L22,9z" fill="#f3c969"/></svg>você avança</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#b0a898" stroke-width="2.4"/><path d="M22,1L29,5L22,9z" fill="#b0a898"/></svg>você recua</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#ff6a52" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M22,1L29,5L22,9z" fill="#ff6a52"/></svg>ataque inimigo previsto</span></div>` : "")
    : opts && opts.military && opts.g && !phaseOf(opts.g).noArmies ? `<div class="milleg" aria-hidden="true">
    <span><svg viewBox="-21 -10 42 20" width="34" height="16"><g class="cnt p">${counterInner("player", 30, 1)}</g></svg>seu exército (força)</span>
    <span><svg viewBox="-21 -10 42 20" width="34" height="16"><g class="cnt e">${counterInner("enemy", 30, 1)}</g></svg>inimigo</span>
    ${phaseOf(opts.g).war ? `<span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H28" stroke="#1a0b06" stroke-width="6"/><path d="M2,5H28" stroke="#ff6a3d" stroke-width="3" stroke-dasharray="5 3"/></svg>frente de batalha</span>` : ""}
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#f3c969" stroke-width="3"/><path d="M22,1L29,5L22,9z" fill="#f3c969"/></svg>seu ataque</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#cfe3f5" stroke-width="2.4"/><path d="M22,1L29,5L22,9z" fill="#cfe3f5"/></svg>movimento</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#ff6a52" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M22,1L29,5L22,9z" fill="#ff6a52"/></svg>intenção inimiga</span></div>` : "";
  const legend = agit ? `<div class="gradlegend" aria-label="Legenda da agitação: de 0, calmo, a 100, revolta"><div class="gbar" style="background:linear-gradient(90deg,${[0, 20, 40, 60, 80, 100].map(v => unrestColor(v)).join(",")})"></div><div class="gticks"><span style="left:0">0<br>calmo</span><span style="left:30%">30<br>tenso</span><span style="left:62%">62<br>derruba apoio</span><span style="left:88%">88<br>revolta</span><span style="left:100%">100</span></div></div>` : `<div class="legend">${legendHTML(control)}</div>`;
  el.innerHTML = mapSVG(control, changed, opts) + `<div class="maptip"></div>${opts && opts.overlay ? opts.overlay : ""}${legend}${milLeg}` + notes;
  const tip = el.querySelector(".maptip"), svg = el.querySelector("svg");
  const show = (e) => {
    const p = e.target.closest("path.uf, g.cnt"); if (!p || e.target.closest("g.tchip, g.tpct")) { tip.style.display = "none"; return; }
    const uf = p.dataset.uf, f = STORY.factions[control[uf]], r = el.getBoundingClientRect();
    const extra = STORY.stateNotes && STORY.stateNotes[uf] ? `<br><span style="color:#9c9182">${esc(STORY.stateNotesLabel||"")}: ${esc(STORY.stateNotes[uf])}</span>` : "";
    const FM = opts && opts.g && frontMode(opts.g), here = opts && opts.g && opts.military ? (FM ? (opts.tpArmies || tpArmies(opts.g)) : (opts.armies || opts.g.armies || [])).filter(a => a.uf === uf) : [];
    const gx = opts && opts.g ? `<br>Agitação ${Math.round(opts.g.uf[uf].unrest)} (${unrestLabel(opts.g.uf[uf].unrest)})${here.length ? "<br>" + here.map(a => `<span style="color:${a.side === "player" ? "#9cc3ea" : "#f09a86"}">${esc(FM ? tpName(opts.g, a) : a.name)} (${Math.round(a.str)})</span>`).join("<br>") : ""}` : "";
    tip.innerHTML = `<strong>${uf}</strong> · ${esc(MAP_DATA.states[uf].name)}<br>${esc(f ? f.label : control[uf])}${gx}${extra}`;
    tip.style.left = (e.clientX - r.left) + "px"; tip.style.top = (e.clientY - r.top) + "px"; tip.style.display = "block";
  };
  svg.addEventListener("mousemove", show);
  svg.addEventListener("mouseleave", () => tip.style.display = "none");
  if (opts && opts.onPick) svg.addEventListener("click", e => {
    // guerra de 2022: ficha de exército → onTropa; estado destacado (ou etiqueta de chance) → onTpTarget
    const tc = e.target.closest("g.tchip"); if (tc && opts.onTropa){ tip.style.display = "none"; if (el._tpLong){ el._tpLong = false; return; } opts.onTropa(tc.dataset.army, e.shiftKey || e.ctrlKey || e.metaKey); return; }
    const tr = e.target.closest("g.tpct, path.ttg"); if (tr && opts.onTpTarget){ tip.style.display = "none"; opts.onTpTarget(tr.dataset.uf); return; }
    const c = e.target.closest("g.cnt"); if (c && opts.onArmy){ tip.style.display = "none"; opts.onArmy(c.dataset.uf, c.dataset.side); return; }
    const p = e.target.closest("path.uf"); if (p) opts.onPick(p.dataset.uf); });
  else svg.addEventListener("click", show);
  // fase 18: toque longo numa ficha = marcar/desmarcar para unificar (como Shift+clique)
  if (opts && opts.onTropa){ let lp = null;
    const stop = () => { if (lp){ clearTimeout(lp.t); lp = null; } };
    svg.addEventListener("pointerdown", e => { const tc = e.target.closest("g.tchip"); stop(); el._tpLong = false; if (!tc) return;
      lp = { x: e.clientX, y: e.clientY, t: setTimeout(() => { lp = null; el._tpLong = true; if (navigator.vibrate) try { navigator.vibrate(20); } catch (_){} opts.onTropa(tc.dataset.army, true); }, 550) }; });
    svg.addEventListener("pointermove", e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) stop(); });
    svg.addEventListener("pointerup", stop); svg.addEventListener("pointercancel", stop);
    svg.addEventListener("contextmenu", e => { if (e.target.closest("g.tchip")) e.preventDefault(); }); }
  if (opts && opts.zoom) mapZoomAttach(el, opts); // zoom e arraste (js/ui/mapa-zoom.js), só no mapa principal
}

/* ---------- Camadas militares do mapa: fronteiras de frente, setas de ordens, contadores (OTAN) ---------- */
const STATE_PTS = {}, BORDER_CACHE = {};
function statePts(uf){ return STATE_PTS[uf] || (STATE_PTS[uf] = [...MAP_DATA.states[uf].d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map(m => [+m[1], +m[2]])); }
// Trecho de fronteira compartilhado entre dois estados (vértices de A encostados no polígono de B)
function sharedBorder(a, b){
  const k = a < b ? a + b : b + a; if (k in BORDER_CACHE) return BORDER_CACHE[k];
  const A = statePts(a < b ? a : b), B = statePts(a < b ? b : a);
  const segd = (p, s, t) => { const dx = t[0]-s[0], dy = t[1]-s[1], L = dx*dx+dy*dy; let u = L ? ((p[0]-s[0])*dx + (p[1]-s[1])*dy) / L : 0; u = Math.max(0, Math.min(1, u)); return Math.hypot(s[0]+u*dx-p[0], s[1]+u*dy-p[1]); };
  const near = A.map(p => { for (let i = 0; i < B.length - 1; i++) if (segd(p, B[i], B[i+1]) < 0.8) return true; return false; });
  let d = "", run = [];
  const flush = () => { if (run.length >= 2) d += "M" + run.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L"); run = []; };
  A.forEach((p, i) => { if (near[i]) run.push(p); else flush(); }); flush();
  return (BORDER_CACHE[k] = d);
}
const MOBILE_MAP = () => window.innerWidth < 600;
function ufAnchor(uf){ const s = MAP_DATA.states[uf], o = LABEL_POS[uf]; return o ? { x: o[0], y: o[1], side: true } : { x: s.lx, y: s.ly }; }
const CNT_K = () => MOBILE_MAP() ? 1.2 : 1;
function counterPos(uf, side, both){
  const a = ufAnchor(uf), k = CNT_K();
  if (a.side) return { x: a.x + 31 * k + (both && side === "enemy" ? 42 * k : 0), y: a.y };
  return { x: a.x + (both ? (side === "player" ? -21 : 21) * k : 0), y: a.y + 19 * k };
}
// Ficha de exército: moldura azul (sua) ou vermelha (inimiga), símbolo OTAN (retângulo = amigo, losango = hostil),
// força em número grande e barra de força embaixo — legível sem depender só da cor.
function counterInner(side, str, n, cap){
  const pct = Math.max(0.04, Math.min(1, str / (cap || ARMY_MAX))), sym = side === "player"
    ? `<rect class="sym" x="-17" y="-5" width="11" height="8"/><path class="sym" d="M-17,-5L-6,3M-17,3L-6,-5"/>`
    : `<path class="sym" d="M-11.5,-6.5L-5.5,-1L-11.5,4.5L-17.5,-1z"/><path class="sym" d="M-14.5,-3.8L-8.5,1.8M-14.5,1.8L-8.5,-3.8"/>`;
  return `<rect class="bg" x="-20" y="-9" width="40" height="18" rx="3"/>${sym}
    <text class="cn" x="7" y="-1">${str}</text><rect class="sb0" x="-17" y="5" width="34" height="2.2" rx="1"/><rect class="sb" x="-17" y="5" width="${(34 * pct).toFixed(1)}" height="2.2" rx="1"/>
    ${n > 1 ? `<circle class="badge" cx="18" cy="-8" r="5"/><text class="cb" x="18" y="-7.6">${n}</text>` : ""}`;
}
function counterSVG(side, uf, list, opts){
  const both = opts.both, p = counterPos(uf, side, both), k = CNT_K();
  const str = Math.round(list.reduce((s, a) => s + a.str, 0)), sel = opts.selArmy && list.some(a => a.id === opts.selArmy.id);
  const ordered = side === "player" && list.some(a => a.order), n = list.length;
  const nm = `${side === "player" ? "Seu" : "Inimigo"}${n > 1 ? `s ${n} exércitos` : ": " + list[0].name}, força ${str}${ordered ? ", com ordem" : ""} em ${uf}`;
  return `<g class="cnt ${side === "player" ? "p" : "e"}${sel ? " sel" : ""}${ordered ? " ord" : ""}" data-uf="${uf}" data-side="${side}" data-id="${list[0].id}" tabindex="0" role="button" aria-label="${esc(nm)}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) scale(${k})"><title>${esc(nm)}</title>
    ${counterInner(side, str, n, ARMY_MAX * n)}${ordered ? `<path class="ordmk" d="M-20,-9L-13,-9L-20,-2z"/>` : ""}</g>`;
}
// Seta curva entre dois estados
function arrowPt(k){ return MAP_DATA.states[k]; }
function arrowSVG(from, to, cls, short){
  const a = arrowPt(from), b = arrowPt(to), k0 = short ? 2 : 6, k1 = short ? 4 : 9;
  const x1 = a.lx, y1 = a.ly, x2 = b.lx, y2 = b.ly, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const sx = x1 + dx / L * k0, sy = y1 + dy / L * k0, ex = x2 - dx / L * k1, ey = y2 - dy / L * k1;
  const cx = (sx + ex) / 2 - dy / L * L * 0.18, cy = (sy + ey) / 2 + dx / L * L * 0.18;
  return `<path class="arw ${cls}" d="M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#ah-${cls.split(" ")[0]})"/>`;
}
const ARROW_DEFS = `<defs>${[["pl", "#f3c969"], ["mv", "#cfe3f5"], ["en", "#ff6a52"], ["rt", "#b0a898"]].map(([id, c]) => `<marker id="ah-${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join("")}
  <radialGradient id="smk"><stop offset="0" stop-color="#d8d2c6" stop-opacity=".75"/><stop offset="1" stop-color="#6d665c" stop-opacity="0"/></radialGradient>
  <radialGradient id="fls"><stop offset="0" stop-color="#fff6d0"/><stop offset=".45" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff5a2a" stop-opacity="0"/></radialGradient></defs>`;
function orderArrowClass(type, side){ return side === "enemy" ? "en" : type === "atacar" ? "pl" : type === "recuar" ? "rt" : "mv"; }
// Monta as camadas militares (frentes, pulsos, setas, contadores) para um estado de jogo
function militaryLayers(g, control, opts){
  const ph = phaseOf(g), war = !!ph.war;
  let fronts = "", pulses = "", arrows = "", counters = "";
  const side = uf => sideOf(g, control[uf], ph);
  if (war) for (const a in ADJ) for (const b of ADJ[a]){
    if (a > b) continue;
    const sa = side(a), sb = side(b);
    const hostile = (sa === "player" && (sb === "enemy" || sb === "contested")) || (sb === "player" && (sa === "enemy" || sa === "contested")) || (sa === "contested" && sb === "enemy") || (sb === "contested" && sa === "enemy");
    if (hostile){ const d = sharedBorder(a, b); if (d) fronts += `<path class="frontcase" d="${d}"/><path class="front${sa === "contested" || sb === "contested" ? " hot" : ""}" d="${d}"/>`; }
  }
  for (const uf in control) if (war && side(uf) === "contested") pulses += `<path class="battlefx" d="${MAP_DATA.states[uf].d}"/>`;
  const armies = opts.armies || g.armies || [];
  if (opts.arrows) for (const o of opts.arrows) arrows += arrowSVG(o.from, o.to, orderArrowClass(o.type, o.side) + (o.side === "enemy" ? " intent" : ""));
  const groups = {};
  for (const a of armies) (groups[a.uf + "|" + a.side] ||= []).push(a);
  for (const key in groups){
    const [uf, s] = key.split("|"), both = !!groups[uf + "|" + (s === "player" ? "enemy" : "player")];
    counters += counterSVG(s, uf, groups[key], { both, selArmy: opts.selArmy });
  }
  return { fronts, pulses, arrows, counters };
}
function currentArrows(g){
  if (frontMode(g)) return []; // 2022: setas dos exércitos em js/ui/mapa-frentes.js
  const out = [];
  for (const a of armiesOf(g, "player")) if (a.order && a.order.to) out.push({ side: "player", from: a.uf, to: a.order.to, type: a.order.type });
  for (const p of knownIntents(g)){ const a = armyById(g, p.id); if (a) out.push({ side: "enemy", from: a.uf, to: p.to, type: p.type }); }
  return out;
}
