// Verifica todos os cenários: links quebrados, nós inalcançáveis, finais atingíveis, referências do mapa (UFs/facções)
// e os dados de campanha (atores, facções, ações, eventos, fases). No fim roda a simulação de campanhas (sim.js).
// Uso: node tests/check.js [partidas_por_IA_na_simulação=150]
const fs = require("fs");
const JOGO = require("./carregar.js");
const src = JOGO.dados;
const SCENARIOS = new Function(src + "; return SCENARIOS;")();
const msrc = "";   // o mapa (MAP_DATA) já faz parte de JOGO.dados
const MAP_DATA = new Function(src + "; return MAP_DATA;")();
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const csrc = JOGO.dados + "\n" + JOGO.nucleo;   // texto de dados + núcleo (para grab)
const grab = name => new Function(csrc.match(new RegExp("const " + name + " = [^;]+;"))[0] + "; return " + name + ";")();
const FOCUS_FX_KEYS = grab("FOCUS_FX_KEYS"), EVENT_FX_KEYS = new Function(csrc.match(/const FOCUS_FX_KEYS = [^;]+;/)[0] + csrc.match(/const EVENT_FX_KEYS = [^;]+;/)[0] + "; return EVENT_FX_KEYS;")(), OFF_TYPES = grab("OFF_TYPES"), REQ_TYPES = grab("REQ_TYPES");
let errors = 0;
const err = m => { console.log("  ✗ " + m); errors++; };

const mapUfs = Object.keys(MAP_DATA.states);
if (mapUfs.length !== 27 || UFS.some(u => !MAP_DATA.states[u])) err("MAP_DATA não tem as 27 UFs: " + mapUfs);
for (const u of mapUfs) if (!MAP_DATA.states[u].d || MAP_DATA.states[u].d.length < 20) err("Geometria vazia: " + u);

// ---- fronteiras (ADJ), terreno e exércitos ----
const ADJ = grab("ADJ"), TERRAIN = grab("TERRAIN"), TERRAIN_TYPES = grab("TERRAIN_TYPES");
{
  const keys = Object.keys(ADJ);
  if (keys.length !== 27 || UFS.some(u => !ADJ[u])) err("ADJ não cobre as 27 UFs");
  let pairs = 0;
  for (const u of keys) for (const n of ADJ[u]){
    if (!UFS.includes(n)) err(`ADJ ${u}: vizinho inválido ${n}`);
    if (n === u) err(`ADJ ${u}: vizinho de si mesmo`);
    if (!(ADJ[n] || []).includes(u)) err(`ADJ não é simétrica: ${u}→${n} sem ${n}→${u}`);
    if (u < n) pairs++;
    if (ADJ[u].indexOf(n) !== ADJ[u].lastIndexOf(n)) err(`ADJ ${u}: vizinho repetido ${n}`);
  }
  const seen = new Set(["DF"]), st = ["DF"]; while (st.length) for (const n of ADJ[st.pop()]) if (!seen.has(n)){ seen.add(n); st.push(n); }
  if (seen.size !== 27) err("grafo de fronteiras desconexo: " + UFS.filter(u => !seen.has(u)));
  // conferência geométrica: vizinhos compartilham borda nos polígonos do mapa; não vizinhos ficam afastados
  const pts = {}; for (const u of UFS) pts[u] = [...MAP_DATA.states[u].d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map(m => [+m[1], +m[2]]);
  const segd = (p, a, b) => { const dx = b[0]-a[0], dy = b[1]-a[1], L = dx*dx+dy*dy; let t = L ? ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0]+t*dx-p[0], a[1]+t*dy-p[1]); };
  const near = (A, B) => { let m = 1e9, cnt = 0; for (const p of pts[A]){ let d = 1e9; for (let i = 0; i < pts[B].length-1; i++) d = Math.min(d, segd(p, pts[B][i], pts[B][i+1])); m = Math.min(m, d); if (d < 1) cnt++; } return { m, cnt }; };
  for (let i = 0; i < UFS.length; i++) for (let j = i+1; j < UFS.length; j++){
    const a = UFS[i], b = UFS[j], adj = ADJ[a].includes(b), x = near(a, b), y = near(b, a), d = Math.min(x.m, y.m);
    if (adj && d > 0.5) err(`ADJ ${a}-${b}: polígonos não se tocam no mapa (distância ${d.toFixed(2)})`);
    if (!adj && d < 1.5) err(`${a}-${b} se tocam no mapa mas não estão na ADJ`);
  }
  for (const u of UFS) if (!TERRAIN_TYPES[TERRAIN[u]]) err(`TERRAIN ${u} ausente/inválido`);
  console.log(`Fronteiras: ${pairs} pares simétricos, grafo conexo, conferidos contra a geometria do mapa; terreno em 27/27 UFs`);
}

