// js/core/ia-inimiga.js — Regras: IA do inimigo na guerra de 2022. A partir da v1.21 a Resistência (Frente Nordeste)
// opera em duas fases: 1) consolidar o Norte (região IBGE Norte + Nordeste — o bloco natural dela, o texto da história
// fala em "governadores do Nordeste e do Norte"); 2) ofensiva coordenada em direção ao Sul, avançando pelos estados
// de fronteira rumo a Brasília e aos estados-chave do jogador. Junta forças numa BASE ao lado do alvo e só ataca
// quando a chance passa do limite; recua exércitos muito feridos e defende a capital (Recife) e estados ameaçados.
// Na fase Norte deixa uma força na linha do Sul (BA, TO e o que já tiver no Centro-Oeste/Sudeste) para não abrir o caminho de Brasília.
// A Liga do Sul já nasce no Sul: só opera a fase de ofensiva local.
/* Nível pela dificuldade (DIFICULDADES[g.diff].ia): 0 = Fácil (plano mais cauteloso, troca de fase mais lenta),
   1 = Normal (plano + contra-ataque + recuo + defesa), 2 = Difícil (cercos, ataca mais cedo, concentra mais, troca
   de fase mais cedo). Estado salvo: g.war.eplan[fac] = { alvo, base, desde, fase } (refeito a cada IA_REPLANO meses
   ou quando o alvo/a base mudam de dono). g.war.efase[fac] = { fase, desde, holes } (fase estratégica, opcional em
   saves antigos — recalculada se faltar). O plano fica visível como antes: setas vermelhas dos ataques do próximo mês. */
