// js/core/urnas.js — Núcleo: "Contestação das urnas" (2022), o caminho para vencer sem guerra pelas vias legais.
/* Três medidores em g.urna: prog (progresso, 100 = vitória), cred (credibilidade, 0 = inelegível) e esc (escalada,
   100 = as ruas saem do controle e a crise vai para os quartéis). Começa quando o jogador escolhe montar a frente da
   contestação (flag K.flag) e acaba quando a história segue outro rumo (K.fecha). Dados e falas: js/data/2022/urnas.js. */
function urnaCfg(g){ const sc = g && scOf(g); return (sc && sc.campaign && sc.campaign.urna) || null; }
function urnaNew(g){ const K = urnaCfg(g); return K ? { prog: 0, cred: K.cred0, esc: K.esc0, peak: K.esc0, warned: false } : null; }
function urnaOn(g){
  const K = urnaCfg(g); if (!K || !g || !g.urna || g.ended) return false;
  return g.flags.includes(K.flag) && !cond(g, K.fecha);
}
// multiplicador dos ganhos de progresso pela credibilidade (0 → ×0,6; 50 → ×1; 100 → ×1,4)
function urnaMult(g){ return 0.6 + g.urna.cred / 125; }
function urnaAdd(g, d){
  if (!d || !urnaOn(g)) return;
  const U = g.urna;
  if (d.prog) U.prog = clamp(Math.round(U.prog + (d.prog > 0 ? d.prog * urnaMult(g) : d.prog)), 0, 100);
  if (d.cred) U.cred = clamp(Math.round(U.cred + d.cred), 0, 100);
  if (d.esc){ U.esc = clamp(Math.round(U.esc + d.esc), 0, 100); U.peak = Math.max(U.peak || 0, U.esc); }
}
// progresso passivo por quinzena (o turno de um mês vale 2)
function urnaPassive(g){
  const K = urnaCfg(g), P = K.passivo, S = g.stats, cz = g.fac.centrao ? g.fac.centrao.loyalty : 45;
  return Math.max(0, P.base + (S.apoio - 50) * P.apoio + (S.base - 50) * P.baseStat + (cz - 45) * P.centrao);
}
function urnaTick(g, halves, R){
  if (!urnaOn(g)) return;
  const K = urnaCfg(g), U = g.urna, p0 = U.prog;
  urnaAdd(g, { prog: urnaPassive(g) * halves, esc: -K.esfria * halves });
  if (U.esc >= 60) urnaAdd(g, { cred: -2 * halves }); // ruas radicalizadas desgastam a imagem
  // v1.20: reconhecimento de potências ajuda a credibilidade da contestação
  { const maj = majorActors(g).filter(a => g.actors[a.id] && g.actors[a.id].recognized).length;
    if (maj >= 2) urnaAdd(g, { cred: Math.min(2, maj - 1) * halves }); }
  // fase 16: perto da virada, a defesa do governo eleito reage no TSE: −1 por mês (Normal a partir de 85, Difícil a partir de 70; Fácil não reage)
  const lvl = typeof iaLevel === "function" ? iaLevel(g) : 0;
  if (lvl && U.prog >= (lvl >= 2 ? 70 : 85)){ U.reage = (U.reage || 0) + halves; if (U.reage >= 2){ const d = Math.floor(U.reage / 2); U.reage %= 2; urnaAdd(g, { prog: -d }); R(`A defesa do governo eleito reage no TSE: progresso −${d}.`, "bad"); } }
  R(`Contestação das urnas: progresso ${U.prog}/100${U.prog > p0 ? ` (+${U.prog - p0})` : ""} · credibilidade ${U.cred} · escalada ${U.esc}.`, U.prog > p0 ? "good" : "mid");
  if (U.esc >= K.warnEsc && !U.warned){ U.warned = true; R("Alerta: as ruas estão no limite. Se a escalada chegar a 100, a crise vai para os quartéis.", "bad"); }
  if (U.esc < K.warnEsc - 15) U.warned = false;
}
// fim da contestação pelos números (vale em qualquer turno): vitória, inelegível ou escalada
function urnaCheck(g, rep){
  if (!urnaOn(g)) return false;
  const U = g.urna;
  if (U.prog >= 100){ endCampaign(g, "fim_urnas", "A contestação chegou a 100: o TSE anulou o resultado e convocou uma nova votação.", "urnas"); return true; }
  if (U.cred <= 0){ endCampaign(g, "fim_cassado", "Sua credibilidade chegou a zero: o TSE declarou você inelegível.", "cassado"); return true; }
  if (U.esc >= 100 && !g.visited.includes("escalada")){ enterStory(g, "escalada", rep); return true; }
  return false;
}
function urnaMeta(g){ return Math.max(0, urnaCfg(g).julgamento - diffSlack(g)); }
function urnaLevel(g){
  const U = g.urna, K = urnaCfg(g);
  if (U.esc >= K.warnEsc || U.cred <= K.warnCred) return { k: "bad", label: U.esc >= K.warnEsc ? "Ruas no limite" : "Credibilidade em risco" };
  if (U.prog >= 70) return { k: "ok", label: "Perto da virada" };
  return { k: "warn", label: "Em disputa" };
}
// Dicas da conselheira (fila vazia). Fácil mostra os números; Difícil só o essencial.
function urnaTips(g){
  if (!urnaOn(g)) return [];
  const K = urnaCfg(g), T = K.marta, U = g.urna, det = coupDetail(g), tips = [], f = s => String(s).replace("{p}", U.prog).replace("{c}", U.cred).replace("{e}", U.esc).replace("{meta}", urnaMeta(g));
  const best = filter => advisorBestAction(g, a => a.cat === "urna" && filter(a));
  if (U.esc >= K.warnEsc){ const b = best(a => a.fx.urna && a.fx.urna.esc < 0); if (b) tips.push({ id: "urna_esc", pri: 92, head: "Contestação das urnas", text: f(T.escalada), sub: b.a.name, act: { k: "action", id: b.a.id } }); }
  if (U.cred <= K.warnCred + 10){ const b = best(a => a.fx.urna && a.fx.urna.cred > 0); if (b) tips.push({ id: "urna_cred", pri: 90, head: "Contestação das urnas", text: f(T.cred), sub: b.a.name, act: { k: "action", id: b.a.id } }); }
  const julg = !g.visited.includes("julgamento_tse");
  const b = best(a => a.fx.urna && a.fx.urna.prog > 0 && !(U.cred <= K.warnCred + 10 && a.fx.urna.cred < 0) && !(U.esc >= K.warnEsc - 10 && a.fx.urna.esc > 0));
  if (b) tips.push({ id: "urna_prog", pri: 76, head: "Contestação das urnas", text: julg && U.prog < urnaMeta(g) && det >= 2 ? f(T.pouco) : g.visited.includes("posse_adiada") ? T.posse : det >= 2 ? f(T.bom) : T.entrada, sub: b.a.name, act: { k: "action", id: b.a.id } });
  return tips;
}
// Conselho para as cenas da contestação (e o convite "existe um caminho sem guerra" na cena do TSE)
function urnaStoryTip(g){
  const K = urnaCfg(g), q = g.queue[0]; if (!K || !q || q.type !== "story") return null;
  const ch = queueChoices(g), idx = ch.findIndex(c => c.ok && c.urna);
  if (q.node === "contestacao" && idx >= 0 && coupDetail(g) >= 2) return { id: "urna_porta", pri: 94, head: "Vencer sem guerra", text: K.marta.porta, act: { k: "choose", i: idx }, btn: "Fazer isso" };
  return null;
}
