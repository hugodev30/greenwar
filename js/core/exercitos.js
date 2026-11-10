// js/core/exercitos.js — Núcleo: exércitos (criar, força, moral, onde podem ficar, modificadores de batalha).
// Fronteiras e terreno ficam em js/data/estados.js.
/* ---------- Exércitos, ordens militares e batalhas (independentes dos pontos de ação) ----------
   Cada lado tem exércitos (força, organização/moral, experiência, general) posicionados em estados.
   A cada mês cada exército do jogador recebe UMA ordem (atacar, mover, recuar, defender, reforçar);
   o inimigo planeja as dele (IA) e tudo se resolve em "Encerrar mês". PA ficam para política,
   economia e diplomacia; recrutar/reforçar custa recursos. */
const STR_UNIT = 10, ARMY_MAX = 60, GARRISON_K = 5;     // 1 "unidade" antiga = 10 de força; força máx. por exército
const ARMY_CAP = { player: 8, enemy: 8 };
const ORDER_LABEL = { atacar: "Atacar", mover: "Mover", recuar: "Recuar", defender: "Defender", reforcar: "Reforçar" };
const MANEUVER = ["atacar", "mover", "recuar"];            // ordens que contam no limite de comando
let MIL_QUIET = false;                                     // durante a resolução, mudanças de mapa vêm dos próprios exércitos

