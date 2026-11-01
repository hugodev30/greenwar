// js/core/focos.js — Núcleo: árvore de decisões nacionais (focos): status, início, progresso, conclusão, oportunidades (aparecem e expiram) e aviso de focos novos.
/* ---------- Árvore de decisões nacionais (focos) ---------- */
const FOCUS_FX_KEYS = ["s","money","reserve","fac","infl","unrest","unrestAll","unrestUF","act","actAll","enemy","flag","map","ap","ceasefire","malus","south","southAlly","front","org","opp","urna"];
const EVENT_FX_KEYS = FOCUS_FX_KEYS.concat(["enemyLoss", "chain"]);
function focusTree(g){ return scOf(g).campaign.focus || null; }
function focusInit(g){
  if (focusTree(g) && !g.focus) g.focus = { done: [], active: null, prog: 0, started: 0, dipBonus: {}, req: [], off: [], hist: [] };
  // v9: oportunidades abertas {id: mês final}, espera até reabrir {id: mês}, vezes repetidas {id: n}, focos novos deste mês e os já vistos
  if (g.focus){ const f = g.focus; f.opps ||= {}; f.cool ||= {}; f.rep ||= {}; f.fresh ||= []; if (!Array.isArray(f.known)) f.known = null; }
  return g.focus;
}
function focusDef(g, id){ const T = focusTree(g); return T ? T.nodes.find(n => n.id === id) : null; }
function focusName(g, id){ const F = focusDef(g, id); return F ? F.name : id; }
function focusStatus(g, F){
  const f = g.focus;
  if (!f) return { state: "unavailable", why: "" };
  const O = F.oport;
  if (f.done.includes(F.id)) return { state: "done", why: "Concluído" };
  if (f.active === F.id) return { state: "active", why: `Em andamento: ${f.prog}/${F.months} ${turnUnit(g, F.months)}` };
  const ex = (F.excl || []).find(x => f.done.includes(x) || f.active === x);
  if (ex) return { state: "excluded", why: `Bloqueado: exclusivo com “${focusName(g, ex)}”` };
  if (F.lockIf && cond(g, F.lockIf)) return { state: "locked", why: F.lockText || "Bloqueado pela história" };
  const miss = (F.req || []).filter(r => !f.done.includes(r));
  const anyOk = !F.reqAny || F.reqAny.some(r => f.done.includes(r));
  if (miss.length || !anyOk){
    const parts = []; if (miss.length) parts.push(miss.map(r => focusName(g, r)).join(" + "));
    if (!anyOk) parts.push("um de: " + F.reqAny.map(r => focusName(g, r)).join(" / "));
    return { state: "prereq", why: "Requer " + parts.join("; ") };
  }
  if (F.avail && !cond(g, F.avail)) return { state: "unavailable", why: F.availText || "Indisponível agora" };
  if (O && !F.probe){
    const until = (f.opps || {})[F.id];
    if (until === undefined){
      const cd = (f.cool || {})[F.id];
      // repetível concluída há pouco: mostra como concluída (não como "passada"), com a volta
      const n = (f.rep || {})[F.id] || 0, last = (f.hist || []).filter(h => h.id === F.id && !h.story).pop();
      if (cd > g.month && last && last.m === cd - (O.cooldown || 6)) return { state: "done", why: `Concluída${n > 1 ? ` (${n}×)` : ""} — pode voltar a partir de ${monthLabel(cd)}` };
      return { state: "unavailable", why: cd > g.month ? `Oportunidade passada — pode voltar a partir de ${monthLabel(cd)}` : "Oportunidade: aparece quando " + O.text };
    }
    // a janela só limita COMEÇAR: depois de começada, a oportunidade sempre termina (ver focusTick/focusEndTick)
    if (g.month > until) return { state: "unavailable", why: "Oportunidade encerrada" };
    const left = oppTurnsLeft(g, until);
    return { state: "available", why: `Oportunidade: ${oppLeftText(g, left)} — depois de começada, sempre termina`, left };
  }
  return { state: "available", why: "Disponível" };
}
// Turnos que ainda restam para COMEÇAR uma oportunidade aberta até o mês "until" (inclusive).
// Quinzenas: 2 por mês (na 2ª quinzena resta 1 no mês atual). Mês a mês: turnos de paceFor(g) meses.
function oppTurnsLeft(g, until){
  const m = until - g.month;
  if (m < 0) return 0;
  if (halfOn(g)) return 2 * m + (g.half ? 1 : 2);
  let p = paceFor(g); if (g.story && g.story.pending) p = Math.min(p, Math.max(1, g.story.due - g.month)); // o turno encurta antes de um evento da história
  return Math.max(1, Math.ceil((m + 1) / Math.max(1, p)));
}
// "última quinzena para começar" / "dá para começar por mais 3 quinzenas" (mês, meses ou turnos quando o turno vale vários meses)
function oppLeftText(g, left){
  const q = halfOn(g), p = q ? 1 : paceFor(g);
  if (left <= 1) return q ? "última quinzena para começar" : p > 1 ? "último turno para começar" : "último mês para começar";
  return `dá para começar por mais ${left} ${q ? "quinzenas" : p > 1 ? "turnos" : "meses"}`;
}
function oppLeftShort(g, left){
  const q = halfOn(g), p = q ? 1 : paceFor(g);
  if (left <= 1) return q ? "última quinzena" : p > 1 ? "último turno" : "último mês";
  return `mais ${left} ${q ? "quinzenas" : p > 1 ? "turnos" : "meses"}`;
}
function focusCheck(g, id){
  const T = focusTree(g), F = focusDef(g, id);
  if (!T || !F) return "Foco inexistente";
  if (g.ended) return "Partida encerrada";
  if (g.queue.length) return "Resolva os eventos pendentes";
  if (g.focus.active) return `Já há um foco em andamento (${focusName(g, g.focus.active)})`;
  const st = focusStatus(g, F); if (st.state !== "available") return st.why;
  if (g.ap < (T.ap ?? 0)) return "Pontos de ação insuficientes";
  if ((F.cost || 0) > g.money) return "Recursos insuficientes";
  return "";
}
function startFocus(g, id){
  const bad = focusCheck(g, id); if (bad) return { ok: false, msg: bad };
  const T = focusTree(g), F = focusDef(g, id);
  const ap = T.ap ?? 0, money = F.cost || 0;
  // guarda o que foi pago neste turno: cancelar no mesmo turno devolve tudo (ver cancelFocus)
  g.focus.paid = { turn: g.turn, ap, money, before: g.ap };
  g.ap -= ap; g.money -= money; g.focus.active = id; g.focus.prog = 0; g.focus.started = g.month; g.stat.actions++;
  return { ok: true, msg: `Foco iniciado: ${F.name} (${F.months} ${turnUnit(g, F.months)}).` };
}
// Reembolso ao cancelar: só no mesmo turno em que o foco começou (começar e cancelar de novo nunca gera pontos).
function focusCancelRefund(g){
  const f = g.focus, p = f && f.active && f.paid;
  return p && p.turn === g.turn ? p : null;
}
function focusCancelPrompt(g){
  return focusCancelRefund(g)
    ? "Cancelar o foco atual? Ele começou neste turno, então os Recursos gastos para iniciá-lo serão devolvidos."
    : "Cancelar o foco atual? O progresso será perdido e, como ele começou num turno anterior, os Recursos gastos não serão devolvidos.";
}
function cancelFocus(g){
  if (!g.focus || !g.focus.active || g.ended) return { ok: false, msg: "Nenhum foco em andamento" };
  const p = focusCancelRefund(g), n = focusName(g, g.focus.active);
  g.focus.active = null; g.focus.prog = 0; g.focus.paid = null;
  if (p){
    // nunca passa do máximo do turno (base + bônus + conversão de Recursos já feita), nem do que havia antes de começar
    const K = scOf(g).campaign.convert, conv = g.used && g.used.convert && K ? K.ap : 0;
    const max = Math.max(Math.max(1, (g.apParts || []).reduce((s, x) => s + (x.v || 0), 0)) + conv, p.before ?? 0);
    g.ap = Math.min(g.ap + p.ap, max); g.money += p.money; g.stat.actions = Math.max(0, (g.stat.actions || 0) - 1);
    return { ok: true, msg: `Foco cancelado: ${n}. Recursos devolvidos.` };
  }
  return { ok: true, msg: `Foco cancelado: ${n}. O progresso foi perdido (começou num turno anterior, nada foi devolvido).` };
}
function focusUnlocks(g, F){
  const C = scOf(g).campaign, flag = "fo_" + F.id, out = [], L = dipLabels(g);
  for (const a of C.actions) if (a.show && (a.show.flags || []).includes(flag)) out.push(`Libera ação: ${a.name}`);
  for (const e of C.events) if (e.if && (e.if.flags || []).includes(flag)) out.push(`Pode disparar o evento: ${e.title}`);
  for (const o of (F.dipOff || [])) out.push(`Diplomacia: libera a oferta “${OFF_LABEL[o]}” em todas as fases`);
  for (const r of (F.dipReq || [])) out.push(`Diplomacia: libera o pedido “${REQ_LABEL[r]}”`);
  for (const aid in (F.dipBonus || {})){ const A = actorDef(g, aid); out.push(`Acordos com ${A ? A.short || A.name : aid} +${F.dipBonus[aid]} na previsão`); }
  if (F.fx && F.fx.flag === "conspiracao") out.push("Marca a conspiração nos autos (pesa no capítulo 'Nos Tribunais')");
  return out;
}
function completeFocus(g, F, R){
  const f = g.focus, C = scOf(g).campaign;
  if (F.oport){ delete f.opps[F.id]; f.cool[F.id] = g.month + (F.oport.cooldown || 6); }
  if (F.oport && F.oport.repeat) f.rep[F.id] = (f.rep[F.id] || 0) + 1; else f.done.push(F.id);
  f.active = null; f.prog = 0; f.hist.push({ id: F.id, m: g.month });
  if (!g.flags.includes("fo_" + F.id)) g.flags.push("fo_" + F.id);
  applyFx(g, F.fx);
  for (const aid in (F.dipBonus || {})) f.dipBonus[aid] = (f.dipBonus[aid] || 0) + F.dipBonus[aid];
  for (const o of (F.dipOff || [])) if (!f.off.includes(o)) f.off.push(o);
  for (const r of (F.dipReq || [])) if (!f.req.includes(r)) f.req.push(r);
  R(`Foco nacional concluído: ${F.name}${F.fx ? ` — ${fxSummary(g, F.fx)}` : ""}.`, "good");
  if (F.risk && rnd(g) < F.risk.p){ applyFx(g, F.risk.fx); R(`${F.risk.msg} (${fxSummary(g, F.risk.fx)})`, "bad"); }
  const un = focusUnlocks(g, F).filter(t => t.startsWith("Libera ação")); if (un.length) R(un.join(" · ") + ".", "good");
}
function focusTick(g, months, R){
  const T = focusTree(g); if (!T) return;
  const f = focusInit(g);
  if (!f.active){ if (T.nodes.some(F => focusStatus(g, F).state === "available")) R("Nenhum foco nacional em andamento (aba Decisões).", "mid"); return; }
  const F = focusDef(g, f.active);
  const st = focusStatus(g, Object.assign({}, F, { id: "__probe", probe: true }));
  const phaseGone = st.state === "unavailable" && F.avail && !cond(g, { phase: F.avail.phase, notPhase: F.avail.notPhase, anyControl: F.avail.anyControl });
  if (!F.oport && (st.state === "locked" || st.state === "excluded" || phaseGone)){ R(`Foco interrompido: ${F.name} — ${st.why}.`, "bad"); f.active = null; f.prog = 0; return; }
  f.prog += months;
  if (f.prog >= F.months) completeFocus(g, F, R);
  else R(`Foco em andamento: ${F.name} (${f.prog}/${F.months} ${turnUnit(g, F.months)}).`);
}
/* ---------- Oportunidades e focos novos (fim de cada turno) ---------- */
// Oportunidades (F.oport = { if, text, dura, cooldown, chance, repeat }): abrem quando a condição vale, ficam abertas por "dura" meses e somem.
function focusOpenOpp(g, F, R, why){
  const f = focusInit(g); if (!f || !F || !F.oport) return false;
  if (f.opps[F.id] !== undefined || f.active === F.id || (!F.oport.repeat && f.done.includes(F.id))) return false;
  f.opps[F.id] = g.month + Math.max(F.oport.dura || 3, paceFor(g)) - 1;
  if (!f.fresh.includes(F.id)) f.fresh.push(F.id);
  if (R) R(`⚡ Nova oportunidade: ${F.name}${why ? ` · ${why}` : ""} · até ${monthLabel(f.opps[F.id])} (aba Decisões).`, "good");
  return true;
}
function focusEndTick(g, R){
  const T = focusTree(g); if (!T || g.ended) return;
  const f = focusInit(g); f.fresh = [];
  for (const F of T.nodes) if (F.oport){
    const until = f.opps[F.id];
    if (until !== undefined){
      if (g.month > until && f.active !== F.id){ delete f.opps[F.id]; f.cool[F.id] = g.month + Math.ceil((F.oport.cooldown || 6) / 2); R(`Oportunidade perdida: ${F.name}`, "mid"); }
      continue;
    }
    if ((f.cool[F.id] || 0) > g.month || f.active === F.id || (!F.oport.repeat && f.done.includes(F.id))) continue;
    if (!cond(g, F.oport.if)) continue;
    if (F.avail && !cond(g, F.avail)) continue;
    if (F.oport.chance !== undefined && rnd(g) >= F.oport.chance) continue;
    focusOpenOpp(g, F, R);
  }
  // focos comuns que acabaram de ficar disponíveis (pela história, pela guerra ou pelos seus números)
  const av = T.nodes.filter(F => !F.oport && focusStatus(g, F).state === "available").map(F => F.id);
  if (f.known){ const nw = av.filter(id => !f.known.includes(id));
    for (const id of nw){ f.fresh.push(id); R(`✨ Novo foco disponível (aba Decisões): ${focusName(g, id)}`, "good"); } }
  f.known = [...new Set([...(f.known || []), ...av])];
}
function focusStoryGrant(g, node, rep){
  const T = focusTree(g); if (!T || !T.grants || !T.grants[node]) return;
  const f = focusInit(g);
  for (const id of T.grants[node]) if (!f.done.includes(id)){ if (f.active === id){ f.active = null; f.prog = 0; } f.done.push(id); f.hist.push({ id, m: g.month, story: true }); if (!g.flags.includes("fo_" + id)) g.flags.push("fo_" + id); if (rep) rep.push({ t: `A história impôs o foco “${focusName(g, id)}”.`, k: "mid" }); }
}
