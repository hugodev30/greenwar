// js/core/tropas.js — Núcleo: EXÉRCITOS da guerra de 2022 — fichas que andam pelos ESTADOS do mapa. Sem DOM.
/* Como funciona (números em js/data/2022/frentes.js → tropas; o mês de guerra em js/core/frentes.js → frontWarMonth):
   - Exército: { id, side "player"|"enemy", fac (facção inimiga), n (número no nome), kind ("ex" Exército | "div" Divisão),
     zona (região da divisão: "do Sul"…), nome (nome dado pelo jogador), uf (estado), str (força), morale, xp (experiência 0–100), order }.
     Fica em g.war.armies (o g.armies do 1964 continua vazio no 2022). Fase 16: os exércitos NUNCA se fundem sozinhos —
     cada um continua com nome, força, moral, general e experiência próprios. Até K.porEstado exércitos do mesmo lado
     num estado; juntar dois (tpJoin) ou dividir um (tpSplit) só quando o jogador escolhe. Cada estado é de um lado só.
   - Ordens (de graça, uma por exército por mês):
       mover         até K.passos estados andando SÓ pelo seu território (nada de atravessar o inimigo; o destino precisa ter vaga);
       atacar        um estado inimigo VIZINHO, com ou sem exército inimigo (sem exército, a luta é contra a guarnição local).
   - Batalha (fim do mês): chance = A^k / (A^k + D^k). A = poder dos atacantes × FLANCO (atacar o mesmo estado vindo de
     2 ou 3 estados diferentes); D = (defensores entrincheirados + guarnição) × terreno × reduto (Brasília, Recife, Porto Alegre).
     Quem vence o ataque toma o estado inteiro e entra nele; o defensor recua para um estado vizinho seu — ou se rende, se cercado.
   - CERCO: exército sem caminho pelo próprio território até a sua capital está cercado: luta com menos força, perde tropa e
     moral todo mês e se rende quando fica fraco. ÍMPETO (−3 a +3): vitórias seguidas dão bônus às suas tropas; derrotas, o contrário.
   - Batalha de Recife: no ataque a Recife você escolhe a tática (assalto, cerco por dois lados ou desembarque no porto) e a
     Resistência faz a última resistência. Tomar Recife vence a guerra; perder Brasília perde.
   - IA (inimigo e "comando automático"): defende a própria capital, ataca onde a chance passa do limite (preferindo o caminho
     até a capital do outro lado e os flancos) e manda quem está na retaguarda andar até a linha. Sempre estado vizinho. */
function tpK(g){ return frontCfg(g).tropas; }
const TP_UFS = Object.keys(ADJ);
function ufName(uf){ const s = MAP_DATA.states[uf]; return s ? s.name : uf; }
function tpArmies(g, side){ const W = g.war, L = (W && W.armies) || []; return side ? L.filter(a => a.side === side) : L; }
function tpById(g, id){ return tpArmies(g).find(a => a.id === id) || null; }
function tpAt(g, side, uf){ return tpArmies(g).find(a => a.side === side && a.uf === uf) || null; }
function tpAllAt(g, side, uf){ return tpArmies(g).filter(a => a.side === side && a.uf === uf); }
// vaga num estado: menos de K.porEstado exércitos do lado ali (sem contar "except")
function tpRoom(g, side, uf, except){ return tpArmies(g).filter(a => a.side === side && a.uf === uf && a !== except).length < (tpK(g).porEstado || 3); }
// Região de um estado (para o nome das divisões: "2ª Divisão do Sul")
const UF_REGIAO = { AC: "N", AM: "N", AP: "N", PA: "N", RO: "N", RR: "N", TO: "N", AL: "NE", BA: "NE", CE: "NE", MA: "NE", PB: "NE", PE: "NE", PI: "NE", RN: "NE", SE: "NE",
  DF: "CO", GO: "CO", MT: "CO", MS: "CO", ES: "SE", MG: "SE", RJ: "SE", SP: "SE", PR: "S", RS: "S", SC: "S" };
