// js/core/efeitos.js — Núcleo: aplica efeitos (fx) nos indicadores, facções, atores e no mapa.
/* ---------- Efeitos ---------- */
function applyStats(g, eff, viaStory){
  const sc = scOf(g), C = sc.campaign;
  for (const k in (eff||{})){
    if (!(k in g.stats)) continue;
    const before = g.stats[k];
    g.stats[k] = clamp(before + eff[k], 0, 100);
    const d = g.stats[k] - before;
    g.lastDelta[k] = (g.lastDelta[k]||0) + d;
    if (!d) continue;
    for (const f of C.factions) if (f.links && f.links[k]) bumpFac(g, f.id, d * f.links[k]);
    if (viaStory && C.actorStat) for (const aid in C.actorStat) if (C.actorStat[aid] === k) g.actors[aid].opinion = clamp(g.actors[aid].opinion + d*2, -100, 100);
  }
}
function bumpFac(g, id, d){ const f = g.fac[id]; if (f) f.loyalty = clamp(Math.round((f.loyalty + d) * 10) / 10, 0, 100); }
function bumpActor(g, id, d){ const a = g.actors[id]; if (a) a.opinion = clamp(Math.round(a.opinion + d), -100, 100); }
function syncActorStats(g){ const C = scOf(g).campaign; if (C.actorStat) for (const aid in C.actorStat){ const k = C.actorStat[aid]; if (k in g.stats) g.stats[k] = clamp(Math.round((g.actors[aid].opinion + 100) / 2), 0, 100); } }
function playerUFs(g){ const ph = phaseOf(g); return Object.keys(g.control).filter(uf => sideOf(g, g.control[uf], ph) === "player"); }
function applyFx(g, fx, rep){
  if (!fx) return;
  if (fx.s) applyStats(g, fx.s);
  if (fx.money) g.money = Math.round(g.money + fx.money);
  if (fx.reserve) addPlayerStrength(g, fx.reserve * STR_UNIT);
  if (fx.fac) for (const id in fx.fac) bumpFac(g, id, fx.fac[id]);
  if (fx.infl) for (const id in fx.infl) if (g.fac[id]) g.fac[id].influence = clamp(g.fac[id].influence + fx.infl[id], 5, 100);
  if (fx.unrest) for (const uf of playerUFs(g)) g.uf[uf].unrest = clamp(g.uf[uf].unrest + fx.unrest, 0, 100);
  if (fx.unrestAll) for (const uf in g.uf) g.uf[uf].unrest = clamp(g.uf[uf].unrest + fx.unrestAll, 0, 100);
  if (fx.unrestUF) for (const uf in fx.unrestUF) g.uf[uf].unrest = clamp(g.uf[uf].unrest + fx.unrestUF[uf], 0, 100);
  if (fx.act) for (const id in fx.act) bumpActor(g, id, fx.act[id]);
  if (fx.actAll) for (const id in g.actors) bumpActor(g, id, fx.actAll);
  if (fx.enemy) g.enemyBoost = Math.max(0, g.enemyBoost + fx.enemy);
  if (fx.flag && !g.flags.includes(fx.flag)) g.flags.push(fx.flag);
  if (fx.map) mapChange(g, { map: fx.map });
  if (fx.ap) g.ap = Math.max(0, g.ap + fx.ap);
  if (fx.ceasefire) g.ceasefire = Math.max(g.ceasefire, fx.ceasefire);
  if (fx.malus){ g.enemyMalus = Math.max(g.month <= g.malusUntil ? g.enemyMalus : 0, fx.malus.v); g.malusUntil = Math.max(g.malusUntil, g.month + fx.malus.months); }
  // efeitos de guerra usados pelos eventos: frentes, moral dos seus exércitos, perdas inimigas
  if (frontMode(g)) frontFx(g, fx);
  else {
  if (fx.front && g.armies){ const ph = phaseOf(g); for (const uf in g.control) if (sideOf(g, g.control[uf], ph) === "contested") g.uf[uf].progress = clamp(g.uf[uf].progress + fx.front, -100, 100); }
  if (fx.org && g.armies) for (const a of armiesOf(g, "player")) a.org = fx.org > 0 ? Math.min(Math.max(a.org, maxOrg(g, "player")), a.org + fx.org) : Math.max(5, a.org + fx.org);
  if (fx.enemyLoss && g.armies){ let left = fx.enemyLoss;
    while (left > 0){ const a = armiesOf(g, "enemy").sort((x, y) => y.str - x.str)[0]; if (!a) break; const d = Math.min(left, a.str); a.str -= d; left -= d; if (a.str < 3) removeArmy(g, a); } }
  }
  // desdobramento: o evento encadeado chega alguns meses depois (se a condição dele ainda valer)
  if (fx.chain) for (const c of [].concat(fx.chain)) (g.chains ||= []).push({ id: c.id, due: g.month + (c.in || 1) });
  if (fx.south) southAdd(g, fx.south);
  if (fx.urna) urnaAdd(g, fx.urna);
  if (fx.opp && typeof focusOpenOpp === "function") focusOpenOpp(g, focusDef(g, fx.opp), rep ? (t, k) => rep.push({ t, k: k || "info" }) : null, "aberta por um evento");
  if (fx.southAlly) southAlly(g, rep ? (t, k) => rep.push({ t, k: k || "info" }) : null);
  syncActorStats(g);
}
// Partes do efeito, cada uma com o tom para o jogador (good: true/false/null). fxSummary junta com " · "; a aba Ações (fase 16) mostra como chips.
function fxParts(g, fx){
  if (!fx) return [];
  const sc = scOf(g), S = sc.story, C = sc.campaign, out = [], sg = v => (v > 0 ? "+" : "") + v;
  const push0 = out.push.bind(out); let inv = false, val = 0;
  out.push = t => push0({ t, good: val === null ? null : inv ? val < 0 : val > 0 });
  const V = (v, i) => { val = v; inv = !!i; return true; };
  if (fx.south && g.south && ["calmo", "revolta"].includes(g.south.state) && V(fx.south, true)) out.push(`Tensão no Sul ${sg(fx.south)}`);
  if (fx.urna){ const u = fx.urna; if (u.prog && V(u.prog)) out.push(`Contestação ${sg(u.prog)}`); if (u.cred && V(u.cred)) out.push(`Credibilidade ${sg(u.cred)}`); if (u.esc && V(u.esc, true)) out.push(`Escalada ${sg(u.esc)}`); }
  if (fx.southAlly && V(1, false)) out.push(`O Sul vira aliado (+1 exército de ${C.south ? C.south.allyStr : 20})`);
  if (fx.s) for (const k in fx.s) V(fx.s[k], false) && out.push(`${S.stats[k] ? S.stats[k].label : k} ${sg(fx.s[k])}`);
  if (fx.money && V(fx.money, false)) out.push(`${C.money.short} ${sg(fx.money)}`);
  if (fx.reserve && V(fx.reserve * STR_UNIT, false)) out.push(`Força militar ${sg(fx.reserve * STR_UNIT)}`);
  if (fx.fac) for (const id in fx.fac){ const f = C.factions.find(x => x.id === id); V(fx.fac[id], false) && out.push(`${f ? f.short || f.name : id} ${sg(fx.fac[id])}`); }
  if (fx.infl) for (const id in fx.infl){ const f = C.factions.find(x => x.id === id); V(fx.infl[id], false) && out.push(`Influência ${f ? f.short || f.name : id} ${sg(fx.infl[id])}`); }
  if (fx.unrest && V(fx.unrest, true)) out.push(`Agitação nos seus estados ${sg(fx.unrest)}`);
  if (fx.unrestAll && V(fx.unrestAll, true)) out.push(`Agitação geral ${sg(fx.unrestAll)}`);
  if (fx.act) for (const id in fx.act){ const a = C.actors.find(x => x.id === id); V(fx.act[id], false) && out.push(`Opinião ${a ? a.short || a.name : id} ${sg(fx.act[id])}`); }
  if (fx.actAll && V(fx.actAll, false)) out.push(`Opinião de todos os atores ${sg(fx.actAll)}`);
  if (fx.enemy && V(fx.enemy, true)) out.push(`Força inimiga ${sg(fx.enemy)}`);
  if (fx.unrestUF && V(Object.values(fx.unrestUF)[0], true)) out.push(`Agitação em ${Object.keys(fx.unrestUF).join("/")} ${sg(Object.values(fx.unrestUF)[0])}`);
  if (fx.ceasefire && V(1, false)) out.push(`Trégua de ${fx.ceasefire} ${fx.ceasefire === 1 ? "mês" : "meses"}`);
  if (fx.malus && V(1, false)) out.push(`Inimigo enfraquecido por ${fx.malus.months} meses`);
  if (fx.front && V(fx.front, false)) out.push(`Frentes ${sg(fx.front)}`);
  if (fx.org && V(fx.org, false)) out.push(`Moral dos seus exércitos ${sg(fx.org)}`);
  if (fx.enemyLoss && V(1, false)) out.push(`Força inimiga −${fx.enemyLoss}`);
  if (fx.chain && V(null, false)) out.push("Pode ter desdobramentos");
  if (fx.opp && V(1, false)) out.push(`Abre a oportunidade “${focusName(g, fx.opp)}”`);
  return out;
}
function fxSummary(g, fx){ return fxParts(g, fx).map(p => p.t).join(" · "); }