const ids = new Set();
for (const sc of SCENARIOS) {
  if (ids.has(sc.id)) err("id de cenário duplicado: " + sc.id); ids.add(sc.id);
  if (sc.soon) { console.log(`\n[${sc.year}] ${sc.title} — placeholder "Em breve"`); continue; }
  console.log(`\n[${sc.year}] ${sc.title} (${sc.id})${sc.locked ? " — BLOQUEADO (não jogável; dados validados para não apodrecerem)" : ""}`);
  for (const k of ["title","year","date","character","description","saveKey","endingsKey","intro","story","campaign"]) if (!sc[k]) err(`campo ${k} ausente`);
  const STORY = sc.story, nodes = STORY.nodes, STATS = Object.keys(STORY.stats), FAC = Object.keys(STORY.factions);
  if (!nodes[STORY.start]) err("start inválido");
  const targets = c => typeof c.next === "string" ? [c.next] : c.next.map(b => b.to);
  const checkStats = (where, obj) => { for (const k in obj||{}) if (!STATS.includes(k)) err(`atributo inválido "${k}" em ${where}`); };
  const checkCondDef = (where, c) => { if (!c) return; checkStats(where, c.min); checkStats(where, c.max); };
  const checkMap = (where, mp) => { for (const [uf, f] of Object.entries(mp||{})) {
    if (!UFS.includes(uf)) err(`UF inválida "${uf}" em ${where}`);
    if (!FAC.includes(f)) err(`Facção inválida "${f}" em ${where}`); } };
  const checkResolve = (where, r) => { for (const [a,b] of Object.entries(r||{})) if (!FAC.includes(a) || !FAC.includes(b)) err(`resolve inválido ${a}->${b} em ${where}`); };
  checkMap("initialMap", STORY.initialMap);
  const def = STORY.defaultFaction || "federal";
  if (!FAC.includes(def) && Object.keys(STORY.initialMap||{}).length < 27) err(`facção padrão "${def}" não existe (defina defaultFaction)`);
  for (const u of Object.keys(STORY.stateNotes||{})) if (!UFS.includes(u)) err("stateNotes com UF inválida " + u);
  for (const [k,t] of Object.entries(STORY.collapse||{})) { if (!STATS.includes(k)) err("collapse atributo " + k); for (const to of typeof t === "string" ? [t] : t.map(b => b.to)) if (!nodes[to]) err("collapse quebrado " + to); }
  let mapRefs = 0;
  for (const [id, n] of Object.entries(nodes)) {
    if (n.onEnter) { checkMap(id+".onEnter", n.onEnter.map); checkResolve(id+".onEnter", n.onEnter.resolve); mapRefs++; }
    if (n.ending) { if (n.choices) err("Final com escolhas: " + id); if (!n.endingName) err("Final sem nome: " + id); continue; }
    if (!n.choices || !n.choices.length) err("Nó sem escolhas: " + id);
    n.choices.forEach((c, i) => {
      for (const t of targets(c)) if (!nodes[t]) err(`Link quebrado: ${id} -> ${t}`);
      checkStats(`${id}#${i}.effects`, c.effects); checkCondDef(`${id}#${i}.req`, c.req);
      if (Array.isArray(c.next)) c.next.forEach(b => checkCondDef(`${id}#${i}.next`, b.if));
      if (c.map) { checkMap(`${id}#${i}`, c.map); mapRefs++; }
    });
  }

  // ---- dados de campanha ----
  const C = sc.campaign;
  if (!C) { err("cenário sem campaign"); }
  else {
    const ACT = (C.actors||[]).map(a => a.id), FCS = (C.factions||[]).map(f => f.id);
    const isNode = id => !!nodes[id];
    if (!/^\d{4}-\d{2}$/.test(C.start)) err("campaign.start inválido");
    for (const k of ["pop","mil","legit"]) if (C.keys[k] && !STATS.includes(C.keys[k])) err(`keys.${k} inválido`);
    if (C.keys.econ && !STATS.includes(C.keys.econ)) err("keys.econ inválido");
    if (C.actors.length < 4) err("poucos atores estrangeiros");
    for (const a of C.actors){ for (const r in a.rel||{}) if (!ACT.includes(r)) err(`ator ${a.id}: relação com ${r} inexistente`);
      for (const f in a.reactions||{}) if (!FCS.includes(f)) err(`ator ${a.id}: reação de facção ${f} inexistente`);
      if (!a.interests || !a.gives) err(`ator ${a.id} sem interests/gives`); }
    for (const f of C.factions){ for (const r of f.rivals||[]) if (!FCS.includes(r)) err(`facção ${f.id}: rival ${r} inexistente`);
      for (const k in f.links||{}) if (!STATS.includes(k)) err(`facção ${f.id}: link ${k}`); for (const k in f.boost||{}) if (!STATS.includes(k)) err(`facção ${f.id}: boost ${k}`); }
    const checkFx = (w, fx) => { if (!fx) return; checkStats(w + ".s", fx.s);
      for (const id in fx.fac||{}) if (!FCS.includes(id)) err(`${w}: facção ${id} inexistente`);
      for (const id in fx.infl||{}) if (!FCS.includes(id)) err(`${w}: facção ${id} inexistente`);
      for (const id in fx.act||{}) if (!ACT.includes(id)) err(`${w}: ator ${id} inexistente`);
      for (const uf in fx.unrestUF||{}) if (!UFS.includes(uf)) err(`${w}: UF ${uf}`);
      if (fx.map) checkMap(w, fx.map); };
    const checkC = (w, c) => { if (!c) return; checkCondDef(w, c);
      for (const id of [...(c.visited||[]), ...(c.visitedAny||[]), ...(c.notVisited||[])]) if (!isNode(id)) err(`${w}: nó ${id} inexistente`);
      for (const id in c.fac||{}) if (!FCS.includes(id)) err(`${w}: facção ${id}`);
      for (const id in c.actor||{}) if (!ACT.includes(id)) err(`${w}: ator ${id}`);
      for (const f of (c.anyControl||[])) if (!FAC.includes(f)) err(`${w}: facção do mapa ${f}`);
      for (const p of [].concat(c.phase||[], c.notPhase||[])) if (!C.phases.some(x => x.id === p)) err(`${w}: fase ${p}`); };
    for (const ph of C.phases){ checkC("fase " + ph.id, ph.if);
      for (const f of [...ph.player, ...(ph.enemy||[]), ph.playerMain, ph.enemyMain].filter(Boolean)) if (!FAC.includes(f)) err(`fase ${ph.id}: facção ${f}`);
      for (const [a, b] of Object.entries({ ...(ph.flipTo||{}), ...(ph.loseTo||{}) })) if (!FAC.includes(a) || !FAC.includes(b)) err(`fase ${ph.id}: flip ${a}->${b}`); }
    if (C.phases.at(-1).if) err("a última fase deve ser a padrão (sem if)");
    for (const id of [...Object.keys(C.storyAt||{}), ...Object.keys(C.storyDelay||{}), ...Object.keys(C.enterFx||{})]) if (!isNode(id)) err(`agenda: nó ${id} inexistente`);
    for (const [id, arr] of Object.entries(C.choiceFx||{})){ if (!isNode(id)) { err(`choiceFx: nó ${id}`); continue; }
      if (arr.length > nodes[id].choices.length) err(`choiceFx ${id}: mais efeitos que escolhas`); arr.forEach((fx, i) => checkFx(`choiceFx ${id}#${i}`, fx)); }
    for (const [id, fx] of Object.entries(C.enterFx||{})) checkFx("enterFx " + id, fx);
    for (const ck of C.checks||[]){ if (!nodes[ck.to] || !nodes[ck.to].ending) err(`check -> ${ck.to} não é final`); checkC("check " + ck.to, ck.if); }
    const aids = new Set();
    for (const a of C.actions){ if (aids.has(a.id)) err("ação duplicada " + a.id); aids.add(a.id);
      if (!["eco","mil","pol","dip","sul","urna"].includes(a.cat)) err(`ação ${a.id}: categoria ${a.cat}`); checkFx("ação " + a.id, a.fx); checkC("ação " + a.id, a.show); checkC("ação " + a.id, a.req); if (a.risk) checkFx("risco " + a.id, a.risk.fx); }
    const eids = new Set();
    for (const e of C.events){ if (eids.has(e.id)) err("evento duplicado " + e.id); eids.add(e.id); checkC("evento " + e.id, e.if);
      if (e.crisisOf && !FCS.includes(e.crisisOf)) err(`evento ${e.id}: crisisOf ${e.crisisOf}`);
      if (!e.choices || e.choices.length < 2) err(`evento ${e.id}: precisa de 2+ escolhas`);
      e.choices.forEach((c, i) => { checkFx(`evento ${e.id}#${i}`, c.fx); checkC(`evento ${e.id}#${i}`, c.req);
        if (c.next) for (const b of c.next) if (b.to && !isNode(b.to)) err(`evento ${e.id}: next ${b.to}`); }); }
    for (const f of FCS) if (!C.events.some(e => e.crisisOf === f)) err(`facção ${f} sem evento de crise`);
    // eventos: textos, chaves de efeito, desdobramentos (chain) e flags exigidas que alguém consegue produzir
    {
      const E = id => C.events.find(e => e.id === id), chainedBy = {};
      const flagsMade = new Set([...(JSON.stringify([STORY, C]).match(/"flag":"[a-z_0-9]+"/g) || []).map(x => x.slice(8, -1)),
        ...((C.focus && C.focus.nodes) || []).map(F => "fo_" + F.id)]);
      for (const e of C.events){
        const w = "evento " + e.id;
        if (!e.title || !e.text || !e.text.length || e.text.some(t => typeof t !== "string" || t.length < 10)) err(`${w}: título/texto vazio`);
        if (e.choices.length > 4) err(`${w}: escolhas demais (${e.choices.length})`);
        if (new Set(e.choices.map(c => c.text)).size !== e.choices.length) err(`${w}: escolhas repetidas`);
        if (!e.generic && !e.choices.some(c => !c.req)) err(`${w}: nenhuma escolha sem requisito (pode travar a fila)`);
        if (e.if && e.if.from && e.if.until && e.if.from > e.if.until) err(`${w}: from > until`);
        for (const f of [...((e.if || {}).flags || [])]) if (!flagsMade.has(f)) err(`${w}: exige flag ${f} que nada produz`);
        e.choices.forEach((c, i) => {
          for (const k in c.fx || {}) if (!EVENT_FX_KEYS.includes(k)) err(`${w}#${i}: chave de efeito "${k}" inválida`);
          for (const k of ["money", "reserve", "front", "org", "enemyLoss", "enemy", "unrest", "unrestAll", "ceasefire", "actAll", "ap"]) if (c.fx && k in c.fx && !Number.isFinite(c.fx[k])) err(`${w}#${i}: ${k} não numérico`);
          for (const f of ((c.req || {}).flags || [])) if (!flagsMade.has(f)) err(`${w}#${i}: requisito com flag ${f} que nada produz`);
          for (const ch of [].concat((c.fx || {}).chain || [])){
            const t = E(ch.id);
            if (!t) err(`${w}#${i}: desdobramento ${ch.id} inexistente`);
            else if (!t.chained) err(`${w}#${i}: ${ch.id} deveria ter chained: true`);
            if (!(ch.in >= 1 && ch.in <= 12)) err(`${w}#${i}: desdobramento em ${ch.in} meses`);
            (chainedBy[ch.id] ||= []).push(e.id);
          }
        });
      }
      if (C.south && C.south.summit) (chainedBy[C.south.summit] ||= []).push("Tensão no Sul ≥ " + C.south.summitAt);
      if (C.south && C.south.summit && !E(C.south.summit)) err(`south.summit: evento ${C.south.summit} inexistente`);
      for (const e of C.events.filter(e => e.chained)) if (!chainedBy[e.id]) err(`evento ${e.id}: chained sem nenhum evento que o dispare`);
      const nCh = C.events.filter(e => e.chained).length, nCr = C.events.filter(e => e.crisisOf).length;
      console.log(`  Eventos: ${C.events.length} (${C.events.length - nCh - nCr} sorteáveis, ${nCh} desdobramentos, ${nCr} crises de facção) — textos, efeitos, flags e encadeamentos válidos`);
    }
    if (C.nationalFac && !FCS.includes(C.nationalFac)) err("nationalFac inválida");
    // ---- exércitos ----
    { const A = C.army;
      if (!A) err("campaign.army ausente");
      else {
        if (!UFS.includes(A.capital)) err("army.capital inválida");
        if (!(A.start||[]).length) err("army.start vazio: o jogador precisa de exércitos desde o início");
        for (const s0 of A.start||[]){ if (!UFS.includes(s0.uf)) err(`army.start UF ${s0.uf}`); if (!(s0.str >= 5 && s0.str <= 60)) err(`army.start força ${s0.str}`); }
        for (const [k, arr] of Object.entries(A.names||{})){ if (k !== "player" && k !== "enemy" && !FAC.includes(k)) err(`army.names: chave ${k}`); if (!arr.length || new Set(arr).size !== arr.length) err(`army.names.${k} vazio/duplicado`); }
        for (const [k, arr] of Object.entries(A.gens||{})) if (!(A.names||{})[k]) err(`army.gens.${k} sem lista de nomes`);
        if (!(A.names||{}).player) err("army.names.player ausente");
        for (const k of ["recruitCost","reinforceCost"]) if (A[k] !== undefined && !(A[k] > 0)) err(`army.${k}`);
        const enemyFacs = [...new Set(C.phases.flatMap(p => p.enemy||[]))];
        if (enemyFacs.length && !(A.names||{}).enemy && !enemyFacs.every(f => (A.names||{})[f])) err("army.names sem nomes para o inimigo");
      }
      for (const a of C.actions) if (a.cat === "mil" && a.fx && a.fx.reserve > 0 && (a.ap ?? 1) !== 0) err(`ação ${a.id}: recrutamento não deve custar PA`);
    }
    for (const fx of Object.values(C.offerFac||{})) checkFx("offerFac", fx);
    // ---- árvore de decisões nacionais (focos) ----
    if (C.focus){
      const T = C.focus, N = T.nodes, byId = {}, BR = (T.branches||[]).map(b => b.id);
      for (const F of N){ if (byId[F.id]) err("foco duplicado " + F.id); byId[F.id] = F; }
      if (N.length < 30 || N.length > 65) err(`árvore com ${N.length} focos (esperado 30–65)`);
      const pos = new Set();
      for (const F of N){
        const w = "foco " + F.id;
        if (!F.name || !F.desc) err(`${w}: sem nome/descrição`);
        if (!(F.months >= 1)) err(`${w}: duração inválida`);
        if (!BR.includes(F.branch)) err(`${w}: ramo ${F.branch} inexistente`);
        const k = F.x + "," + F.y; if (pos.has(k)) err(`${w}: posição ${k} sobreposta`); pos.add(k);
        for (const r of [...(F.req||[]), ...(F.reqAny||[]), ...(F.excl||[])]) if (!byId[r]) err(`${w}: referência a foco inexistente ${r}`);
        for (const x of F.excl||[]) if (byId[x] && !(byId[x].excl||[]).includes(F.id)) err(`${w}: exclusão com ${x} não é simétrica`);
        if ((F.excl||[]).some(x => (F.req||[]).includes(x))) err(`${w}: exclusivo de um pré-requisito`);
        for (const key in F.fx||{}) if (!FOCUS_FX_KEYS.includes(key)) err(`${w}: chave de efeito "${key}" inválida`);
        checkFx(w, F.fx); checkC(w + ".avail", F.avail); checkC(w + ".lockIf", F.lockIf);
        if (F.risk){ if (!(F.risk.p > 0 && F.risk.p < 1)) err(`${w}: risco p`); checkFx(w + ".risco", F.risk.fx); }
        for (const a in F.dipBonus||{}) if (!ACT.includes(a)) err(`${w}: dipBonus ator ${a}`);
        for (const o of F.dipOff||[]) if (!OFF_TYPES.includes(o)) err(`${w}: dipOff ${o}`);
        for (const o of F.dipReq||[]) if (!REQ_TYPES.includes(o)) err(`${w}: dipReq ${o}`);
        if (F.cost !== undefined && !(F.cost >= 0)) err(`${w}: custo`);
      }
      for (const [n, arr] of Object.entries(T.grants||{})){ if (!isNode(n)) err(`grants: nó ${n}`); for (const id of arr) if (!byId[id]) err(`grants: foco ${id}`); }
      // ciclos (req + reqAny)
      const color = {};
      const dfs = id => { if (color[id] === 1) { err("ciclo de pré-requisitos em " + id); return; } if (color[id] === 2) return; color[id] = 1;
        for (const r of [...(byId[id].req||[]), ...(byId[id].reqAny||[])]) if (byId[r]) dfs(r); color[id] = 2; };
      N.forEach(F => dfs(F.id));
      // alcançável: existe um conjunto de pré-requisitos (escolhendo uma opção de cada reqAny) sem exclusivos em conflito
      const consistent = set => [...set].every(a => !(byId[a].excl||[]).some(x => set.has(x)));
      const closures = (id, set) => { // devolve conjuntos possíveis
        if (set.has(id)) return [set];
        let sets = [new Set([...set, id])];
        for (const r of byId[id].req||[]) sets = sets.flatMap(s => closures(r, s));
        if ((byId[id].reqAny||[]).length) sets = sets.flatMap(s => byId[id].reqAny.flatMap(r => closures(r, s)));
        return sets.filter(consistent).slice(0, 200);
      };
      const unreach = N.filter(F => !closures(F.id, new Set()).length).map(F => F.id);
      if (unreach.length) err("focos inalcançáveis por qualquer caminho: " + unreach);
      const roots = N.filter(F => !F.oport && !(F.req||[]).length && !(F.reqAny||[]).length);
      for (const F of N.filter(F => F.oport)){ const O = F.oport, w = "oportunidade " + F.id;
        if (!O.text || !O.if) err(`${w}: sem condição/texto`); checkC(w + ".if", O.if);
        if (!(O.dura >= 1) || !(O.cooldown >= 1)) err(`${w}: dura/cooldown`);
        if (O.chance !== undefined && !(O.chance > 0 && O.chance <= 1)) err(`${w}: chance`);
        if ((F.req||[]).length || (F.reqAny||[]).length || (F.excl||[]).length) err(`${w}: oportunidades não têm pré-requisitos nem exclusivos`); }
      const evOpp = JSON.stringify(C.events).match(/"opp":"[a-z_0-9]+"/g) || [];
      for (const o of evOpp){ const id = o.slice(7, -1); if (!byId[id] || !byId[id].oport) err(`evento abre oportunidade inexistente ${id}`); }
      if (roots.length !== 1) err(`a árvore deve ter uma raiz (tem ${roots.map(F => F.id)})`);
      // flags fo_* usadas por ações/eventos
      const fo = JSON.stringify([C.actions, C.events]).match(/"fo_[a-z_0-9]+"/g) || [];
      for (const f of new Set(fo)) if (!byId[f.slice(4, -1)]) err(`flag ${f} não corresponde a um foco`);
      const nEx = N.reduce((s, F) => s + (F.excl||[]).length, 0) / 2;
      console.log(`  Árvore de decisões: ${N.length} focos em ${BR.length} ramos (${N.filter(F => F.oport).length} oportunidades, ${N.filter(F => F.avail && !F.oport && /warMonths|south|visited|"min"/.test(JSON.stringify(F.avail))).length} dinâmicos), ${nEx} pares exclusivos, ${new Set(fo).size} flags de foco usadas por ações/eventos — sem ciclos, todos alcançáveis`);
    }
    console.log(`  Campanha: ${C.actors.length} atores, ${C.factions.length} facções, ${C.actions.length} ações, ${C.events.length} eventos, ${C.phases.length} fases, ${(C.checks||[]).length} condições de fim`);
  }
  // simulação de partidas aleatórias (só a história)
  const cond = (c, s) => { if (!c) return true;
    for (const k in c.min||{}) if (s.stats[k] < c.min[k]) return false;
    for (const k in c.max||{}) if (s.stats[k] > c.max[k]) return false;
    for (const f of c.flags||[]) if (!s.flags.includes(f)) return false;
    for (const f of c.noFlags||[]) if (s.flags.includes(f)) return false;
    for (const n of c.visited||[]) if (!s.visited.includes(n)) return false;
    if (c.diff && !c.diff.includes(s.diff)) return false;
    if (c.urna){ const u = c.urna; if (u.min !== undefined && s.urna.prog < u.min) return false; if (u.credMax !== undefined && s.urna.cred > u.credMax) return false; } // contestação das urnas: números sorteados por partida
    return true; };
  const applyMap = (s, spec) => { if (!spec) return;
    if (spec.resolve) for (const uf in s.control) if (spec.resolve[s.control[uf]]) s.control[uf] = spec.resolve[s.control[uf]];
    if (spec.map) Object.assign(s.control, spec.map); };
  const visited = new Set(), endings = {}, used = new Set(), endMaps = {};
  for (let run = 0; run < 40000; run++) {
    const s = { stats: {}, flags: [], control: {}, diff: ["facil", "normal", "dificil"][run % 3], visited: [], urna: { prog: Math.random() * 110, cred: Math.random() * 60 } };
    for (const k of STATS) s.stats[k] = STORY.stats[k].initial;
    for (const u of UFS) s.control[u] = STORY.defaultFaction || "federal";
    Object.assign(s.control, STORY.initialMap);
    let id = STORY.start, steps = 0; applyMap(s, nodes[id].onEnter);
    while (!nodes[id].ending) {
      // contestação das urnas: a escalada a 100 (js/core/urnas.js) interrompe o caminho antes do julgamento ou do veredito
      if (nodes.escalada && s.flags.includes("contesta_urna") && (id === "julgamento_tse" || id === "veredito") && !s.visited.includes("escalada") && Math.random() < 0.15) id = "escalada";
      visited.add(id); s.visited.push(id);
      const opts = nodes[id].choices.map((c,i)=>[c,i]).filter(([c]) => cond(c.req, s));
      if (!opts.length) { err("Beco sem saída em " + id); break; }
      const [c,i] = opts[Math.floor(Math.random()*opts.length)]; used.add(id+"#"+i);
      for (const k in c.effects||{}) s.stats[k] = Math.max(0, Math.min(100, s.stats[k] + c.effects[k]));
      if (c.flag && !s.flags.includes(c.flag)) s.flags.push(c.flag);
      if (c.map) applyMap(s, { map: c.map });
      let col = null; for (const k in STORY.collapse||{}) if (s.stats[k] <= 0) { const t = STORY.collapse[k]; col = typeof t === "string" ? t : (t.find(b => cond(b.if, s)) || t.at(-1)).to; break; }
      id = col || (typeof c.next === "string" ? c.next : (c.next.find(b => cond(b.if, s)) || c.next.at(-1)).to);
      applyMap(s, nodes[id].onEnter);
      if (++steps > 100) { err("Loop infinito?"); break; }
    }
    visited.add(id); endings[id] = (endings[id]||0) + 1;
    const summ = {}; for (const u of UFS) (summ[s.control[u]] ||= []).push(u);
    (endMaps[id] ||= new Set()).add(Object.entries(summ).map(([f,l]) => `${f}:${l.length}`).sort().join(" "));
  }
  const unreached = Object.keys(nodes).filter(id => !visited.has(id));
  const unused = Object.entries(nodes).flatMap(([id,n]) => (n.choices||[]).map((_,i)=>id+"#"+i)).filter(c => !used.has(c));
  if (unreached.length) err("Nós nunca alcançados: " + unreached);
  if (unused.length) err("Escolhas nunca disponíveis: " + unused);
  const nEnd = Object.values(nodes).filter(n => n.ending).length;
  console.log(`  Nós: ${Object.keys(nodes).length} (${Object.keys(nodes).length - nEnd} de história, ${nEnd} finais); ${mapRefs} mudanças de mapa validadas`);
  console.log("  Finais em 40.000 partidas aleatórias:", JSON.stringify(endings));
  for (const [e, set] of Object.entries(endMaps)) console.log(`    mapa final ${e}: ${[...set].slice(0,3).join("  |  ")}${set.size>3?` (+${set.size-3})`:""}`);
}
// ---- regressão: cancelar um foco devolve o ponto de ação e os Recursos só no mesmo turno ----
{
  const API = new Function(JOGO.codigo + "; return { SCENARIOS, newCampaign, endTurn, choose, queueChoices, focusTree, focusStatus, focusCheck, startFocus, cancelFocus, focusCancelPrompt, apFor, convertMoney };")();
  const fs = require("fs"), path = require("path");
  const EN = new Function(fs.readFileSync(path.join(JOGO.RAIZ, "js/i18n/en.js"), "utf8") + "; return I18N_EN;")();
  const trSrc = fs.readFileSync(path.join(JOGO.RAIZ, "js/i18n/traducao.js"), "utf8").split("\ndocument.__ptTitle")[0];
  const tr = new Function("I18N_EN", "SET", "document", trSrc + "; return trCore;")(EN, { lang: "en" }, {});
  const sc = API.SCENARIOS.find(s => s.id === "brasil2022"); let casos = 0;
  const drain = g => { while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } };
  const pick = g => API.focusTree(g).nodes.find(F => !API.focusCheck(g, F.id));
  for (let seed = 1; seed <= 12; seed++){
    const g = API.newCampaign(sc, seed); drain(g);
    // avança alguns meses concluindo focos até aparecer um com custo em Recursos
    for (let t = 0; t < seed % 5 && !g.ended; t++){ const P = pick(g); if (P && !g.focus.active) API.startFocus(g, P.id); API.endTurn(g); drain(g); }
    if (g.ended) continue;
    if (g.focus.active) API.cancelFocus(g);
    g.money = Math.max(g.money, 40);
    const F = pick(g); if (!F){ err(`foco/cancelar #${seed}: nenhum foco disponível`); continue; }
    const cost0 = F.cost; F.cost = 5; // os focos de 2022 só custam PA; um custo de teste confere o reembolso de Recursos
    const ap0 = g.ap, m0 = g.money, act0 = g.stat.actions;
    // mesmo turno: começar e cancelar várias vezes não perde nem gera pontos
    for (let i = 0; i < 5; i++){
      if (!API.startFocus(g, F.id).ok){ err(`foco/cancelar #${seed}: não reiniciou ${F.id}`); break; }
      if (!/devolvidos\.$/.test(API.focusCancelPrompt(g))) err(`foco/cancelar #${seed}: confirmação do mesmo turno não fala do reembolso`);
      const r = API.cancelFocus(g);
      if (!r.ok || !/devolvidos/.test(r.msg)) err(`foco/cancelar #${seed}: mensagem sem reembolso: ${r.msg}`);
      if (g.ap !== ap0 || g.money !== m0) err(`foco/cancelar #${seed}: cancelar no mesmo turno deixou PA ${ap0}→${g.ap}, Recursos ${m0}→${g.money}`);
    }
    F.cost = cost0;
    if (g.stat.actions !== act0) err(`foco/cancelar #${seed}: contagem de ações mudou (${act0}→${g.stat.actions})`);
    // converter Recursos em ação depois de começar não faz perder o reembolso
    if (API.convertMoney){ g.money += 50; const apA = g.ap; API.startFocus(g, F.id); const cv = API.convertMoney(g); API.cancelFocus(g); if (cv.ok && g.ap !== apA + 1) err(`foco/cancelar #${seed}: conversão + cancelar deixou PA ${apA}→${g.ap}`); }
    // reembolso nunca passa do máximo do turno
    API.startFocus(g, F.id); const tot = API.apFor(g).total + (g.used.convert ? 1 : 0); g.ap = tot; g.focus.paid.before = Math.min(g.focus.paid.before, tot); API.cancelFocus(g);
    if (g.ap > tot) err(`foco/cancelar #${seed}: reembolso passou do máximo (${g.ap} > ${tot})`);
    // turno anterior: não devolve, e a confirmação avisa
    g.ap = ap0; const F2 = pick(g); API.startFocus(g, F2.id); drain(g); API.endTurn(g); drain(g);
    if (g.ended) continue;
    // se o foco já terminou no turno, começa outro e simula a virada do turno
    if (g.focus.active !== F2.id){ const F4 = pick(g); if (!F4) continue; API.startFocus(g, F4.id); g.turn++; }
    if (!/turno anterior/.test(API.focusCancelPrompt(g))) err(`foco/cancelar #${seed}: confirmação de turno anterior não avisa que não há reembolso`);
    const ap1 = g.ap, m1 = g.money, r2 = API.cancelFocus(g);
    if (g.ap !== ap1 || g.money !== m1) err(`foco/cancelar #${seed}: devolveu PA/Recursos de um foco de turno anterior`);
    if (!/nada foi devolvido/.test(r2.msg)) err(`foco/cancelar #${seed}: mensagem de turno anterior sem aviso`);
    // save antigo sem "paid": cancela sem devolver e sem quebrar
    const F3 = pick(g); if (F3){ API.startFocus(g, F3.id); delete g.focus.paid; const a3 = g.ap; API.cancelFocus(g); if (g.ap !== a3) err(`foco/cancelar #${seed}: save sem registro de pagamento devolveu PA`); }
    casos++;
  }
  for (const s of ["Cancelar o foco atual? Ele começou neste turno, então o ponto de ação e os Recursos gastos para iniciá-lo serão devolvidos.", "Cancelar o foco atual? O progresso será perdido e, como ele começou num turno anterior, o ponto de ação e os Recursos gastos não serão devolvidos.", "Foco cancelado: Reunir o núcleo político. Ponto de ação e Recursos devolvidos.", "Foco cancelado: Reunir o núcleo político. O progresso foi perdido (começou num turno anterior, nada foi devolvido)."]){
    const r = tr(s); if (!r || /[ãçõé]/.test(r)) err(`foco/cancelar: sem inglês: ${s} → ${r}`);
  }
  console.log(`\nFoco cancelado: reembolso no mesmo turno, sem reembolso em turno anterior e sem passar do máximo — ${casos} casos OK`);
}
// ---- saves: migração v2 → v4 e v3 → v4, e um combate de teste ----
{
  const API = new Function(JOGO.codigo + "; return { SCENARIOS, scOf, newCampaign, migrateSave, SAVE_VERSION, endTurn, sideStr, armiesOf, armyAllowed, setOrder, armyTargets, fight, phaseOf, sideOf, choose, queueChoices, battleReport, advisorTips, advisorDo, advisorFrontTips, frontMode, frontReport, frontPool, frontCfg, frontFala, ADJ, IBGE_UF, southRevolt, tpTargets, tpOrder, tpArmies, tpOdds, launchOffensive, offensiveState, coupState, coupStoryTip, coupReadiness, golpeCfg, endingGrade, earnedAchievements, achMerge, CONQUISTAS };")();
  let n = 0;
  for (const sc of API.SCENARIOS){ if (sc.soon || !sc.campaign) continue;
    for (let seed = 1; seed <= 25; seed++){
      const g = API.newCampaign(sc, seed);
      for (let t = 0; t < seed % 9 && !g.ended; t++){ while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } if (!g.ended) API.endTurn(g); }
      if (g.ended) continue;
      // reconstrói um save antigo (v2): tropas como contadores por estado + reserva
      const v2 = JSON.parse(JSON.stringify(g)); v2.v = 2; v2.reserve = 2 + seed % 3;
      for (const k of ["armies","armySeq","armyN","enemyPlans","enemyPool","mil","armsAid","milPhase","war","warNews"]) delete v2[k];
      const ufs = Object.keys(v2.uf); for (const uf of ufs) v2.uf[uf].force = 0;
      for (const uf of ufs.filter(uf => API.sideOf(v2, v2.control[uf]) === "player").slice(0, 2)) v2.uf[uf].force = 1 + seed % 3;
      const total = v2.reserve + ufs.reduce((s, uf) => s + v2.uf[uf].force, 0);
      const m = API.migrateSave(v2);
      if (!m || m.v !== API.SAVE_VERSION) { err(`${sc.id}#${seed}: migração v2 falhou`); continue; }
      if ("reserve" in m || ufs.some(uf => "force" in m.uf[uf])) err(`${sc.id}#${seed}: migração deixou campos antigos`);
      const str = API.sideStr(m, "player"); // 2022: tropas das frentes (save v8)
      if (!API.phaseOf(m).noArmies && str < Math.min(total * 10, 8 * 60) * 0.5) err(`${sc.id}#${seed}: migração perdeu tropas (${total} unid. → ${str} de força)`);
      for (const a of m.armies) if (!API.armyAllowed(m, a.side, a.uf)) err(`${sc.id}#${seed}: exército migrado em território impossível`);
      JSON.parse(JSON.stringify(m)); if (!API.endTurn(m) && !m.queue.length) err(`${sc.id}#${seed}: save migrado não avança`);
      n++;
    }
  }
  // v3 → v4: sem histórico de batalhas nem reserva de alistamento
  let n3 = 0;
  for (const sc of API.SCENARIOS){ if (sc.soon || !sc.campaign) continue;
    for (let seed = 1; seed <= 15; seed++){
      const g = API.newCampaign(sc, seed);
      for (let t = 0; t < seed % 7 && !g.ended; t++){ while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } if (!g.ended) API.endTurn(g); }
      if (g.ended) continue;
      const v3 = JSON.parse(JSON.stringify(g)); v3.v = 3; delete v3.battleLog; delete v3.mobPool; if (v3.used) v3.used._recruit = true;
      const m = API.migrateSave(v3);
      if (!m || m.v !== API.SAVE_VERSION || !Array.isArray(m.battleLog) || m.mobPool !== 0) { err(`${sc.id}#${seed}: migração v3→v4 falhou`); continue; }
      if (!API.endTurn(m) && !m.queue.length) err(`${sc.id}#${seed}: save v3 migrado não avança`);
      n3++;
    }
  }
  // v4 → v5: sem fila de desdobramentos (g.chains)
  let n4 = 0;
  for (let seed = 1; seed <= 15; seed++){
    const g = API.newCampaign(API.SCENARIOS.find(s => s.id === "brasil2022"), seed);
    for (let t = 0; t < seed % 6 && !g.ended; t++){ while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } if (!g.ended) API.endTurn(g); }
    if (g.ended) continue;
    const v4 = JSON.parse(JSON.stringify(g)); v4.v = 4; delete v4.chains;
    const m = API.migrateSave(v4);
    if (!m || m.v !== API.SAVE_VERSION || !Array.isArray(m.chains)) { err(`brasil2022#${seed}: migração v4→v5 falhou`); continue; }
    if (!API.endTurn(m) && !m.queue.length) err(`brasil2022#${seed}: save v4 migrado não avança`);
    n4++;
  }
  // v6 → v7: saves antigos continuam no Normal, campanha completa; Fácil/Difícil/Rápida criam variantes sem mexer no cenário original
  let n6 = 0;
  { const sc22 = API.SCENARIOS.find(s => s.id === "brasil2022"), C0 = JSON.stringify(sc22.campaign.money) + sc22.campaign.enemyPower + JSON.stringify(sc22.campaign.pace);
    for (let seed = 1; seed <= 10; seed++){
      const g = API.newCampaign(sc22, seed); if (g.ended) continue;
      const v6 = JSON.parse(JSON.stringify(g)); v6.v = 6; delete v6.diff; delete v6.quick; delete v6.simple;
      const m = API.migrateSave(v6);
      if (!m || m.v !== API.SAVE_VERSION || m.diff !== "normal" || "quick" in m || m.simple !== false) { err(`brasil2022#${seed}: migração v6→v7 falhou`); continue; }
      if (!API.endTurn(m) && !m.queue.length) err(`brasil2022#${seed}: save v6 migrado não avança`);
      n6++;
    }
    for (const diff of ["facil", "dificil"]){
      const g = API.newCampaign(sc22, 3, { diff, quick: true }); // "quick" antigo é ignorado: só existe a campanha completa
      if (g.diff !== diff || "quick" in g || g.simple !== (diff === "facil")) err(`modo ${diff}: campos do save errados`);
      if (API.scOf(g) === sc22 || API.scOf(g).story !== sc22.story) err(`modo ${diff}: variante do cenário inválida`);
    }
    if (API.scOf(API.newCampaign(sc22, 3)) !== sc22) err("Normal precisa usar o cenário original");
    if (JSON.stringify(sc22.campaign.money) + sc22.campaign.enemyPower + JSON.stringify(sc22.campaign.pace) !== C0) err("os modos alteraram o cenário original");
    // guerra com exércitos nos estados (save v13): achar uma partida em guerra, migrar v7, v11 e v12, relatório sem NaN, Liga do Sul, conselheira
    let gwReg = null; // partida em guerra reaproveitada nos testes da fase 14
    // guerra no formato antigo (v8–v11: força por frente) a partir de uma partida atual, para testar a migração
    const oldWar = (g, troops, enemy) => ({ reserve: 5, fronts: g.war.fronts.map((f, i) => ({ id: f.id, troops: i ? 10 : troops, enemy, posture: "segurar", morale: 55, supply: 80, emorale: 60, eposture: "segurar", progress: 0, n: f.n, opened: f.opened, axis: {} })),
      gens: { valadares: g.war.fronts[0].id }, offAt: g.month, log: [{ month: g.month, front: g.war.fronts[0].id, rows: [] }], hist: g.war.hist || [], months: 2, siege: { "resistencia+": 100 } });
    const armiesOk = (g, tag) => { const W = g.war, ph = API.phaseOf(g), seen = {}, cap = (API.frontCfg(g).tropas.porEstado || 3);
      for (const a of W.armies){ const own = a.side === "player" ? API.sideOf(g, g.control[a.uf], ph) === "player" : g.control[a.uf] === a.fac;
        if (!API.ADJ[a.uf]){ err(`${tag}: exército ${a.id} num estado inválido (${a.uf})`); return false; }
        if (!own){ err(`${tag}: exército ${a.id} (${a.side}) fora do próprio território`); return false; }
        seen[a.side + a.uf] = (seen[a.side + a.uf] || 0) + 1;
        if (seen[a.side + a.uf] > cap){ err(`${tag}: mais de ${cap} exércitos do mesmo lado em ${a.uf}`); return false; }
        if (!(a.str > 0) || !(a.morale >= 0)){ err(`${tag}: exército ${a.id} com força/moral inválida`); return false; } }
      if (g.reg || "reg" in g) { err(`${tag}: o save ainda tem regiões (g.reg)`); return false; }
      return true; };
    {
      let gw = null;
      for (let seed = 1; seed <= 20 && !gw; seed++){ // segue a conselheira (inclusive no golpe) até a guerra começar
        const g = API.newCampaign(sc22, seed);
        for (let t = 0; t < 40 && !g.ended; t++){
          let guard = 0;
          while (g.queue.length && !g.ended && guard++ < 20){ const tip = API.coupStoryTip(g, API.coupState(g)); if (tip) API.advisorDo(g, tip); else { const ch = API.queueChoices(g); API.choose(g, Math.max(0, ch.findIndex(c => c.ok))); } }
          if (g.ended) break;
          if (API.frontMode(g) && g.war.fronts.length && API.phaseOf(g).war){ gw = g; break; }
          for (let k = 0; k < 10; k++){ const tp = API.advisorTips(g, { tab: "mapa" }).find(x => x.act.k !== "tab" && x.act.k !== "end"); if (!tp || API.advisorDo(g, tp).ok === false) break; }
          API.endTurn(g);
        }
      }
      gwReg = gw;
      if (!gw) err("exércitos: nenhuma partida de teste chegou à guerra");
      else {
        if ((gw.armies || []).length) err("exércitos: o 2022 não usa g.armies (só g.war.armies)");
        if (!API.tpArmies(gw, "player").length || !API.tpArmies(gw, "enemy").length) err("exércitos: guerra sem exércitos dos dois lados");
        armiesOk(gw, "exércitos (início)");
        // v7 → v13: exércitos antigos por estado viram exércitos de 2022 nos estados, sem perder tropas
        const v7 = JSON.parse(JSON.stringify(gw)); v7.v = 7; delete v7.war; delete v7.warNews;
        const fid = gw.war.fronts[0].id;
        v7.armies = [{ id: 1, side: "player", fac: API.phaseOf(gw).playerMain, uf: "DF", str: 30 }, { id: 2, side: "player", fac: API.phaseOf(gw).playerMain, uf: "GO", str: 25 }, { id: 3, side: "enemy", fac: fid, uf: "PE", str: 40 }];
        const m = API.migrateSave(v7);
        if (!m || m.v !== API.SAVE_VERSION || !API.frontMode(m) || m.armies.length) err("exércitos: migração v7→v13 falhou");
        else {
          if (Math.abs(API.frontPool(m) - 55) > 1) err(`exércitos: migração v7→v13 perdeu tropas (${API.frontPool(m)} ≠ 55)`);
          if (!API.tpArmies(m, "player").length || !API.tpArmies(m, "enemy").length) err("exércitos: migração v7→v13 sem exércitos");
          armiesOk(m, "migração v7");
          if (!API.endTurn(m) && !m.queue.length && !m.ended) err("exércitos: save v7 migrado não avança");
        }
        // v11 → v13: a força de cada frente vira exércitos nos estados da linha
        const v11 = JSON.parse(JSON.stringify(gw)); v11.v = 11; v11.war = oldWar(gw, 60, 90); delete v11.mil;
        const v11c = JSON.parse(JSON.stringify(v11)), m11 = API.migrateSave(v11c);
        if (!m11 || m11.v !== API.SAVE_VERSION) err("exércitos: migração v11→v13 falhou");
        else {
          const pl = API.tpArmies(m11, "player"), en = API.tpArmies(m11, "enemy"), P = pl.reduce((s, a) => s + a.str, 0) + m11.war.reserve, E = en.reduce((s, a) => s + a.str, 0);
          if (!pl.length || !en.length) err("exércitos: migração v11→v13 sem exércitos");
          const P0 = v11.war.reserve + v11.war.fronts.reduce((s, f) => s + f.troops, 0);
          if (Math.abs(P - P0) > 2) err(`exércitos: migração v11→v13 perdeu tropas (${P} ≠ ${P0})`);
          if (Math.abs(E - 90) > 2) err(`exércitos: migração v11→v13 mudou a força inimiga (${E} ≠ 90)`);
          if (m11.war.siege || m11.war.fronts.some(f => "troops" in f || "posture" in f)) err("exércitos: migração v11→v13 deixou campos antigos");
          if (!Object.values(m11.war.gens).some(id => pl.some(a => a.id === id))) err("exércitos: migração v11→v13 perdeu o general");
          armiesOk(m11, "migração v11");
          if (!API.endTurn(m11) && !m11.queue.length && !m11.ended) err("exércitos: save v11 migrado não avança");
        }
        // v12 → v13: exércitos nas regiões do IBGE voltam para o estado da região (2 primeiros dígitos do código)
        const UFC = {}; for (const k in API.IBGE_UF) UFC[API.IBGE_UF[k]] = k;
        const v12 = JSON.parse(JSON.stringify(gw)); v12.v = 12; v12.reg = { [UFC.DF + "01"]: v12.control.DF }; v12.regHist = []; v12.war.hist = []; v12.war.axis = {};
        for (const a of v12.war.armies){ a.reg = UFC[a.uf] + "0" + (1 + (a.id.length % 3)); delete a.uf; a.order = { type: "atacar", to: "9999" }; }
        const n12 = v12.war.armies.length, s12 = v12.war.armies.reduce((s, a) => s + a.str, 0), m12 = API.migrateSave(v12);
        if (!m12 || m12.v !== API.SAVE_VERSION) err("exércitos: migração v12→v13 falhou");
        else {
          if (m12.war.armies.some(a => "reg" in a || (a.order && !API.ADJ[a.order.to]))) err("exércitos: migração v12→v13 deixou regiões nos exércitos");
          if (m12.war.hist || m12.war.axis) err("exércitos: migração v12→v13 deixou campos das regiões");
          const s13 = m12.war.armies.reduce((s, a) => s + a.str, 0) + (m12.war.reserve - gw.war.reserve);
          if (!m12.war.armies.length || m12.war.armies.length > n12 || Math.abs(s13 - s12) > 2) err(`exércitos: migração v12→v13 perdeu exércitos/tropas (${s13} ≠ ${s12})`);
          armiesOk(m12, "migração v12");
          if (!API.endTurn(m12) && !m12.queue.length && !m12.ended) err("exércitos: save v12 migrado não avança");
        }
        // relatório de batalha: sem NaN, motivo, fatores e frase dramática
        const g = JSON.parse(JSON.stringify(gw)); let reps = 0; g.autoOrders = "auto";
        for (let t = 0; t < 6 && !g.ended; t++){
          while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); API.choose(g, Math.max(0, ch.findIndex(c => c.ok))); }
          if (g.ended) break;
          API.endTurn(g);
          for (const b of (g.mil && g.mil.battles) || []){
            const r = API.frontReport(g, b); reps++;
            if (!r || !r.summary || !Array.isArray(r.rows) || !r.rows.length || /NaN|undefined/.test(JSON.stringify(r)) || !(r.chance >= 0 && r.chance <= 100)) { err(`exércitos: relatório inválido (${b.uf})`); break; }
            if (!b.drama || !API.frontFala(g, "drama", b.drama) || !API.ADJ[b.uf]) { err(`exércitos: batalha sem frase dramática ou estado (${b.uf})`); break; }
          }
          if (g.war && !armiesOk(g, `exércitos (mês ${t + 1})`)) break;
          if (g.war && !(Math.abs(g.war.mom || 0) <= 3)) err("exércitos: ímpeto fora de −3…+3");
        }
        if (!reps) err("exércitos: nenhuma batalha em 6 meses de guerra com comando automático");
        // revolta do Sul abre a Frente Sul, com exércitos da Liga
        const gs = JSON.parse(JSON.stringify(gw)), SF = API.frontCfg(gs).frentes;
        if (API.phaseOf(gs).enemy.includes("separatista") && SF.separatista && !gs.war.fronts.some(f => f.id === "separatista") && gs.south){
          API.southRevolt(gs, null); API.endTurn(gs);
          if (!gs.ended && Object.values(gs.control).includes("separatista")){
            if (!gs.war.fronts.some(f => f.id === "separatista")) err("exércitos: revolta do Sul não abriu a Frente Sul");
            else if (!API.tpArmies(gs, "enemy").some(a => a.fac === "separatista")) err("exércitos: a Liga do Sul não tem exércitos");
          }
          if (!gs.ended && gs.war.fronts.length > 2) err("exércitos: mais de 2 frentes");
        }
        // conselheira: dica de ataque com "Fazer isso" dando a ordem ao exército
        const ga = JSON.parse(JSON.stringify(gw)); ga.autoOrders = "off"; while (ga.queue.length) ga.queue.pop();
        for (const a of API.tpArmies(ga, "player")){ a.order = null; a.str = 150; a.morale = 90; }
        const all = []; API.advisorFrontTips(ga, all); const tp = all.find(t => t.act && (t.act.k === "tropa" || t.act.k === "flanco"));
        if (API.advisorTips(ga, { tab: "mapa" }).some(t => !t.head || !t.text || !t.act)) err("exércitos: dica inválida da conselheira");
        if (!tp) err("exércitos: a conselheira não deu dica de ataque/defesa");
        else { const r = API.advisorDo(ga, tp), id = tp.act.id || (tp.act.ids || [])[0], a = API.tpArmies(ga, "player").find(x => x.id === id);
          if (r.ok === false || !a || !a.order || a.order.to !== tp.act.to) err("exércitos: \"Fazer isso\" não deu a ordem ao exército"); }
        // ofensiva especial: só com ordem de ataque; um exército por vez
        const go = JSON.parse(JSON.stringify(ga)); go.money = 99; go.war.offAt = 0;
        const atk = API.tpArmies(go, "player").find(a => a.order && a.order.type === "atacar");
        if (atk){ if (!API.launchOffensive(go, atk.id).ok || !atk.special) err("exércitos: ofensiva especial não foi marcada");
          const other = API.tpArmies(go, "player").find(a => a !== atk); if (other && API.offensiveState(go, other.id).ok) err("exércitos: duas ofensivas especiais no mesmo mês"); }
      }
      // falas das frentes com inglês
      const fs = require("fs"), EN = new Function(fs.readFileSync(require("path").join(JOGO.RAIZ, "js/i18n/en.js"), "utf8") + "; return I18N_EN;")();
      // tradução como na tela: trCore (js/i18n/traducao.js) com os {n} preenchidos por números ou por nomes (frente, inimigo, estado)
      const trSrc = fs.readFileSync(require("path").join(JOGO.RAIZ, "js/i18n/traducao.js"), "utf8").split("\ndocument.__ptTitle")[0];
      const trCore = new Function("I18N_EN", "SET", "document", trSrc + "; return trCore;")(EN, { lang: "en" }, {});
      const fills = [["7", "3"], ["Frente Nordeste", "Resistência constitucional"], ["Bahia", "Resistência constitucional"], ["Bahia", "Pernambuco"], ["7º Exército", "Bahia"]];
      const F = sc22.frentes.falas, miss = [];
      for (const grp of Object.values(F)) for (const v of Object.values(grp)) if (typeof v === "string" && !fills.some(x => trCore(v.replace(/\{(\d)\}/g, (_, i) => x[+i] || x[0])) != null)) miss.push(v);
      if (miss.length) err(`frentes.js: ${miss.length} falas sem tradução EN, ex.: "${miss[0].slice(0, 60)}"`);
    }
    // 2022 sem "disputa" e sem regiões: divisões válidas, migração v9→v13
    {
      const RX = new Function(JOGO.codigo + "; return { MAP_DATA, migrateSave, newCampaign, endTurn, SAVE_VERSION };")();
      const ufs = Object.keys(RX.MAP_DATA.states);
      if (/\bREG_DATA\b|\bregSync\b|\bregMapOn\b/.test(JOGO.codigo)) err("regiões: código das regiões ainda carregado");
      // "disputa" não pode aparecer como lado em nenhum dado de controle do 2022 (mapa inicial, história, fases, eventos)
      const achou = [], ver = (o, cam, d) => { if (o == null || d > 12) return; if (typeof o === "string"){ if (o === "disputa") achou.push(cam); return; }
        if (typeof o !== "object") return; for (const k in o){ if (k === "disputa") achou.push(cam + "." + k); ver(o[k], cam + "." + k, d + 1); } };
      ver(sc22.story, "story", 0); ver(sc22.campaign, "campaign", 0); ver(sc22.golpe, "golpe", 0); ver(sc22.frentes, "frentes", 0);
      if (achou.length) err(`2022: "disputa" ainda aparece nos dados de controle: ${achou.slice(0, 4).join(", ")}`);
      const facs = Object.keys(sc22.story.factions);
      for (const n of Object.values(sc22.story.nodes)) for (const c of (n.choices || [])) for (const uf in (c.split || {}))
        if (!ufs.includes(uf) || !facs.includes(c.split[uf])) err(`2022: divisão inválida ${uf}→${c.split[uf]}`);
      const gt = RX.newCampaign(sc22, 3);
      if ("reg" in gt) err("2022: campanha nova ainda cria regiões (g.reg)");
      // migração v9 → v13: estados "disputa" viram um lado
      const v9 = JSON.parse(JSON.stringify(gt)); v9.v = 9; v9.control.MG = "disputa"; v9.control.BA = "disputa";
      const m = RX.migrateSave(v9);
      if (!m || m.v !== RX.SAVE_VERSION || m.v !== 15 || m.halfDone !== true || !m.urna) err("2022: migração v9→v14 falhou");
      else {
        if (Object.values(m.control).includes("disputa")) err("2022: migração v9→v13 deixou estado em disputa");
        if ("reg" in m) err("2022: migração v9→v13 criou regiões");
        if (!RX.endTurn(m) && !m.queue.length && !m.ended) err("2022: save v9 migrado não avança");
      }
      const rd = f => fs2.readFileSync(require("path").join(JOGO.RAIZ, f), "utf8"), fs2 = require("fs");
      for (const f of ["js/core/regioes.js", "js/data/mapa-regioes.js", "js/ui/mapa-regioes.js", "css/mapa-regioes.css"]) if (fs2.existsSync(require("path").join(JOGO.RAIZ, f))) err(`regiões: ${f} deveria ter saído`);
      if (/regioes/.test(rd("index.html"))) err("regiões: index.html ainda carrega arquivos das regiões");
    }
    // fase 14: exércitos nos estados — movimentos só pelo próprio território (até 2 estados), ataques só a vizinhos, flanco, cerco, Recife
    {
      const RX = new Function(JOGO.codigo + "; return { ADJ, newCampaign, endTurn, phaseOf, choose, queueChoices, advisorTips, advisorDo, frontMode, coupState, coupStoryTip, sideOf, tpGoalPath, migrateSave, SAVE_VERSION, tpArmies, tpTargets, tpOrder, tpOdds, tpChance, tpSiege, tpLinked, tpCut, tpNew, tpTactics, tpSetTactic, tpIsFinal, frontCfg, setAutoOrders, setControl, tpHome };")();
      const ADJ = RX.ADJ;
      let moves = 0, bats = 0, caps = 0, badMove = 0, badAtk = 0, flagOk = 0, wars = 0, pathBad = 0, flanks = 0, sieges = 0, ex = "";
      for (let seed = 1; seed <= 14; seed++){
        const g = RX.newCampaign(sc22, seed); let opened = false;
        for (let t = 0; t < 70 && !g.ended; t++){ let guard = 0;
          while (g.queue.length && !g.ended && guard++ < 20){ const tip = RX.coupStoryTip(g, RX.coupState(g)); if (tip) RX.advisorDo(g, tip); else { const ch = RX.queueChoices(g); RX.choose(g, Math.max(0, ch.findIndex(c => c.ok))); } }
          if (g.ended) break;
          for (let k = 0; k < 10; k++){ const tp = RX.advisorTips(g, { tab: "mapa" }).find(x => x.act.k !== "tab" && x.act.k !== "end"); if (!tp || RX.advisorDo(g, tp).ok === false) break; }
          const war = RX.frontMode(g) && RX.phaseOf(g).war && g.war.fronts.length, ph = RX.phaseOf(g);
          if (war && !opened){ opened = true; wars++; RX.setAutoOrders(g, seed % 3 ? "auto" : "defender"); if (g.war.fronts.some(f => f.id === "resistencia") && g.flags.includes("recife_capital")) flagOk++; }
          if (war) for (const f of g.war.fronts){ const P = RX.tpGoalPath(g, f.id), goal = (RX.frontCfg(g).frentes[f.id] || {}).reduto;
            if (P && (P[P.length - 1] !== goal || P.some((u, i) => i && !ADJ[u].includes(P[i - 1])) || P.some(u => RX.sideOf(g, g.control[u], ph) === "player"))) pathBad++; }
          const pre = Object.assign({}, g.control);
          RX.endTurn(g);
          const ev = g.mil; if (!war || !ev || !ev.start) continue;
          const own = (side, fac, uf) => side === "player" ? RX.sideOf(g, pre[uf], ph) === "player" : pre[uf] === fac;
          const T = RX.frontCfg(g).tropas;
          for (const mv of ev.moves){ if (mv.fix) continue; moves++; // fix = realocação de exército isolado (não é marcha)
            const P = mv.path, ok = P.length >= 2 && P.length <= T.passos + 1 && P.every((u, i) => !i || (ADJ[u].includes(P[i - 1]) && own(mv.side, mv.fac, u)));
            if (!ok){ badMove++; if (!ex) ex = `s${seed} mover ${P.join(">")}`; } }
          const start = {}; for (const a of ev.start) start[a.id] = a.uf;
          for (const b of ev.battles){ bats++; if (b.took) caps++; if (b.origins >= 2) flanks++;
            for (const a of b.atk){ const from = ev.moves.find(m => m.id === a.id) ? null : start[a.id];
              if (!from || !ADJ[b.uf].includes(from)){ badAtk++; if (!ex) ex = `s${seed} ataque a ${b.uf}`; } } }
          sieges += (ev.sieges || []).filter(s => s.surrender).length;
        }
      }
      if (!bats || !caps) err("fase 14: nenhuma batalha/captura nas partidas de teste");
      if (badMove) err(`fase 14: ${badMove} movimentos fora do próprio território ou com salto (ex.: ${ex})`);
      if (badAtk) err(`fase 14: ${badAtk} ataques a estado não vizinho do exército (ex.: ${ex})`);
      if (pathBad) err(`fase 14: ${pathBad} caminhos até a capital inimiga inválidos`);
      if (wars && flagOk < wars) err(`fase 14: Recife não foi anunciada como capital da Resistência em ${wars - flagOk} guerras`);
      let tests = 0;
      if (gwReg){
        const base = () => { const g = JSON.parse(JSON.stringify(gwReg)); while (g.queue.length) g.queue.pop(); g.autoOrders = "off"; return g; };
        const ph0 = RX.phaseOf(gwReg), mine = (g, u) => RX.sideOf(g, g.control[u], ph0) === "player", foe = (g, u) => RX.sideOf(g, g.control[u], ph0) === "enemy";
        // sem teletransporte: um estado a 2 passos, passando por estado inimigo, não é destino válido (nem à força, na resolução)
        { const g = base(); let a = null, far = null, via = null;
          for (const x of RX.tpArmies(g, "player")){ for (const n of ADJ[x.uf]) if (foe(g, n)) for (const m of ADJ[n]) if (m !== x.uf && !ADJ[x.uf].includes(m) && mine(g, m) && !ADJ[m].some(k => mine(g, k) && ADJ[x.uf].includes(k))){ a = x; via = n; far = m; break; } if (a) break; }
          if (a){ tests++;
            if (RX.tpTargets(g, a).some(t => t.to === far)) err("fase 14: destino a 2 estados passando pelo inimigo aparece como válido");
            if (RX.tpOrder(g, a.id, far).ok) err("fase 14: ordem de teletransporte aceita");
            a.order = { type: "mover", to: far, path: [via, far] }; RX.endTurn(g);
            const b = RX.tpArmies(g, "player").find(x => x.id === a.id);
            if (b && b.uf === far) err("fase 14: exército atravessou estado inimigo na resolução");
            if (g.mil && g.mil.moves.some(m => m.id === a.id)) err("fase 14: movimento inválido foi registrado"); } }
        // alvos: movimento até 2 estados só pelo próprio território; ataque só a vizinho inimigo
        { const g = base();
          for (const a of RX.tpArmies(g, "player")) for (const t of RX.tpTargets(g, a)){
            if (t.type === "atacar" && (!ADJ[a.uf].includes(t.to) || !foe(g, t.to))) { err(`fase 14: alvo de ataque inválido ${a.uf}→${t.to}`); break; }
            if (t.type !== "atacar" && (t.path.length > 2 || t.path.some((u, i) => !mine(g, u) || !ADJ[i ? t.path[i - 1] : a.uf].includes(u)))) { err(`fase 14: movimento inválido ${a.uf}→${t.to}`); break; } }
          tests++; }
        // flanco: atacar de dois estados diferentes dá mais força do que de um só
        { const g = base(); let done = false;
          for (const u of Object.keys(ADJ)) if (foe(g, u)){ const fr = ADJ[u].filter(k => mine(g, k)); if (fr.length < 2) continue;
            const A = RX.tpNew(g, "player", RX.phaseOf(g).playerMain, fr[0], 40, 70), B = RX.tpNew(g, "player", RX.phaseOf(g).playerMain, fr[1], 40, 70);
            const one = RX.tpOdds(g, [A], u), two = RX.tpOdds(g, [A, B], u), same = RX.tpOdds(g, [A, Object.assign({}, B, { uf: fr[0] })], u);
            if (!(two.flank > 1) || !(two.origins === 2) || !(two.chance > one.chance)) err("fase 14: ataque de dois lados sem bônus de flanco");
            if (same.flank !== 1) err("fase 14: dois exércitos do mesmo estado ganharam flanco");
            done = true; break; }
          if (done) tests++; }
        // cerco: exército inimigo isolado da capital dele perde força e se rende
        { const g = base(); const e = RX.tpArmies(g, "enemy")[0];
          if (e){ const home = RX.tpHome(g, "enemy", e.fac);
            const u = Object.keys(ADJ).find(k => g.control[k] === e.fac && k !== home && !ADJ[home].includes(k) && !RX.tpArmies(g).some(x => x !== e && x.uf === k));
            if (u){ e.uf = u; for (const k of ADJ[u]) if (g.control[k] === e.fac) RX.setControl(g, k, RX.phaseOf(g).playerMain);
              if (!RX.tpCut(g, e)) err("fase 14: exército isolado não aparece cercado");
              const ev = { sieges: [] }; let n = 0; e.str = Math.max(e.str, 30);
              while (RX.tpArmies(g, "enemy").includes(e) && n++ < 10) RX.tpSiege(g, ev);
              if (RX.tpArmies(g, "enemy").includes(e)) err("fase 14: exército cercado não se rendeu");
              const mine = ev.sieges.filter(x => x.id === e.id);
              if (!mine.length || !mine[mine.length - 1].surrender || !(mine[0].str < mine[0].str0)) err("fase 14: cerco sem perda de força/rendição registrada");
              tests++; } } }
        // Batalha de Recife: 3 táticas com chances diferentes; a ordem guarda a tática e dá para trocar
        { const g = base(), K = RX.frontCfg(g), R = K.frentes.resistencia && K.frentes.resistencia.reduto;
          if (R && g.control[R] === "resistencia"){
            const nb = ADJ[R].find(k => !mine(g, k)) || ADJ[R][0]; RX.setControl(g, nb, RX.phaseOf(g).playerMain);
            for (const a of RX.tpArmies(g).filter(a => a.uf === nb)) a.uf = a.side === "player" ? a.uf : R;
            const a = RX.tpArmies(g, "player").find(x => x.uf === nb) || RX.tpNew(g, "player", RX.phaseOf(g).playerMain, nb, 60, 80);
            if (!RX.tpIsFinal(g, R)) err("fase 14: Recife não é o alvo final");
            const ks = Object.keys(RX.tpTactics(g)), cs = ks.map(k => RX.tpChance(g, a, R, k).chance);
            if (ks.length < 2 || ks.length > 3 || new Set(cs.map(c => c.toFixed(4))).size < 2) err("fase 14: táticas de Recife sem efeito");
            const r = RX.tpOrder(g, a.id, R, ks[1]);
            if (!r.ok || a.order.tatica !== ks[1]) err("fase 14: a ordem de ataque a Recife não guardou a tática");
            if (!RX.tpSetTactic(g, R, ks[2] || ks[0]).ok || a.order.tatica !== (ks[2] || ks[0])) err("fase 14: troca de tática falhou");
            if (!RX.tpTargets(g, a).some(t => t.to === R && t.final)) err("fase 14: Recife não aparece como alvo final");
            tests++; } }
      }
      // migração v10 → v13: eixos/cerco somem, exércitos criados na linha e a flag da capital criada
      if (gwReg){ const v10 = JSON.parse(JSON.stringify(gwReg)); v10.v = 10; v10.flags = v10.flags.filter(x => x !== "recife_capital"); v10.war = oldWar(gwReg, 50, 70); for (const f of v10.war.fronts) f.rompe = { dir: 1, month: 1 };
        const m = RX.migrateSave(v10);
        if (!m || m.v !== RX.SAVE_VERSION) err("fase 14: migração v10→v13 falhou");
        else if (m.war.fronts.some(f => f.rompe || f.axis) || m.war.siege) err("fase 14: migração v10→v13 manteve campos antigos");
        else if (!RX.tpArmies(m, "player").length || !RX.tpArmies(m, "enemy").length) err("fase 14: migração v10→v13 sem exércitos");
        else if (m.war.fronts.some(f => f.id === "resistencia") && !m.flags.includes("recife_capital")) err("fase 14: migração v10→v13 não criou a capital da Resistência"); }
      // interface: evento de Recife, estatísticas só de campanhas concluídas, sem tela de postura, sem regiões
      const fs = require("fs"), rd = f => fs.readFileSync(require("path").join(JOGO.RAIZ, f), "utf8");
      if (!/recife_capital:\s*\{/.test(rd("js/ui/grandes-eventos.js"))) err("fase 12: falta o grande evento de Recife");
      if (/campaignStarted/.test(rd("js/ui/menu.js"))) err("estatísticas: começar campanha não pode contar nas estatísticas");
      if (!/achDone[\s\S]{0,200}finRecord|finRecord[\s\S]{0,200}achDone/.test(rd("js/ui/conquistas.js"))) err("estatísticas: a campanha só conta no final (finRecord)");
      if (/setFrontPosture|POSTURE_ICON/.test(rd("js/ui/frentes.js") + rd("js/ui/jogo.js"))) err("fase 13: a tela de postura das frentes deveria ter saído");
      if (/REG_DATA|regMapOn|regTally|\.reg\b/.test(rd("js/ui/frentes.js") + rd("js/ui/mapa.js") + rd("js/ui/mapa-frentes.js") + rd("js/ui/aba-mapa.js") + rd("js/ui/mapa-zoom.js"))) err("fase 14: a interface ainda usa regiões");
      if (!/showRecifeVictory/.test(rd("js/ui/frentes.js")) || !/data-tptat/.test(rd("js/ui/frentes.js"))) err("fase 14: falta a Batalha de Recife na interface (tática / vitória)");
      console.log(`Fase 14: ${moves} movimentos e ${bats} batalhas (${caps} capturas, ${flanks} com flanco, ${sieges} rendições por cerco) em ${wars} guerras, todos contíguos; ${tests} testes de teletransporte/alvos/flanco/cerco/Recife; Recife anunciada em ${flagOk}/${wars}; migrações v7/v9/v10/v11/v12→v13 OK`);
    }
    // fase 16: exércitos distintos (sem fusão automática, até porEstado por estado), dividir/juntar/renomear, recrutar novo/reforço,
    // migração v14 → v15, plano do inimigo (eplan), soldo/motim, cenas dos finais, Novidades e efeitos das ações
    {
      const RY = new Function(JOGO.codigo + "; return { SAVE_VERSION, migrateSave, tpArmies, tpById, tpAllAt, tpJoin, tpSplit, tpRename, tpName, tpNew, frontRecruit, frontRecruitUFs, frontCfg, frontSoldo, endTurn, iaLevel, iaEnemyMonth, tpEnemyPlan, fxParts };")();
      let t16 = 0;
      if (gwReg){
        const base = () => { const g = JSON.parse(JSON.stringify(gwReg)); while (g.queue.length) g.queue.pop(); g.autoOrders = "off"; g.ended = null; g.used = g.used || {}; g.used._recruit = 0; return g; };
        const T = RY.frontCfg(gwReg).tropas, cap = T.porEstado || 3;
        // limite por estado e ids únicos na partida de teste
        { const g = base(), L = RY.tpArmies(g), per = {};
          for (const a of L){ const k = a.side + (a.fac || "") + a.uf; per[k] = (per[k] || 0) + 1; }
          if (Object.values(per).some(n => n > cap)) err(`fase 16: mais de ${cap} exércitos do mesmo lado num estado`);
          if (new Set(L.map(a => a.id)).size !== L.length) err("fase 16: ids de exército repetidos"); t16++; }
        // recrutar "novo" cria um exército a mais (não funde); "reforço" soma força num existente
        { const g = base(); g.money = 200; const uf = RY.frontRecruitUFs(g).find(u => RY.tpAllAt(g, "player", u).length === 1 && RY.tpAllAt(g, "player", u).length < cap);
          if (uf && RY.tpArmies(g, "player").length < T.max){
            const n0 = RY.tpArmies(g, "player").length, r = RY.frontRecruit(g, uf, "novo");
            if (!r.ok || RY.tpArmies(g, "player").length !== n0 + 1 || RY.tpAllAt(g, "player", uf).length !== 2) err("fase 16: recrutar exército novo deveria criar um exército a mais no estado");
            const a = RY.tpAllAt(g, "player", uf)[0], s0 = a.str, r2 = RY.frontRecruit(g, uf, "reforco", a.id);
            if (!r2.ok || a.str <= s0 || RY.tpAllAt(g, "player", uf).length !== 2) err("fase 16: reforçar deveria somar força sem criar exército");
            // juntar é só por escolha: os dois continuam separados até tpJoin
            RY.endTurn(g);
            t16 += 2; } }
        // dividir, juntar e renomear
        { const g = base(), a = RY.tpArmies(g, "player").find(x => x.str >= (T.dividirMin || 20) && RY.tpAllAt(g, "player", x.uf).length < cap && !x.special);
          if (a && RY.tpArmies(g, "player").length < T.max){
            const s0 = a.str, r = RY.tpSplit(g, a.id), b = r.ok && RY.tpById(g, r.id);
            if (!b || a.str + b.str !== s0 || b.uf !== a.uf) err("fase 16: dividir deveria repartir a força no mesmo estado");
            else { const j = RY.tpJoin(g, a.id, b.id);
              if (!j.ok || RY.tpById(g, b.id) || a.str !== s0) err("fase 16: juntar deveria somar as forças e remover o outro"); }
            if (!RY.tpRename(g, a.id, "Leões <do> Norte").ok || RY.tpName(g, a) !== "Leões do Norte") err("fase 16: renomear falhou");
            RY.tpRename(g, a.id, ""); if (a.nome) err("fase 16: nome vazio deveria voltar ao padrão");
            t16 += 3; } }
        // 4 exércitos do jogador no mesmo estado: o limite barra o quarto (sem fusão automática)
        { const g = base(), a = RY.tpArmies(g, "player")[0]; g.money = 200;
          while (RY.tpAllAt(g, "player", a.uf).length < cap) RY.tpNew(g, "player", null, a.uf, 10, 60, "div");
          if (RY.frontRecruit(g, a.uf, "novo").ok) err("fase 16: recrutou além do limite por estado");
          RY.endTurn(g);
          const per = {}; for (const x of RY.tpArmies(g)){ const k = x.side + (x.fac || "") + x.uf; per[k] = (per[k] || 0) + 1; }
          if (Object.values(per).some(n => n > cap)) err("fase 16: o mês passou do limite por estado"); t16++; }
        // plano do inimigo: com IA nova, eplan aponta para um estado do jogador e uma base dele
        { const g = base(); g.diff = "normal"; RY.tpEnemyPlan(g);
          const P = Object.values(g.war.eplan || {});
          if (RY.iaLevel(g) >= 1 && !P.length) err("fase 16: a IA do inimigo não montou plano (eplan)");
          if (P.some(p => !p.alvo || !p.base || g.control[p.base] === undefined)) err("fase 16: plano do inimigo inválido"); t16++; }
        // soldo: cofres no vermelho por K.soldo.meses meses = motim (fim_restauracao, cause motim)
        { const g = base(), S = RY.frontCfg(g).soldo, R = () => {};
          if (S){ let end = false; for (let i = 0; i < S.meses && !end; i++){ g.money = S.limite - 5; end = RY.frontSoldo(g, R); }
            if (!end || !g.war.end || g.war.end.cause !== "motim") err("fase 16: soldo atrasado não levou ao motim");
            const h = base(); h.money = S.limite - 5; RY.frontSoldo(h, R); h.money = 50; RY.frontSoldo(h, R);
            if (h.unpaid) err("fase 16: pagar o soldo deveria zerar o atraso"); t16 += 2; } }
        // migração v14 → v15: g.quick some, exércitos ganham tipo/xp, sem passar do limite por estado
        { const v14 = JSON.parse(JSON.stringify(gwReg)); v14.v = 14; v14.quick = true; delete v14.unpaid; if (v14.war){ delete v14.war.eplan; for (const a of v14.war.armies){ delete a.kind; delete a.xp; delete a.zona; } }
          const m = RY.migrateSave(v14);
          if (!m || m.v !== RY.SAVE_VERSION || "quick" in m) err("fase 16: migração v14→v15 falhou");
          else if (RY.tpArmies(m).some(a => !a.kind || a.xp == null)) err("fase 16: migração v14→v15 sem tipo/experiência nos exércitos");
          t16++; }
      }
      // efeitos das ações em pedaços (bom/ruim)
      { const p = RY.fxParts(gwReg || {}, { money: 5 }); if (!Array.isArray(p) || !p.length || p.some(x => !x.t || typeof x.good !== "boolean")) err("fase 16: fxParts inválido"); t16++; }
      // cenas: todo final do 2022 tem cena (pelo arquivo da interface)
      { const fs = require("fs"), path = require("path"), rd = f => fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8");
        const src = rd("js/ui/finais-animados.js");
        const FA = new Function("STORY", "frontCfg", "fFala", src + "; return { FA_CENAS, FA_POR_FINAL, FA_POR_CAUSA, endingSceneKey };")({ nodes: sc22.story.nodes }, () => null, () => "");
        const fins = Object.keys(sc22.story.nodes).filter(k => /^fim_/.test(k));
        for (const f of fins){ const k = FA.endingSceneKey({ ended: { node: f } }); if (!FA.FA_CENAS[k]) err(`fase 16: final ${f} sem cena animada`); }
        for (const c of ["recife", "df", "motim", "urnas", "cassado"]) if (!FA.FA_CENAS[FA.endingSceneKey({ ended: { node: "fim_regime", cause: c } })]) err(`fase 16: causa ${c} sem cena`);
        if (/quick|Partida rápida/.test(rd("js/ui/menu.js"))) err("fase 16: o menu ainda oferece partida rápida");
        // Novidades: lista do mais novo para o mais antigo, cada uma com versão, data, título e itens
        const NOV = new Function(rd("js/data/novidades.js") + "; return NOVIDADES;")();
        if (!Array.isArray(NOV) || !NOV.length || NOV.some(n => !n.v || !/^\d{4}-\d{2}-\d{2}$/.test(n.data) || !n.titulo || !Array.isArray(n.itens) || !n.itens.length)) err("fase 16: NOVIDADES com formato inválido");
        else if (NOV.some((n, i) => i && n.data > NOV[i - 1].data)) err("fase 16: NOVIDADES fora de ordem (mais nova primeiro)");
        t16 += fins.length + 2; }
      console.log(`Fase 16: ${t16} testes de exércitos distintos, soldo, plano do inimigo, migração v14→v15, cenas dos finais e Novidades`);
    }
    // fase 18: unificar 2–3 exércitos (só do MESMO estado, regra no núcleo), dividir só com força ≥ dividirMin (50), fichas lado a lado
    {
      const RZ = new Function(JOGO.codigo + "; return { tpArmies, tpById, tpAllAt, tpMerge, tpMergeState, tpJoin, tpSplit, tpSplitState, tpNew, tpGen, frontCfg, frontFala, TP_UFS };")();
      let t18 = 0; const rd = f => require("fs").readFileSync(require("path").join(JOGO.RAIZ, f), "utf8");
      if (gwReg){
        const base = () => { const g = JSON.parse(JSON.stringify(gwReg)); while (g.queue.length) g.queue.pop(); g.ended = null; g.used = g.used || {}; return g; };
        const T = RZ.frontCfg(gwReg).tropas, cap = T.porEstado || 3, minD = T.dividirMin;
        if (minD !== 50) err(`fase 18: dividirMin deveria ser 50 (está ${minD})`);
        // unificar 3 do mesmo estado: força somada, moral ponderada, fica o escolhido
        { const g = base(), a = RZ.tpArmies(g, "player")[0];
          for (const x of RZ.tpAllAt(g, "player", a.uf)) if (x !== a) g.war.armies = g.war.armies.filter(y => y !== x);
          while (RZ.tpAllAt(g, "player", a.uf).length < 3) RZ.tpNew(g, "player", null, a.uf, 15, 40, "div");
          const L = RZ.tpAllAt(g, "player", a.uf), sum = L.reduce((s, x) => s + x.str, 0), keep = L[1].id, mn = Math.min(...L.map(x => x.morale)), mx = Math.max(...L.map(x => x.morale));
          const r = RZ.tpMerge(g, L.map(x => x.id), keep), here = RZ.tpAllAt(g, "player", a.uf);
          if (!r.ok || here.length !== 1 || here[0].id !== keep || here[0].str !== sum || here[0].morale < mn || here[0].morale > mx) err("fase 18: unificar 3 exércitos do mesmo estado falhou");
          t18++; }
        // exércitos de estados DIFERENTES: o núcleo recusa (com motivo) e nada muda
        { const g = base(), P = RZ.tpArmies(g, "player"), a = P[0], b = P.find(x => x.uf !== a.uf);
          if (!b) err("fase 18: partida de teste sem exércitos em estados diferentes");
          else { const n0 = RZ.tpArmies(g).length, sa = a.str, sb = b.str, r = RZ.tpMerge(g, [a.id, b.id], a.id), r2 = RZ.tpJoin(g, a.id, b.id), st = RZ.tpMergeState(g, [a.id, b.id]);
            const why = RZ.frontFala(g, "tropas", "unirLonge");
            if (r.ok || r2.ok || st.ok || r.msg !== why || RZ.tpArmies(g).length !== n0 || a.str !== sa || b.str !== sb || !RZ.tpById(g, b.id)) err("fase 18: unificar exércitos de estados diferentes deveria ser recusado");
            // misturando 2 do mesmo estado com 1 de outro: também recusa
            const c = RZ.tpNew(g, "player", null, a.uf, 10, 60, "div"), r3 = RZ.tpMerge(g, [a.id, c.id, b.id]);
            if (r3.ok || !RZ.tpById(g, c.id)) err("fase 18: unificar com um exército de outro estado na lista deveria ser recusado"); }
          t18 += 2; }
        // só exércitos seus, pelo menos 2
        { const g = base(), a = RZ.tpArmies(g, "player")[0], e = RZ.tpArmies(g, "enemy")[0];
          if (RZ.tpMerge(g, [a.id]).ok) err("fase 18: unificar 1 exército só deveria ser recusado");
          if (e && RZ.tpMerge(g, [a.id, e.id]).ok) err("fase 18: unificar com exército inimigo deveria ser recusado");
          t18 += 2; }
        // dividir: 49 não, 50 sim (25/25); estado cheio não
        { const g = base(), a = RZ.tpArmies(g, "player")[0];
          for (const x of RZ.tpAllAt(g, "player", a.uf)) if (x !== a) g.war.armies = g.war.armies.filter(y => y !== x);
          a.special = false; a.str = 49; const r0 = RZ.tpSplit(g, a.id);
          if (r0.ok || !/49/.test(r0.msg || "")) err("fase 18: dividir com força 49 deveria ser recusado (com a força atual no motivo)");
          a.str = 50; const r1 = RZ.tpSplit(g, a.id), b = r1.ok && RZ.tpById(g, r1.id);
          if (!b || a.str !== 25 || b.str !== 25 || b.uf !== a.uf) err("fase 18: dividir com força 50 deveria dar 25 + 25 no mesmo estado");
          while (RZ.tpAllAt(g, "player", a.uf).length < cap) RZ.tpNew(g, "player", null, a.uf, 10, 60, "div");
          a.str = 80; if (RZ.tpSplit(g, a.id).ok) err("fase 18: dividir num estado cheio deveria ser recusado");
          t18 += 3; }
        // fichas: 2 ou 3 exércitos do mesmo lado num estado nunca se sobrepõem (desktop e celular) e ficam perto do estado
        { const mf = rd("js/ui/mapa-frentes.js"), lp = rd("js/ui/mapa.js").match(/const LABEL_POS = [^\n]+/)[0];
          const part = mf.slice(mf.indexOf("const TCHIP_K"), mf.indexOf("// ponto do estado (setas"));
          for (const mob of [false, true]){
            const LY = new Function(JOGO.dados + "\n" + lp + "\nconst MOBILE_MAP = () => " + mob + ", SET = {};\n" + part + "; return { tpChipSlots, TCHIP_K, tpChipPos, MAP_DATA };")();
            const k = LY.TCHIP_K();
            for (const uf of RZ.TP_UFS) for (const n of [2, 3]){
              const A = Array.from({ length: n }, (_, i) => ({ id: "t" + (i + 1), side: "player", uf })), S = LY.tpChipSlots(A), c = LY.tpChipPos(uf);
              for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++){ const p = S[A[i].id], q = S[A[j].id];
                if (Math.abs(p[0] - q[0]) < 38 * k && Math.abs(p[1] - q[1]) < 20 * k) err(`fase 18: fichas sobrepostas em ${uf} (${n} exércitos, ${mob ? "celular" : "desktop"})`); }
              if (A.some(a => Math.hypot(S[a.id][0] - c[0], S[a.id][1] - c[1]) > 4 * 41 * k + 1)) err(`fase 18: ficha longe demais de ${uf}`);
              t18++; } } }
        if (!/data-tpmerge/.test(rd("js/ui/frentes.js")) || !/data-tpsplit/.test(rd("js/ui/frentes.js")) || /tpOrgOpen/.test(rd("js/ui/frentes.js"))) err("fase 18: unificar/dividir deveriam estar à vista no cartão (fora de 'Organizar')");
      }
      console.log(`Fase 18: ${t18} testes de unificar (só no mesmo estado), dividir (força ≥ 50) e fichas lado a lado`);
    }
    // Fase 18.1 (v1.18.1): oportunidade começada SEMPRE termina, mesmo que a janela feche (a janela só limita COMEÇAR)
    {
      const OX = new Function(JOGO.codigo + "; return { newCampaign, endTurn, startFocus, focusStatus, focusDef, focusOpenOpp, focusInit, focusCheck, oppTurnsLeft, halfOn, paceFor, parseYM, advisorTips };")();
      let t181 = 0;
      const mk = (mode, seed) => {
        const g = OX.newCampaign(sc22, seed); g.queue.length = 0;
        if (mode === "q1"){ OX.endTurn(g); g.queue.length = 0; } // 1ª quinzena de novembro
        if (mode === "m1"){ g.halfDone = true; g.half = 0; }
        if (mode === "m3"){ g.halfDone = true; g.half = 0; g.month = OX.parseYM("2023-06"); g.story.pending = false; }
        g.queue.length = 0; return g;
      };
      for (const mode of ["q2", "q1", "m1", "m3"]) for (const id of ["o_janela", "o_popularidade", "o_caixa"]) for (const months of [1, 2]){
        const g = mk(mode, 3 + t181 % 7), f = OX.focusInit(g), F = OX.focusDef(g, id), save = F.months;
        if (mode === "q2" && !(OX.halfOn(g) && g.half === 1)){ err(`fase 18.1: ${mode} não está na 2ª quinzena`); continue; }
        if (mode === "q1" && !(OX.halfOn(g) && g.half === 0)){ err(`fase 18.1: ${mode} não está na 1ª quinzena`); continue; }
        if (mode === "m3" && OX.paceFor(g) !== 3){ err("fase 18.1: turno de 3 meses esperado"); continue; }
        F.months = months; f.active = null; f.opps = {}; f.cool = {}; g.money = 50;
        OX.focusOpenOpp(g, F, null); f.opps[id] = g.month; // último mês da janela
        const left = OX.oppTurnsLeft(g, g.month), want = mode === "q1" ? 2 : 1;
        if (left !== want) err(`fase 18.1: ${mode} ${id}: turnos restantes ${left}, esperado ${want}`);
        // começa no ÚLTIMO turno válido (na 1ª quinzena, passa antes para a 2ª)
        if (mode === "q1"){ OX.endTurn(g); g.queue.length = 0; if (OX.oppTurnsLeft(g, f.opps[id]) !== 1) err("fase 18.1: 2ª quinzena deveria ser o último turno"); }
        if (OX.focusStatus(g, F).state !== "available"){ err(`fase 18.1: ${mode} ${id} deveria estar disponível no último turno`); F.months = save; continue; }
        const r = OX.startFocus(g, id); if (!r.ok){ err(`fase 18.1: não começou ${id} (${r.msg})`); F.months = save; continue; }
        const rep0 = f.rep[id] || 0; let lost = false;
        for (let k = 0; k < months; k++){
          if (k > 0 && f.active === id && f.opps[id] !== undefined && g.month <= f.opps[id]) err(`fase 18.1: ${mode} ${id}: janela deveria ter fechado`);
          g.queue.length = 0; OX.endTurn(g);
          if ((g.report || []).some(x => /Oportunidade perdida|Foco interrompido/.test(x.t) && x.t.includes(F.name))) lost = true;
        }
        if (lost || (f.rep[id] || 0) !== rep0 + 1 || f.active === id) err(`fase 18.1: ${mode} ${id} (${months} turno(s)) começada no último turno não terminou`);
        if (OX.focusStatus(g, F).state !== "done") err(`fase 18.1: ${id} concluída deveria aparecer como concluída (não como "passada")`);
        F.months = save; t181++;
      }
      // janela fechada sem ter começado: não dá para começar, e a expiração some no fim do turno
      { const g = mk("m1", 5), f = OX.focusInit(g), F = OX.focusDef(g, "o_janela"); f.active = null; f.opps = { o_janela: g.month - 1 };
        if (OX.focusStatus(g, F).state !== "unavailable" || !OX.focusCheck(g, "o_janela")) err("fase 18.1: oportunidade vencida não pode começar");
        OX.endTurn(g); if (f.opps.o_janela !== undefined) err("fase 18.1: oportunidade vencida deveria sumir"); t181++; }
      // começada e a janela já fechou por qualquer motivo: ainda assim termina
      { const g = mk("m1", 6), f = OX.focusInit(g), F = OX.focusDef(g, "o_janela"); f.active = null; f.opps = {}; f.cool = {}; g.money = 50;
        OX.focusOpenOpp(g, F, null); OX.startFocus(g, "o_janela"); f.opps.o_janela = g.month - 2; const r0 = f.rep.o_janela || 0;
        OX.endTurn(g); if ((f.rep.o_janela || 0) !== r0 + 1) err("fase 18.1: começada com a janela já fechada deveria terminar"); t181++; }
      if (/some no fim do mês/.test(require("fs").readFileSync(require("path").join(JOGO.RAIZ, "js/core/conselheiro.js"), "utf8"))) err("fase 18.1: dica da Marta ainda diz 'some no fim do mês'");
      console.log(`Fase 18.1: ${t181} testes de oportunidade começada no último turno (quinzenas e meses) que sempre termina`);
    }
    // Fase 18.2 (v1.18.2): estado tomado em batalha não volta em silêncio (bug: "ocupei o Amazonas e o relatório diz que ganhei e perdi")
    // Causa: o nó "racha_militar" (onEnter map AM/AP → resistência) entrava no MESMO turno da batalha e sobrescrevia g.control; tpFix tirava o exército.
    {
      const W = new Function(JOGO.codigo + "; return { newCampaign, endTurn, choose, queueChoices, advisorTips, advisorDo, coupStoryTip, coupState, frontMode, frontAuto, tpSide, tpArmies, phaseOf, sideOf, mapChange, frontFlipSummary, enterStory, frontHeldUFs, scOf };")();
      let t182 = 0; const ok = (c, m) => { t182++; if (!c) err("Fase 18.2: " + m); };
      const step = g => { let gd = 0;
        while (g.queue.length && !g.ended && gd++ < 20){ const tip = W.coupStoryTip(g, W.coupState(g)); if (tip) W.advisorDo(g, tip); else { const ch = W.queueChoices(g); W.choose(g, Math.max(0, ch.findIndex(c => c.ok))); } }
        if (g.ended) return;
        for (let k = 0; k < 10; k++){ const tp = W.advisorTips(g, { tab: "mapa" }).find(x => x.act.k !== "tab" && x.act.k !== "end"); if (!tp || W.advisorDo(g, tp).ok === false) break; }
        if (W.frontMode(g) && g.war && g.war.fronts.length) W.frontAuto(g, "auto");
        W.endTurn(g); };
      // 1) varredura: toda conquista do jogador num mês continua dele e com o exército dentro (a guerra não acabou no mesmo turno)
      let caps = 0, bad = 0, warG = null, rachaHit = 0;
      for (let seed = 1; seed <= 90; seed++){
        const g = W.newCampaign(sc22, seed, { diff: ["normal", "facil", "dificil"][seed % 3] });
        for (let t = 0; t < 70 && !g.ended; t++){
          const hadRacha = g.visited.includes("racha_militar");
          step(g); const ev = g.mil;
          if (!ev || ev.month !== g.month || g.ended || !W.tpArmies(g).length) continue;
          if (!warG && ev.war) warG = seed;
          if (!hadRacha && g.visited.includes("racha_militar") && ev.flips.some(f => f.side === "player")) rachaHit++;
          for (const b of ev.battles) if (b.took && b.side === "player"){ caps++;
            const mine = W.tpSide(g, b.uf) === "player", army = W.tpArmies(g, "player").some(a => a.uf === b.uf);
            const FS = W.frontFlipSummary(g, ev);
            if (!mine || !army || !FS.won.includes(b.uf) || FS.lost.includes(b.uf)){ bad++; if (bad < 4) err(`Fase 18.2: seed ${seed} mês ${g.month}: ${b.uf} tomado mas dono=${W.tpSide(g, b.uf)} exército=${army}`); }
          }
        }
      }
      ok(caps > 100, `poucas conquistas na varredura (${caps})`); ok(bad === 0, `${bad} conquistas revertidas/sem exército`);
      // 2) cenário do bug (seed 57, abril/2023): AM tomado no mês em que entra o "racha_militar" fica com o jogador e o t8 dentro
      { const g = W.newCampaign(sc22, 57, { diff: "normal" }); let hit = null;
        for (let t = 0; t < 70 && !g.ended && !hit; t++){ const had = g.visited.includes("racha_militar"); step(g);
          if (!had && g.visited.includes("racha_militar")) hit = g; }
        ok(!!hit, "seed 57 não chegou ao racha_militar"); if (hit){ const ev = hit.mil, am = ev.battles.find(b => b.uf === "AM" && b.took && b.side === "player");
          ok(!!am, "seed 57: o cenário do bug (AM tomado no mês do racha) não se reproduziu"); if (am){ ok(W.tpSide(hit, "AM") === "player", "AM voltou para o inimigo no mês do racha");
            ok(W.tpArmies(hit, "player").some(a => a.uf === "AM" && a.id === am.into), "o exército que tomou AM não está lá");
            ok((ev.kept || []).some(k => k.uf === "AM" && k.why === "batalha"), "g.mil.kept não registra AM");
            ok((hit.report || []).some(r => /Amazonas continua seu/.test(r.t)), "relatório não explica que AM continua seu");
            ok(W.frontFlipSummary(hit, ev).won.includes("AM"), "resumo não lista AM como tomado"); } } }
      // 3) unidade: mapChange respeita conquista do mês e exército presente, mas não finais nem estados vazios
      { const g = W.newCampaign(sc22, warG || 1, { diff: ["normal", "facil", "dificil"][(warG || 1) % 3] });
        for (let t = 0; t < 70 && !g.ended && !(W.phaseOf(g).war && W.tpArmies(g, "player").length && g.mil && g.mil.war); t++) step(g);
        ok(!!(W.phaseOf(g).war && W.tpArmies(g, "player").length), "não chegou na guerra para o teste unitário");
        const ph = W.phaseOf(g), mineUF = Object.keys(g.control).filter(u => W.tpSide(g, u) === "player");
        const enemyFac = Object.values(g.control).find(f => W.sideOf(g, f, ph) === "enemy");
        const withArmy = mineUF.find(u => W.tpArmies(g, "player").some(a => a.uf === u));
        const empty = mineUF.find(u => !W.tpArmies(g).some(a => a.uf === u) && u !== withArmy && u !== "DF");
        const conq = mineUF.find(u => u !== withArmy && u !== empty && u !== "DF" && !W.tpArmies(g).some(a => a.uf === u));
        g.mil.month = g.month; g.mil.flips = [{ uf: conq, side: "player", to: g.control[conq] }]; g.mil.kept = [];
        const c0 = Object.assign({}, g.control);
        const kept = W.mapChange(g, { map: { [withArmy]: enemyFac, [conq]: enemyFac, [empty]: enemyFac } });
        ok(g.control[withArmy] === c0[withArmy] && g.control[conq] === c0[conq], "evento tirou estado com exército/conquistado no mês");
        ok(g.control[empty] === enemyFac, "evento deixou de mudar um estado vazio (deveria mudar)");
        ok(kept.length === 2 && kept.some(k => k.uf === conq && k.why === "batalha") && kept.some(k => k.uf === withArmy && k.why === "exercito"), "mapChange não devolveu os estados seguros");
        const rep = []; const node = Object.keys(W.scOf(g).story.nodes).find(id => (W.scOf(g).story.nodes[id].onEnter || {}).map && !W.scOf(g).story.nodes[id].ending);
        const N = W.scOf(g).story.nodes[node], sv = N.onEnter; N.onEnter = { map: { [withArmy]: enemyFac } };
        try { W.enterStory(g, node, rep); } finally { N.onEnter = sv; }
        ok(rep.some(r => /continua seu: o seu exército está lá/.test(r.t) && r.k === "good"), "enterStory não avisa que as tropas seguraram o estado");
        g.ended = { node: "x" }; W.mapChange(g, { map: { [withArmy]: enemyFac } }); ok(g.control[withArmy] === enemyFac, "final da campanha deveria aplicar o mapa"); }
      // 4) resumo do relatório: tomado e retomado / perdido e recuperado / seguro
      { const g = W.newCampaign(sc22, 2); const ph = W.phaseOf(g);
        const P = Object.keys(g.control).find(u => W.sideOf(g, g.control[u], ph) === "player"), E = Object.keys(g.control).find(u => W.sideOf(g, g.control[u], ph) !== "player");
        let F = W.frontFlipSummary(g, { flips: [{ uf: E, side: "player" }, { uf: E, side: "enemy" }, { uf: P, side: "enemy" }, { uf: P, side: "player" }], kept: [{ uf: P, why: "exercito" }] });
        ok(F.retaken.includes(E) && !F.won.includes(E) && !F.lost.includes(E), "tomado e retomado não aparece como tal");
        ok(F.recovered.includes(P) && !F.lost.includes(P), "perdido e recuperado não aparece como tal");
        ok(F.kept.includes(P), "estado seguro pelas tropas não listado");
        F = W.frontFlipSummary(g, { flips: [{ uf: P, side: "player" }, { uf: E, side: "enemy" }] });
        ok(F.won.includes(P) && F.lost.includes(E), "resumo simples errado"); }
      // 5) textos novos traduzidos e UI usa o resumo pelo dono final
      const rd2 = f => require("fs").readFileSync(require("path").join(JOGO.RAIZ, f), "utf8");
      const ui = rd2("js/ui/frentes.js"); ok(/frontFlipSummary\(G, ev\)/.test(ui) && /listaRetomado/.test(ui), "relatório animado não usa o resumo pelo dono final");
      for (const L of ["en", "zh", "ru"]){ const d = rd2(`js/i18n/${L}.js`);
        for (const k of ["Tomados e retomados pelo inimigo no mesmo mês: {0}.", "Perdidos e recuperados por você no mesmo mês: {0}.", "Seguros pelas suas tropas, apesar dos eventos: {0}.", "{0} continua seu: você o tomou em batalha neste mês, e o evento não o tira de você.", "{0} continua seu: o seu exército está lá e segura o estado.", "Conquistas que ficam"])
          ok(d.includes(JSON.stringify(k) + ":"), `${L}: falta tradução de "${k}"`); }
      ok(/v: "1\.18\.2"/.test(rd2("js/data/novidades.js")), "Novidades sem v1.18.2");
      console.log(`Fase 18.2: ${t182} testes (${caps} conquistas na varredura, 0 revertidas${rachaHit ? `, ${rachaHit} no mês do racha` : ""})`);
    }
    // conselheira: no máximo 2 dicas, com título, texto e ação; "Fazer isso" funciona e não quebra a partida
    for (let seed = 1; seed <= 12; seed++){
      const g = API.newCampaign(sc22, seed, { diff: seed % 2 ? "facil" : "normal" });
      for (let t = 0; t < 14 && !g.ended; t++){
        while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
        if (g.ended) break;
        const tips = API.advisorTips(g, { tab: "mapa" });
        if (!tips.length || tips.length > 2 || tips.some(x => !x.head || !x.text || !x.act || !x.act.k)) { err(`conselheira#${seed}: dicas inválidas`); break; }
        const tp = tips.find(x => x.act.k !== "tab" && x.act.k !== "end");
        if (tp && API.advisorDo(g, tp).ok === false) err(`conselheira#${seed}: "Fazer isso" falhou (${tp.id})`);
        API.endTurn(g);
      }
    }
    // conselheira no caminho do golpe (ficção do cenário): "porta" antes da posse, "plano" na conspiração, nada depois de aceitar o resultado
    {
      const K = API.golpeCfg(API.newCampaign(sc22, 1));
      if (!K) err("brasil2022 sem dados da linha do golpe (golpe.js)");
      else {
        const fs = require("fs"), EN = new Function(fs.readFileSync(require("path").join(JOGO.RAIZ, "js/i18n/en.js"), "utf8") + "; return I18N_EN;")();
        const key = s => { let n = 0; return s.replace(/\{\d\}/g, "7").replace(/\d+(?:[.,]\d+)?/g, () => "{" + (n++) + "}"); };
        for (const v of Object.values(K.falas).concat(Object.values(K.falas.req)).filter(v => typeof v === "string"))
          if (!(/\d/.test(v) ? EN.tpl[key(v)] : EN.exact[v])) err(`golpe.js: fala sem tradução EN: "${v.slice(0, 50)}"`);
        for (const [n, o] of Object.entries(K.nos)) for (const i of Object.values(o)) if (!sc22.story.nodes[n] || !sc22.story.nodes[n].choices[i]) err(`golpe.js: escolha ${n}[${i}] não existe na história`);
        for (const id of K.focos) if (!sc22.campaign.focus.nodes.some(F => F.id === id)) err(`golpe.js: foco ${id} não existe`);
        // porta: a dica da apuração aponta para "convocar os comandantes"; em outra aba só avisa da fila
        const g0 = API.newCampaign(sc22, 2);
        if (API.coupState(g0) !== "porta") err("início da campanha deveria abrir a linha do golpe (porta)");
        const t0 = API.advisorTips(g0, { tab: "historia" });
        if (t0.length !== 1 || t0[0].act.k !== "choose" || t0[0].act.i !== K.nos.apuracao.golpe) err("na apuração a conselheira deveria sugerir convocar os comandantes");
        if (API.advisorTips(g0, { tab: "mapa" }).some(t => t.golpe)) err("fora da aba História a dica do golpe não deveria aparecer com a fila cheia");
        // aceitar o resultado: dicas normais pelo resto da campanha
        API.choose(g0, 0);
        for (let t = 0; t < 8 && !g0.ended; t++){
          while (g0.queue.length && !g0.ended){ const ch = API.queueChoices(g0); API.choose(g0, Math.max(0, ch.findIndex(c => c.ok))); }
          if (g0.ended) break;
          if (API.coupState(g0) || API.advisorTips(g0, { tab: "mapa" }).some(t => t.golpe)) { err("depois de aceitar o resultado a conselheira não deveria falar em golpe"); break; }
          API.endTurn(g0);
        }
        // seguir só a conselheira até o golpe: dicas válidas, "Fazer isso" funciona, prontidão 0–100; Fácil/Normal consumam o golpe
        const ok = { facil: 0, normal: 0, dificil: 0 }, N = 6;
        for (const diff of ["facil", "normal", "dificil"]) for (let seed = 1; seed <= N; seed++){
          const g = API.newCampaign(sc22, seed, { diff });
          for (let t = 0; t < 20 && !g.ended && !g.visited.includes("golpe_inicial") && !g.visited.includes("golpe_fracassa"); t++){
            let guard = 0;
            while (g.queue.length && !g.ended && guard++ < 20){
              const st = API.coupState(g), tip = API.coupStoryTip(g, st);
              if (tip){ if (API.advisorDo(g, tip).ok === false) err(`golpe ${diff}#${seed}: escolha sugerida falhou`); }
              else { const ch = API.queueChoices(g); API.choose(g, Math.max(0, ch.findIndex(c => c.ok))); }
            }
            if (g.ended || g.visited.includes("golpe_inicial") || g.visited.includes("golpe_fracassa")) break;
            const st = API.coupState(g);
            if (st){ const R = API.coupReadiness(g);
              if (!(R.pct >= 0 && R.pct <= 100) || !R.reqs.length || !R.hora || !["sim", "talvez", "nao"].includes(R.troops)) err(`golpe ${diff}#${seed}: prontidão inválida`); }
            for (let k = 0; k < 10; k++){
              const tips = API.advisorTips(g, { tab: "mapa" });
              if (tips.length > 2 || tips.some(x => !x.head || !x.text || !x.act)) { err(`golpe ${diff}#${seed}: dicas inválidas`); break; }
              const tp = tips.find(x => x.act.k !== "tab" && x.act.k !== "end"); if (!tp) break;
              if (API.advisorDo(g, tp).ok === false) break;
            }
            API.endTurn(g);
          }
          if (g.visited.includes("golpe_inicial")) ok[diff]++;
          if (!g.visited.includes("sondagem")) err(`golpe ${diff}#${seed}: seguindo a conselheira a reunião secreta deveria acontecer`);
        }
        if (ok.facil < N || ok.normal < N - 1) err(`seguindo a conselheira o golpe deveria dar certo no Fácil e no Normal (Fácil ${ok.facil}/${N}, Normal ${ok.normal}/${N})`);
        // Difícil: conselho mais vago (sem números) nas escolhas da história
        const gd = API.newCampaign(sc22, 4, { diff: "dificil" }); API.choose(gd, K.nos.apuracao.golpe);
        for (let t = 0; t < 6 && !gd.queue.some(q => q.node === "sondagem"); t++){ while (gd.queue.length) API.choose(gd, 0); API.endTurn(gd); }
        if (gd.queue[0] && gd.queue[0].node === "sondagem"){ const tp = API.coupStoryTip(gd, API.coupState(gd)); if (!tp || /\d/.test(tp.text)) err("no Difícil o conselho da reunião secreta deveria ser vago (sem números)"); }
        else err("Difícil: a reunião secreta não chegou para o teste");
      }
    }
  }
  // tela de final: nota S/A/B/C válida, conquistas conhecidas, dica em todo final e união local+nuvem das conquistas
  {
    const sc22 = API.SCENARIOS.find(s => s.id === "brasil2022"), ids = API.CONQUISTAS.map(c => c.id);
    if (new Set(ids).size !== ids.length) err("conquistas com id repetido");
    for (const [id, n] of Object.entries(sc22.story.nodes)) if (n.ending && !n.dica) err(`final ${id} sem dica (botão "Tentar outro final")`);
    let ended = 0;
    for (let seed = 1; seed <= 30; seed++){
      const g = API.newCampaign(sc22, seed, { diff: ["facil", "normal", "dificil"][seed % 3] });
      for (let t = 0; t < 60 && !g.ended; t++){
        while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
        if (!g.ended) API.endTurn(g);
      }
      if (!g.ended) continue; ended++;
      const gr = API.endingGrade(g), got = API.earnedAchievements(g, { achados: 9, total: 9 });
      if (!"SABC".includes(gr.letter) || !(gr.score >= 0 && gr.score <= 100) || !gr.parts.length) err(`nota inválida #${seed}: ${gr.letter} ${gr.score}`);
      if (gr.outcome === "derrota" && "SA".includes(gr.letter)) err(`derrota com nota ${gr.letter}`);
      if (!got.includes("primeira") || !got.includes("historiador") || got.some(id => !ids.includes(id))) err(`conquistas inválidas #${seed}: ${got.join(",")}`);
    }
    if (ended < 20) err(`só ${ended}/30 partidas de teste chegaram ao final`);
    const m = API.achMerge({ v: 1, got: { primeira: { at: 5 }, xyz: { at: 1 } }, best: { brasil2022: "B" } }, { v: 1, got: { primeira: { at: 3 }, vitoria: { at: 9 } }, best: { brasil2022: "A", outro: "Z" } });
    if (m.got.primeira.at !== 3 || !m.got.vitoria || m.got.xyz || m.best.brasil2022 !== "A" || m.best.outro) err("achMerge: união das conquistas errada");
    if (Object.keys(API.achMerge(null, "lixo").got).length) err("achMerge: dados inválidos deveriam virar registro vazio");
  }
  // retratos: só personagens fictícios têm rosto; todo id mapeado existe; todo arquivo é usado e todo rosto tem arquivo webp
  {
    const fs = require("fs"), path = require("path"), sc22 = API.SCENARIOS.find(s => s.id === "brasil2022"), R = sc22.retratos;
    if (!R) err("brasil2022 sem retratos");
    else {
      const dir = path.join(JOGO.RAIZ, "assets", "retratos"), files = new Set(fs.readdirSync(dir).filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5)));
      const used = new Set();
      for (const [k, p] of Object.entries(R.pessoas)){
        if (!p.nome || !p.cargo) err(`retrato ${k} sem nome/cargo`);
        if (p.img){ used.add(p.img); if (!files.has(p.img)) err(`retrato ${k}: falta assets/retratos/${p.img}.webp`); else if (fs.statSync(path.join(dir, p.img + ".webp")).size > 60000) err(`retrato ${p.img}.webp grande demais`); }
        else if (!p.icone && !p.silhueta) err(`retrato ${k}: precisa de img, icone ou silhueta`);
      }
      for (const f of files) if (!used.has(f)) err(`assets/retratos/${f}.webp não é usado em retratos.js`);
      const ids = { faccoes: sc22.campaign.factions.map(f => f.id), atores: sc22.campaign.actors.map(a => a.id), eventos: sc22.campaign.events.map(e => e.id),
        historia: Object.keys(sc22.story.nodes), generais: Object.values(sc22.campaign.army && sc22.campaign.army.gens || {}).flat() };
      for (const kind of Object.keys(ids)) for (const [id, key] of Object.entries(R[kind] || {})){
        if (!ids[kind].includes(id)) err(`retratos.${kind}: "${id}" não existe no cenário`);
        if (!R.pessoas[key]) err(`retratos.${kind}.${id}: personagem "${key}" não existe`);
      }
      for (const id of ids.faccoes) if (!R.faccoes[id]) err(`facção ${id} sem porta-voz em retratos.js`);
      for (const id of ids.atores) if (!R.atores[id]) err(`ator ${id} sem retrato em retratos.js`);
      for (const n of ids.generais) if (!R.generais[n]) err(`general "${n}" sem retrato`);
      for (const id of ["n_transicao_dados", "r_argentina", "n_mercosul", "n_governador_desponta", "f_herdeiro"]) if (R.eventos[id] && R.pessoas[R.eventos[id]].img) err(`evento ${id} envolve pessoa real: use ícone ou silhueta`);
    }
  }
  // desdobramento: escolher "n_acampamentos" agenda "n_acampamentos_radical", que precisa aparecer em poucos meses
  {
    let okChain = 0;
    for (let seed = 1; seed <= 10; seed++){
      const g = API.newCampaign(API.SCENARIOS.find(s => s.id === "brasil2022"), seed);
      while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
      g.queue.push({ type: "event", id: "n_acampamentos" });
      const ch = API.queueChoices(g), idx = ch.findIndex((c, i) => c.ok && JSON.stringify((g.queue[0] && API.SCENARIOS.find(s => s.id === "brasil2022").campaign.events.find(e => e.id === "n_acampamentos").choices[i].fx) || {}).includes("n_acampamentos_radical"));
      if (idx < 0) { err("n_acampamentos sem escolha que agende o desdobramento"); break; }
      API.choose(g, idx);
      if (!(g.chains || []).some(c => c.id === "n_acampamentos_radical")) { err("chain não registrado em g.chains"); break; }
      let seen = false;
      for (let t = 0; t < 4 && !g.ended && !seen; t++){
        API.endTurn(g);
        seen = g.queue.some(q => q.id === "n_acampamentos_radical");
        while (g.queue.length && !g.ended){ const c2 = API.queueChoices(g); const ok = c2.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
      }
      if (seen) okChain++;
    }
    if (okChain < 8) err(`desdobramento apareceu só em ${okChain}/10 campanhas`);
    console.log(`\nDesdobramentos: n_acampamentos → n_acampamentos_radical apareceu em ${okChain}/10 campanhas de teste`);
  }
  const g = API.newCampaign(API.SCENARIOS.find(s => s.id === "brasil2022"), 7);
  const A = { side: "player", role: "att", units: [{ name: "A", str: 30, org: 70, xp: 10 }] }, B = { side: "enemy", role: "def", units: [{ name: "B", str: 20, org: 60, xp: 10, militia: true }] };
  const rec = API.fight(g, "MG", A, B, "ataque");
  if (!(rec.rounds.length >= 1 && rec.rounds.length <= 5) || ![0, 1].includes(rec.win) || !(rec.margin >= 0 && rec.margin <= 1) || rec.loss.some(x => !(x >= 0))) err("combate de teste inválido");
  const BR = API.battleReport(rec);
  if (!BR.summary || !BR.tips.length || BR.rows.length < 3 || BR.won !== (rec.win === 0)) err("relatório de batalha de teste inválido");
  console.log(`\nSaves: ${n} saves v2 e ${n3} saves v3 e ${n4} saves v4 e ${n6} saves v6 sintéticos migrados para v${API.SAVE_VERSION} e jogados mais 1 mês; combate de teste OK (${rec.rounds.length} rodadas)`);
  console.log(`  relatório de teste: ${BR.summary}`);
}
// ---- organização dos arquivos: todo js/ e css/ listado uma vez no index.html, com comentário no topo ----
{
  const path = require("path"), html = fs.readFileSync(path.join(JOGO.RAIZ, "index.html"), "utf8");
  const walk = d => fs.readdirSync(path.join(JOGO.RAIZ, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  const listed = [...JOGO.scripts, ...css, "js/nuvem/cloud.js", "js/nuvem/config.js"];
  for (const f of listed){ if (!fs.existsSync(path.join(JOGO.RAIZ, f))) err("index.html aponta para arquivo que não existe: " + f); if (listed.indexOf(f) !== listed.lastIndexOf(f)) err("arquivo listado duas vezes no index.html: " + f); }
  for (const f of [...walk("js"), ...walk("css")]){
    if (!listed.includes(f)) err(`arquivo fora do index.html (não carrega no jogo): ${f}`);
    const top = fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8").slice(0, 3);
    if (!/^(\/\/|\/\*)/.test(top)) err(`${f}: falta o comentário de topo explicando o arquivo`);
  }
  // todo script do index.html precisa compilar (erro de sintaxe derruba o arquivo inteiro no navegador)
  for (const f of JOGO.scripts){ try { new (require("vm").Script)(fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8"), { filename: f }); } catch (e){ err(`${f}: erro de sintaxe: ${e.message}`); } }
  // nomes globais declarados duas vezes quebrariam o jogo (scripts clássicos dividem o mesmo escopo)
  const decl = {};
  for (const f of JOGO.scripts) for (const m of fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8").matchAll(/^(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=)/gm)){
    const n = m[1] || m[2]; if (decl[n]) err(`nome global repetido: ${n} (${decl[n]} e ${f})`); else decl[n] = f; }
  console.log(`\nArquivos: ${JOGO.scripts.length} scripts e ${css.length} CSS no index.html; ${Object.keys(decl).length} nomes globais sem repetição`);
}
// ---- tradução (aviso, não falha): nomes de ações e focos sem inglês em js/i18n/en.js ----
{
  const t = fs.readFileSync(JOGO.RAIZ + "/js/i18n/traducao.js", "utf8") + fs.readFileSync(JOGO.RAIZ + "/js/i18n/en.js", "utf8");
  const trCore = new Function('const SET = { lang: "en" }; const document = { title: "" };' + t + "; return trCore;")();
  for (const sc of SCENARIOS.filter(s => !s.locked && !s.soon && s.campaign)){
    const C = sc.campaign, falta = [...C.actions.map(a => a.name), ...((C.focus && C.focus.nodes) || []).map(f => f.name)].filter(x => trCore(x) == null);
    console.log(`Tradução [${sc.year}]: ${falta.length ? `${falta.length} nomes de ações/focos sem inglês (aparecem em português): ${falta.slice(0, 5).join(" · ")}${falta.length > 5 ? " …" : ""}` : "todas as ações e focos têm inglês"}`);
  }
}
// ---- tradução completa do cenário 2022 em inglês, chinês e russo (falha se faltar texto) ----
// percorre todos os textos do cenário (história, finais, ações, focos, eventos, facções, frentes, golpe) e do cartão de 1964;
// cada idioma é testado sozinho (sem cair no inglês), com os {n} preenchidos por números ou nomes como na tela
{
  const rd = f => fs.readFileSync(require("path").join(JOGO.RAIZ, f), "utf8");
  const trSrc = rd("js/i18n/traducao.js").split("\ndocument.__ptTitle")[0];
  const DIC = { en: new Function(rd("js/i18n/en.js") + "; return I18N_EN;")(), zh: new Function(rd("js/i18n/zh.js") + "; return I18N_ZH;")(), ru: new Function(rd("js/i18n/ru.js") + "; return I18N_RU;")() };
  const VAZIO = { exact: {}, tpl: {} };
  const textos = (o, out, seen, d) => { if (o == null || d > 14) return out; if (typeof o === "string"){ const s = o.trim(); if ((/[a-zà-ú]{3}/i.test(s) && /\s/.test(s)) || /[ãçõéáíóúâêô]/.test(s)) out.add(s); return out; }
    if (typeof o !== "object" || seen.has(o)) return out; seen.add(o); for (const k in o) textos(o[k], out, seen, d + 1); return out; };
  const s22 = SCENARIOS.find(s => s.id === "brasil2022"), s64 = SCENARIOS.find(s => s.locked);
  const lista = [...textos(s22, new Set(), new Set(), 0)];
  const card64 = s64 ? ["title", "date", "tag", "character", "description"].map(k => s64[k]).filter(x => typeof x === "string") : [];
  const fills = [["7", "3", "5", "2", "4"], ["Frente Nordeste", "Resistência constitucional"], ["Bahia", "Resistência constitucional"]];
  for (const L of ["en", "zh", "ru"]){
    const tr = new Function("I18N_EN", "I18N_ZH", "I18N_RU", "SET", "document", trSrc + "; return trCore;")(L === "en" ? DIC.en : VAZIO, DIC.zh, DIC.ru, { lang: L }, {});
    const ok = v => fills.some(x => tr(v.replace(/\{(\d)\}/g, (_, i) => x[+i] || x[0]), 0, L) != null);
    const falta = lista.filter(v => !ok(v)), falta64 = card64.filter(v => !ok(v));
    console.log(`Tradução ${L.toUpperCase()} [2022]: ${lista.length - falta.length}/${lista.length} textos${falta.length ? ` — faltam ${falta.length}` : " (100%)"}; cartão 1964: ${card64.length - falta64.length}/${card64.length}`);
    if (falta.length) err(`tradução ${L}: ${falta.length} textos do cenário 2022 sem tradução, ex.: "${falta[0].slice(0, 70)}"`);
    if (falta64.length) err(`tradução ${L}: cartão do cenário 1964 sem tradução: "${falta64[0].slice(0, 60)}"`);
  }
}
// ---- tradução da aba Diplomacia (falha se algum texto renderizado ficar em português) ----
// tests/textos-diplomacia.js renderiza a aba em todas as fases/atores/pedidos/ofertas e junta as mensagens de acordo, missão,
// relatório do mês e focos. Cada texto passa pelo tradutor da tela (trCore), cada idioma sozinho (sem cair no inglês); falha se
// não traduzir ou se sobrar português (EN) ou palavra latina (ZH/RU). Texto novo na diplomacia precisa entrar em en/zh/ru.js.
{
  const rd = f => fs.readFileSync(require("path").join(JOGO.RAIZ, f), "utf8");
  const trSrc = rd("js/i18n/traducao.js").split("\ndocument.__ptTitle")[0];
  const DIC = { en: new Function(rd("js/i18n/en.js") + "; return I18N_EN;")(), zh: new Function(rd("js/i18n/zh.js") + "; return I18N_ZH;")(), ru: new Function(rd("js/i18n/ru.js") + "; return I18N_RU;")() };
  const VAZIO = { exact: {}, tpl: {} };
  const PT = /[ãõçâêôàÃÕÇ]|\b(de|da|do|dos|das|não|você|seu|sua|com|para|por|uma|mês|meses|acordo|opinião|pedido|oferta|dívida|ação|ações|dinheiro|em|os|as|ao|que|mais|já|se|aceitou|recusou|fechado|agora|força|apoio|sanções)\b/i;
  const NOMES = /Alcântara|Brasília|Martín|São Paulo|Itamaraty/g, SIGLAS = /\b(AP|ONU|OEA|UN|OAS|BRICS|EUA|USA|EU|UE|PIB|ONG|AI|IA)\b/g;
  const textos = require("./textos-diplomacia.js")("brasil2022");
  const ruins = {};
  for (const L of ["en", "zh", "ru"]){
    const tr = new Function("I18N_EN", "I18N_ZH", "I18N_RU", "SET", "document", trSrc + "; return trCore;")(L === "en" ? DIC.en : VAZIO, DIC.zh, DIC.ru, { lang: L }, {});
    ruins[L] = textos.filter(([t]) => { const r = tr(t, 0, L), fim = (r == null ? t : r).replace(NOMES, "");
      const sobra = L === "en" ? PT.test(fim) : /[A-Za-zÀ-ú]{3,}/.test(fim.replace(SIGLAS, ""));
      return (r == null && (L !== "en" || PT.test(t))) || sobra; });
    for (const [t, onde] of ruins[L].slice(0, 3)) err(`tradução ${L} da Diplomacia: "${t.slice(0, 70)}" (${onde}) fica em português`);
  }
  const n = Object.values(ruins).reduce((a, b) => a + b.length, 0);
  console.log(`Tradução da Diplomacia: ${textos.length} textos renderizados × EN/ZH/RU — ${n ? n + " em português" : "0 em português"}`);
}
console.log(errors ? `\nFALHOU (${errors} problemas)` : "\nOK: todos os cenários íntegros, todos os nós e finais alcançáveis.");
if (errors) process.exit(1);
console.log("\n=== Simulação de campanhas (sim.js) ===");
const r = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", process.argv[2] || "150"], { stdio: "inherit" });
// Cenários bloqueados: teste curto de integridade (só exceções/invariantes; a cobertura de finais não é exigida)
let lockedFail = 0;
for (const sc of SCENARIOS.filter(s => s.locked && s.campaign)){
  const q = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", "40", sc.id], { encoding: "utf8" });
  const out = (q.stdout || "") + (q.stderr || ""), fin = (out.match(/Finais alcançados: [^\n]*/) || ["?"])[0];
  console.log(`\n[${sc.year}] ${sc.title} (bloqueado): 40 partidas por IA — ${q.status === 0 ? "sem falhas" : "FALHOU"} · ${fin}`);
  if (q.status !== 0){ console.log(out.split("\n").filter(l => /falha|exceção|✗|!/.test(l)).slice(0, 10).join("\n")); lockedFail++; }
}
// Dificuldades: sem falhas, todos os finais alcançáveis no conjunto, e Fácil > Difícil em vitórias da IA aleatória
let modeFail = 0; const winOf = {};
for (const args of [["--dif=facil"], ["--dif=dificil"]]){
  const q = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", "80", "brasil2022", ...args], { encoding: "utf8" });
  const out = (q.stdout || "") + (q.stderr || ""), fin = (out.match(/Finais alcançados: [^\n]*/) || ["?"])[0];
  const rnd = out.split("IA aleatoria")[1] || "", w = +((rnd.match(/resultado: vitória (\d+)%/) || [])[1] || 0); winOf[args.join(" ")] = w;
  console.log(`\n[modo ${args.join(" ")}] 80 partidas por IA — ${q.status === 0 ? "sem falhas" : "FALHOU"} · ${fin} · vitória da IA aleatória ${w}%`);
  if (q.status !== 0){ console.log(out.split("\n").filter(l => /falha|exceção|✗|!/.test(l)).slice(0, 10).join("\n")); modeFail++; }
}
if (!(winOf["--dif=facil"] > winOf["--dif=dificil"] + 10)) { console.log("  ✗ Fácil deveria vencer bem mais que Difícil"); modeFail++; }
process.exit(r.status || (lockedFail || modeFail ? 1 : 0));