function armyCfg(g){ return scOf(g).campaign.army || {}; }
function armiesOf(g, side, uf){ return (g.armies || []).filter(a => a.side === side && (uf === undefined || a.uf === uf)); }
function armyById(g, id){ return (g.armies || []).find(a => a.id === id) || null; }
function sideStr(g, side, uf){ if (frontMode(g)) return frontStr(g, side, uf); return armiesOf(g, side, uf).reduce((s, a) => s + a.str, 0); }
function armyPow(a){ return Math.max(0, a.str) * (0.45 + 0.55 * clamp(a.org, 0, 100) / 100) * (1 + (a.xp || 0) / 250); }
function removeArmy(g, a){ g.armies = g.armies.filter(x => x !== a); }
function foreignFoes(g){ return Object.values(g.actors).filter(a => a.supportsEnemy).length; }
function malusNow(g){ return g.month <= g.malusUntil ? g.enemyMalus : 0; }
function armsAid(g){ return g.armsAid && g.month <= g.armsAid.until ? g.armsAid.v : 0; }
function natLoyalty(g){ const C = scOf(g).campaign; return C.nationalFac && g.fac[C.nationalFac] ? g.fac[C.nationalFac].loyalty : 50; }
// Organização máxima: lealdade da facção militar e o atributo militar do cenário definem o moral do jogador
function maxOrg(g, side){
  const C = scOf(g).campaign;
  if (side === "player") return Math.round(clamp(55 + natLoyalty(g) * 0.3 + ((g.stats[C.keys.mil] ?? 50) - 50) * 0.3, 35, 100));
  return Math.round(clamp(72 + (g.enemyBoost || 0) * 3, 45, 95));
}
function armyAllowed(g, side, uf, ph){
  ph = ph || phaseOf(g);
  const s = sideOf(g, g.control[uf], ph);
  if (side === "player") return !ph.noArmies && (s === "player" || s === "contested");
  return !!ph.war && (s === "enemy" || s === "contested");
}
function enemyFacOf(g, a){ const ph = phaseOf(g); return a && a.fac && (ph.enemy || []).includes(a.fac) ? a.fac : ph.enemyMain; }
const ROMAN = ["", " II", " III", " IV", " V", " VI", " VII", " VIII"];
function newArmy(g, side, uf, str, o){
  o = o || {};
  const cfg = armyCfg(g), key = o.fac && cfg.names && cfg.names[o.fac] ? o.fac : side;
  const n = g.armyN[key] = (g.armyN[key] || 0) + 1;
  const names = (cfg.names && cfg.names[key]) || [side === "player" ? "Divisão leal" : "Força inimiga"];
  const gens = (cfg.gens && cfg.gens[key]) || [];
  const name = o.name || (names[(n - 1) % names.length] + (ROMAN[Math.floor((n - 1) / names.length)] || ""));
  const a = { id: "a" + (++g.armySeq), side, fac: o.fac || null, name, gen: o.gen !== undefined ? o.gen : (n <= gens.length ? gens[n - 1] : null),
    uf, str: Math.round(clamp(str, 1, ARMY_MAX)), org: o.org ?? Math.min(70, maxOrg(g, side)), xp: o.xp ?? (side === "enemy" ? 15 : 10), order: null };
  g.armies.push(a);
  return a;
}
function capitalOf(g, side){
  const ph = phaseOf(g), want = side === "player" ? armyCfg(g).capital : null;
  const own = Object.keys(g.control).filter(uf => sideOf(g, g.control[uf], ph) === side);
  if (want && own.includes(want)) return want;
  return own.sort((a, b) => UF_WEIGHT[b] - UF_WEIGHT[a] || (a < b ? -1 : 1))[0] || null;
}
function enemyCapitals(g){
  const ph = phaseOf(g);
  return Object.keys(g.control).filter(uf => sideOf(g, g.control[uf], ph) === "enemy").sort((a, b) => UF_WEIGHT[b] - UF_WEIGHT[a] || (a < b ? -1 : 1)).slice(0, 2);
}
// Reforços (antigo "+N unidades na reserva"): completa exércitos fracos ou forma um novo na capital
function addPlayerStrength(g, str){
  if (frontMode(g)) return frontAdd(g, str);
  if (!g.armies || !str) return 0;
  const ph = phaseOf(g);
  if (str < 0){
    let left = -str;
    while (left > 0){ const a = armiesOf(g, "player").sort((x, y) => y.str - x.str)[0]; if (!a) break;
      const d = Math.min(left, a.str); a.str -= d; left -= d; if (a.str < 3) removeArmy(g, a); }
    return str;
  }
  if (ph.noArmies) return 0;
  let left = str, added = 0;
  while (left > 0){
    const chunk = Math.min(STR_UNIT, left); left -= chunk;
    const mine = armiesOf(g, "player");
    let a = mine.filter(x => x.str < 30 && sideOf(g, g.control[x.uf], ph) === "player").sort((x, y) => x.str - y.str)[0];
    if (!a && mine.length < ARMY_CAP.player){ const cap = armyCfg(g).capital, base = capitalOf(g, "player") || (armyAllowed(g, "player", cap, ph) ? cap : Object.keys(g.control).find(uf => armyAllowed(g, "player", uf, ph))); if (base){ newArmy(g, "player", base, chunk, { org: 60, xp: 5 }); added += chunk; continue; } }
    if (!a) a = mine.filter(x => x.str + chunk <= ARMY_MAX).sort((x, y) => x.str - y.str)[0];
    if (!a) break;
    a.str += chunk; added += chunk;
  }
  return added;
}
// Forças locais (sem contador no mapa): guarnições inimigas (u.enemy) e polícia/voluntários do seu lado
function militia(g, side, uf){
  const C = scOf(g).campaign, u = g.uf[uf], s = sideOf(g, g.control[uf]), pop = g.stats[C.keys.pop] ?? 50;
  let str = 0, name = "";
  if (side === "enemy"){ if (s === "enemy" || s === "contested"){ str = u.enemy * GARRISON_K; name = s === "contested" ? "Milícias e guerrilheiros" : "Guarnição local"; } }
  else if (s === "player"){ str = Math.round(6 + UF_WEIGHT[uf] * 1.2); name = "Polícia e milícias leais"; }
  else if (s === "contested"){ str = Math.round(clamp((pop - 45) / 3 + u.sway / 10, 0, 15)); name = "Voluntários locais"; }
  return str >= 1 ? { militia: true, side, name, str, org: 50, xp: 0 } : null;
}
function supplied(g, side, uf){ const ph = phaseOf(g); return sideOf(g, g.control[uf], ph) === side || ADJ[uf].some(n => sideOf(g, g.control[n], ph) === side); }
// Modificadores de combate (exibidos na tela de batalha)
function milMods(g, side, uf, role, units){
  const sc = scOf(g), C = sc.campaign, K = C.keys, out = [], u = g.uf[uf];
  const pop = g.stats[K.pop] ?? 50, mil = g.stats[K.mil] ?? 50;
  const add = (k, label, v) => { v = Math.round(v * 100) / 100; if (v) out.push({ k, label, v }); };
  if (role === "def"){
    const T = TERRAIN_TYPES[TERRAIN[uf]]; if (T && T.def) add("terreno", `Terreno: ${T.label}`, T.def);
    if (units.some(a => !a.militia && (!a.order || a.order.type === "defender"))) add("posicao", "Posições preparadas", 0.1);
  }
  if (side === "player"){
    const s = sideOf(g, g.control[uf]);
    add("apoio", "Apoio local", clamp((pop - 50) / 150 + (s === "player" ? (45 - u.unrest) / 300 : 0) + u.sway / 400, -0.3, 0.3));
    add("comando", `Moral (${sc.story.stats[K.mil] ? sc.story.stats[K.mil].label : "militar"} e lealdade militar)`, clamp((mil - 50) / 200 + (natLoyalty(g) - 50) / 300, -0.3, 0.3));
    if (g.money < 0) add("supr", "Suprimentos: cofres vazios", -0.2);
    else if (!supplied(g, "player", uf)) add("supr", "Suprimentos: linhas cortadas", -0.15);
    const aid = armsAid(g); if (aid) add("armas", "Armas estrangeiras", aid);
    if (majorActors(g).some(A => g.actors[A.id] && g.actors[A.id].recognized && (A.gives.armas || 0) > 0.4)) add("ancora_diplo", "Âncora diplomática", 0.11);
    const wmal = g.warEnemyMalus || warEnemySupportMalus(g); if (wmal) add("isolamento", "Potências apoiam o inimigo", -wmal);
  } else {
    const foreign = foreignFoes(g), malus = malusNow(g);
    add("qual", "Qualidade das tropas", ((C.enemyPower ?? 1) - 1) * 0.3);
    add("apoio", "Apoio local", clamp((50 - pop) / 200, -0.2, 0.2));
    if (foreign) add("armas", `Armas estrangeiras (${foreign} apoiador${foreign > 1 ? "es" : ""})`, 0.12 * foreign);
    if (g.enemyBoost > 0) add("mob", "Mobilização inimiga", Math.min(0.3, g.enemyBoost * 0.08));
    if (malus) add("supr", "Suprimentos: sanções e pressão", -0.15 * malus);
    else if (!supplied(g, "enemy", uf)) add("supr", "Suprimentos: linhas cortadas", -0.15);
  }
  return out;
}
const modsMult = mods => Math.max(0.3, 1 + mods.reduce((s, m) => s + m.v, 0));
function defendersAt(g, side, uf){ const L = armiesOf(g, side, uf); const m = militia(g, side, uf); if (m) L.push(m); return L; }
// Estimativa (sem sorte) de um ataque — usada pela IA, pelo sim.js e pela previsão na interface
