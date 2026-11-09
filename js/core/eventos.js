// js/core/eventos.js — Núcleo: eventos genéricos e sorteio de eventos do mês.
/* ---------- Eventos ---------- */
const GENERIC_EVENTS = [
  { id: "_dependencia", title: "Pressão de um parceiro", generic: true,
    text: ["{actor} lembra, com cortesia calculada, quanto o seu governo depende da ajuda recebida. Em troca da continuidade, pede alinhamento explícito em temas que dividem a sua base."],
    choices: [
      { text: "Ceder às exigências.", fx: { s: {}, dyn: "ceder" } },
      { text: "Recusar e buscar autonomia, mesmo com custo.", fx: { dyn: "recusar" } } ] },
];
function findEvent(g, id){ return (scOf(g).campaign.events || []).find(e => e.id === id) || GENERIC_EVENTS.find(e => e.id === id); }
function eventText(g, q){
  const ev = findEvent(g, q.id), C = scOf(g).campaign, a = q.actor ? C.actors.find(x => x.id === q.actor) : null;
  return ev.text.map(t => t.replace(/\{actor\}/g, a ? a.name : "Um parceiro"));
}
// Evento "da quinzena": once + if.half — entra com certeza na abertura quando a fila está vazia (v1.19).
function pickForcedQuinzena(g){
  if (!halfOn(g)) return null;
  const C = scOf(g).campaign;
  const pool = (C.events || []).filter(e => e.if && e.if.half != null && !e.crisisOf && !e.chained && cond(g, e.if) && !(e.once && g.eventSeen[e.id]) && (g.month - (g.eventSeen[e.id] ?? -99)) >= (e.cooldown ?? 0));
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0]; // não gasta rnd: um evento só por quinzena
  let tot = pool.reduce((s, e) => s + (e.weight || 1), 0), r = rnd(g) * tot;
  for (const e of pool){ r -= (e.weight || 1); if (r <= 0) return e; }
  return pool[pool.length-1];
}
function pickRandomEvent(g){
  const C = scOf(g).campaign;
  const pool = (C.events || []).filter(e => !e.crisisOf && !e.chained && cond(g, e.if) && !(e.once && g.eventSeen[e.id]) && (g.month - (g.eventSeen[e.id] ?? -99)) >= (e.cooldown ?? 6));
  if (!pool.length) return null;
  let tot = pool.reduce((s, e) => s + (e.weight || 1), 0), r = rnd(g) * tot;
  for (const e of pool){ r -= (e.weight || 1); if (r <= 0) return e; }
  return pool[pool.length-1];
}