const IA_REPLANO = 3;
function iaLevel(g){ const d = diffOf(g); return d.ia == null ? 1 : d.ia; }
// Bloco "Norte" da Resistência: Norte + Nordeste (UF_REGIAO). A Liga do Sul não consolida o Norte.
function iaHomeRegs(fac){ return fac === "separatista" ? ["S"] : ["N", "NE"]; }
function iaInBloc(uf, fac){ return iaHomeRegs(fac).includes(UF_REGIAO[uf] || ""); }
function iaHomeHoles(g, fac){ return TP_UFS.filter(uf => iaInBloc(uf, fac) && tpSide(g, uf) === "player"); }
function iaHardHole(g, uf, fac, lvl){
  const here = tpAllAt(g, "player", uf).reduce((s, a) => s + a.str, 0) + iaPlayerNear(g, uf) * 0.5;
  const near = tpArmies(g, "enemy").filter(a => a.fac === fac && (a.uf === uf || ADJ[uf].includes(a.uf))).reduce((s, a) => s + a.str, 0);
  const bar = lvl >= 2 ? 55 : 70;
  return here >= bar && here >= near * (lvl >= 2 ? 1.8 : 1.5);
}
// Fase estratégica: "norte" (consolidar o bloco) ou "sul" (ofensiva rumo a Brasília). Nunca trava: se só restam
// buracos muito defendidos, ou não há alvo adjacente, ou passaram N meses sem progresso, passa à ofensiva.
function iaFaseOf(g, fac, lvl){
  const W = g.war; W.efase ||= {};
  if (fac === "separatista") return (W.efase[fac] = { fase: "sul", desde: g.month, holes: 0 });
  const holes = iaHomeHoles(g, fac);
  const reach = holes.filter(uf => ADJ[uf].some(n => g.control[n] === fac));
  const soft = reach.filter(uf => !iaHardHole(g, uf, fac, lvl));
  const remote = uf => uf === "AC" || uf === "RR" || uf === "AP";
  const easyLeft = soft.filter(uf => !remote(uf));
  let S = W.efase[fac];
  if (!S || (S.fase !== "norte" && S.fase !== "sul")){
    const start = easyLeft.length || holes.some(uf => !remote(uf)) ? "norte" : "sul";
    S = { fase: start, desde: g.month, holes: holes.length };
    if (start === "norte"){
      (g.warNews ||= []).push(frontFala(g, "tropas", "iaNewsNorte"));
      const b0 = lvl <= 0 ? 0 : lvl >= 2 ? 3 : 2;
      if (b0) g.enemyBoost = Math.max(g.enemyBoost || 0, b0);
    }
  }
  const stallN = lvl <= 0 ? 5 : lvl >= 2 ? 2 : 3;
  if (S.fase === "norte"){
    if (holes.length < (S.holes == null ? 99 : S.holes)){ S.desde = g.month; S.holes = holes.length; }
    else S.holes = holes.length;
    const done = holes.length === 0 || (soft.length === 0 && (reach.length === 0 || holes.length <= (lvl >= 2 ? 2 : 1))) || easyLeft.length === 0;
    const stall = (g.month - (S.desde || g.month)) >= stallN;
    if (done || stall){
      const prev = S.fase;
      S.fase = "sul"; S.desde = g.month; S.why = done ? "done" : "stall";
      if (prev !== "sul"){
        (g.warNews ||= []).push(frontFala(g, "tropas", "iaNewsSul"));
        // Impulso da ofensiva: as tropas que foram ao Norte não voltam a tempo; reforço pontual na virada (Fácil não ganha).
        const add = lvl <= 0 ? 0 : lvl >= 2 ? 52 : 36;
        if (add && typeof frontEnemyAdd === "function") frontEnemyAdd(g, fac, add);
        const boost = lvl <= 0 ? 0 : lvl >= 2 ? 6 : 4;
        if (boost) g.enemyBoost = Math.max(g.enemyBoost || 0, boost);
      }
    }
  } else if (soft.length >= 2){
    S.fase = "norte"; S.desde = g.month; S.holes = holes.length;
    (g.warNews ||= []).push(frontFala(g, "tropas", "iaNewsNorte"));
  }
  W.efase[fac] = S;
  return S;
}
// Exércitos do jogador que ficariam cercados (sem ligação com Brasília) se o inimigo tomasse "uf"
function iaCutGain(g, uf, fac){
  const old = g.control[uf]; g.control[uf] = fac;
  let n = 0;
  try { const L = tpLinked(g, "player"); for (const a of tpArmies(g, "player")) if (a.uf !== uf && L && !L.has(a.uf)) n++; }
  finally { g.control[uf] = old; }
  return n;
}
// Força do jogador num estado e nos vizinhos dele (o quanto o alvo é difícil de segurar)
function iaPlayerNear(g, uf){ return tpArmies(g, "player").filter(a => a.uf === uf || ADJ[uf].includes(a.uf)).reduce((s, a) => s + a.str, 0); }
function iaChooseTarget(g, fac, lvl, fase){
  const DC = ufDist(tpCap(g)), mine = uf => g.control[uf] === fac;
  let cand = TP_UFS.filter(uf => tpSide(g, uf) === "player" && ADJ[uf].some(mine));
  if (fase === "norte"){
    const remote = uf => uf === "AC" || uf === "RR" || uf === "AP";
    const home = cand.filter(uf => iaInBloc(uf, fac));
    const near = home.filter(uf => !remote(uf));
    if (near.length) cand = near;
    else if (home.length) cand = home;
    else {
      // buraco no bloco ainda não adjacente: alvo = o mais perto, base = estado dela mais próximo
      const holes = iaHomeHoles(g, fac).filter(uf => !remote(uf));
      if (holes.length){
        const own = TP_UFS.filter(mine);
        let bestH = null;
        for (const uf of holes){
          const d = Math.min(...own.map(o => ufDist(o)[uf] ?? 99));
          if (!bestH || d < bestH.d) bestH = { uf, d };
        }
        if (bestH){
          const base = own.sort((x, y) => (ufDist(x)[bestH.uf] ?? 99) - (ufDist(y)[bestH.uf] ?? 99) || (x < y ? -1 : 1))[0] || null;
          return { alvo: bestH.uf, base, desde: g.month, fase };
        }
      }
    }
  }
  let best = null;
  for (const uf of cand){
    const here = tpAllAt(g, "player", uf).reduce((s, a) => s + a.str, 0), near = iaPlayerNear(g, uf);
    let v;
    if (fase === "norte"){
      v = (UF_WEIGHT[uf] || 1) / 5 - here / 22 - near / 70 + 0.2 * ADJ[uf].filter(mine).length;
      if (UF_REGIAO[uf] === "N") v += 0.25;
    } else {
      v = -0.7 * (DC[uf] ?? 20) + (UF_WEIGHT[uf] || 1) / 5 + (uf === tpCap(g) ? 3 : 0) - here / 28 - near / 85;
      if (lvl >= 2) v += 1.3 * iaCutGain(g, uf, fac);
    }
    if (!best || v > best.v) best = { uf, v };
  }
  if (!best) return null;
  const own = ADJ[best.uf].filter(mine);
  const str = u => tpArmies(g, "enemy").filter(a => a.fac === fac && (a.uf === u || ADJ[u].includes(a.uf))).reduce((s, a) => s + a.str, 0);
  const base = own.sort((x, y) => str(y) - str(x) || (x < y ? -1 : 1))[0] || null;
  return { alvo: best.uf, base, desde: g.month, fase };
}
function iaPlan(g, fac, lvl){
  const W = g.war; W.eplan ||= {};
  const F = iaFaseOf(g, fac, lvl), fase = F.fase;
  let P = W.eplan[fac];
  const stale = !P || g.month - P.desde >= IA_REPLANO || tpSide(g, P.alvo) !== "player" || !P.base || g.control[P.base] !== fac || P.fase !== fase;
  if (stale){ P = iaChooseTarget(g, fac, lvl, fase); if (P) W.eplan[fac] = P; else delete W.eplan[fac]; }
  return W.eplan[fac] || null;
}
// Recuo: exército dele muito ferido e ameaçado (força do jogador ao lado ≥ 2× a dele) vai para um estado de trás com vaga
function iaRetreats(g, list, lvl){
  const fac = list[0] && list[0].fac, L = tpLineDist(g, "enemy", fac), home = tpHome(g, "enemy", fac); let n = 0;
  for (const a of list){
    if (a.order || a.uf === home) continue;
    const weak = a.str < (lvl >= 2 ? 14 : 12) || a.morale < 25; if (!weak) continue;
    const thr = tpArmies(g, "player").filter(p => ADJ[a.uf].includes(p.uf)).reduce((s, p) => s + p.str, 0);
    if (thr < a.str * 2) continue;
    const t = tpTargets(g, a).filter(t => t.type !== "atacar" && (L[t.to] ?? 0) > (L[a.uf] ?? 0)).sort((x, y) => (L[y.to] ?? 0) - (L[x.to] ?? 0) || (x.stack || 0) - (y.stack || 0) || (x.to < y.to ? -1 : 1))[0];
    if (t){ tpGive(g, a, t); n++; }
  }
  return n;
}
// Defesa: quem está num estado ameaçado (e a capital, se o jogador chegou perto) fica; um vizinho vem reforçar
// se a força local não cobre a ameaça. Devolve o conjunto de exércitos que não devem sair (opt.hold).
function iaHold(g, list, lvl){
  const fac = list[0] && list[0].fac, home = tpHome(g, "enemy", fac), hold = new Set();
  const foes = tpArmies(g, "player"), threat = {};
  for (const e of foes) for (const n of ADJ[e.uf] || []) if (g.control[n] === fac) threat[n] = (threat[n] || 0) + e.str;
  if (home && g.control[home] === fac){
    const Dh = ufDist(home), near = Math.min(99, ...foes.map(e => Dh[e.uf] ?? 99));
    if (near <= (lvl >= 2 ? 2 : 1)) threat[home] = Math.max(threat[home] || 0, 1);
  }
  // Reduto (Recife): o jogador vence ao tomá-lo — deixa 2 exércitos na vizinhança (3 no Difícil),
  // puxa reforço se o jogador chegou a 3 estados, e ainda assim reserva 2 para a força-tarefa do Norte.
  if (home && g.control[home] === fac && list.length >= 3){
    const Dh = ufDist(home), near = Math.min(99, ...foes.map(e => Dh[e.uf] ?? 99));
    const need = Math.min(list.length - 2, near <= 1 ? (lvl >= 2 ? 3 : 2) : near <= 3 ? (lvl >= 2 ? 2 : 1) : 1);
    const around = list.filter(a => !a.order && (a.uf === home || (ADJ[home] || []).includes(a.uf)))
      .sort((x, y) => (x.uf === home ? 0 : 1) - (y.uf === home ? 0 : 1) || y.str - x.str);
    for (const a of around.slice(0, Math.max(1, need))) hold.add(a);
    let have = [...hold].filter(a => a.uf === home || (ADJ[home] || []).includes(a.uf)).length;
    if (have < need){
      const help = list.filter(a => !a.order && !hold.has(a) && tpTargets(g, a).some(t => t.type !== "atacar" && (t.to === home || (ADJ[home] || []).includes(t.to))))
        .sort((x, y) => (Dh[x.uf] ?? 20) - (Dh[y.uf] ?? 20) || y.str - x.str)[0];
      if (help){ const t = tpTargets(g, help).filter(x => x.type !== "atacar" && (x.to === home || (ADJ[home] || []).includes(x.to))).sort((x, y) => (Dh[x.to] ?? 20) - (Dh[y.to] ?? 20))[0];
        if (t){ tpGive(g, help, t); hold.add(help); } }
    }
  }
  const imp = uf => (uf === home ? 4 : 0) + (UF_WEIGHT[uf] || 1) / 4;
  for (const uf of Object.keys(threat).sort((x, y) => imp(y) - imp(x) || (x < y ? -1 : 1))){
    const here = list.filter(a => a.uf === uf && !a.order);
    const have = here.reduce((s, a) => s + a.str, 0), need = threat[uf];
    const keep = uf === home || have < need * (lvl >= 2 ? 0.95 : 1.15);
    if (keep) for (const a of here) hold.add(a);
    if (have < need * (lvl >= 2 ? 0.8 : 0.7) && (uf === home || imp(uf) >= 2)){
      const help = list.filter(a => !a.order && !hold.has(a) && a.uf !== uf && tpTargets(g, a).some(t => t.to === uf && t.type !== "atacar"))
        .sort((x, y) => y.str - x.str)[0];
      if (help){ const t = tpTargets(g, help).find(x => x.to === uf && x.type !== "atacar"); if (t){ tpGive(g, help, t); hold.add(help); } }
    }
  }
  return hold;
}
// Linha do Sul: estados dela que já estão no Centro-Oeste/Sudeste/Sul, ou os portões naturais do bloco
// (BA e TO) encostados no caminho de Brasília. Não inclui AM/PA só porque tocam MT — esses ficam com a força-tarefa do Norte.
function iaSouthEdge(g, fac){
  const face = uf => { const r = UF_REGIAO[uf] || ""; return r === "CO" || r === "SE" || r === "S"; };
  return TP_UFS.filter(uf => g.control[uf] === fac && (face(uf) || uf === "BA" || uf === "TO"));
}
// Na fase Norte, segura uma força na linha do Sul (defesa + pressão em direção a Brasília) e, se a chance passar
// do limite, ataca dali. Deixa pelo menos um exército livre para a força-tarefa do Norte.
function iaFrontHold(g, list, hold, fac, lvl, fase, P){
  if (fase !== "norte" || !list.length) return;
  const edge = iaSouthEdge(g, fac); if (!edge.length) return;
  const holes = iaHomeHoles(g, fac).length;
  const reservedNorth = holes ? (lvl >= 2 ? 2 : 1) : 0;
  const reservedHome = [...hold].length;
  const need = Math.min(Math.max(0, list.length - reservedHome - reservedNorth), lvl <= 0 ? 1 : lvl >= 2 ? 3 : 2);
  if (need <= 0) return;
  const DC = ufDist(tpCap(g));
  // Não tira da força-tarefa do Norte o exército que está na BASE ou que já pode atacar o alvo do plano.
  const northJob = a => !!(P && iaInBloc(P.alvo, fac) && (a.uf === P.base || tpTargets(g, a).some(t => t.type === "atacar" && t.to === P.alvo)));
  const gate = uf => uf === "BA" || uf === "TO" || uf === "MG" || uf === "GO";
  const pick = list.filter(a => !a.order && !hold.has(a) && edge.includes(a.uf) && !northJob(a))
    .sort((a, b) => (gate(b.uf) ? 1 : 0) - (gate(a.uf) ? 1 : 0) || (DC[a.uf] ?? 20) - (DC[b.uf] ?? 20) || b.str - a.str)
    .slice(0, need);
  if (pick.length < need){
    const help = list.filter(a => !a.order && !hold.has(a) && !pick.includes(a) && !northJob(a) && tpTargets(g, a).some(t => t.type !== "atacar" && edge.includes(t.to)))
      .sort((a, b) => (DC[a.uf] ?? 20) - (DC[b.uf] ?? 20) || b.str - a.str)[0];
    if (help){
      const t = tpTargets(g, help).filter(x => x.type !== "atacar" && edge.includes(x.to)).sort((x, y) => (DC[x.to] ?? 20) - (DC[y.to] ?? 20))[0];
      if (t){ tpGive(g, help, t); pick.push(help); }
    }
  }
  const D = ((frontCfg(g) || {}).frentes || {})[fac] || {};
  const tthr = (D.ataca || 0.6) + (lvl <= 0 ? 0.08 : lvl >= 2 ? -0.04 : 0);
  // Junta a linha do Sul num único alvo (o mais perto de Brasília com chance boa), em vez de cada um atacar um estado diferente.
  const ready = pick.filter(a => !a.order);
  const tgs = {};
  for (const a of ready){
    for (const t of tpTargets(g, a).filter(t => t.type === "atacar" && !iaInBloc(t.to, fac)))
      (tgs[t.to] ||= []).push({ a, t });
  }
  let best = null;
  for (const to of Object.keys(tgs)){
    const as = tgs[to];
    const ch = tpOdds(g, as.map(x => x.a), to).chance;
    const v = ch - 0.05 * (DC[to] ?? 20) + (to === tpCap(g) ? 1.2 : 0) + as.length * 0.08;
    if (ch >= tthr - 0.04 && (!best || v > best.v)) best = { to, as, v };
  }
  if (best) for (const x of best.as) tpGive(g, x.a, x.t);
  for (const a of pick) hold.add(a);
}
// Exércitos do jogador vulneráveis: cercados, fracos ou com 2+ estados inimigos vizinhos (flanco)
function iaWeakSpots(g, fac){
  const L = tpLinked(g, "player"), out = {};
  for (const a of tpArmies(g, "player")){
    const foes = ADJ[a.uf].filter(u => g.control[u] === fac).length; if (!foes) continue;
    const sum = tpAllAt(g, "player", a.uf).reduce((s, x) => s + x.str, 0);
    let b = 0; if (L && !L.has(a.uf)) b += 0.35; if (sum < 15) b += 0.2; if (foes >= 2) b += 0.1 * Math.min(2, foes - 1);
    if (b) out[a.uf] = Math.max(out[a.uf] || 0, b);
  }
  return out;
}
// Plano do mês de uma facção (chamado por tpEnemyPlan)
function iaEnemyMonth(g, fac, list, D){
  const lvl = iaLevel(g);
  if (!list.length) return 0;
  // Fácil (lvl 0) também segue o plano em duas fases, mas ataca com mais cautela e troca de fase mais devagar.
  iaRetreats(g, list, Math.max(1, lvl));
  const hold = iaHold(g, list, lvl);
  const P = iaPlan(g, fac, lvl), weak = iaWeakSpots(g, fac);
  const fase = (P && P.fase) || (g.war.efase && g.war.efase[fac] && g.war.efase[fac].fase) || "norte";
  iaFrontHold(g, list, hold, fac, lvl, fase, P);
  const thr0 = lvl <= 0 ? D.ataca + 0.08 : D.ataca;
  const opt = { thr: thr0, attack: true, base: P ? P.base : null, hold,
    recallNear: (function(){
      const home = tpHome(g, "enemy", fac);
      if (!home) return 1;
      const Dh = ufDist(home);
      const near = Math.min(99, ...tpArmies(g, "player").map(e => Dh[e.uf] ?? 99));
      return near <= 1 ? 2 : 1;
    })(),
    allow: t => {
      if (fase !== "norte") return true;
      if (iaInBloc(t, fac) || (P && t === P.alvo)) return true;
      const committed = list.filter(a => a.order && a.order.type === "atacar" && (P && a.order.to === P.alvo || iaInBloc(a.order.to, fac))).reduce((s, a) => s + a.str, 0);
      return committed >= (lvl >= 2 ? 20 : 28);
    },
    thrFor: (t, thr) => {
      if (P && t === P.alvo) return thr - (lvl >= 2 ? 0.12 : lvl >= 1 ? 0.08 : 0.03);
      if (fase === "norte" && !iaInBloc(t, fac)) return thr + 0.25;
      if (fase === "sul" && (t === tpCap(g) || (ADJ[tpCap(g)] || []).includes(t))) return thr - (lvl >= 2 ? 0.14 : lvl >= 1 ? 0.08 : 0);
      if (weak[t]) return thr - 0.08;
      return fase === "sul" ? (lvl >= 2 ? thr - 0.04 : thr) : (lvl >= 2 ? thr + 0.05 : thr + 0.02);
    },
    bonus: t => (P && t === P.alvo ? (lvl >= 2 ? 0.55 : 0.4) : 0) + (fase === "norte" && iaInBloc(t, fac) ? 0.25 : 0) + (weak[t] || 0)
      + (fase === "sul" && t === tpCap(g) ? 0.25 : 0) };
  return tpAI(g, list, opt);
}
