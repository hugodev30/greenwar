// js/ui/mapa-frentes.js — Interface: mapa da guerra de 2022 com EXÉRCITOS nos estados — fichas OTAN com a força,
// destinos destacados com a chance de vitória (%) e o bônus de flanco, setas grossas das suas ordens e do plano inimigo,
// faixa da linha de frente, sua capital, Recife (a capital inimiga) e o caminho mais curto até ela ("Recife a N estados").
/* Só desenha quando mapSVG recebe opts.fronts (aba Mapa e animação do fim do mês). Tudo é SVG simples (sem filtros pesados) para rodar bem no celular.
   As fichas (g.tchip) e as etiquetas de chance (g.tpct) são contra-escaladas no zoom (js/ui/mapa-zoom.js): continuam legíveis de longe e de perto.
   Estados pequenos do Nordeste (RN, PB, PE, AL, SE) têm a ficha no mar, ao lado do rótulo, em duas colunas alternadas.
   Fase 16: até 3 exércitos do mesmo lado num estado — aparece uma ficha só (o selecionado, ou o que está sem ordem, ou o mais forte)
   com fichas "empilhadas" atrás e um selo ×N; tocar de novo na ficha passa para o próximo exército da pilha. */
const FMAP_COL = () => SET.cb ? { p: "#0072B2", e: "#D55E00", pl: "#9fd3ff", el: "#ffc499" } : { p: "#2a5d93", e: "#a3301f", pl: "#9cc3ea", el: "#f0a493" };
const TCHIP_K = () => MOBILE_MAP() ? 1.75 : 1.15;
// onde fica a ficha de cada estado (centro): embaixo do rótulo; DF, ES e RJ ao lado do rótulo; NE pequeno no mar
const TP_CHIP_SIDE = { DF: [28, 10], ES: [24, 0], RJ: [26, 0] }, TP_CHIP_SEA = ["RN", "PB", "PE", "AL", "SE"];
const TP_COAST = { RN: [571, 172], PB: [574, 189], PE: [573, 206], AL: [567, 223], SE: [552, 240] }; // ponto da costa de cada estado pequeno
function tpChipPos(uf){
  const s = MAP_DATA.states[uf], o = LABEL_POS[uf], k = TCHIP_K();
  // fase 17: a ficha encosta na costa do próprio estado (duas colunas alternadas, para não sobrepor no celular)
  if (TP_CHIP_SEA.includes(uf)){ const i = TP_CHIP_SEA.indexOf(uf), c = TP_COAST[uf], c0 = c[0] + 4 + 19 * k; return [i % 2 ? c0 + 38 * k + 3 : c0, c[1]]; }
  if (TP_CHIP_SIDE[uf]){ const d = TP_CHIP_SIDE[uf]; return [o[0] + d[0] * k / 1.15, o[1] + d[1]]; }
  return [s.lx, s.ly + 8 + 10 * k];
}
// fase 18: vários exércitos do mesmo lado num estado ficam lado a lado (nunca um em cima do outro).
// 2 = uma fileira; 3 = dois em cima e um embaixo; nos estados pequenos do Nordeste, colunas intercaladas no mar.
const TP_SLOT_W = 41, TP_SLOT_H = 23;
function tpSlotOffsets(uf, n){
  const k = TCHIP_K(), w = TP_SLOT_W * k, h = TP_SLOT_H * k;
  if (TP_CHIP_SEA.includes(uf)){ const cw = 38 * k + 3; return Array.from({ length: n }, (_, j) => [2 * j * cw, 0]); }
  if (n <= 1) return [[0, 0]];
  if (n === 2) return [[-w / 2, 0], [w / 2, 0]];
  return [[-w / 2, 0], [w / 2, 0], [0, h]].concat(Array.from({ length: n - 3 }, (_, j) => [(j % 2 ? 1 : -1) * w, h * (1 + (j >> 1))]));
}
const tpSeqN = a => +String(a.id).replace(/\D/g, "") || 0;
function tpChipSlots(armies){
  const by = {}, out = {}; for (const a of armies) (by[a.side + ":" + a.uf] ||= []).push(a);
  for (const L of Object.values(by)){ L.sort((x, y) => tpSeqN(x) - tpSeqN(y)); const [x0, y0] = tpChipPos(L[0].uf), off = tpSlotOffsets(L[0].uf, L.length);
    L.forEach((a, i) => { out[a.id] = [x0 + off[i][0], y0 + off[i][1]]; }); }
  return out;
}
// ponto do estado (setas e estrelas): Recife e Porto Alegre ficam onde as cidades estão
const TP_CITY = { PE: [566, 207], RS: [330, 546], DF: [384.3, 320.7] };
function tpUfPt(uf){ const c = TP_CITY[uf]; if (c) return c; const s = MAP_DATA.states[uf]; return [s.lx, s.ly]; }
// Geometria de uma frente: trechos de fronteira entre os seus estados e os do inimigo dela
function frontGeom(g, f){
  const B = frontBorder(g, f.id), segs = [];
  for (const a of B.mine) for (const b of B.theirs) if (ADJ[a].includes(b)){ const d = sharedBorder(a, b); if (d) segs.push(d); }
  return segs.length ? { mine: B.mine, theirs: B.theirs, d: segs.join(""), shape: k => MAP_DATA.states[k].d } : null;
}
// Camadas extras do mapa de frentes: { under, over, defs, badges, w (largura necessária) }
function frontMapLayers(g, control, w, opts){
  opts = opts || {};
  const ph = phaseOf(g), W = g.war, C = FMAP_COL(), K = frontCfg(g), out = { defs: "", under: "", over: "", badges: "", w };
  const hatch = (id, col, ang, sw, gap, op) => `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><rect width="${gap}" height="${gap}" fill="none"/><path d="M0,0V${gap}" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}"/></pattern>`;
  out.defs += hatch("fhP", C.p, 45, 2, 5, .85) + hatch("fhE", C.e, -45, 2, 5, .85);
  out.defs += `<marker id="frotaArr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ffe08a"/></marker>`;
  // guerra acabou (ex.: Recife caiu neste mês): a animação ainda mostra os exércitos do começo do mês
  const armyLayers = () => { const L = tpMapLayers(g, opts); out.over += L.targets + L.arrows; out.badges += L.chips; out.w = Math.max(w, Math.ceil(Math.max(tpChipPos("PB")[0], L.maxX || 0) + 22 * TCHIP_K() + 4)); };
  if (!ph.war || !W || !W.fronts.length){ if (W && opts.static && opts.tpArmies) armyLayers(); return out; }
  for (const f of W.fronts){
    const G0 = frontGeom(g, f); if (!G0) continue;
    // faixa sombreada dos dois lados, só perto da linha (traço largo recortado pelos estados de cada lado)
    out.defs += `<clipPath id="fcp-${f.id}">${G0.mine.map(k => `<path d="${G0.shape(k)}"/>`).join("")}</clipPath><clipPath id="fce-${f.id}">${G0.theirs.map(k => `<path d="${G0.shape(k)}"/>`).join("")}</clipPath>`;
    out.under += `<path class="fband p" d="${G0.d}" stroke="url(#fhP)" clip-path="url(#fcp-${f.id})"/><path class="fband e" d="${G0.d}" stroke="url(#fhE)" clip-path="url(#fce-${f.id})"/>`;
  }
  // caminho mais curto até Recife (tracejado discreto, estado por estado)
  if (!opts.static) for (const f of W.fronts){
    const D = K.frentes[f.id]; if (!D || !D.vitoria) continue;
    const P = tpGoalPath(g, f.id); if (!P || P.length < 2) continue;
    const from = ADJ[P[0]].filter(x => tpSide(g, x) === "player").map(x => [x, tpUfPt(x)]), p0 = tpUfPt(P[0]);
    from.sort((a, b) => Math.hypot(a[1][0] - p0[0], a[1][1] - p0[1]) - Math.hypot(b[1][0] - p0[0], b[1][1] - p0[1]));
    const pts = (from.length ? [from[0][1]] : []).concat(P.map(tpUfPt)).map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`);
    out.over += `<polyline class="frota" points="${pts.join(" ")}" marker-end="url(#frotaArr)"><title>${esc(frontFala(g, "mapa", "rota"))}</title></polyline>`;
  }
  // capital (estrela dourada) e capitais inimigas das frentes abertas (estrela vermelha grande + nome: "Recife — capital da Resistência")
  const STAR = "M0,-6.5L1.9,-2L6.6,-2L2.8,1L4.2,5.8L0,3L-4.2,5.8L-2.8,1L-6.6,-2L-1.9,-2z";
  const mark = (uf, cls, lbl, name) => { const [x, y] = tpUfPt(uf);
    // fase 17: só o nome curto ("Recife"), à esquerda da estrela; o nome inteiro fica na dica (title)
    const short = name ? name.split(" — ")[0] : "", t = short ? `<text class="fglbl" x="-10" y="0" text-anchor="end" translate="no">${esc(short)}</text>` : "";
    return `<g class="fgoal ${cls}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><title>${esc(name || lbl)}</title><g class="zinv">${cls === "cap" ? `<path d="${STAR}"/>` : `<path class="big" d="${STAR}" transform="scale(1.45)"/>`}${t}</g></g>`; };
  if (K.capital && sideOf(g, control[K.capital], ph) === "player") out.over += mark(K.capital, "cap", `${K.capital}: sua capital — se cair, o regime cai`, "");
  for (const f of W.fronts){ const r = K.frentes[f.id] && K.frentes[f.id].reduto; if (r && control[r] !== undefined && sideOf(g, control[r], ph) !== "player") out.over += mark(r, "goal", `${r}: capital inimiga — ${frontName(g, f)}`, frontFala(g, "reduto", f.id)); }
  // exércitos: destinos do selecionado (com a chance), setas das ordens e as fichas por cima de tudo
  armyLayers();
  return out;
}
/* ---------- Exércitos no mapa ---------- */
// cor da chance: verde (boa), amarela (arriscada), vermelha (ruim)
function tpChanceCls(c){ return c >= 60 ? "good" : c >= 40 ? "mid" : "bad"; }
function tpChipLabel(g, a){
  const F = k => frontFala(g, "tropas", k), o = a.order;
  const ord = a.side !== "player" ? "" : o ? ` · ${F(o.type === "atacar" ? "ordemAtaca" : "ordemVai")} ${ufName(o.to)}` : ` · ${F("semOrdemCurta")}`;
  return `${tpName(g, a)} · ${ufName(a.uf)} · ${F("forca")} ${Math.round(a.str)} · ${F("moral")} ${Math.round(a.morale ?? 60)}${ord}${a.cut ? " · " + frontFala(g, "cerco", "chip") : ""}`;
}
// Ficha OTAN: retângulo azul com X (seu) ou losango vermelho (inimigo), força em número grande e barra de moral embaixo.
// Cercado: moldura tracejada vermelha e um cadeado.
function tpChipSVG(g, a, o, cut, pos){
  if (!MAP_DATA.states[a.uf]) return "";
  const [x, y] = pos || tpChipPos(a.uf), k = TCHIP_K(), P = a.side === "player", gen = g.war && g.war.gens && P ? tpGen(g, a) : null, lbl = tpChipLabel(g, a);
  const mor = Math.max(0.05, Math.min(1, (a.morale ?? 60) / 100));
  const sym = P ? `<rect class="sym" x="-16" y="-5.5" width="10" height="8"/><path class="sym" d="M-16,-5.5L-6,2.5M-16,2.5L-6,-5.5"/>`
    : `<path class="sym" d="M-11,-7L-5,-1.5L-11,4L-17,-1.5z"/><path class="sym" d="M-14,-4.3L-8,1.2M-14,1.2L-8,-4.3"/>`;
  const cls = `tchip ${P ? "p" : "e"}${o.sel === a.id ? " sel" : ""}${o.mark && o.mark.length > 1 && o.mark.includes(a.id) ? " mk" : ""}${P && a.order ? " ord" : ""}${a.special ? " sp" : ""}${cut ? " cut" : ""}${o.dim && o.sel && o.sel !== a.id && P && !(o.mark && o.mark.length > 1 && o.mark.includes(a.id)) ? " dim" : ""}`;
  return `<g class="${cls}" data-army="${a.id}" data-uf="${a.uf}" tabindex="0" role="button" aria-label="${esc(lbl)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})"><title>${esc(lbl)}</title>
    ${o.sel === a.id ? `<rect class="ring" x="-22" y="-14" width="44" height="28" rx="6"/>` : ""}${cut ? `<rect class="cutr" x="-21.5" y="-12.5" width="43" height="25" rx="5"/>` : ""}<rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/>${sym}
    <text class="cn" x="6.5" y="0.5">${Math.round(a.str)}</text><rect class="mb0" x="-16" y="5.2" width="32" height="2.2" rx="1"/><rect class="mb" x="-16" y="5.2" width="${(32 * mor).toFixed(1)}" height="2.2" rx="1"/>
    ${gen ? `<g class="gs" transform="translate(17,-9)"><circle r="4.6"/><text y="0.6">★</text></g>` : ""}${P && a.order ? `<path class="ordmk" d="M-19,-10L-12,-10L-19,-3z"/>` : ""}${a.special ? `<text class="spk" x="-21" y="-9">💥</text>` : ""}${cut ? `<text class="cutk" x="-20" y="12">⛓</text>` : ""}${o.mark && o.mark.length > 1 && o.mark.includes(a.id) ? `<g class="mkc" transform="translate(-19,-10)"><circle r="5.6"/><text y="0.6">✓</text></g>` : ""}${a.xp >= 30 && P ? `<text class="xps" x="-1" y="-11.5">${a.xp >= 70 ? "★★" : "★"}</text>` : ""}</g>`;
}
// Pilhas de exércitos (mesmo lado, mesmo estado): qual aparece por cima — o selecionado, depois o sem ordem, depois o mais forte
function tpStacks(armies, selId){
  const by = {}; for (const a of armies) (by[a.side + ":" + a.uf] ||= []).push(a);
  return Object.values(by).map(L => { L = L.slice().sort((x, y) => (y.id === selId) - (x.id === selId) || (!!x.order - !!y.order) || y.str - x.str || (x.id < y.id ? -1 : 1)); return { top: L[0], list: L }; });
}
// Seta grossa: começa na ficha do exército e passa pelos estados do caminho (pts = UFs); a ponta para antes do centro do destino
function tpArrowSVG(pts, cls, title, start){
  if (!pts || pts.length < 2 || pts.some(u => !MAP_DATA.states[u])) return "";
  const P = [start || tpChipPos(pts[0])].concat(pts.slice(1).map(tpUfPt));
  const cut = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(0.45, d / L); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const s = cut(P[0], P[1], 12), n = P.length, e = cut(P[n - 1], P[n - 2], 7), pts2 = [s].concat(P.slice(1, -1), [e]);
  let d = `M${s[0].toFixed(1)},${s[1].toFixed(1)}`;
  if (pts2.length === 2){ const [x1, y1] = s, [x2, y2] = e, dx = x2 - x1, dy = y2 - y1; d += ` Q${((x1 + x2) / 2 - dy * 0.2).toFixed(1)},${((y1 + y2) / 2 + dx * 0.2).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; }
  else for (let i = 1; i < pts2.length; i++) d += `L${pts2[i][0].toFixed(1)},${pts2[i][1].toFixed(1)}`;
  return `<g class="tarw ${cls}">${title ? `<title>${esc(title)}</title>` : ""}<path class="cs" d="${d}"/><path class="ln" d="${d}" marker-end="url(#tah-${cls.split(" ")[0]})"/></g>`;
}
const TARW_DEFS = `${[["pl", "#f3c969"], ["mv", "#cfe3f5"], ["en", "#ff5a42"], ["pv", "#fff2b0"]].map(([id, c]) => `<marker id="tah-${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c}" stroke="#140c06" stroke-width="1"/></marker>`).join("")}`;
// Setas padrão: suas ordens (amarelo = ataque, azul-claro = movimento) e os ataques planejados pelo inimigo (vermelho tracejado)
function tpArrowList(g){
  const out = [], F = k => frontFala(g, "tropas", k);
  for (const a of tpArmies(g)){ const o = a.order; if (!o || !o.to) continue;
    if (a.side === "enemy" && o.type !== "atacar") continue;
    out.push({ id: a.id, pts: [a.uf].concat(o.path && o.path.length ? o.path : [o.to]), cls: a.side === "enemy" ? "en" : o.type === "atacar" ? "pl" : "mv",
      title: `${tpName(g, a)}: ${F(o.type === "atacar" ? "ordemAtaca" : "ordemVai")} ${ufName(o.to)}` }); }
  return out;
}
// Camadas dos exércitos: { targets, arrows, chips }. opts: tpSel, tpPend, tpArmies (lista própria, na animação), tpArrows, tpHot (estados em batalha)
function tpMapLayers(g, opts){
  const out = { targets: "", arrows: "", chips: "" }; if (!g.war || !g.war.armies) return out;
  const armies = opts.tpArmies || tpArmies(g), sel = opts.tpSel ? tpById(g, opts.tpSel) : null, k = TCHIP_K();
  const SL = tpChipSlots(armies); out.maxX = Math.max(0, ...Object.values(SL).map(p => p[0]));
  if (opts.tpHot) for (const uf of opts.tpHot){ const S = MAP_DATA.states[uf]; if (S) out.targets += `<path class="thot" d="${S.d}"/>`; }
  if (sel && sel.side === "player" && !opts.static){
    const S0 = MAP_DATA.states[sel.uf]; if (S0) out.targets += `<path class="tsrc" d="${S0.d}"/>`;
    for (const t of tpTargets(g, sel)){
      const S = MAP_DATA.states[t.to], pend = opts.tpPend === t.to, atk = t.type === "atacar", F = x => frontFala(g, "tropas", x);
      const od = atk ? tpChance(g, sel, t.to) : null, c = atk ? Math.round(od.chance * 100) : null, fl = atk && od.flank > 1.005 ? Math.round((od.flank - 1) * 100) : 0;
      const lbl = `${ufName(t.to)}: ${F(atk ? (t.empty ? "ocupar" : "atacar") : t.type)}${atk ? ` · ${F("chance")} ${c}%` : ""}${fl ? ` · ${F("flancoChip")} +${fl}%` : ""}`;
      out.targets += `<path class="uf ttg ${t.type}${pend ? " pend" : ""}${t.final ? " final" : ""}" data-uf="${t.to}" d="${S.d}"><title>${esc(lbl)}</title></path>`;
      const busy = armies.some(a => a.uf === t.to && a !== sel), [cx, cy] = tpChipPos(t.to), x = cx, y = cy - (busy ? 22 * k : 0);
      out.chips += `<g class="tpct ${atk ? tpChanceCls(c) : "mv"}${pend ? " pend" : ""}${t.final ? " final" : ""}" data-uf="${t.to}" tabindex="0" role="button" aria-label="${esc(lbl)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})"><title>${esc(lbl)}</title>
        <rect x="${atk ? -15 : -9}" y="-7.5" width="${atk ? 30 : 18}" height="15" rx="7.5"/><text y="0.6">${atk ? c + "%" : t.stack ? "➜" + (t.stack + 1) : "➜"}</text>${fl ? `<g class="flk" transform="translate(0,-12)"><rect x="-15" y="-5" width="30" height="10" rx="5"/><text y="0.4">⚔ +${fl}%</text></g>` : ""}</g>`;
    }
    if (opts.tpPend){ const t = tpTargets(g, sel).find(x => x.to === opts.tpPend); if (t) out.arrows += tpArrowSVG([sel.uf].concat(t.path), "pv", "", SL[sel.id]); }
  }
  for (const A of (opts.tpArrows || tpArrowList(g))) if (!(sel && A.id === sel.id && opts.tpPend)) out.arrows += tpArrowSVG(A.pts, A.cls, A.title, SL[A.id]);
  // fichas: inimigas embaixo, as suas por cima; a selecionada por último
  const order = tpStacks(armies, sel && sel.id).sort((a, b) => (a.top.side === "player") - (b.top.side === "player") || ((sel && a.list.includes(sel)) - (sel && b.list.includes(sel))));
  const pct = out.chips, Lk = {}; out.chips = "";
  const cutOf = a => { if (opts.static) return !!a.cut; const key = a.side + a.fac; if (!(key in Lk)) Lk[key] = tpLinked(g, a.side, a.fac); return tpCut(g, a, Lk[key]); };
  const mark = sel && opts.tpMark ? opts.tpMark : null;
  for (const S of order) for (const a of S.list.slice().sort((x, y) => (x === sel) - (y === sel))) out.chips += tpChipSVG(g, a, { sel: sel && sel.id, dim: !!sel, mark }, cutOf(a), SL[a.id]);
  out.chips += pct;
  return out;
}
function frontLegendHTML(g){
  const F = k => frontFala(g, "tropas", k), arw = (c, dash) => `<svg viewBox="0 0 30 12" width="30" height="12"><path d="M2,6H22" stroke="#140c06" stroke-width="6"/><path d="M2,6H22" stroke="${c}" stroke-width="3.6"${dash ? ' stroke-dasharray="5 3"' : ""}/><path d="M21,1L29,6L21,11z" fill="${c}"/></svg>`;
  return `<div class="milleg fleg" aria-hidden="true">
    <span><svg viewBox="-20 -11 40 22" width="34" height="18"><g class="tchip p"><rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/><rect class="sym" x="-16" y="-5.5" width="10" height="8"/><path class="sym" d="M-16,-5.5L-6,2.5M-16,2.5L-6,-5.5"/><text class="cn" x="6.5" y="0.5">40</text></g></svg>${esc(F("legSeu"))}</span>
    <span><svg viewBox="-20 -11 40 22" width="34" height="18"><g class="tchip e"><rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/><path class="sym" d="M-11,-7L-5,-1.5L-11,4L-17,-1.5z"/><text class="cn" x="6.5" y="0.5">35</text></g></svg>${esc(F("legInimigo"))}</span>
    <span><svg viewBox="-23 -14 46 28" width="34" height="20"><g class="tchip e cut"><rect class="cutr" x="-21.5" y="-12.5" width="43" height="25" rx="5"/><rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/><text class="cn" x="0" y="0.5">12</text></g></svg>${esc(frontFala(g, "cerco", "chip"))}</span>
    <span><svg viewBox="-16 -8 32 16" width="30" height="15"><g class="tpct good"><rect x="-15" y="-7.5" width="30" height="15" rx="7.5"/><text y="0.6">65%</text></g></svg>${esc(F("legAlvo"))}</span>
    <span>${arw("#f3c969")}${esc(F("atacar"))}</span><span>${arw("#cfe3f5")}${esc(F("mover"))}</span><span>${arw("#ff5a42", true)}${esc(F("legPlano"))}</span>
    <span><svg viewBox="-7 -7 14 14" width="13" height="13"><path d="M0,-6.5L1.9,-2L6.6,-2L2.8,1L4.2,5.8L0,3L-4.2,5.8L-2.8,1L-6.6,-2L-1.9,-2z" fill="#f3c969" stroke="#1a1408"/></svg>sua capital</span>
    <span><svg viewBox="-10 -10 20 20" width="15" height="15"><path d="M0,-9.4L2.8,-2.9L9.6,-2.9L4.1,1.5L6.1,8.4L0,4.4L-6.1,8.4L-4.1,1.5L-9.6,-2.9L-2.8,-2.9z" fill="#e0412f" stroke="#fff" stroke-width="1.4"/></svg>capital inimiga (vitória)</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H23" stroke="#ffe08a" stroke-width="1.8" stroke-dasharray="3 3"/><path d="M22,1.5L29,5L22,8.5z" fill="#ffe08a"/></svg>caminho mais curto até a capital inimiga</span></div>`;
}
