// js/core/frentes.js — Núcleo: guerra de 2022 por EXÉRCITOS nos estados — frentes abertas, reforços, recrutamento, ofensiva, mês de guerra. Sem DOM.
/* Só vale quando o cenário tem "frentes" (js/data/2022/frentes.js). O 1964 segue com exércitos por estado (js/core/ordens.js).
   Estado salvo em g.war (save v13):
     reserve  tropas fora da guerra (antes de ela começar ficam em Brasília; viram exércitos quando a primeira frente abre)
     armies   exércitos nos estados (js/core/tropas.js)      seq  contador de ids      epool  { facção: reforço acumulado }
     fronts   [{ id (facção inimiga), opened, n (estados dela) }] — uma "frente" por inimigo com território
     gens     { idDoGeneral: idDoExército }      offAt  mês a partir do qual a ofensiva especial está liberada
     mom      ímpeto (−3 a +3)      log  batalhas dos últimos meses (relatórios)      months  meses de combate
   Cada estado é de um lado só (g.control). Em modo frentes, g.armies fica vazio e as funções antigas (sideStr, addPlayerStrength,
   recruitArmy, syncMilitary, planEnemy…) desviam para cá. Vitória: tomar Recife (PE). Derrota: perder Brasília (DF).
   Porto Alegre (RS) derruba a Liga do Sul. */
function frontCfg(g){ const sc = g && scOf(g); return (sc && sc.frentes) || null; }
function frontMode(g){ return !!(g && g.war && frontCfg(g)); }
function frontFala(g, grp, k){ const F = frontCfg(g).falas; return (F[grp] && F[grp][k]) || k; }
function frontName(g, f){ return frontFala(g, "nome", f.id || f); }
function frontNew(g, reserve){ return { reserve: Math.max(0, Math.round(reserve || 0)), armies: [], seq: 0, epool: {}, fronts: [], gens: {}, offAt: null, mom: 0, log: [] }; }
function frontPool(g){ const W = g.war; return W ? W.reserve + tpTotal(g, "player") : 0; }
function frontById(g, id){ return (g.war && g.war.fronts.find(f => f.id === id)) || null; }
function frontEnemyScale(g){ const K = frontCfg(g), C = scOf(g).campaign; return (C.enemyPower ?? K.poderBase) / K.poderBase; }
function frontMaxMorale(g){ const M = frontCfg(g).moralMax, K = scOf(g).campaign.keys, mil = g.stats[K.mil] ?? 50;
  return Math.round(clamp(M.base + natLoyalty(g) * M.lealdade + (mil - 50) * M.militar, M.min, 100)); }