// Experiência: 0–100; nível 0 (recrutas), 1 (veteranos, ★), 2 (elite, ★★); dá até +K.xp.bonus de poder
function tpXpLevel(a){ const x = a.xp || 0; return x >= 70 ? 2 : x >= 30 ? 1 : 0; }
function tpSide(g, uf){ return sideOf(g, g.control[uf], phaseOf(g)); }
function tpOwn(g, a, uf){ return a.side === "player" ? tpSide(g, uf) === "player" : g.control[uf] === a.fac; }
function tpHostile(g, a, uf){ return a.side === "player" ? tpSide(g, uf) === "enemy" && !!frontById(g, g.control[uf]) : tpSide(g, uf) === "player"; }
function tpName(g, a){
  if (a.nome) return a.nome;
  if (a.side === "player" && a.kind === "div") return gfmt(frontFala(g, "tropas", "nomeDiv_" + (a.zona || "CO")), a.n);
  return gfmt(frontFala(g, "tropas", a.side === "player" ? "nomeSeu" : "nome_" + a.fac), a.n);
}
function tpCap(g){ return frontCfg(g).capital; }
// capital de quem defende: a sua (Brasília) ou o reduto da facção inimiga (Recife / Porto Alegre)
function tpHome(g, side, fac){ const K = frontCfg(g); return side === "player" ? K.capital : (K.frentes[fac] || {}).reduto || null; }
function tpIsFort(g, uf){
  if (uf === tpCap(g)) return tpSide(g, uf) === "player";
  const D = frontCfg(g).frentes[g.control[uf]]; return !!(D && D.reduto === uf);
}
// Recife (o reduto que decide a guerra) nas mãos do inimigo
function tpIsFinal(g, uf){ const D = frontCfg(g).frentes[g.control[uf]]; return !!(D && D.vitoria && D.reduto === uf); }
function tpTotal(g, side, fac){ return tpArmies(g, side).filter(a => !fac || a.fac === fac).reduce((s, a) => s + a.str, 0); }
// distância (em estados) de cada estado até "from", pelo mapa todo
const UF_DIST = {};
function ufDist(from){
  if (UF_DIST[from]) return UF_DIST[from];
  const d = { [from]: 0 }, q = [from];
  while (q.length){ const u = q.shift(); for (const n of ADJ[u] || []) if (!(n in d)){ d[n] = d[u] + 1; q.push(n); } }
  return (UF_DIST[from] = d);
}
// Caminho mais curto do seu território até a capital inimiga (só estados inimigos): "Recife a N estados"
function tpGoalPath(g, fac){
  const goal = tpHome(g, "enemy", fac); if (!goal || tpSide(g, goal) === "player") return null;
  const ph = phaseOf(g), mine = uf => sideOf(g, g.control[uf], ph) === "player", prev = {}, q = [];
  for (const uf of TP_UFS) if (!mine(uf) && ADJ[uf].some(mine)){ prev[uf] = null; q.push(uf); }
  while (q.length){ const u = q.shift(); if (u === goal) break; for (const n of ADJ[u]) if (!(n in prev) && !mine(n)){ prev[n] = u; q.push(n); } }
  if (!(goal in prev)) return null;
  const P = []; for (let x = goal; x != null; x = prev[x]) P.unshift(x);
  return P;
}
// Revolta num estado seu (agitação extrema): passa para a facção inimiga com mais estados vizinhos (com frente aberta)
function tpRevoltTo(g, uf){
  const n = {}; for (const x of ADJ[uf] || []){ const f = g.control[x]; if (tpSide(g, x) === "enemy" && frontById(g, f)) n[f] = (n[f] || 0) + 1; }
  return Object.keys(n).sort((a, b) => n[b] - n[a] || (a < b ? -1 : 1))[0] || null;
}
/* ---------- Criar, juntar, dividir, renomear, remover ---------- */
// kind: "ex" (Exército, os do começo da guerra) ou "div" (Divisão da região do estado: recrutas e divisões)
function tpNew(g, side, fac, uf, str, morale, kind, xp){
  const W = g.war; kind = side === "player" ? (kind || "ex") : "ex";
  const zona = kind === "div" ? (UF_REGIAO[uf] || "CO") : null;
  const used = new Set(tpArmies(g).filter(a => a.side === side && a.fac === (fac || null) && (a.kind || "ex") === kind && (a.zona || null) === zona).map(a => a.n));
  let n = 1; while (used.has(n)) n++;
  W.seq = (W.seq || 0) + 1;
  const a = { id: "t" + W.seq, side, fac: fac || null, n, kind, zona, uf, str: Math.max(1, Math.round(str)), morale: Math.round(morale ?? 60), xp: Math.round(xp ?? 0), order: null };
  W.armies.push(a);
  return a;
}
function tpEditState(g, a){
  const st = tpOrderState(g); if (!st.ok) return st;
  if (!a || a.side !== "player") return { ok: false, msg: frontFala(g, "tropas", "erroExercito") };
  return { ok: true };
}
// Juntar (escolha do jogador): "from" entra em "into" (mesmo estado). Força somada, moral e experiência pela média; o general fica.
function tpJoinState(g, into, from){
  const st = tpEditState(g, into); if (!st.ok) return st;
  if (!from || from === into || from.side !== "player" || from.uf !== into.uf) return { ok: false, msg: frontFala(g, "tropas", "juntarLonge") };
  if (into.special || from.special) return { ok: false, msg: frontFala(g, "tropas", "juntarOfensiva") };
  return { ok: true };
}
function tpJoin(g, intoId, fromId){ return tpMerge(g, [intoId, fromId], intoId); }
// Unificar (fase 18): 2 ou 3 exércitos seus do mesmo estado viram um só. Força somada; moral e experiência pela média ponderada;
// fica o nome, a ordem e o general de "keepId" (sem general, herda o do mais forte que tiver um)
function tpMergeState(g, ids, keepId){
  const F = k => frontFala(g, "tropas", k), L = [...new Set(ids || [])].map(id => tpById(g, id));
  if (L.length < 2) return { ok: false, msg: F("unirPoucos") };
  if (L.some(x => !x)) return { ok: false, msg: F("erroExercito") };
  for (const x of L){ const st = tpEditState(g, x); if (!st.ok) return st; }
  if (L.some(x => x.uf !== L[0].uf)) return { ok: false, msg: F("unirLonge") }; // só do mesmo estado (regra dura, também no núcleo)
  if (L.some(x => x.special)) return { ok: false, msg: F("juntarOfensiva") };
  if (keepId && !L.some(x => x.id === keepId)) return { ok: false, msg: F("erroExercito") };
  return { ok: true, list: L };
}
function tpMerge(g, ids, keepId){
  const st = tpMergeState(g, ids, keepId); if (!st.ok) return st;
  const L = st.list, into = keepId ? tpById(g, keepId) : L.slice().sort((x, y) => y.str - x.str)[0], rest = L.filter(x => x !== into);
  const tot = L.reduce((s, x) => s + x.str, 0);
  into.xp = Math.round(L.reduce((s, x) => s + (x.xp || 0) * x.str, 0) / Math.max(1, tot));
  let gi = tpGen(g, into); const gOther = rest.slice().sort((x, y) => y.str - x.str).map(x => tpGen(g, x)).find(Boolean);
  for (const x of rest){ tpAddTo(into, x.str, x.morale); tpRemove(g, x); }
  if (!gi && gOther){ g.war.gens[gOther.id] = into.id; gi = gOther; }
  return { ok: true, id: into.id, msg: gfmt(frontFala(g, "tropas", "msgUniu"), L.length, tpName(g, into), Math.round(into.str)) };
}
// Dividir (escolha do jogador): metade da força vira uma Divisão nova no mesmo estado (precisa de vaga e de força mínima)
function tpSplitState(g, a){
  const st = tpEditState(g, a); if (!st.ok) return st;
  const T = tpK(g), F = k => frontFala(g, "tropas", k);
  if (a.str < (T.dividirMin || 50)) return { ok: false, msg: gfmt(F("dividirFraco"), T.dividirMin || 50, Math.round(a.str)) };
  if (!tpRoom(g, "player", a.uf)) return { ok: false, msg: gfmt(F("lotado"), T.porEstado || 3) };
  if (tpArmies(g, "player").length >= T.max) return { ok: false, msg: gfmt(F("limite"), T.max) };
  if (a.special) return { ok: false, msg: F("juntarOfensiva") };
  return { ok: true };
}
function tpSplit(g, id){
  const a = tpById(g, id), st = tpSplitState(g, a); if (!st.ok) return st;
  const half = Math.floor(a.str / 2); a.str -= half;
  const b = tpNew(g, "player", null, a.uf, half, a.morale, "div", a.xp);
  return { ok: true, id: b.id, msg: gfmt(frontFala(g, "tropas", "msgDividiu"), tpName(g, a), tpName(g, b)) };
}
// Renomear: texto curto (até 28 letras); vazio volta ao nome padrão
function tpRename(g, id, name){
  const a = tpById(g, id); if (!a || a.side !== "player") return { ok: false, msg: frontFala(g, "tropas", "erroExercito") };
  const t = String(name || "").replace(/[<>{}\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 28);
  if (t) a.nome = t; else delete a.nome;
  return { ok: true, msg: gfmt(frontFala(g, "tropas", "msgRenomeou"), tpName(g, a)) };
}
function tpRemove(g, a){ const W = g.war; W.armies = W.armies.filter(x => x !== a); for (const k in W.gens) if (W.gens[k] === a.id) W.gens[k] = null; }
function tpAddTo(a, str, morale){ if (morale != null && a.str + str > 0) a.morale = Math.round((a.morale * a.str + morale * str) / (a.str + str)); a.str = Math.round(a.str + str); }
/* ---------- Generais ---------- */
// Seu general de um exército (um general por exército); os exércitos inimigos usam o traço do comandante da facção
function tpGen(g, a){
  const K = frontCfg(g);
  if (a.side !== "player"){ const D = K.frentes[a.fac]; return D ? { id: "e_" + a.fac, traco: D.traco, retrato: D.retrato } : null; }
  return K.generais.find(x => g.war.gens[x.id] === a.id) || null;
}
function tpSetGeneral(g, armyId, genId){
  const W = g.war, K = frontCfg(g), a = tpById(g, armyId);
  if (!a || a.side !== "player") return { ok: false, msg: frontFala(g, "tropas", "erroExercito") };
  const cur = tpGen(g, a);
  if (!genId){ if (cur) W.gens[cur.id] = null; return { ok: true }; }
  const gen = K.generais.find(x => x.id === genId); if (!gen) return { ok: false, msg: frontFala(g, "tropas", "erroGeneral") };
  if (cur && cur.id === genId) return { ok: true };
  const from = W.gens[genId];
  if (cur) W.gens[cur.id] = from && tpById(g, from) ? from : null; // troca: o atual vai para o exército de onde o outro saiu
  W.gens[genId] = a.id;
  return { ok: true, msg: gfmt(frontFala(g, "tropas", "generalAssume"), frontGenName(g, gen), tpName(g, a)) };
}
function frontGenName(g, gen){ const P = scOf(g).retratos && scOf(g).retratos.pessoas[gen.retrato]; return P ? P.nome : gen.id; }
/* ---------- Cerco e ímpeto ---------- */
// Estados do lado ligados à capital dele pelo próprio território (quem está fora disso está cercado)
function tpLinked(g, side, fac){
  const home = tpHome(g, side, fac), ph = phaseOf(g), own = uf => side === "player" ? sideOf(g, g.control[uf], ph) === "player" : g.control[uf] === fac;
  const S = new Set(); if (!home || !own(home)) return null; // sem capital (caiu): ninguém é "cercado" por isso
  const q = [home]; S.add(home);
  while (q.length){ const u = q.shift(); for (const n of ADJ[u]) if (!S.has(n) && own(n)){ S.add(n); q.push(n); } }
  return S;
}
function tpCut(g, a, linked){ const L = linked !== undefined ? linked : tpLinked(g, a.side, a.fac); return !!(L && !L.has(a.uf)); }
function tpMomentum(g){ return clamp(Math.round((g.war && g.war.mom) || 0), -3, 3); }
/* ---------- Poder e chance ---------- */
// Modificadores do lado (multiplicam todos os exércitos dele). rows: fatores para o relatório
function tpMods(g, side, fac){
  const C = scOf(g).campaign, KK = C.keys, T = tpK(g), rows = []; let m = 0;
  const add = (k, v) => { if (Math.abs(v - 1) >= 0.005) rows.push({ k, v }); return v - 1; };
  if (side === "player"){
    m += add("comando", 1 + clamp(((g.stats[KK.mil] ?? 50) - 50) / 200 + (natLoyalty(g) - 50) / 300, -0.3, 0.3));
    m += add("apoio", 1 + clamp(((g.stats[KK.pop] ?? 50) - 50) / 150, -0.2, 0.2));
    m += add("armas", 1 + armsAid(g));
    m += add("impeto", 1 + T.impeto.passo * tpMomentum(g));
  } else {
    m += add("dificuldade", 1 + ((C.enemyPower ?? 1) - 1) * 0.3);
    if (fac === (phaseOf(g).enemyMain || fac)) m += add("estrangeiro", 1 + 0.12 * foreignFoes(g) + 0.05 * (g.enemyBoost || 0));
    m += add("sancoes", 1 - 0.15 * malusNow(g));
  }
  return { v: Math.max(0.3, 1 + m), rows };
}
function tpXpF(g, a){ const X = tpK(g).xp; return 1 + (X ? X.bonus : 0.15) * clamp(a.xp || 0, 0, 100) / 100; }
function tpMoraleF(a){ return 0.4 + 0.6 * clamp(a.morale, 0, 100) / 100; }
function tpTrait(g, a, role){ const gen = tpGen(g, a), T = gen && frontCfg(g).tracos[gen.traco]; return T ? 1 + (T[role] || 0) : 1; }
function tpPow(g, a, role, mods, cut){
  let p = Math.max(0, a.str) * tpMoraleF(a) * tpTrait(g, a, role) * tpXpF(g, a);
  if (role === "ataque" && a.special) p *= frontCfg(g).ofensiva.mult;
  if (cut) p *= tpK(g).cerco.poder;
  return p * (mods || tpMods(g, a.side, a.fac)).v;
}
// Guarnição local (milícia, polícia, voluntários) de um estado — luta mesmo sem exército
function tpGarrison(g, uf){
  const T = tpK(g);
  let v = tpIsFort(g, uf) ? T.guarnicaoCapital : T.guarnicao + (UF_WEIGHT[uf] || 1) * T.guarnicaoPeso;
  if (tpSide(g, uf) === "enemy") v *= frontEnemyScale(g);
  return v;
}
// Táticas da Batalha de Recife (só no ataque do jogador a Recife)
function tpTactics(g){ return tpK(g).recife.taticas; }
function tpTactic(g, atks, uf){
  if (atks[0].side !== "player" || !tpIsFinal(g, uf)) return null;
  const k = (atks.find(a => a.order && a.order.tatica) || {}).order; return k && tpTactics(g)[k.tatica] ? k.tatica : "assalto";
}
// Chance de um grupo de exércitos (do mesmo lado) tomar um estado. tat: tática de Recife (opcional; senão a da ordem)
function tpOdds(g, atks, uf, tat){
  const K = frontCfg(g), T = tpK(g), side = atks[0].side, dside = side === "player" ? "enemy" : "player";
  const am = tpMods(g, side, atks[0].fac), La = tpLinked(g, side, atks[0].fac);
  const tk = tat !== undefined ? (tat && tpIsFinal(g, uf) && side === "player" ? tat : null) : tpTactic(g, atks, uf), TT = tk ? tpTactics(g)[tk] : null;
  const origins = new Set(atks.map(a => a.uf)).size;
  const flank = 1 + T.flanco * Math.min(2, origins - 1) * (TT && TT.flanco ? TT.flanco : 1);
  const cutA = atks.filter(a => tpCut(g, a, La)).length;
  let A = atks.reduce((s, a) => s + tpPow(g, a, "ataque", am, tpCut(g, a, La)), 0) * flank * (TT ? TT.ataque : 1);
  const defs = tpArmies(g, dside).filter(a => a.uf === uf), Ld = defs.length ? tpLinked(g, dside, defs[0].fac) : null;
  const dm = defs.length ? tpMods(g, dside, defs[0].fac) : null, last = tpIsFinal(g, uf) && side === "player";
  const dig = TT && TT.semCavar ? 1 : T.cavar;
  const DA = defs.reduce((s, a) => s + tpPow(g, a, "defesa", dm, tpCut(g, a, Ld)) * (a.moved && !last ? 1 : dig), 0);
  const gar = tpGarrison(g, uf), terr = 1 + frontTerrain(uf), red = tpIsFort(g, uf) ? (TT && TT.semReduto ? 1 : K.reduto) : 1;
  const ult = last ? T.recife.ultima : 1;
  const D = (DA + gar) * terr * red * ult, k = T.expoente;
  const chance = A <= 0 ? 0 : Math.pow(A, k) / (Math.pow(A, k) + Math.pow(Math.max(0.1, D), k));
  return { A, D, DA, gar, terr, red, ult, flank, origins, cutA, cutD: defs.filter(a => tpCut(g, a, Ld)).length, dig, tat: tk, chance, defs, am, dm };
}
// Chance mostrada antes de confirmar: este exército + os seus que já vão atacar o mesmo alvo
function tpChance(g, a, to, tat){
  const grp = tpArmies(g, a.side).filter(x => x !== a && x.order && x.order.type === "atacar" && x.order.to === to);
  if (tat === undefined && a.side === "player" && tpIsFinal(g, to)) tat = (a.order && a.order.to === to && a.order.tatica) || (grp.find(x => x.order.tatica) || { order: {} }).order.tatica || tpBestTactic(g, a, to);
  return Object.assign(tpOdds(g, [a].concat(grp), to, tat), { with: grp.map(x => x.id) });
}
// A melhor tática para este ataque a Recife (a IA do comando automático e a sugestão inicial)
function tpBestTactic(g, a, to){
  const grp = tpArmies(g, a.side).filter(x => x !== a && x.order && x.order.type === "atacar" && x.order.to === to), L = [a].concat(grp);
  return Object.keys(tpTactics(g)).map(k => ({ k, c: tpOdds(g, L, to, k).chance })).sort((x, y) => y.c - x.c)[0].k;
}
/* ---------- Alvos e ordens ---------- */
// Destinos válidos: até K.passos estados pelo seu território (mover; o destino precisa ter vaga — stack = quantos seus já estão lá)
// e estados inimigos vizinhos (atacar). Passar por um estado lotado pode; parar nele, não.
function tpTargets(g, a){
  const out = []; if (!a || !ADJ[a.uf]) return out;
  const T = tpK(g), dist = { [a.uf]: 0 }, prev = {}, q = [a.uf];
  while (q.length){
    const u = q.shift(); if (dist[u] >= T.passos) continue;
    for (const n of ADJ[u]) if (!(n in dist) && tpOwn(g, a, n)){
      dist[n] = dist[u] + 1; prev[n] = u; q.push(n);
      const path = []; for (let x = n; x !== a.uf; x = prev[x]) path.unshift(x);
      const o = tpAllAt(g, a.side, n).filter(x => x !== a);
      if (o.length < (T.porEstado || 3)) out.push({ to: n, type: "mover", path, with: o.length ? o[0].id : null, stack: o.length });
    }
  }
  if (!(g.ceasefire > 0)){
    const foe = a.side === "player" ? "enemy" : "player";
    for (const n of ADJ[a.uf]) if (tpHostile(g, a, n)) out.push({ to: n, type: "atacar", path: [n], empty: !tpAt(g, foe, n), final: tpIsFinal(g, n) && a.side === "player" });
  }
  return out;
}
function tpGive(g, a, t, tat){
  a.order = { type: t.type === "atacar" ? "atacar" : "mover", to: t.to, path: t.path.slice() };
  if (t.type === "atacar" && a.side === "player" && tpIsFinal(g, t.to)){
    const k = tat && tpTactics(g)[tat] ? tat : tpBestTactic(g, a, t.to);
    for (const x of tpArmies(g, "player")) if (x.order && x.order.type === "atacar" && x.order.to === t.to) x.order.tatica = k; // todos no mesmo plano
    a.order.tatica = k;
  }
}
function tpOrderState(g){
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes na aba História." };
  if (!g.war || !phaseOf(g).war) return { ok: false, msg: frontFala(g, "tropas", "semGuerra") };
  return { ok: true };
}
// Ordem do jogador: to = estado de destino (null ou o próprio estado desfaz a ordem); tat = tática (só no ataque a Recife)
function tpOrder(g, id, to, tat){
  const st = tpOrderState(g); if (!st.ok) return st;
  const a = tpById(g, id), F = k => frontFala(g, "tropas", k);
  if (!a || a.side !== "player") return { ok: false, msg: F("erroExercito") };
  if (to == null || to === a.uf){ if (a.special) cancelOffensive(g, a.id); a.order = null; return { ok: true, msg: gfmt(F("ordemDesfeita"), tpName(g, a)) }; }
  const t = tpTargets(g, a).find(x => x.to === to);
  if (!t) return { ok: false, msg: F("alvoInvalido") };
  if (a.special && t.type !== "atacar") cancelOffensive(g, a.id);
  tpGive(g, a, t, tat);
  if (t.type === "atacar") return { ok: true, msg: gfmt(F(a.order.tatica ? "msgAtaqueRecife" : "msgAtaque"), tpName(g, a), ufName(to), Math.round(tpChance(g, a, to).chance * 100)) };
  return { ok: true, msg: gfmt(F("msgMover"), tpName(g, a), ufName(to)) };
}
// Troca a tática do ataque a Recife (vale para todos os seus exércitos que atacam Recife neste mês)
function tpSetTactic(g, uf, tat){
  if (!tpTactics(g)[tat]) return { ok: false, msg: frontFala(g, "tropas", "alvoInvalido") };
  const L = tpArmies(g, "player").filter(x => x.order && x.order.type === "atacar" && x.order.to === uf);
  for (const x of L) x.order.tatica = tat;
  return { ok: true, msg: gfmt(frontFala(g, "tropas", "taticaEscolhida"), frontFala(g, "taticas", tat)) };
}
/* ---------- IA (inimigo e comando automático) ---------- */
// Distância (em estados do lado) até a linha de frente: 0 = encostado no inimigo
function tpLineDist(g, side, fac){
  const ph = phaseOf(g), own = uf => side === "player" ? sideOf(g, g.control[uf], ph) === "player" : g.control[uf] === fac;
  const hostile = uf => side === "player" ? sideOf(g, g.control[uf], ph) === "enemy" && !!frontById(g, g.control[uf]) : sideOf(g, g.control[uf], ph) === "player";
  const d = {}, q = [];
  for (const uf of TP_UFS) if (own(uf) && ADJ[uf].some(hostile)){ d[uf] = 0; q.push(uf); }
  while (q.length){ const u = q.shift(); for (const n of ADJ[u]) if (!(n in d) && own(n)){ d[n] = d[u] + 1; q.push(n); } }
  return d;
}
// opt: { thr: chance mínima para atacar, attack: pode atacar?, thrFor(t, thr): limite por alvo, bonus(t): valor extra do alvo,
//        base: estado onde a retaguarda se concentra (IA do inimigo, js/core/ia-inimiga.js) }
// Ordem de prioridade: 1) capital (fica / volta para defender), 2) estados ameaçados, 3) ataques, 4) retaguarda até a linha
function tpAI(g, list, opt){
  if (!list.length) return 0;
  const side = list[0].side, fac = list[0].fac, foe = side === "player" ? "enemy" : "player";
  const free = new Set(list.filter(a => !a.order)); let n = 0;
  const give = (a, to) => { const t = tpTargets(g, a).find(x => x.to === to); if (!t) return false; tpGive(g, a, t); free.delete(a); n++; return true; };
  const reachers = to => [...free].filter(a => a.uf !== to && tpTargets(g, a).some(t => t.to === to && t.type !== "atacar")).sort((x, y) => y.str - x.str);
  const foes = tpArmies(g, foe), ph = phaseOf(g), own = uf => side === "player" ? sideOf(g, g.control[uf], ph) === "player" : g.control[uf] === fac;
  // 1) capital: quem está nela fica quando há inimigo por perto; o lado inimigo traz exércitos de volta se você chega perto de Recife
  const home = tpHome(g, side, fac); let recall = null;
  if (home && own(home)){
    const Dh = ufDist(home), near = Math.min(99, ...foes.map(e => Dh[e.uf] ?? 99));
    const at = tpAt(g, side, home);
    if (at && near <= (side === "player" ? 1 : 2)) for (const x of tpAllAt(g, side, home)) free.delete(x);
    if (!at && near <= 1){ const c = reachers(home)[0]; if (c) give(c, home); }
    if (side === "enemy" && near <= 2) recall = Dh;
  }
  // 2) estados ameaçados: o jogador vê o plano inimigo (setas vermelhas); quem está no estado ameaçado fica, e um vizinho vem ajudar
  if (side === "player"){
    const thr = {}; for (const e of foes) if (e.order && e.order.type === "atacar" && own(e.order.to)) (thr[e.order.to] ||= []).push(e);
    const imp = uf => (uf === home ? 3 : 0) + (UF_WEIGHT[uf] || 1) / 4 + (tpAt(g, side, uf) ? 0.5 : 0);
    for (const uf of Object.keys(thr).sort((x, y) => imp(y) - imp(x) || (x < y ? -1 : 1))){
      const at = tpAt(g, side, uf), ch = tpOdds(g, thr[uf], uf).chance;
      if (at){ const here = tpAllAt(g, side, uf), sum = here.reduce((s, x) => s + x.str, 0);
        if (ch > 0.25 && !(opt.attack && sum > thr[uf].reduce((s, e) => s + e.str, 0) * 1.6)) for (const x of here) free.delete(x); continue; }
      if (ch < 0.5 || imp(uf) < 1) continue;
      const c = reachers(uf).find(a => !Object.keys(thr).includes(a.uf)); if (c) give(c, uf);
    }
  }
  // 3) ataques: o melhor alvo de cada vez (chance + valor), juntando vizinhos (flanco) até passar do limite
  if (opt.attack && !(g.ceasefire > 0)){
    const gd = t => { const goal = side === "player" ? tpHome(g, "enemy", g.control[t]) : tpCap(g); return goal ? (ufDist(goal)[t] ?? 30) : 30; };
    const Lfoe = {}, cutFoe = uf => { const e = tpAt(g, foe, uf); if (!e) return false; const k = e.side + e.fac; if (!(k in Lfoe)) Lfoe[k] = tpLinked(g, e.side, e.fac); return tpCut(g, e, Lfoe[k]); };
    for (let guard = 0; guard < 12; guard++){
      let best = null; const cand = new Set();
      for (const a of free) for (const t of ADJ[a.uf]) if (tpHostile(g, a, t)) cand.add(t);
      for (const t of cand){
        const already = list.filter(a => a.order && a.order.type === "atacar" && a.order.to === t);
        const near = [...free].filter(a => ADJ[a.uf].includes(t) && tpHostile(g, a, t) && !(recall && (recall[t] ?? 99) > 2 && (recall[a.uf] ?? 99) <= 3)).sort((x, y) => y.str - x.str);
        const goal = side === "player" ? tpHome(g, "enemy", g.control[t]) : tpCap(g), thr0 = t === goal ? Math.min(opt.thr, tpK(g).alvoChance) : opt.thr, thr = opt.thrFor ? opt.thrFor(t, thr0) : thr0;
        const pick = []; let ch = 0;
        for (const a of near){ pick.push(a); ch = tpOdds(g, already.concat(pick), t, side === "player" && tpIsFinal(g, t) ? tpBestTacticFor(g, already.concat(pick), t) : undefined).chance; if (ch >= thr) break; }
        if (!pick.length || ch < thr) continue;
        const v = ch - 0.05 * gd(t) + (t === goal ? 1 : 0) + (UF_WEIGHT[t] || 1) * 0.01 + (tpAt(g, foe, t) ? 0 : 0.08) + (cutFoe(t) ? 0.15 : 0) + (recall && (recall[t] ?? 99) <= 2 ? 0.3 : 0) + (opt.bonus ? opt.bonus(t) : 0);
        if (!best || v > best.v) best = { t, pick, v };
      }
      if (!best) break;
      for (const a of best.pick) give(a, best.t);
      if (side === "player" && tpIsFinal(g, best.t)){ const k = tpBestTacticFor(g, list.filter(a => a.order && a.order.to === best.t), best.t); for (const a of list) if (a.order && a.order.to === best.t) a.order.tatica = k; }
    }
  }
  // 4) retaguarda: anda até a linha (ou, no recuo, até a capital), sem empilhar à toa
  const L = tpLineDist(g, side, fac), Gd = side === "player" ? null : ufDist(opt.base && own(opt.base) ? opt.base : tpCap(g));
  const mainFoe = side === "player" ? (ph.enemyMain && frontById(g, ph.enemyMain) ? ph.enemyMain : (g.war.fronts[0] || {}).id) : null;
  const goalR = side === "player" ? (mainFoe ? tpHome(g, "enemy", mainFoe) : null) : (opt.base && own(opt.base) ? opt.base : tpCap(g)), GG = goalR ? ufDist(goalR) : null;
  for (const a of [...free]){
    if (recall && (recall[a.uf] ?? 99) <= 4 && (recall[a.uf] ?? 99) > 1){
      const o = tpTargets(g, a).filter(t => t.type !== "atacar" && (recall[t.to] ?? 99) < recall[a.uf]).sort((x, y) => recall[x.to] - recall[y.to] || (!!x.with - !!y.with))[0];
      if (o){ give(a, o.to); continue; }
    }
    const d0 = L[a.uf]; if (d0 === undefined) continue;
    if (d0 === 0){ // na linha e sem ataque: se o estado não está ameaçado, desliza pela linha rumo ao objetivo (junta forças no eixo)
      if (!opt.attack || !GG) continue;
      const risk = foes.filter(e => ADJ[a.uf].includes(e.uf)).reduce((s, e) => s + e.str, 0);
      if (risk > a.str * 0.7 || (a.uf === home)) continue;
      const o = tpTargets(g, a).filter(t => t.type !== "atacar" && L[t.to] === 0 && (!t.with || t.to === opt.base) && (GG[t.to] ?? 99) < (GG[a.uf] ?? 99)).sort((x, y) => GG[x.to] - GG[y.to] || (x.to < y.to ? -1 : 1))[0];
      if (o) give(a, o.to);
      continue;
    }
    const opts = tpTargets(g, a).filter(t => t.type !== "atacar" && L[t.to] !== undefined && L[t.to] < d0);
    if (!opts.length) continue;
    opts.sort((x, y) => (!!x.with - !!y.with) || L[x.to] - L[y.to] || (Gd ? (Gd[x.to] ?? 30) - (Gd[y.to] ?? 30) : (GG ? (GG[x.to] ?? 30) - (GG[y.to] ?? 30) : 0)) || (x.to < y.to ? -1 : 1));
    give(a, opts[0].to);
  }
  return n;
}
function tpBestTacticFor(g, L, to){ return Object.keys(tpTactics(g)).map(k => ({ k, c: tpOdds(g, L, to, k).chance })).sort((x, y) => y.c - x.c)[0].k; }
// Plano do inimigo para o próximo mês (fica visível: setas vermelhas no mapa)
function tpEnemyPlan(g){
  const K = frontCfg(g);
  for (const a of tpArmies(g, "enemy")) a.order = null;
  for (const f of (g.war.fronts || [])){
    const D = K.frentes[f.id], list = tpArmies(g, "enemy").filter(a => a.fac === f.id);
    iaEnemyMonth(g, f.id, list, D); // js/core/ia-inimiga.js (no Fácil, a IA antiga)
  }
}
/* ---------- Batalha ---------- */
function tpRetreat(g, d, from){
  const home = tpHome(g, d.side, d.fac), H = home ? ufDist(home) : {};
  const c = ADJ[from].filter(x => x !== from && tpOwn(g, d, x));
  if (!c.length) return null;
  c.sort((x, y) => (tpRoom(g, d.side, y, d) - tpRoom(g, d.side, x, d)) || (H[x] ?? 40) - (H[y] ?? 40) || (x < y ? -1 : 1));
  return c[0];
}
function tpWhy(rec){
  const c = rec.chance, emp = !rec.def.length;
  if (rec.side === "player") return rec.win ? (emp ? "ocupou" : c >= 65 ? "venceuForte" : c >= 40 ? "venceuApertado" : "venceuSorte")
    : (c < 35 ? "perdeuFraco" : c < 60 ? "perdeuApertado" : "perdeuAzar");
  return rec.win ? (c >= 60 ? "caiuForte" : "caiuAzar") : (c >= 50 ? "segurouSorte" : "segurouForte");
}
// Frase curta e dramática da batalha (animação e registro do mês)
function tpDrama(rec){
  if (rec.final) return rec.win ? "recifeCaiu" : "recifeResiste";
  if (rec.side === "enemy" && rec.uf === rec.cap) return rec.win ? "capitalCaiu" : "capitalResiste";
  if (rec.win && rec.origins >= 2) return rec.side === "player" ? "flanco" : "flancoInimigo";
  if (rec.lost.some(x => x.side !== rec.side) && rec.win) return rec.side === "player" ? "aniquilou" : "aniquilado";
  if (rec.side === "player") return rec.win ? (rec.chance < 40 ? "zebra" : "avanco") : "repelido";
  return rec.win ? "perdemos" : "segurou";
}
// Referência curta de um exército (para registros: o nome continua certo depois que ele some)
function tpRef(a){ const r = { id: a.id, n: a.n, side: a.side, fac: a.fac }; if (a.kind === "div"){ r.kind = "div"; r.zona = a.zona; } if (a.nome) r.nome = a.nome; return r; }
function tpSnap(g, a, s0){ const gen = tpGen(g, a); return Object.assign(tpRef(a), { uf: a.uf, str0: s0, str: a.str, morale: Math.round(a.morale), xp: a.xp || 0, gen: a.side === "player" && gen ? gen.id : null }); }
function tpBattle(g, atks, uf){
  const K = frontCfg(g), T = tpK(g), side = atks[0].side, ph = phaseOf(g);
  const o = tpOdds(g, atks, uf), win = rnd(g) < o.chance, TT = o.tat ? tpTactics(g)[o.tat] : null;
  const r = o.A / Math.max(1, o.D), wf = 1 + frontWeary(g) * 0.5, L = T.perdas, M = T.moral, X = T.xp || { vitoria: 12, derrota: 6, defesa: 6 };
  const s0A = atks.map(a => a.str), s0D = o.defs.map(a => a.str), spec = atks.some(a => a.special), from = atks.map(a => a.uf);
  const front = side === "player" ? g.control[uf] : atks[0].fac, final = tpIsFinal(g, uf) && side === "player";
  for (const a of atks){
    let loss = a.str * (win ? L.venceu * clamp(1 / r, 0.4, 1.5) : L.perdeu * clamp(1 / r, 0.6, 2)) * wf;
    if (!win && TT && TT.perdas) loss *= TT.perdas;
    if (a.special && !win) loss += a.str * K.ofensiva.falhaPerdas;
    a.str = Math.max(0, Math.round(a.str - loss)); a.fought = true;
    a.morale = clamp(a.morale + M.ataque + (win ? M.vitoria : M.derrota) + (a.special && !win ? K.ofensiva.falhaMoral : 0), 5, 100);
    a.xp = clamp((a.xp || 0) + (win ? X.vitoria : X.derrota), 0, 100);
  }
  for (const d of o.defs){
    d.str = Math.max(0, Math.round(d.str - d.str * (win ? L.defPerdeu * clamp(r, 0.6, 2) : L.defVenceu * clamp(r, 0.4, 1.5)) * wf));
    d.morale = clamp(d.morale + (win ? M.derrota : M.vitoria), 5, 100);
    d.xp = clamp((d.xp || 0) + X.defesa, 0, 100);
  }
  const rec = { month: g.month, uf, side, front, win, special: spec, final, tat: o.tat, origins: o.origins, from, cap: tpCap(g),
    atk: atks.map((a, i) => tpSnap(g, a, s0A[i])), def: o.defs.map((d, i) => tpSnap(g, d, s0D[i])),
    gar: Math.round(o.gar), A: Math.round(o.A), D: Math.round(o.D), chance: Math.round(o.chance * 100),
    terr: Math.round(o.terr * 100) / 100, red: o.red, rows: tpRows(g, o, atks, side), retreat: [], lost: [], took: null };
  if (win){
    for (const d of o.defs){
      const to = d.str > 0 ? tpRetreat(g, d, uf) : null;
      if (to){ rec.retreat.push(Object.assign(tpRef(d), { to })); d.uf = to; d.order = null; d.moved = true; d.special = false; }
      else { rec.lost.push(Object.assign(tpRef(d), { cerco: d.str > 0 })); tpRemove(g, d); }
    }
    const to = side === "player" ? (ph.playerMain || ph.player[0]) : atks[0].fac, was = g.control[uf];
    setControl(g, uf, to);
    const u = g.uf[uf]; if (u){ u.enemy = 0; if (side === "player") u.unrest = Math.max(u.unrest, 45); }
    rec.took = { uf, from: was, to, side, front };
    const lead = atks.filter(a => a.str > 0).sort((x, y) => y.str - x.str)[0];
    if (lead){ lead.uf = uf; lead.moved = true; rec.into = lead.id; }
  }
  for (const a of atks.concat(o.defs)) if (a.str <= 0 && g.war.armies.includes(a)){ rec.lost.push(tpRef(a)); tpRemove(g, a); }
  rec.why = tpWhy(rec); rec.drama = tpDrama(rec);
  return rec;
}
// Fatores da batalha do ponto de vista "você × inimigo" (para o relatório). v: multiplicador; n: número
function tpRows(g, o, atks, side){
  const rows = [], P = side === "player" ? "p" : "e", E = side === "player" ? "e" : "p", T = tpK(g);
  const put = (k, s, v, kind) => { let x = rows.find(y => y.k === k); if (!x){ x = { k, kind: kind || "x" }; rows.push(x); } x[s] = v; };
  put("tropas", P, atks.reduce((s, a) => s + a.str, 0), "n"); put("tropas", E, o.defs.reduce((s, a) => s + a.str, 0), "n");
  if (o.gar) put("guarnicao", E, Math.round(o.gar), "n");
  const avg = (L, f) => L.length ? L.reduce((s, a) => s + f(a) * a.str, 0) / Math.max(1, L.reduce((s, a) => s + a.str, 0)) : 1;
  put("moral", P, avg(atks, tpMoraleF)); if (o.defs.length) put("moral", E, avg(o.defs, tpMoraleF));
  const ga = avg(atks, a => tpTrait(g, a, "ataque")), gd = o.defs.length ? avg(o.defs, a => tpTrait(g, a, "defesa")) : 1;
  if (Math.abs(ga - 1) > 0.005) put("general", P, ga); if (Math.abs(gd - 1) > 0.005) put("general", E, gd);
  for (const r of o.am.rows) put(r.k, P, r.v);
  if (o.dm) for (const r of o.dm.rows) put(r.k, E, r.v);
  if (o.flank > 1.005) put("flanco", P, o.flank);
  if (o.cutA) put("cercado", P, T.cerco.poder); if (o.cutD) put("cercado", E, T.cerco.poder);
  if (o.tat){ const TT = tpTactics(g)[o.tat]; if (Math.abs(TT.ataque - 1) > 0.005) put("tatica", P, TT.ataque); }
  if (o.defs.length && o.dig > 1 && o.defs.some(a => !a.moved || o.ult > 1)) put("cavar", E, o.dig);
  if (o.terr > 1.005) put("terreno", E, o.terr);
  if (o.red > 1) put("reduto", E, o.red);
  if (o.ult > 1) put("ultima", E, o.ult);
  if (atks.some(a => a.special)) put("ofensiva", P, frontCfg(g).ofensiva.mult);
  put("poder", P, Math.round(o.A), "n"); put("poder", E, Math.round(o.D), "n");
  return rows;
}
// Exércitos fora do próprio território (revolta, história, negociação) vão para o estado seu mais perto; sem nenhum, são desfeitos
function tpFix(g, out){
  if (!g.war || !g.war.armies) return;
  for (const a of tpArmies(g).slice()){
    if (a.str <= 0){ tpRemove(g, a); continue; }
    if (ADJ[a.uf] && tpOwn(g, a, a.uf)) continue;
    const D = ADJ[a.uf] ? ufDist(a.uf) : {};
    const c = TP_UFS.filter(uf => tpOwn(g, a, uf) && !tpAt(g, a.side, uf)).sort((x, y) => (D[x] ?? 99) - (D[y] ?? 99) || (x < y ? -1 : 1))[0]
      || TP_UFS.filter(uf => tpOwn(g, a, uf) && tpRoom(g, a.side, uf, a)).sort((x, y) => (D[x] ?? 99) - (D[y] ?? 99))[0];
    if (c){ if (out) out.push({ id: a.id, side: a.side, from: a.uf, to: c, fix: true }); a.uf = c; a.order = null; }
    else tpRemove(g, a);
  }
  // estado com exércitos demais do mesmo lado (recuo, revolta): os mais fracos vão para o estado seu com vaga mais perto
  const cap = tpK(g).porEstado || 3;
  for (const side of ["player", "enemy"]){
    const by = {}; for (const a of tpArmies(g, side)) (by[a.uf] ||= []).push(a);
    for (const uf in by){ const L = by[uf]; if (L.length <= cap) continue;
      L.sort((x, y) => y.str - x.str || (x.id < y.id ? -1 : 1));
      for (const a of L.slice(cap)){ const D = ufDist(uf);
        const c = TP_UFS.filter(u => u !== uf && tpOwn(g, a, u) && tpRoom(g, side, u, a)).sort((x, y) => (D[x] ?? 99) - (D[y] ?? 99) || (x < y ? -1 : 1))[0];
        if (c){ if (out) out.push({ id: a.id, side, from: uf, to: c, fix: true }); a.uf = c; a.order = null; }
        else { tpAddTo(L[cap - 1], a.str, a.morale ?? 60); tpRemove(g, a); } } } // sem vaga em lugar nenhum: junta ao exército dali
  }
}
// Cerco no fim do mês: exército cortado da capital perde tropa e moral; fraco demais (ou cercado há muito tempo), se rende
function tpSiege(g, ev){
  const T = tpK(g).cerco, L = {};
  for (const a of tpArmies(g).slice()){
    const k = a.side + a.fac; if (!(k in L)) L[k] = tpLinked(g, a.side, a.fac);
    if (!tpCut(g, a, L[k])){ delete a.cut; continue; }
    a.cut = (a.cut || 0) + 1;
    const s0 = a.str; a.str = Math.max(0, Math.round(a.str * (1 - T.perda))); a.morale = clamp(a.morale - T.moral, 5, 100);
    const give = a.str < T.rende || a.morale <= T.moralRende || a.cut > T.meses;
    ev.sieges.push({ id: a.id, n: a.n, side: a.side, fac: a.fac, uf: a.uf, str0: s0, str: a.str, surrender: give });
    if (give) tpRemove(g, a);
  }
}
// Ímpeto do mês: vitórias e derrotas (do seu ponto de vista) empurram o valor; sem batalhas ele volta devagar a zero
function tpMomentumMonth(g, ev){
  const W = g.war; let d = 0;
  for (const b of ev.battles) d += (b.side === "player" ? b.win : !b.win) ? 1 : -1;
  for (const s of ev.sieges) if (s.surrender) d += s.side === "player" ? -1 : 1;
  const m0 = W.mom || 0;
  W.mom = d ? clamp(m0 + clamp(d, -2, 2), -3, 3) : m0 > 0 ? m0 - 1 : m0 < 0 ? m0 + 1 : 0;
  return W.mom - m0;
}
// Movimentos e batalhas do mês. Devolve { moves, battles }
function tpResolve(g, ev){
  const W = g.war, T = tpK(g);
  for (const a of W.armies){ a.moved = false; a.fought = false; }
  // 1) movimentos (pelo próprio território, estado vizinho a estado vizinho)
  for (const a of W.armies.slice()){
    const o = a.order; if (!o || o.type !== "mover") continue;
    const p = o.path && o.path.length ? o.path : [o.to];
    let ok = p.length <= T.passos, at = a.uf;
    for (const x of p){ if (!ok) break; ok = (ADJ[at] || []).includes(x) && tpOwn(g, a, x); at = x; }
    // destino lotado (outros chegaram antes): para no último estado do caminho com vaga
    let k = ok ? p.length : 0; while (k > 0 && !tpRoom(g, a.side, p[k - 1], a)) k--;
    if (k > 0){ const to = p[k - 1]; ev.moves.push(Object.assign(tpRef(a), { from: a.uf, to, path: [a.uf].concat(p.slice(0, k)), short: k < p.length })); a.uf = to; a.moved = true; }
    a.order = null;
  }
  // 2) batalhas: ataques ao mesmo alvo se somam (de estados diferentes = flanco); os lados se alternam (a ordem muda a cada mês)
  if (!(g.ceasefire > 0)){
    const groups = {}; for (const a of W.armies) if (a.order && a.order.type === "atacar") (groups[a.side + ">" + a.order.to] ||= []).push(a);
    const all = Object.values(groups), shuffle = L => { for (let i = L.length - 1; i > 0; i--){ const j = Math.floor(rnd(g) * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } return L; };
    const P = shuffle(all.filter(x => x[0].side === "player")), E = shuffle(all.filter(x => x[0].side === "enemy")), seq = [];
    const first = rnd(g) < 0.5 ? [P, E] : [E, P];
    while (P.length || E.length){ if (first[0].length) seq.push(first[0].shift()); if (first[1].length) seq.push(first[1].shift()); }
    // Recife por último: a grande batalha fecha o mês
    seq.sort((x, y) => (x[0].side === "player" && tpIsFinal(g, x[0].order.to)) - (y[0].side === "player" && tpIsFinal(g, y[0].order.to)));
    for (const grp of seq){
      const atks = grp.filter(a => W.armies.includes(a) && a.str > 0 && !a.fought && a.order && a.order.type === "atacar"
        && (ADJ[a.uf] || []).includes(a.order.to) && tpHostile(g, a, a.order.to));
      if (!atks.length) continue;
      const to = atks[0].order.to;
      ev.battles.push(tpBattle(g, atks.filter(a => a.order.to === to), to));
    }
  }
  for (const a of W.armies){ a.order = null; a.special = false; }
  tpFix(g, ev.moves);
}
