// js/core/golpe.js — Núcleo: linha de dicas da conselheira no caminho do golpe (ficção do cenário 2022): estado da conspiração, "Prontidão do golpe", dicas e conselho nas escolhas da história.
/* Só lê o estado da partida; quem executa é advisorRun (conselheiro.js). Dados e falas em js/data/2022/golpe.js (sc.golpe).
   coupState(g): null (sem linha do golpe: aceitou o resultado, ou já passou), "porta" (antes da posse, o golpe ainda é uma
   opção), "plano" (conspiração em andamento) ou "dia" (golpe consumado, decisão do dia seguinte na fila). */
function golpeCfg(g){ const sc = g && scOf(g); return (sc && sc.golpe) || null; }
function gfmt(s, ...a){ return String(s).replace(/\{(\d)\}/g, (m, i) => a[+i]); }
function coupDetail(g){ return g && g.diff === "facil" ? 3 : g && g.diff === "dificil" ? 1 : 2; }
function coupFocusOn(g, id){ return !!g.focus && (g.focus.active === id || g.focus.done.includes(id)); }
function coupState(g){
  const K = golpeCfg(g); if (!K || !g || g.ended) return null;
  if (urnaOn(g) || (g.queue[0] && g.queue[0].type === "story" && ["julgamento_tse", "posse_adiada", "veredito", "escalada"].includes(g.queue[0].node))) return null; // contestação das urnas (js/core/urnas.js): a linha do golpe fica de lado
  const A = K.aceitou, P = K.conspira, V = g.visited;
  const next = [g.story && g.story.node].concat(g.queue.map(q => q.type === "story" && q.node)); // escolha já feita, cena ainda por vir
  if (A.visitedAny.some(n => V.includes(n) || next.includes(n)) || A.focus.some(id => coupFocusOn(g, id))) return null;
  if (K.fim.some(n => V.includes(n))) return null;
  if (V.includes("golpe_inicial")) return g.queue[0] && g.queue[0].type === "story" && g.queue[0].node === "golpe_inicial" ? "dia" : null;
  if (P.flags.some(f => g.flags.includes(f)) || P.focus.some(id => coupFocusOn(g, id)) || P.visitedAny.some(n => V.includes(n))) return "plano";
  return phaseOf(g).id === "governo" ? "porta" : null;
}
function coupNeed(g, wait){ const K = golpeCfg(g); return (wait ? K.militarEspera : K.militar) - diffSlack(g); }
// Previsão do Apoio Militar no dia do decreto (a história ainda dá pontos: convocar/sondar e a troca de comando)
function coupForecast(g){
  const K = golpeCfg(g), q = g.queue[0], node = q && q.type === "story" ? q.node : null, now = Math.round(g.stats.militar), need = coupNeed(g);
  let pre = 0, rest = 0;
  if (node && K.ganhos.antes[node] !== undefined) pre = K.ganhos.antes[node];
  if (node === "decreto" || g.visited.includes("decreto")) rest = 0;
  else if (node === "expurgo" || g.visited.includes("expurgo")) rest = node === "expurgo" ? 5 : 0;
  else rest = now + pre >= need ? 0 : K.ganhos.expurgo;
  return { now, need, proj: Math.min(100, now + pre + rest), viaExpurgo: rest > 0 };
}
function coupMonthsLeft(g){
  const K = golpeCfg(g), C = scOf(g).campaign;
  if (g.story && g.story.node === K.reuniao) return Math.max(0, g.story.due - g.month);
  const at = C.storyAt && C.storyAt[K.reuniao]; return at ? Math.max(0, parseYM(at) - g.month) : 0;
}
function coupReadiness(g){
  const K = golpeCfg(g); if (!K) return null;
  const F = coupForecast(g), C = scOf(g).campaign, W = K.pesos;
  const steps = K.focos.slice(1), done = steps.filter(id => g.focus && g.focus.done.includes(id)).length;
  const facs = Object.keys(K.faccoes).filter(id => g.fac[id]).map(id => ({ id, name: (C.factions.find(f => f.id === id) || {}).name || id, now: Math.round(g.fac[id].loyalty), need: K.faccoes[id] }));
  const pMil = Math.min(1, F.proj / F.need), pFoc = done / steps.length, pFac = facs.reduce((s, f) => s + Math.min(1, f.now / f.need), 0) / Math.max(1, facs.length), pRes = Math.min(1, g.money / K.reserva);
  // v1.20: âncora diplomática (potência que reconhece ou tem opinião alta e pode dar armas/crédito)
  const anchor = (scOf(g).campaign.actors || []).some(A => A.major && g.actors[A.id] && (g.actors[A.id].recognized || g.actors[A.id].opinion >= 40) && ((A.gives && ((A.gives.armas || 0) > 0.4 || (A.gives.dinheiro || 0) > 0.5))));
  const pct = Math.round(W.militar * pMil + W.focos * pFoc + W.faccoes * pFac + W.reserva * pRes) + (anchor ? 4 : 0);
  const troops = F.proj >= F.need ? "sim" : F.proj >= F.need - 5 ? "talvez" : "nao";
  const L = K.falas.req, reqs = [{ k: "militar", label: L.militar, now: F.proj, need: F.need, ok: F.proj >= F.need, gap: (F.need - F.proj) / F.need * 3 },
    { k: "focos", label: L.focos, now: done, need: steps.length, ok: done >= steps.length, gap: (steps.length - done) / steps.length }]
    .concat(facs.map(f => ({ k: "fac", id: f.id, label: f.name, now: f.now, need: f.need, ok: f.now >= f.need, gap: (f.need - f.now) / f.need * (f.id === "militares" ? 2 : 1) })),
      [{ k: "reserva", label: L.reserva, now: Math.round(g.money), need: K.reserva, ok: g.money >= K.reserva, gap: (K.reserva - g.money) / K.reserva * 0.8 }]);
  const missing = reqs.filter(r => !r.ok).sort((a, b) => b.gap - a.gap);
  const T = K.falas, q = g.queue[0], node = q && q.type === "story" ? q.node : null;
  const hora = node && K.nos[node] && K.nos[node].golpe !== undefined ? T.horaPorta : node === "decreto" ? T.horaDecreto : node === "sondagem" || node === "expurgo" ? T.horaAgora
    : coupMonthsLeft(g) <= 0 ? T.horaAgora : gfmt(T.horaMeses, coupMonthsLeft(g));
  const risks = [];
  if (troops !== "sim") risks.push(T.riscoFracasso);
  if (southOn(g) && g.south.t >= K.riscos.sul) risks.push(gfmt(T.riscoSul, Math.round(g.south.t)));
  else if (!southOn(g) && g.fac.agro && g.fac.agro.loyalty <= 30) risks.push(gfmt(T.riscoSulAgro, Math.round(g.fac.agro.loyalty)));
  if (g.stats.internacional <= K.riscos.internacional) risks.push(gfmt(T.riscoInt, Math.round(g.stats.internacional)));
  if (F.viaExpurgo && g.stats.base <= K.riscos.base) risks.push(gfmt(T.riscoBase, Math.round(g.stats.base)));
  return { pct, troops, forecast: F, reqs, missing, hora, risks };
}
// Conselho para a escolha da história na fila (botão "Fazer isso" = escolher a opção)
function coupStoryTip(g, st){
  const K = golpeCfg(g), q = g.queue[0]; if (!st || !q || q.type !== "story") return null;
  const N = K.nos[q.node], T = K.falas, det = coupDetail(g); if (!N) return null;
  const ok = i => i !== undefined && queueChoices(g)[i] && queueChoices(g)[i].ok, F = coupForecast(g), now = F.now, need = F.need;
  const tip = (head, text, i, btn) => ok(i) ? { id: "golpe_" + q.node, pri: 95, head, text, act: { k: "choose", i }, btn, golpe: true } : null;
  if (N.golpe !== undefined){
    const R = coupReadiness(g);
    return tip(T.portaHead, det >= 3 ? gfmt(T.portaFacil, R.pct, now + (K.ganhos.antes[q.node] || 0), need) : gfmt(T.porta, R.pct), N.golpe, T.portaBtn);
  }
  if (q.node === "sondagem"){
    if (det <= 1) return tip(T.sondHead, T.sondVago, now >= need ? N.decreto : N.expurgo);
    if (now >= need) return tip(T.sondHead, gfmt(T.sondDireto, now, need), N.decreto);
    if (now + K.ganhos.expurgo >= need) return tip(T.sondHead, gfmt(T.sondExpurgo, now, need, K.ganhos.expurgo), N.expurgo);
    return tip(T.sondHead, gfmt(T.sondRecuar, now, need), N.recuar);
  }
  if (q.node === "expurgo") return now + 5 >= need ? tip(T.expHead, gfmt(T.expSeguir, now + 5, need), N.seguir) : tip(T.expHead, gfmt(T.expRecuar, now + 5, need), N.recuar);
  if (q.node === "decreto"){
    if (det <= 1) return tip(T.decHead, T.decVago, now >= need ? N.cercar : N.esperar);
    return now >= need ? tip(T.decHead, gfmt(T.decCercar, now, need), N.cercar) : tip(T.decHead, gfmt(T.decPerdido, now, need), N.esperar);
  }
  if (q.node === "golpe_inicial"){
    const mil = g.fac.militares ? Math.round(g.fac.militares.loyalty) : 50;
    return mil < 30 ? tip(T.consHead, gfmt(T.consIntervir, mil), N.intervir) : tip(T.consHead, T.consNegociar, N.negociar);
  }
  return null;
}
// Próxima decisão nacional do plano (balanço → sondar a ruptura → quartéis → minuta)
function coupNextFocus(g){
  const K = golpeCfg(g); if (!g.focus || g.focus.active) return null;
  for (const id of K.focos) if (!g.focus.done.includes(id) && !focusCheck(g, id)) return focusDef(g, id);
  return null;
}
// Dicas do plano (fila vazia). st = "porta" (só um convite discreto) ou "plano" (linha completa).
function coupTips(g, st){
  const K = golpeCfg(g), T = K.falas, C = scOf(g).campaign, tips = [], F = coupForecast(g), det = coupDetail(g);
  const nf = coupNextFocus(g);
  if (st === "porta"){
    if (nf && nf.id !== K.focos[0]) tips.push({ id: "golpe_virada", pri: 58, head: T.viradaHead, text: T.virada, sub: nf.name, act: { k: "focus", id: nf.id }, golpe: true });
    return tips;
  }
  if (nf){
    const txt = { t_balanco: T.focoTronco, c_ruptura: T.focoRuptura, c_quarteis: T.focoQuarteis, c_minuta: T.focoMinuta }[nf.id] || T.focoRuptura;
    tips.push({ id: "golpe_foco", pri: 86, head: T.focoHead, text: txt, sub: nf.name, act: { k: "focus", id: nf.id }, golpe: true });
  }
  const mil = g.fac.militares, fcM = C.factions.find(f => f.id === "militares");
  if (mil && fcM && mil.loyalty < K.faccoes.militares && !g.used["fac_agradar_militares"]){
    const c = facCost(g, fcM, "agradar");
    if (g.money >= c.money && g.ap >= c.ap) tips.push({ id: "golpe_fac_mil", pri: 84, head: T.milHead, text: gfmt(T.milFac, Math.round(mil.loyalty), K.faccoes.militares), act: { k: "fac", id: "militares" }, golpe: true });
  }
  if (F.proj < F.need + 5){
    const best = advisorBestAction(g, a => a.fx && a.fx.s && a.fx.s.militar > 0);
    if (best) tips.push({ id: "golpe_mil", pri: F.proj < F.need ? 83 : 60, head: T.milHead, text: gfmt(T.milAcao, F.now, F.need), sub: best.a.name, act: { k: "action", id: best.a.id }, golpe: true });
  }
  for (const id of ["agro", "evangelicos", "centrao"]){
    const f = g.fac[id], fc = C.factions.find(x => x.id === id); if (!f || !fc || f.loyalty >= K.faccoes[id] || g.used["fac_agradar_" + id]) continue;
    const c = facCost(g, fc, "agradar"); if (g.money < c.money + 10 || g.ap < c.ap) continue;
    tips.push({ id: "golpe_fac_" + id, pri: id === "agro" ? 68 : 64 - (K.faccoes[id] - f.loyalty) * 0.05, head: T.baseHead, text: gfmt(id === "agro" ? T.agroFac : T.baseFac, Math.round(f.loyalty), K.faccoes[id]), sub: fc.name, act: { k: "fac", id }, golpe: true });
  }
  if (southOn(g) && g.south.t >= K.riscos.sul){
    const best = advisorBestAction(g, a => a.cat === "sul");
    if (best) tips.push({ id: "golpe_sul", pri: 72, head: T.sulHead, text: gfmt(T.sul, Math.round(g.south.t)), sub: best.a.name, act: { k: "action", id: best.a.id }, golpe: true });
  }
  if (g.stats.internacional <= K.riscos.internacional){
    const best = advisorBestAction(g, a => a.fx && a.fx.s && a.fx.s.internacional > 0 && !(a.fx.s.militar < 0));
    if (best) tips.push({ id: "golpe_int", pri: 62, head: T.intHead, text: gfmt(T.intl, Math.round(g.stats.internacional)), sub: best.a.name, act: { k: "action", id: best.a.id }, golpe: true });
  }
  if (det >= 2 && g.money < K.reserva && coupMonthsLeft(g) <= 1)
    tips.push({ id: "golpe_caixa", pri: 45, head: T.caixaHead, text: gfmt(T.caixa, Math.round(g.money), K.reserva), act: { k: "end" }, btn: "Encerrar mês", golpe: true });
  return tips;
}
