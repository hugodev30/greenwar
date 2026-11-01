// js/core/historia.js — Núcleo: avança a história roteirizada (nós, escolhas, fila de decisões, finais).
/* ---------- História (eventos-chave roteirizados) ---------- */
function enterStory(g, id, rep){
  const sc = scOf(g), S = sc.story, n = S.nodes[id];
  g.story = { node: id, due: g.month, pending: false };
  if (!g.visited.includes(id)) g.visited.push(id);
  const kept = n.onEnter ? mapChange(g, n.onEnter) : [];
  if (rep) for (const k of kept) rep.push({ t: gfmt(k.why === "batalha" ? "{0} continua seu: você o tomou em batalha neste mês, e o evento não o tira de você." : "{0} continua seu: o seu exército está lá e segura o estado.", ufName(k.uf)), k: "good" });
  const C = sc.campaign;
  if (C.enterFx && C.enterFx[id]) applyFx(g, C.enterFx[id]);
  if (C.focus) focusStoryGrant(g, id, rep);
  southOnStory(g, id, rep);
  syncMilitary(g);
  if (n.ending){ endCampaign(g, id, null); return; }
  g.queue = g.queue.filter(q => q.type !== "story");
  g.queue.unshift({ type: "story", node: id });
}
// Variações de texto de um nó conforme o estado da partida (ex.: o Sul aliado ou em revolta)
function nodeView(g, node){ const alt = node && (node.textAlt || []).find(x => cond(g, x.if)); return alt ? Object.assign({}, node, { title: alt.title || node.title, text: alt.text }) : node; }
function storyDue(g, next){
  const C = scOf(g).campaign, at = C.storyAt && C.storyAt[next], dl = C.storyDelay && C.storyDelay[next];
  if (at) return Math.max(parseYM(at), g.month + (dl ?? 0));
  return g.month + (dl ?? (C.defaultDelay ?? 1));
}
// Final por atributo zerado: o destino pode ser um nó fixo ou uma lista de rumos (como "next")
function collapseTo(g, k){ const t = scOf(g).story.collapse[k]; return typeof t === "string" ? t : resolveNextG(t, g); }
function queueChoices(g){
  const q = g.queue[0]; if (!q) return [];
  const sc = scOf(g);
  if (q.type === "story"){ const CF = (sc.campaign.choiceFx || {})[q.node] || [];
    return sc.story.nodes[q.node].choices.map((c, i) => { const u = CF[i] && CF[i].urna, fx = c.effects || u ? Object.assign(c.effects ? { s: c.effects } : {}, u ? { urna: u } : {}) : null;
      return { text: c.text, ok: cond(g, c.req), req: c.req, fx, urna: !!c.urna }; }); }
  const ev = findEvent(g, q.id);
  return ev.choices.map(c => ({ text: c.text, ok: cond(g, c.req), req: c.req, fx: c.fx }));
}
function choose(g, idx){
  const q = g.queue[0]; if (!q || g.ended) return false;
  const sc = scOf(g), S = sc.story, C = sc.campaign;
  if (q.type === "story"){
    const n = S.nodes[q.node], c = n.choices[idx];
    if (!c || !cond(g, c.req)) return false;
    g.queue.shift();
    applyStats(g, c.effects || {}, true);
    if (C.choiceFx && C.choiceFx[q.node] && C.choiceFx[q.node][idx]) applyFx(g, C.choiceFx[q.node][idx]);
    if (c.flag && !g.flags.includes(c.flag)) g.flags.push(c.flag);
    if (c.map || c.split) mapChange(g, { map: c.map, split: c.split });
    syncActorStats(g);
    g.history.push({ m: g.month, t: c.text });
    for (const k in S.collapse) if (g.stats[k] <= 0){ enterStory(g, collapseTo(g, k)); return true; }
    const next = resolveNextG(c.next, g), nn = S.nodes[next];
    if (nn.ending){ enterStory(g, next); return true; }
    const due = storyDue(g, next);
    if (due <= g.month) enterStory(g, next);
    else g.story = { node: next, due, pending: true };
    return true;
  }
  const ev = findEvent(g, q.id), c = ev.choices[idx];
  if (!c || !cond(g, c.req)) return false;
  g.queue.shift();
  if (ev.generic) resolveGenericDyn(g, q, idx); else applyFx(g, c.fx);
  g.history.push({ m: g.month, t: `${ev.title}: ${c.text}`, ev: true });
  if (c.next){
    const to = resolveNextG(c.next, g);
    if (to && S.nodes[to]) enterStory(g, to);
  }
  if (!g.ended) for (const k in S.collapse) if (g.stats[k] <= 0){ enterStory(g, collapseTo(g, k)); break; }
  return true;
}
// cause (fase 16): por que acabou — escolhe a cena animada do final (js/ui/finais-animados.js): "df", "recife", "motim",
// "estados", "militares", "territorio", "urnas", "cassado"; sem cause, a cena é a do próprio final
function endCampaign(g, node, why, cause){
  if (g.ended) return;
  g.queue = [];
  g.ended = { node, why: why || null, month: g.month };
  if (cause) g.ended.cause = cause;
  g.story = { node, due: g.month, pending: false };
  const n = scOf(g).story.nodes[node];
  if (n && n.onEnter && why) mapChange(g, n.onEnter); // finais por estado da campanha também aplicam o mapa final
  if (!g.visited.includes(node)) g.visited.push(node);
}
