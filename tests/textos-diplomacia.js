// tests/textos-diplomacia.js — gera, no Node, todos os textos que a aba Diplomacia mostra (para o check.js conferir a tradução).
// v1.20: strip, cards com demanda/favor/missão (sem deal builder).
const fs = require("fs"), path = require("path");
const JOGO = require("./carregar.js");
module.exports = function textosDiplomacia(cenId){
  const rd = f => fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8");
  const ui = ["js/ui/retratos.js", "js/ui/aba-diplomacia.js"].map(rd).join("\n");
  const stubs = `let SCEN = null, STORY = null, G = null;
    const UI = { tab: "diplomacia", selActor: null, req: [], off: [], dealMsg: null };
    const $ = () => null, esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])), sgn = v => (v > 0 ? "+" : "") + v;
    function renderGame(){} function afterAct(){} const window = { innerWidth: 1200 };`;
  const api = new Function(JOGO.codigo + "\n" + stubs + "\n" + ui + `
    return { SCENARIOS, newCampaign, endTurn, meetDemand, askFavor, favorPool, diploMission, focusUnlocks, tabDiplomacia, DEMAND_LABEL, FAVOR_LABEL,
      set: (sc, g) => { SCEN = sc; STORY = sc.story; G = g; }, get G(){ return G; }, UI };`)();
  const sc = api.SCENARIOS.find(s => s.id === (cenId || "brasil2022")), C = sc.campaign;
  const out = new Map();
  const dec = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const add = (t, onde) => { t = dec(String(t || "")).replace(/\s+/g, " ").trim(); if (/[A-Za-zÀ-ú]{2}/.test(t) && !out.has(t)) out.set(t, onde); };
  const html = (h, onde) => {
    for (const m of h.matchAll(/\s(?:title|aria-label|placeholder)="([^"]*)"/g)) add(m[1], onde + " @title");
    for (const s of h.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").split(/<[^>]*>/)) add(s, onde); };
  const el = { innerHTML: "", querySelectorAll: () => [] };
  const render = onde => { api.tabDiplomacia(el); html(el.innerHTML, onde); };
  const fases = [["governo", g => g], ["oposicao", g => { g.visited.push("transicao"); return g; }], ["regime", g => { g.visited.push("golpe_inicial"); return g; }]];
  const U = api.UI, clone = g => JSON.parse(JSON.stringify(g));
  for (const [ph, mk] of fases){
    const base = mk(api.newCampaign(sc, 7)); base.queue.length = 0; base.ap = 99; base.money = 50; base.pd = 8;
    const reset = () => { const g = clone(base); api.set(sc, g); U.selActor = null; U.dealMsg = null; return g; };
    reset(); render(ph + ": lista");
    for (const A of C.actors){
      let g = reset(); U.selActor = A.id; render(`${ph}/${A.id}`);
      g = reset(); g.actors[A.id].demand = (A.demands && (A.demands[ph] || A.demands.default) || ["gesto"])[0]; U.selActor = A.id; render(`${ph}/${A.id} demanda`);
      add(api.meetDemand(g, A.id).msg, `${ph}/${A.id} atender`);
      g = reset(); g.pd = 0; g.actors[A.id].demand = "gesto"; add(api.meetDemand(g, A.id).msg, `${ph}/${A.id} sem PD`);
      g = reset(); g.dealtWith[A.id] = true; g.actors[A.id].demand = "gesto"; add(api.meetDemand(g, A.id).msg, `${ph}/${A.id} já negociou`);
      g = reset(); for (const f of api.favorPool(g, A)){ const gg = reset(); gg.actors[A.id].opinion = 100; add(api.askFavor(gg, A.id, f).msg, `${ph}/${A.id} favor ${f}`); }
      g = reset(); g.actors[A.id].opinion = -50; for (const f of api.favorPool(g, A).slice(0, 2)) add(api.askFavor(g, A.id, f).msg, `${ph}/${A.id} favor opinião`);
      g = reset(); add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão`); add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão repetida`);
      g = reset(); g.money = 0; add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão sem recursos`);
      g = reset(); g.pd = 0; add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão sem PD`);
      g = reset(); g.queue.push({}); add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão com eventos`); U.selActor = A.id; render(`${ph}/${A.id} com eventos`);
      g = reset(); Object.assign(g.actors[A.id], { recognized: true, aligned: true, sanctioning: true, supportsEnemy: true, dependence: 40, demand: "gesto" });
      g.debts.push({ aid: A.id, amount: 20, due: g.month + 3 }); g.dealtWith[A.id] = true; U.selActor = A.id; render(`${ph}/${A.id} selos`);
      g = reset(); g.isoMonths = 3; U.selActor = A.id; render(`${ph}/${A.id} isolamento`);
      g = reset(); g.ended = { node: "x" }; U.selActor = A.id; render(`${ph}/${A.id} encerrada`);
    }
    for (const [nome, prep] of [
      ["dívida paga", g => { g.money = 99; for (const A of C.actors) g.debts.push({ aid: A.id, amount: 20, due: g.month }); }],
      ["calote", g => { g.money = -50; for (const A of C.actors) g.debts.push({ aid: A.id, amount: 20, due: g.month }); }],
      ["opinião baixa", g => { for (const k in g.stats) g.stats[k] = Math.min(g.stats[k], 30); g.stats[C.keys.legit] = 20; for (const A of C.actors) Object.assign(g.actors[A.id], { opinion: -100 }); }],
      ["opinião alta", g => { for (const A of C.actors) Object.assign(g.actors[A.id], { opinion: 100, sanctioning: true }); }],
    ]) for (let seed = 1; seed <= 12; seed++){
      const g = clone(base); g.seed = seed * 7919; if (g.rng != null) g.rng = seed * 7919; prep(g); api.set(sc, g);
      try { api.endTurn(g); } catch (e){ continue; }
      for (const l of (g.report || [])){ const t = l.t || l; if (C.actors.some(A => String(t).includes(A.name) || String(t).includes(A.short || "\u0000")) || /Dívida|Calote|sanç|Isolamento|Diplomacia|PD/i.test(t)) add(t, `${ph} relatório (${nome})`); }
    }
  }
  { const g = api.newCampaign(sc, 7); api.set(sc, g);
    for (const F of ((C.focus && C.focus.nodes) || [])) if (F.dipOff || F.dipReq || F.dipBonus) for (const t of api.focusUnlocks(g, F)) if (/Diplomacia|Acordos com/.test(t)) add(t, "foco " + F.id); }
  for (const A of C.actors) for (const k of ["name", "tag", "ideology", "short", "canGive"]) if (A[k]) add(A[k], "ator " + A.id + "." + k);
  for (const lab of [api.DEMAND_LABEL, api.FAVOR_LABEL]) for (const k in lab) add(lab[k], "rótulo " + k);
  return [...out.entries()];
};
