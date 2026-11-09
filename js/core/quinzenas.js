// js/core/quinzenas.js — Núcleo: abertura da campanha em quinzenas (turnos de 15 dias) e o rótulo de data do turno.
/* Enquanto halfOn(g): o turno da 1ª para a 2ª quinzena é um "meio-turno" leve (halfTurn: metade da receita, foco nacional,
   contestação das urnas, evento com metade da chance, ações renovadas) e o da 2ª quinzena para o mês seguinte é o turno
   mensal normal (endTurn) com receita pela metade. Termina em C.quinzenas.ate ou quando a guerra começa:
   daí em diante cada turno é um mês. Dados: js/data/2022/urnas.js (QUINZENAS_2022). */
function halfCfg(g){ const sc = g && scOf(g); return (sc && sc.campaign && sc.campaign.quinzenas) || null; }
function halfOn(g){
  const Q = halfCfg(g); if (!Q || !g || g.halfDone) return false;
  if (phaseOf(g).war) return false;
  return g.month < parseYM(Q.ate);
}
const MONTH_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function halfLabel(m, h){ return `${h ? "2ª" : "1ª"} quinzena de ${MONTH_SHORT[((m % 12) + 12) % 12]}/${Math.floor(m / 12)}`; }
function dateLabel(g){ return halfOn(g) ? halfLabel(g.month, g.half) : monthLabel(g.month); }
// "quinzena(s)" na abertura, "mês/meses" depois (duração de focos e textos de prazo)
function turnUnit(g, n){ return halfOn(g) ? (n === 1 ? "quinzena" : "quinzenas") : (n === 1 ? "mês" : "meses"); }
// Fim da abertura: avisa uma vez (relatório + aviso na tela)
function halfSync(g, R){
  const Q = halfCfg(g); if (!Q || g.halfDone || halfOn(g)) return;
  g.halfDone = true; g.half = 0;
  const why = phaseOf(g).war ? "a guerra começou" : "a abertura terminou";
  R(`Fim das quinzenas (${why}): a partir de agora cada turno é um mês.`, "mid");
  g.notice = { k: "mensal", why };
}
// Meio-turno: da 1ª para a 2ª quinzena do mesmo mês
function halfTurn(g){
  const sc = scOf(g), S = sc.story, C = sc.campaign, Q = halfCfg(g), rep = [];
  const R = (t, k) => rep.push({ t, k: k || "info" });
  g.lastDelta = {}; g.lastMapChanges = []; g.counter = null; g.notice = null;
  g.half = 1; g.turn++;
  R(`Nova quinzena: ${dateLabel(g)}.`);
  const inc = incomeFor(g), gain = Math.round(inc.total / 2);
  g.money += gain;
  R(`Receita da quinzena: ${gain >= 0 ? "+" : ""}${gain} ${C.money.short}.`, gain >= 0 ? "good" : "bad");
  if (C.focus) focusTick(g, Q.foco ?? 1, R);
  urnaTick(g, 1, R);
  syncActorStats(g);
  for (const k in S.collapse) if (g.stats[k] <= 0){ g.report = rep; finishLog(g, rep); enterStory(g, collapseTo(g, k)); g.ended.why = `${S.stats[k].label} chegou a zero.`; return true; }
  if (urnaCheck(g, rep) && g.ended){ g.report = rep; finishLog(g, rep); return true; }
  if (g.story.pending && g.month >= g.story.due) enterStory(g, g.story.node, rep);
  if (!g.queue.length){
    const ci = (g.chains || []).findIndex(c => c.due <= g.month && findEvent(g, c.id) && cond(g, findEvent(g, c.id).if));
    if (ci >= 0){ const c = g.chains.splice(ci, 1)[0]; g.queue.push({ type: "event", id: c.id }); g.eventSeen[c.id] = g.month; }
    else {
      const forced = pickForcedQuinzena(g);
      if (forced){ g.queue.push({ type: "event", id: forced.id }); g.eventSeen[forced.id] = g.month; }
      else if (rnd(g) < (C.eventChance ?? 0.45) * (Q.evento ?? 0.5)){ const ev = pickRandomEvent(g); if (ev){ g.queue.push({ type: "event", id: ev.id }); g.eventSeen[ev.id] = g.month; } }
    }
  }
  if (C.focus) focusEndTick(g, R);
  const capInfo = applyMoneyCap(g); if (capInfo) R(`Teto de ${C.money.short}: ${capInfo} acima de ${C.money.cap} foram perdidos (caixa parado não rende).`, "bad");
  { const A = apFor(g); g.ap = A.total; g.apParts = A.parts; if (C.apScale) R(`Ações neste turno: ${A.total} (${A.parts.filter((p, i) => i === 0 || p.v).map((p, i) => i === 0 ? `base ${p.v}` : `${p.label} ${p.v > 0 ? "+" : "−"}${Math.abs(p.v)}`).join(" · ")}).`); }
  g.used = {}; g.dealtWith = {};
  halfSync(g, R);
  g.report = rep; finishLog(g, rep);
  return true;
}