function frontTerrain(uf){ const T = uf && TERRAIN_TYPES[TERRAIN[uf]]; return T && T.def ? T.def : 0; }
/* ---------- Abrir / fechar frentes conforme o mapa ---------- */
function syncFronts(g){
  const W = g.war, K = frontCfg(g), ph = phaseOf(g);
  if (!W || !K) return;
  W.armies ||= []; W.epool ||= {};
  if (ph.noArmies){ W.reserve = 0; W.fronts = []; W.gens = {}; W.armies = []; return; }
  if (!ph.war){ if (W.armies.length || W.fronts.length){ W.reserve += tpTotal(g, "player"); W.armies = []; W.fronts = []; W.gens = {}; } return; }
  for (const fac of Object.keys(K.frentes)){
    if (!(ph.enemy || []).includes(fac)) continue;
    const n = Object.values(g.control).filter(x => x === fac).length, f = frontById(g, fac);
    if (n && !f) frontOpen(g, fac, Math.max(1, n));
    else if (!n && f) frontClose(g, f);
    else if (f && n > f.n){ W.epool[fac] = (W.epool[fac] || 0) + (n - f.n) * K.frentes[fac].porEstado * frontEnemyScale(g); f.n = n; }
    else if (f) f.n = n;
  }
  // inimigo sem frente aberta (fora da guerra, armistício) não tem exércitos
  W.armies = W.armies.filter(a => a.side === "player" || frontById(g, a.fac));
  if (W.fronts.length && !tpArmies(g, "player").length && W.reserve > 0) frontDeploy(g);
  tpFix(g);
}
// Estados na linha entre você e uma facção inimiga: mine (seus, encostados nela) e theirs (dela, encostados em você)
function frontBorder(g, fac){
  const ph = phaseOf(g), mine = uf => sideOf(g, g.control[uf], ph) === "player";
  return { mine: TP_UFS.filter(uf => mine(uf) && ADJ[uf].some(n => g.control[n] === fac)),
    theirs: TP_UFS.filter(uf => g.control[uf] === fac && ADJ[uf].some(mine)) };
}
// Primeira frente: a reserva vira K.tropas.inicio exércitos na linha (um no caminho até a capital inimiga, os outros perto de Brasília)
function frontDeploy(g){
  const W = g.war, T = tpK(g), f = W.fronts[0]; if (!f) return;
  const total = W.reserve, n = clamp(Math.floor(total / 12), 1, T.inicio);
  const B = frontBorder(g, f.id).mine, cap = tpCap(g), DC = ufDist(cap), P = tpGoalPath(g, f.id);
  const first = P ? B.filter(uf => ADJ[uf].includes(P[0])).sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40))[0] : null;
  const picks = first ? [first] : [];
  for (const uf of B.slice().sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40) || (a < b ? -1 : 1))){
    if (picks.length >= n) break;
    if (!picks.includes(uf)) picks.push(uf);
  }
  if (!picks.length) picks.push(cap);
  const each = total / picks.length, mor = Math.min(70, frontMaxMorale(g));
  picks.forEach(uf => tpNew(g, "player", null, uf, each, mor));
  W.reserve = 0;
  // generais: o agressivo no exército do caminho, os outros nos seguintes
  const order = ["agressivo", "defensivo", "logistico"];
  tpArmies(g, "player").forEach((a, i) => { const gen = frontCfg(g).generais.find(x => x.traco === order[i]) ; if (gen && !W.gens[gen.id]) W.gens[gen.id] = a.id; });
}
// Exércitos inimigos de uma frente nova: um guarda a capital deles, os outros na linha, mais perto de Brasília
function frontSpawn(g, fac, total){
  const T = tpK(g), D = frontCfg(g).frentes[fac];
  const n = clamp(Math.round(total / T.porExercito), 2, D.exercitos);
  const home = tpHome(g, "enemy", fac), DC = ufDist(tpCap(g));
  const B = frontBorder(g, fac).theirs.sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40) || (a < b ? -1 : 1));
  const picks = [];
  if (g.control[home] === fac && n >= 3 && !B.includes(home)) picks.push(home);
  for (const uf of B){ if (picks.length >= n) break; if (!picks.includes(uf)) picks.push(uf); }
  if (picks.length < Math.min(n, 2)){ // linha curta: o resto fica nos estados logo atrás
    const back = TP_UFS.filter(uf => g.control[uf] === fac && !picks.includes(uf) && ADJ[uf].some(x => B.includes(x))).sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40));
    for (const uf of back){ if (picks.length >= n) break; picks.push(uf); }
  }
  if (!picks.length){ const any = TP_UFS.find(uf => g.control[uf] === fac); if (any) picks.push(any); }
  const w = picks.map(uf => uf === home ? 0.6 : 1), sw = w.reduce((s, x) => s + x, 0);
  picks.forEach((uf, i) => { const at = tpAt(g, "enemy", uf), v = total * w[i] / sw; if (at && !tpRoom(g, "enemy", uf)) tpAddTo(at, v, D.moral); else tpNew(g, "enemy", fac, uf, v, D.moral); });
}
function frontOpen(g, fac, n){
  const W = g.war, K = frontCfg(g), D = K.frentes[fac];
  const f = { id: fac, n, opened: g.month };
  W.fronts.push(f);
  frontSpawn(g, fac, (D.tropas + D.porEstado * n) * frontEnemyScale(g));
  if (W.offAt == null) W.offAt = g.month + K.ofensiva.primeira;
  if (!tpArmies(g, "player").length && W.reserve > 0) frontDeploy(g);
  tpAI(g, tpArmies(g, "enemy").filter(a => a.fac === fac), { thr: D.ataca, attack: true });
  (g.warNews ||= []).push(gfmt(frontFala(g, "eventos", "abriu"), frontName(g, f), frontFala(g, "inimigo", fac)));
  // a capital do inimigo desta frente é anunciada uma vez (Recife: grande evento "capital da Resistência")
  if (D.capitalFlag && !g.flags.includes(D.capitalFlag)){ g.flags.push(D.capitalFlag); if (D.capitalNews) g.warNews.push(frontFala(g, "eventos", D.capitalNews)); }
  return f;
}
function frontClose(g, f){
  const W = g.war; W.fronts = W.fronts.filter(x => x !== f);
  W.armies = W.armies.filter(a => !(a.side === "enemy" && a.fac === f.id)); delete W.epool[f.id];
  (g.warNews ||= []).push(gfmt(frontFala(g, "eventos", "fechou"), frontName(g, f)));
}
/* ---------- Tropas novas (alistamento, eventos, aliados) ---------- */
// Reforço do jogador: dividido entre os seus exércitos (sem exércitos, vai para a reserva em Brasília). n < 0 tira de todos.
function frontAdd(g, n, morale){
  const W = g.war; if (!W || !n) return 0;
  const mine = tpArmies(g, "player");
  if (n < 0){
    let left = -n; const tot = mine.reduce((s, a) => s + a.str, 0);
    for (const a of mine){ const d = Math.min(a.str, Math.round(-n * a.str / Math.max(1, tot))); a.str -= d; left -= d; }
    if (left > 0){ const d = Math.min(W.reserve, left); W.reserve -= d; left -= d; }
    for (const a of mine) if (left > 0){ const d = Math.min(a.str, left); a.str -= d; left -= d; }
    tpFix(g); return n;
  }
  if (phaseOf(g).noArmies) return 0;
  if (!mine.length){ W.reserve += n; return n; }
  // poucos exércitos: um reforço grande forma um exército novo na linha
  const T = tpK(g); let left = n;
  while (left >= 12 && tpArmies(g, "player").length < T.inicio && W.fronts.length){
    const spot = frontNewSpot(g); if (!spot) break;
    const d = Math.min(left, T.porExercito); tpNew(g, "player", null, spot, d, morale ?? Math.min(65, frontMaxMorale(g))); left -= d;
  }
  if (left <= 0) return n;
  n = left;
  mine.slice().sort((a, b) => a.str - b.str).forEach((a, i, L) => { const d = i === L.length - 1 ? left : Math.round(n / L.length); left -= d; tpAddTo(a, d, morale); });
  return n;
}
// Reforço inimigo do mês: metade completa os exércitos dele, metade junta para formar um novo (numa capital de estado dele)
function frontEnemyAdd(g, fac, add){
  const W = g.war, T = tpK(g), D = frontCfg(g).frentes[fac], list = tpArmies(g, "enemy").filter(a => a.fac === fac);
  const full = list.length >= D.exercitos, now = full ? add : add / 2;
  W.epool[fac] = (W.epool[fac] || 0) + add - now;
  list.slice().sort((a, b) => a.str - b.str).forEach((a, i, L) => tpAddTo(a, now / L.length, D.moral));
  if (!list.length) W.epool[fac] += now;
  if (W.epool[fac] >= T.novo && !full){
    const uf = frontSpawnUF(g, "enemy", fac);
    if (uf){ const at = tpAt(g, "enemy", uf); if (at && !tpRoom(g, "enemy", uf)) tpAddTo(at, W.epool[fac], D.moral); else tpNew(g, "enemy", fac, uf, W.epool[fac], D.moral); W.epool[fac] = 0; }
  }
}
// Lugar para um exército novo do jogador: estado seu na linha, sem exército seu, o mais perto de Brasília
function frontNewSpot(g){
  const DC = ufDist(tpCap(g)), L = tpLineDist(g, "player");
  const c = TP_UFS.filter(uf => L[uf] === 0 && !tpAt(g, "player", uf));
  return c.sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40) || (a < b ? -1 : 1))[0] || frontSpawnUF(g, "player");
}
// Onde nasce um exército novo: estado do lado ligado à capital, sem exército, o mais perto da linha (empate: o maior)
function frontSpawnUF(g, side, fac){
  const L = tpLineDist(g, side, fac), K = tpLinked(g, side, fac), own = uf => side === "player" ? tpSide(g, uf) === "player" : g.control[uf] === fac;
  const all = TP_UFS.filter(uf => own(uf) && (!K || K.has(uf))), free = all.filter(uf => !tpAt(g, side, uf)), pool = free.length ? free : all;
  return pool.sort((a, b) => (L[a] ?? 50) - (L[b] ?? 50) || (UF_WEIGHT[b] || 1) - (UF_WEIGHT[a] || 1) || (a < b ? -1 : 1))[0] || null;
}
/* ---------- Comando automático e plano inimigo ---------- */
function frontPlan(g){ if (frontMode(g) && g.war.armies) tpEnemyPlan(g); }
// "auto": ataca onde a chance é boa e leva a retaguarda até a linha; "defender": nunca ataca. Só mexe em quem está sem ordem.
function frontAuto(g, mode){
  if (!frontMode(g) || !phaseOf(g).war) return { ok: true, n: 0 };
  const n = tpAI(g, tpArmies(g, "player"), { thr: tpK(g).autoChance, attack: (mode || "auto") === "auto" });
  return { ok: true, n, msg: n ? gfmt(frontFala(g, "tropas", n === 1 ? "autoUma" : "autoVarias"), n) : frontFala(g, "tropas", "autoNada") };
}
/* ---------- Recrutar e ofensiva especial ---------- */
// Recruta em qualquer estado seu ligado a Brasília. Fase 16: o jogador escolhe — "reforco" (soma a um exército que já está
// no estado; id = qual) ou "novo" (forma uma Divisão nova ali, se houver vaga no estado e não passar de T.max)
function frontRecruitUFs(g){
  if (!g.war) return [];
  const K = tpLinked(g, "player");
  return TP_UFS.filter(uf => tpSide(g, uf) === "player" && (!K || K.has(uf)));
}
function frontRecruitState(g, uf, how, id){
  const K = frontCfg(g).recruta, ph = phaseOf(g), T = tpK(g);
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes na aba História." };
  if (ph.noArmies) return { ok: false, msg: "Nesta fase você não comanda tropas." };
  if ((+g.used._recruit || 0) >= K.porMes) return { ok: false, msg: `Já recrutou ${K.porMes} vezes neste mês. Encerre o mês para recrutar de novo.` };
  if (g.money < K.custo) return { ok: false, msg: `Faltam recursos: precisa de ${K.custo} (tem ${Math.floor(g.money)}).` };
  if (uf && (!ph.war || !g.war.fronts.length)) uf = null;
  if (uf){
    if (!frontRecruitUFs(g).includes(uf)) return { ok: false, msg: frontFala(g, "tropas", tpSide(g, uf) === "player" ? "recrutaIsolado" : "recrutaOnde") };
    const here = tpAllAt(g, "player", uf), novo = how === "novo" || (!how && !here.length);
    if (novo){
      if (tpArmies(g, "player").length >= T.max) return { ok: false, msg: gfmt(frontFala(g, "tropas", "limite"), T.max) };
      if (!tpRoom(g, "player", uf)) return { ok: false, msg: gfmt(frontFala(g, "tropas", "lotado"), T.porEstado || 3) };
    } else if (!here.length) return { ok: false, msg: frontFala(g, "tropas", "semReforco") };
    const into = novo ? null : (here.find(a => a.id === id) || here.slice().sort((a, b) => a.str - b.str)[0]);
    return { ok: true, cost: K.custo, uf, novo, into: into ? into.id : null };
  }
  return { ok: true, cost: K.custo, uf };
}
// Estado sugerido para recrutar: o seu exército mais ameaçado (ou o mais fraco na linha); sem exército, Brasília
function frontRecruitPick(g){
  const mine = tpArmies(g, "player"); if (!mine.length) return tpCap(g);
  if (mine.length <= tpK(g).inicio){ const r = frontNewSpot(g); if (r && !tpAt(g, "player", r)) return r; }
  const L = tpLineDist(g, "player"), foe = tpArmies(g, "enemy"), K = tpLinked(g, "player");
  const threat = a => foe.filter(e => e.order && e.order.type === "atacar" && e.order.to === a.uf).reduce((s, e) => s + e.str, 0);
  const ok = mine.filter(a => !K || K.has(a.uf));
  return (ok.length ? ok : mine).slice().sort((a, b) => threat(b) - threat(a) || (L[a.uf] ?? 9) - (L[b.uf] ?? 9) || a.str - b.str)[0].uf;
}
function frontRecruit(g, uf, how, id){
  const ph = phaseOf(g), war = ph.war && g.war.fronts.length;
  if (war && !uf) uf = frontRecruitPick(g);
  const st = frontRecruitState(g, uf, how, id); if (!st.ok) return st;
  const K = frontCfg(g).recruta;
  g.money -= st.cost; g.used._recruit = (+g.used._recruit || 0) + 1;
  if (!st.uf){ frontAdd(g, K.forca, K.moral); return { ok: true, msg: `+${K.forca} de tropas recrutadas (−${st.cost}).` }; }
  const at = st.into ? tpById(g, st.into) : null;
  if (at){ tpAddTo(at, K.forca, K.moral); return { ok: true, msg: gfmt(frontFala(g, "tropas", "msgReforca"), tpName(g, at), K.forca, st.cost) }; }
  const a = tpNew(g, "player", null, st.uf, K.forca, K.moral, "div");
  return { ok: true, msg: gfmt(frontFala(g, "tropas", "msgNovo"), tpName(g, a), ufName(st.uf), st.cost), id: a.id };
}
// Ofensiva especial: UM exército com ordem de ataque ganha ×mult de poder neste mês (custa recursos; intervalo entre usos)
function offensiveState(g, id){
  const K = frontCfg(g).ofensiva, a = id ? tpById(g, id) : null, F = k => frontFala(g, "tropas", k);
  if (!phaseOf(g).war || !g.war.fronts.length) return { ok: false, msg: "Sem frente ativa." };
  if (tpArmies(g, "player").some(x => x.special)) return { ok: false, msg: F("ofensivaJa") };
  if (g.ceasefire > 0) return { ok: false, msg: "Trégua em vigor." };
  if (g.month < (g.war.offAt ?? 0)) return { ok: false, wait: g.war.offAt - g.month, msg: `Disponível em ${g.war.offAt - g.month} ${g.war.offAt - g.month === 1 ? "mês" : "meses"}.` };
  if (g.money < K.custo) return { ok: false, msg: `Faltam recursos: precisa de ${K.custo}.` };
  if (a && !(a.order && a.order.type === "atacar")) return { ok: false, msg: F("ofensivaSemAtaque") };
  if (a && a.morale < 30) return { ok: false, msg: "Moral baixa demais para uma ofensiva." };
  return { ok: true, cost: K.custo };
}
function launchOffensive(g, id){
  const st = offensiveState(g, id); if (!st.ok) return st;
  const a = tpById(g, id); if (!a) return { ok: false, msg: frontFala(g, "tropas", "ofensivaSemAtaque") };
  g.money -= st.cost; a.special = true;
  return { ok: true, msg: gfmt(frontFala(g, "eventos", "ofensiva"), tpName(g, a), ufName(a.order.to)) };
}
function cancelOffensive(g, id){
  const a = tpById(g, id); if (!a || !a.special) return { ok: false };
  a.special = false; g.money += frontCfg(g).ofensiva.custo; return { ok: true, msg: "Ofensiva cancelada (recursos devolvidos)." };
}
/* ---------- Soldo (fase 16) ---------- */
// Fecha o mês de guerra com os cofres muito no vermelho: soldo atrasado (g.unpaid) e moral menor; K.soldo.meses seguidos = motim (fim)
function frontSoldo(g, R){
  const S = frontCfg(g).soldo, W = g.war; if (!S || !W || !phaseOf(g).war || !W.fronts.length) return false;
  if (g.money < S.limite){
    g.unpaid = (g.unpaid || 0) + 1;
    if (g.unpaid >= S.meses){ W.end = { to: "fim_restauracao", why: frontFala(g, "eventos", "motim"), cause: "motim" }; R(W.end.why, "bad"); return true; }
    for (const a of tpArmies(g, "player")) a.morale = Math.max(5, a.morale - S.moral);
    R(gfmt(frontFala(g, "eventos", "soldoAtraso"), g.unpaid, S.meses, S.moral), "bad");
  } else if (g.unpaid){ g.unpaid = 0; R(frontFala(g, "eventos", "soldoOk"), "good"); }
  return false;
}
/* ---------- O mês de guerra ---------- */
// Cansaço da guerra: depois de WAR_WEARY_FROM meses de combate, as batalhas ficam mais sangrentas e o apoio cai devagar.
const WAR_WEARY_FROM = 12;
function frontWeary(g){ const m = (g.war && g.war.months) || 0; return Math.min(1.5, Math.max(0, (m - WAR_WEARY_FROM) / 18)); }
// Resumo das viradas do mês pelo dono FINAL de cada estado (v1.18.2): tomado/perdido de verdade,
// tomado e retomado pelo inimigo, perdido e recuperado, e os que um evento quis tirar mas as tropas seguraram.
function frontFlipSummary(g, ev){
  const out = { won: [], lost: [], retaken: [], recovered: [], kept: [] }, seen = new Set();
  for (const f of (ev && ev.flips) || []){ if (seen.has(f.uf)) continue; seen.add(f.uf);
    const fl = ev.flips.filter(x => x.uf === f.uf), firstP = fl[0].side === "player", endP = tpSide(g, f.uf) === "player";
    if (firstP) out[endP ? "won" : "retaken"].push(f.uf); else out[endP ? "recovered" : "lost"].push(f.uf); }
  for (const k of (ev && ev.kept) || []) if (!out.kept.includes(k.uf) && !out.won.includes(k.uf)) out.kept.push(k.uf);
  return out;
}
function frontWarMonth(g, R){
  const K = frontCfg(g), T = tpK(g), C = scOf(g).campaign, KK = C.keys, ph = phaseOf(g), W = g.war;
  syncFronts(g);
  const ev = { month: g.month, war: !!ph.war, control0: Object.assign({}, g.control),
    battles: [], flips: [], moves: [], merges: [], sieges: [], start: [], orders: [], mom0: W.mom || 0, mom: W.mom || 0 };
  g.mil = ev;
  if (!ph.war || !W.fronts.length){ g.warNews = []; return ev; }
  if (g.autoOrders && g.autoOrders !== "off"){ const r = frontAuto(g, g.autoOrders); if (r.n) R(gfmt(frontFala(g, "tropas", r.n === 1 ? "autoLogUma" : "autoLog"), r.n)); }
  const LK = {}, cutOf = a => { const k = a.side + a.fac; if (!(k in LK)) LK[k] = tpLinked(g, a.side, a.fac); return tpCut(g, a, LK[k]); };
  ev.start = W.armies.map(a => ({ id: a.id, n: a.n, side: a.side, fac: a.fac, uf: a.uf, str: a.str, morale: Math.round(a.morale), cut: cutOf(a) }));
  ev.orders = W.armies.filter(a => a.order).map(a => ({ id: a.id, side: a.side, from: a.uf, type: a.order.type, to: a.order.to, path: [a.uf].concat(a.order.path || []), special: !!a.special, tatica: a.order.tatica || null }));
  const cf = g.ceasefire > 0;
  if (cf){ g.ceasefire--; R("Trégua em vigor: sem combates neste mês. As tropas descansam.", "good");
    for (const a of W.armies) if (a.special){ a.special = false; g.money += K.ofensiva.custo; } }
  else {
    W.months = (W.months || 0) + 1;
    const wm = W.months - WAR_WEARY_FROM;
    if (wm > 0 && wm % 3 === 0){ applyStats(g, { [KK.pop]: -1 }); R(gfmt(frontFala(g, "tropas", "cansaco"), W.months), "bad"); }
  }
  MIL_QUIET = true;
  tpResolve(g, ev);
  if (!cf) tpSiege(g, ev);
  MIL_QUIET = false;
  for (const b of ev.battles) if (b.took) ev.flips.push(b.took);
  syncFronts(g);
  if (ev.battles.length) g.stat.battles = (g.stat.battles || 0) + 1;
  W.log = (W.log || []).concat(ev.battles).slice(-40);
  if (ev.battles.some(b => b.special)) W.offAt = g.month + K.ofensiva.intervalo;
  // registro do mês
  const won = ev.battles.filter(b => b.took && b.side === "player"), lost = ev.battles.filter(b => b.took && b.side === "enemy");
  const held = ev.battles.filter(b => !b.win && b.side === "enemy"), fail = ev.battles.filter(b => !b.win && b.side === "player");
  if (ev.battles.length) R(gfmt(frontFala(g, "tropas", "resumoMes"), ev.battles.length, won.length, lost.length), won.length > lost.length ? "good" : lost.length > won.length ? "bad" : "info");
  for (const b of ev.battles) if (b.origins >= 2 || b.final || (b.uf === b.cap)) R(frontFala(g, "drama", b.drama), (b.side === "player") === b.win ? "good" : "bad");
  const FS = frontFlipSummary(g, ev), nms = l => l.map(ufName).join(", ");
  if (FS.won.length) R(gfmt(frontFala(g, "mapa", "listaGanhou"), nms(FS.won)), "good");
  if (FS.lost.length) R(gfmt(frontFala(g, "mapa", "listaPerdeu"), nms(FS.lost)), "bad");
  if (FS.retaken.length) R(gfmt(frontFala(g, "mapa", "listaRetomado"), nms(FS.retaken)), "bad");
  if (FS.recovered.length) R(gfmt(frontFala(g, "mapa", "listaRecuperado"), nms(FS.recovered)), "good");
  if (held.length) R(gfmt(frontFala(g, "tropas", "logSegurou"), held.map(b => ufName(b.uf)).join(", ")), "good");
  if (fail.length) R(gfmt(frontFala(g, "tropas", "logFalhou"), fail.map(b => ufName(b.uf)).join(", ")), "bad");
  for (const b of ev.battles) for (const x of b.lost) R(gfmt(frontFala(g, "tropas", x.side === "player" ? "logDestruido" : "logDestruiuInimigo"), tpName(g, x)), x.side === "player" ? "bad" : "good");
  for (const s of ev.sieges) if (s.surrender) R(gfmt(frontFala(g, "cerco", s.side === "player" ? "rendeuSeu" : "rendeuInimigo"), tpName(g, s), ufName(s.uf)), s.side === "player" ? "bad" : "good");
  for (const a of W.armies) if (a.cut === 1) R(gfmt(frontFala(g, "cerco", a.side === "player" ? "aviso" : "inimigo"), tpName(g, a), ufName(a.uf)), a.side === "player" ? "bad" : "good");
  if (lost.length >= 2) W.lostAt = g.month;
  // ímpeto: vitórias e derrotas do mês
  if (!cf){ const d = tpMomentumMonth(g, ev); ev.mom = W.mom;
    if (d > 0 && W.mom >= 2) R(frontFala(g, "impeto", "sobe"), "good"); else if (d < 0 && W.mom <= -2) R(frontFala(g, "impeto", "desce"), "bad"); }
  // fim da guerra: Brasília perdida / capital (reduto) inimiga tomada
  const cap = tpCap(g);
  if (tpSide(g, cap) === "enemy"){ W.end = { to: "fim_restauracao", why: frontFala(g, "eventos", "derrota"), cause: "df" }; R(W.end.why, "bad"); }
  else if (tpArmies(g, "enemy").some(e => ADJ[cap].includes(e.uf))) R(frontFala(g, "eventos", "capitalRisco"), "bad");
  for (const fac in K.frentes){
    const D = K.frentes[fac]; if (!ev.flips.some(m => m.uf === D.reduto && m.side === "player")) continue;
    if (D.vitoria && !W.end){ W.end = { to: D.vitoria, why: frontFala(g, "eventos", "vitoria"), cause: "recife" }; R(W.end.why, "good"); }
    else if (!D.vitoria) frontCrush(g, fac, R);
  }
  // às portas de Recife: primeiro exército seu vizinho de Recife (grande evento; a Resistência faz a última resistência)
  if (!W.end) for (const fac in K.frentes){
    const D = K.frentes[fac]; if (!D.vitoria || !D.portasFlag || g.flags.includes(D.portasFlag) || g.control[D.reduto] !== fac) continue;
    if (tpArmies(g, "player").some(a => ADJ[D.reduto].includes(a.uf))){ g.flags.push(D.portasFlag); R(frontFala(g, "eventos", "portasRecife"), "info");
      for (const e of tpArmies(g, "enemy")) if (e.fac === fac) e.morale = Math.min(100, e.morale + 10); }
  }
  if (!cf){
    // reforços dos dois lados
    const mob = mobilization(g); frontAdd(g, mob); R(gfmt(frontFala(g, "eventos", "mobiliza"), mob), "good");
    const sc = frontEnemyScale(g);
    for (const f of W.fronts){
      const D = K.frentes[f.id], n = Object.values(g.control).filter(x => x === f.id).length;
      const cap = (D.teto || 260) * sc + 40, have = tpTotal(g, "enemy", f.id) + (W.epool[f.id] || 0);
      const tired = 1 - Math.min(0.6, Math.max(0, W.months - WAR_WEARY_FROM) * 0.04); // o inimigo também cansa: menos reforços depois de um ano
      const add = Math.min(Math.max(0, cap - have), Math.max(0, ((D.reforco + 0.25 * n) * sc + (f.id === ph.enemyMain ? foreignFoes(g) * 1.5 + (g.enemyBoost || 0) : 0)) * tired - malusNow(g) * 2));
      if (add > 0) frontEnemyAdd(g, f.id, add);
    }
    const share = frontShare(g);
    if (share > 0.65) applyStats(g, { [KK.mil]: 1 }); else if (share < 0.35){ applyStats(g, { [KK.mil]: -2 }); R("Você controla pouco território: o moral das tropas cai.", "bad"); }
  }
  // moral: quem não lutou descansa
  const mx = frontMaxMorale(g), M = T.moral;
  for (const a of W.armies){
    if (a.fought) continue;
    const gen = tpGen(g, a), extra = gen && K.tracos[gen.traco] ? (K.tracos[gen.traco].moral || 0) : 0;
    const top = a.side === "player" ? mx : (K.frentes[a.fac] || {}).moral || 65;
    if (a.morale < top && !a.cut) a.morale = Math.min(top, a.morale + M.descanso + extra);
  }
  for (const a of W.armies){ delete a.moved; delete a.fought; }
  g.enemyBoost = Math.max(0, (g.enemyBoost || 0) - 0.25);
  if (!W.end) frontPlan(g);
  for (const t of (g.warNews || [])) R(t, "bad"); g.warNews = [];
  return ev;
}
// Parte do território em guerra que é sua (peso dos estados), entre você e os inimigos com frente aberta
function frontShare(g){
  let p = 0, e = 0; for (const uf of TP_UFS){ const s = tpSide(g, uf), w = UF_WEIGHT[uf] || 1; if (s === "player") p += w; else if (s === "enemy" && frontById(g, g.control[uf])) e += w; }
  return p + e ? p / (p + e) : 1;
}
// Reduto da Liga tomado: os estados separatistas voltam para você e a frente fecha
function frontCrush(g, fac, R){
  const ph = phaseOf(g), before = Object.assign({}, g.control);
  const to = ph.playerMain || ph.player[0];
  for (const uf in g.control) if (g.control[uf] === fac) g.control[uf] = to;
  if (g.mil) for (const uf in before) if (before[uf] === fac) (g.mil.flips ||= []).push({ uf, from: fac, to, side: "player", front: fac, crush: true });
  if (g.war) g.war.armies = g.war.armies.filter(a => !(a.side === "enemy" && a.fac === fac));
  noteChanges(g, before);
  if (southOn(g) && fac === southCfg(g).fac){ g.south.state = "esmagada"; if (!g.flags.includes("sul_esmagado")) g.flags.push("sul_esmagado"); }
  if (R) R(frontFala(g, "eventos", "ligaCaiu"), "good");
}
/* ---------- Efeitos de eventos (fx.front, fx.org, fx.enemyLoss) ---------- */
// fx.front > 0: o inimigo perde moral (e você ganha um pouco); < 0, o contrário. fx.org: moral dos seus exércitos.
function frontFx(g, fx){
  const W = g.war; if (!W || !W.armies || !W.armies.length) return;
  const mx = frontMaxMorale(g), up = (a, v) => { a.morale = v > 0 ? Math.min(Math.max(a.morale, a.side === "player" ? mx : 80), a.morale + v) : Math.max(5, a.morale + v); };
  if (fx.front) for (const a of W.armies) up(a, a.side === "player" ? fx.front / 2 : -fx.front);
  if (fx.org) for (const a of tpArmies(g, "player")) up(a, fx.org);
  if (fx.enemyLoss){ const a = tpArmies(g, "enemy").sort((x, y) => y.str - x.str)[0]; if (a){ a.str = Math.max(1, a.str - fx.enemyLoss); } }
}
// Força por estado (agitação, revoltas): o exército do lado no estado (a reserva fica em Brasília)
function frontStr(g, side, uf){
  const W = g.war; if (!W) return 0;
  if (uf === undefined) return (side === "player" ? W.reserve : 0) + tpTotal(g, side);
  let s = side === "player" && uf === frontCfg(g).capital ? W.reserve : 0;
  for (const a of tpArmies(g, side)) if (a.uf === uf) s += a.str;
  return s;
}
// Save v7 → v8: exércitos viram tropas das frentes (formato antigo; o v13 converte de novo em exércitos nos estados)
function migrateFronts(g){
  if (!frontCfg(g) || !Array.isArray(g.armies)) return;
  const ph = phaseOf(g), mine = g.armies.filter(a => a.side === "player").reduce((s, a) => s + a.str, 0);
  const foes = {}; for (const a of g.armies.filter(a => a.side === "enemy")){ const fac = a.fac || ph.enemyMain; foes[fac] = (foes[fac] || 0) + a.str; }
  g.war = { reserve: ph.noArmies ? 0 : mine, fronts: [], gens: {}, offAt: null, log: [] };
  g.armies = []; g.enemyPlans = [];
  if (ph.war && !ph.noArmies) for (const fac of Object.keys(frontCfg(g).frentes)){
    if (!(ph.enemy || []).includes(fac) || !Object.values(g.control).includes(fac)) continue;
    const D = frontCfg(g).frentes[fac], n = Object.values(g.control).filter(x => x === fac).length;
    const f = { id: fac, troops: 0, enemy: Math.round(Math.max((D.tropas + D.porEstado * n) * 0.6, (foes[fac] || 0) + n * 2)), n, opened: g.month, progress: 0 };
    if (!g.war.fronts.length){ f.troops = g.war.reserve; g.war.reserve = 0; }
    g.war.fronts.push(f);
  }
  g.warNews = [];
}
// Save v8…v12 → v13: sem regiões do IBGE nem linha de frente. Cada estado volta a ser de um lado só, e os exércitos ficam nos estados:
//   - v12 (exércitos nas regiões): cada exército vai para o estado da região (código IBGE: 2 primeiros dígitos = estado);
//   - v8…v11 (força por frente): a força de cada frente vira exércitos na linha (os seus do seu lado, os do inimigo do lado dele).
const IBGE_UF = { 11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",21:"MA",22:"PI",23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",
  31:"MG",32:"ES",33:"RJ",35:"SP",41:"PR",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF" };
// "Em disputa" (saves antigos) vira o lado com mais vizinhos (empate: o seu)
function dropContested(g){
  const S = scOf(g).story, valid = k => !!S.factions[k];
  const fix = ctl => { if (!ctl) return; for (const uf in ctl) if (!valid(ctl[uf])){
    const n = {}; for (const x of ADJ[uf] || []) if (valid(ctl[x])) n[ctl[x]] = (n[ctl[x]] || 0) + 1;
    const ph = phaseOf(g), pick = Object.keys(n).sort((a, b) => n[b] - n[a] || (sideOf(g, b, ph) === "player") - (sideOf(g, a, ph) === "player"))[0];
    ctl[uf] = pick || (ph.playerMain || (ph.player || [])[0] || S.defaultFaction); } };
  fix(g.control);
  if (g.mil && g.mil.control0) fix(g.mil.control0);
  g.lastMapChanges = (g.lastMapChanges || []).filter(c => valid(c.to));
}
function migrateV13(g){
  if (!frontCfg(g)) return; // só o 2022 mudou
  dropContested(g);
  // regiões: o estado fica com quem tinha a maioria delas (já está em g.control); o mapa de regiões some
  delete g.reg; delete g.regHist; delete g.regPend;
  const W = g.war; if (!W){ if (g.mil) g.mil = null; return; }
  delete W.siege; delete W.hist; delete W.axis; W.mom = W.mom || 0; W.epool ||= {}; W.gens ||= {};
  const ph = phaseOf(g);
  if (Array.isArray(W.armies) && W.armies.some(a => a.reg)){ // v12
    for (const a of W.armies){ a.uf = IBGE_UF[String(a.reg).slice(0, 2)] || a.uf || tpCap(g); delete a.reg; if (a.order) a.order = null; }
    W.fronts = (W.fronts || []).map(f => ({ id: f.id, n: f.n || 1, opened: f.opened ?? g.month }));
    tpFix(g);
  } else if (!Array.isArray(W.armies) || !W.armies.length){ // v8…v11
    const old = W.fronts || [], gens = W.gens || {};
    Object.assign(W, { armies: [], seq: 0, epool: {}, log: [], gens: {}, fronts: [] });
    if (ph.war && !ph.noArmies){
      let mine = 0;
      for (const f of old){
        mine += f.troops || 0;
        if (!Object.values(g.control).includes(f.id) || !frontCfg(g).frentes[f.id]) continue;
        W.fronts.push({ id: f.id, n: f.n || 1, opened: f.opened ?? g.month });
        frontSpawn(g, f.id, Math.max(10, f.enemy || 0));
        for (const a of tpArmies(g, "enemy").filter(a => a.fac === f.id)) a.morale = clamp(Math.round(f.emorale ?? 60), 20, 80);
      }
      W.reserve = (W.reserve || 0) + mine;
      if (W.fronts.length) frontDeploy(g);
      for (const a of tpArmies(g, "player")) a.morale = clamp(Math.round(old[0] && old[0].morale != null ? old[0].morale : 60), 20, 90);
      // generais antigos (por frente) vão para exércitos, na ordem
      const mineA = tpArmies(g, "player"); let i = 0;
      for (const id in gens) if (gens[id] && mineA[i]) W.gens[id] = mineA[i++].id;
    } else W.reserve = (W.reserve || 0) + old.reduce((s, f) => s + (f.troops || 0), 0);
  }
  for (const a of W.armies || []){ delete a.cut; a.order = null; }
  for (const id in W.gens) if (W.gens[id] && !tpById(g, W.gens[id])) W.gens[id] = null;
  // Recife: capital da Resistência anunciada (o grande evento já passou ou vem agora)
  if (ph.war) for (const fac in frontCfg(g).frentes){ const D = frontCfg(g).frentes[fac]; if (D.capitalFlag && Object.values(g.control).includes(fac) && !g.flags.includes(D.capitalFlag)) g.flags.push(D.capitalFlag); }
  if (ph.war && W.fronts.length) tpEnemyPlan(g);
  if (g.mil) g.mil = null;
  g.warNews = [];
}
/* ---------- Relatório de uma batalha ("por que ganhou / perdeu") ---------- */
function frontReport(g, rec){
  const L = frontCfg(g).falas.fatores, rows = [];
  const pc = v => v == null || Math.abs(v - 1) < 0.005 ? "—" : `${v > 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`;
  for (const r of rec.rows){
    if (r.kind === "n") rows.push({ k: r.k, label: L[r.k] || r.k, p: r.p == null ? "—" : String(r.p), e: r.e == null ? "—" : String(r.e), fav: (r.p || 0) > (r.e || 0) * 1.05 ? "player" : (r.e || 0) > (r.p || 0) * 1.05 ? "enemy" : null, w: Math.abs(Math.log(Math.max(1, r.p || 0) / Math.max(1, r.e || 0))) });
    else { const lr = Math.log((r.p ?? 1) / (r.e ?? 1)); rows.push({ k: r.k, label: L[r.k] || r.k, p: pc(r.p), e: pc(r.e), fav: lr > 0.01 ? "player" : lr < -0.01 ? "enemy" : null, w: Math.abs(lr) }); }
  }
  const top = rows.filter(r => r.fav && r.k !== "poder").sort((a, b) => b.w - a.w).slice(0, 2);
  const D = frontCfg(g).falas.dicasTropas, tips = [];
  const mineWon = rec.side === "player" ? rec.win : !rec.win;
  if (!mineWon) tips.push(rec.side === "player" ? (rec.chance < 50 ? "juntar" : "azar") : "defender");
  if (rec.side === "player" && !mineWon && rec.origins < 2) tips.push("flanco");
  if (rec.rows.some(r => r.k === "terreno" || r.k === "reduto")) tips.push("terreno");
  if (rec.rows.some(r => r.k === "cercado") || mineWon) tips.push("cerco");
  if (rec.side === "player" && !rec.special) tips.push("ofensiva");
  tips.push("recrutar");
  const pPow = rec.side === "player" ? rec.A : rec.D, ePow = rec.side === "player" ? rec.D : rec.A;
  return { summary: frontFala(g, "porque", rec.why), top, rows, tips: [...new Set(tips)].slice(0, 2).map(k => D[k]), power: { p: pPow, e: ePow }, won: mineWon, chance: rec.side === "player" ? rec.chance : 100 - rec.chance };
}
