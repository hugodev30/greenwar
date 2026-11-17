// js/core/faccoes.js — Núcleo: facções internas (agradar, pressionar, lealdade).
/* ---------- Facções internas ---------- */
function factionAction(g, id, kind){
  const C = scOf(g).campaign, F = C.factions.find(f => f.id === id), f = g.fac[id];
  if (g.queue.length || g.ended) return { ok: false, msg: "Resolva os eventos pendentes" };
  const key = "fac_" + kind + "_" + id;
  if (g.used[key]) return { ok: false, msg: "Já feito neste turno" };
  const fc = facCost(g, F, kind), cost = fc.money;
  if (g.ap < fc.ap) return { ok: false, msg: "Pontos de ação insuficientes" };
  if (g.money < cost) return { ok: false, msg: "Recursos insuficientes" };
  g.ap -= fc.ap; g.money -= cost; g.used[key] = true; g.stat.actions++;
  if (kind === "agradar"){
    bumpFac(g, id, 14);
    for (const r of (F.rivals||[])) bumpFac(g, r, -5);
    if (F.favorFx) applyFx(g, F.favorFx);
    return { ok: true, msg: `${F.name}: lealdade +14${(F.rivals||[]).length ? " (rivais −5)" : ""}.` };
  }
  f.influence = clamp(f.influence - 10, 5, 100); bumpFac(g, id, -12);
  if (F.pressFx) applyFx(g, F.pressFx);
  return { ok: true, msg: `${F.name}: influência −10, lealdade −12.` };
}
// limite de crise da facção (v1.24): 15, ou F.crise para facções que começam leais (entram em crise antes)
function facCrise(F){ return (F && F.crise) || 15; }
function facStatus(f, F){ return f.loyalty >= 65 ? "Leal" : f.loyalty >= 35 ? "Neutra" : f.loyalty >= facCrise(F) ? "Insatisfeita" : "Em crise"; }