/* ---------- Mapa ---------- */
// Estados seus que um evento da história não pode tirar no meio da guerra: { uf: "batalha" | "exercito" }
function frontHeldUFs(g){
  if (typeof frontMode !== "function" || !frontMode(g) || !g.war || !(g.war.armies || []).length || !phaseOf(g).war) return null;
  const out = {}, ev = g.mil && g.mil.month === g.month ? g.mil : null;
  for (const a of g.war.armies) if (a.side === "player" && sideOf(g, g.control[a.uf], phaseOf(g)) === "player") out[a.uf] = "exercito";
  if (ev) for (const f of ev.flips || []) if (f.side === "player" && sideOf(g, g.control[f.uf], phaseOf(g)) === "player") out[f.uf] = "batalha";
  return out;
}
function mapChange(g, spec){
  if (!spec) return [];
  const before = Object.assign({}, g.control), kept = [];
  if (spec.resolve) for (const uf in g.control) if (spec.resolve[g.control[uf]]) g.control[uf] = spec.resolve[g.control[uf]];
  if (spec.map){
    // v1.18.2: na guerra por frentes, um evento da história não tira em silêncio um estado que é seu na marra
    // (tomado em batalha neste mês ou com exército seu lá dentro). O estado fica com você e o mês registra o porquê.
    const keep = g.ended ? null : frontHeldUFs(g);
    for (const uf in spec.map){
      if (keep && keep[uf] && sideOf(g, spec.map[uf], phaseOf(g)) !== "player"){ kept.push({ uf, why: keep[uf] }); continue; }
      g.control[uf] = spec.map[uf];
    }
    if (kept.length && g.mil && g.mil.month === g.month) g.mil.kept = (g.mil.kept || []).concat(kept);
  }
  noteChanges(g, before);
  // "split" (2022): estado rachado — não muda de dono (não existe "em disputa"), mas a agitação dispara
  if (spec.split) for (const uf in spec.split) if (g.uf[uf]) g.uf[uf].unrest = Math.max(g.uf[uf].unrest, 70);
  return kept;
}
function noteChanges(g, before){
  for (const uf in g.control) if (g.control[uf] !== before[uf]){
    const ex = g.lastMapChanges.find(c => c.uf === uf);
    if (ex) ex.to = g.control[uf]; else g.lastMapChanges.push({ uf, from: before[uf], to: g.control[uf] });
    const u = g.uf[uf]; u.progress = 0; u.sway = 0;
  }
  g.lastMapChanges = g.lastMapChanges.filter(c => c.from !== c.to);
  prepContested(g);
  syncMilitary(g, before);
}
function setControl(g, uf, fac){ const before = Object.assign({}, g.control); g.control[uf] = fac; noteChanges(g, before); }
