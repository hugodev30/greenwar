// js/ui/aba-decisoes.js — Interface: aba Decisões (árvore de focos navegável).
/* ---------- Aba Decisões: árvore de focos nacionais ---------- */
const FSTATE = { done: ["Concluído", "✔"], active: ["Em andamento", "⏳"], available: ["Disponível", "●"], prereq: ["Requer pré-requisito", "○"], excluded: ["Exclusivo (bloqueado)", "⊘"], locked: ["Bloqueado pela história", "🔒"], unavailable: ["Indisponível agora", "◌"] };
function focusGeom(T){
  const w = T.cell.w, h = T.cell.h, nw = 134, nh = 70, pad = 20, head = 34;
  const bx = Math.min(...T.branches.map(b => b.x0), ...T.nodes.map(n => n.x - 0.5));
  const bxMax = Math.max(...T.branches.map(b => b.x1), ...T.nodes.map(n => n.x + 0.5));
  const X = v => (v - bx) * w + pad, Y = v => head + v * h + 10;
  const W = Math.ceil(X(bxMax) + pad), H = Math.ceil(Y(Math.max(...T.nodes.map(n => n.y))) + nh + 24);
  return { w, h, nw, nh, X, Y, W, H, head };
}
// Texto da oportunidade: quando aparece, por quanto tempo fica aberta e se volta
function focusOppText(F){
  const O = F.oport; if (!O) return "";
  return `Aparece quando ${O.text} Fica aberta ${O.dura} ${O.dura === 1 ? "mês" : "meses"}${O.repeat ? ` e pode voltar ${O.cooldown} meses depois de usada` : " (uma vez só)"}.`;
}
function focusTip(F, st){
  const fx = fxSummary(G, F.fx), un = focusUnlocks(G, F);
  return [F.name, F.oport ? "⚡ Oportunidade — " + focusOppText(F) : "", F.desc, `Duração: ${F.months} ${turnUnit(G, F.months)}`, F.cost ? `Custo: ${F.cost} ${SCEN.campaign.money.short}` : "Custo: grátis", "Não gasta ações políticas.",
    fx ? "Efeitos: " + fx : "", F.risk ? `Risco (${Math.round(F.risk.p * 100)}%): ${F.risk.msg}` : "", ...un, `Situação: ${st.why}`].filter(Boolean).map(trText).join("\n");
}
function focusSVG(T, Gm){
  const byId = Object.fromEntries(T.nodes.map(n => [n.id, n])), f = G.focus, out = [];
  const bands = T.branches.filter(b => b.id !== "tronco").map(b => `<rect x="${Gm.X(b.x0)}" y="2" width="${Gm.X(b.x1) - Gm.X(b.x0) - 6}" height="${Gm.H - 6}" rx="8" fill="${b.color}" fill-opacity=".06" stroke="${b.color}" stroke-opacity=".35"/><text x="${Gm.X(b.x0) + 12}" y="22" fill="${b.color}" font-size="13" font-weight="600" letter-spacing=".08em">${esc(b.label.toUpperCase())}</text>`).join("");
  for (const n of T.nodes){
    const edges = [...(n.req || []).map(p => [p, false]), ...(n.reqAny || []).map(p => [p, true])];
    for (const [pid, any] of edges){
      const p = byId[pid]; if (!p) continue;
      const x1 = Gm.X(p.x), y1 = Gm.Y(p.y) + Gm.nh, x2 = Gm.X(n.x), y2 = Gm.Y(n.y), mid = y2 - 14;
      const lit = f.done.includes(pid);
      out.push(`<path d="M${x1} ${y1} V${mid} H${x2} V${y2}" class="fedge${any ? " any" : ""}${lit ? " lit" : ""}"/>`);
    }
  }
  const seen = new Set();
  for (const n of T.nodes) for (const x of (n.excl || [])){
    const key = [n.id, x].sort().join("|"); if (seen.has(key)) continue; seen.add(key);
    const o = byId[x]; if (!o) continue;
    const [a, b] = n.x <= o.x ? [n, o] : [o, n];
    const ax = Gm.X(a.x) + Gm.nw / 2, bxp = Gm.X(b.x) - Gm.nw / 2, ay = Gm.Y(a.y) + Gm.nh / 2, by = Gm.Y(b.y) + Gm.nh / 2;
    const mx = (ax + bxp) / 2, my = (ay + by) / 2;
    out.push(`<line x1="${ax}" y1="${ay}" x2="${bxp}" y2="${by}" class="fexcl"/><circle cx="${mx}" cy="${my}" r="8" class="fexclc"/><text x="${mx}" y="${my + 4}" class="fexclt">⊘</text>`);
  }
  return `<svg class="fsvg" width="${Gm.W}" height="${Gm.H}" viewBox="0 0 ${Gm.W} ${Gm.H}" aria-hidden="true">${bands}${out.join("")}</svg>`;
}
function tabDecisoes(el){
  const T = focusTree(G); focusInit(G);
  const f = G.focus, Gm = focusGeom(T), C = SCEN.campaign;
  const small = window.innerWidth < 700;
  let z = UI.fz ?? (small ? 0.8 : 1);
  UI.freshSeen = G.turn; // abriu a aba: o aviso "novo" some da aba (os cartões continuam marcados neste turno)
  const fresh = f.fresh || [], open = T.nodes.filter(F => F.oport && f.opps[F.id] !== undefined);
  const nodes = T.nodes.map(F => {
    const st = focusStatus(G, F), br = T.branches.find(b => b.id === F.branch) || {};
    const pr = st.state === "active" ? Math.round(100 * f.prog / F.months) : 0, isNew = fresh.includes(F.id) && st.state === "available";
    const ic = F.oport && st.state === "unavailable" ? "⚡" : FSTATE[st.state][1], rep = F.oport && f.rep[F.id] ? ` · ×${f.rep[F.id]}` : "";
    const extra = F.oport ? (st.state === "available" ? ` · <em class="fexp">⚡ <span>${oppLeftShort(G, st.left)}</span></em>` : "") : (F.excl || []).length ? " · exclusivo" : F.avail && !F.avail.phase && !F.avail.notPhase ? " · depende do momento" : "";
    return `<button class="fnode st-${st.state}${F.oport ? " opp" : ""}${isNew ? " fresh" : ""}${UI.selFocus === F.id ? " sel" : ""}" data-fid="${F.id}" style="left:${Gm.X(F.x) - Gm.nw / 2}px;top:${Gm.Y(F.y)}px;--bc:${br.color || "#c9a45c"}" title="${esc(focusTip(F, st))}" aria-label="${esc(F.name)} — ${esc(F.oport && st.state === "unavailable" ? "Oportunidade fechada" : FSTATE[st.state][0])}${isNew ? " — novo" : ""}">
      ${isNew ? `<span class="fnew" aria-hidden="true">${F.oport ? "NOVA" : "NOVO"}</span>` : ""}<span class="fic" aria-hidden="true">${ic}</span><b>${esc(F.name)}</b><small>${F.months} ${turnUnit(G, F.months)}${F.cost ? ` · ${F.cost} ${esc(C.money.short)}` : ""}${extra}${rep}</small>${st.state === "active" ? `<i class="fprog"><u style="width:${pr}%"></u></i>` : ""}</button>`;
  }).join("");
  const freshReg = fresh.filter(id => !(focusDef(G, id) || {}).oport && focusStatus(G, focusDef(G, id)).state === "available");
  const oppBar = `<div class="fopps" role="region" aria-label="Oportunidades e focos novos"><span class="fopl">⚡ Oportunidades</span>${open.length ? open.map(F => { const st = focusStatus(G, F); return `<button class="fchip${fresh.includes(F.id) ? " fresh" : ""}" data-fid="${F.id}">${esc(F.name)} <small>${st.state === "active" ? "em andamento" : st.state === "available" ? `começar: ${oppLeftShort(G, st.left)}` : ""}</small></button>`; }).join("") : `<small>Nenhuma aberta agora. Elas aparecem conforme a situação (apoio, guerra, caixa, Sul…) e somem se você não aproveitar.</small>`}
    ${freshReg.length ? `<span class="fopl new">✨ Novos focos</span>${freshReg.map(id => `<button class="fchip fresh" data-fid="${id}">${esc(focusName(G, id))}</button>`).join("")}` : ""}</div>`;
  const act = f.active ? focusDef(G, f.active) : null;
  const status = act
    ? `<div class="fstatus on"><span>Foco atual</span><strong>${esc(act.name)}</strong><div class="bar"><i style="width:${Math.round(100 * f.prog / act.months)}%;background:#c9a45c"></i></div><small>${f.prog}/${act.months} ${turnUnit(G, act.months)} · avança ao encerrar o mês</small>${act.oport ? `<small>⚡ <span>Oportunidade já começada: termina mesmo se a janela fechar.</span></small>` : ""}</div>`
    : `<div class="fstatus"><span>Foco atual</span><strong>Nenhum</strong><small>Escolha um foco disponível (●). Não gasta ações políticas; só um por vez. Concluídos: ${f.done.filter(id => !(focusDef(G, id) || {}).oport).length} de ${T.nodes.filter(F => !F.oport).length}.</small></div>`;
  const sel = UI.selFocus ? focusDef(G, UI.selFocus) : null;
  let detail = "";
  if (sel){
    const st = focusStatus(G, sel), br = T.branches.find(b => b.id === sel.branch) || {}, bad = focusCheck(G, sel.id);
    const list = (ids, sep) => ids.map(id => `<span class="${f.done.includes(id) ? "ok" : ""}">${f.done.includes(id) ? "✔ " : ""}${esc(focusName(G, id))}</span>`).join(sep);
    detail = `<div class="fdetail" id="fdetail" role="region" aria-label="Detalhes do foco"><button class="fclose" id="fClose" aria-label="Fechar detalhes">×</button>
      <div class="chap" style="color:${br.color}">${esc(br.label || "")}</div><h3>${esc(sel.name)}</h3>
      <div class="fstate st-${st.state}">${FSTATE[st.state][1]} ${esc(st.why)}</div>
      <p>${esc(sel.desc)}</p>
      <dl><dt>Duração</dt><dd>${sel.months} ${turnUnit(G, sel.months)}</dd><dt>Custo</dt><dd>${sel.cost ? `${sel.cost} ${esc(C.money.short)}` : "Grátis"} · não gasta ações</dd>
      ${sel.fx ? `<dt>Efeitos</dt><dd>${esc(fxSummary(G, sel.fx))}</dd>` : ""}
      ${sel.risk ? `<dt>Risco</dt><dd>${Math.round(sel.risk.p * 100)}%: ${esc(sel.risk.msg)} (${esc(fxSummary(G, sel.risk.fx))})</dd>` : ""}
      ${focusUnlocks(G, sel).length ? `<dt>Libera</dt><dd>${focusUnlocks(G, sel).map(esc).join("<br>")}</dd>` : ""}
      ${(sel.req || []).length ? `<dt>Requer</dt><dd>${list(sel.req, " + ")}</dd>` : ""}
      ${(sel.reqAny || []).length ? `<dt>Requer um de</dt><dd>${list(sel.reqAny, " / ")}</dd>` : ""}
      ${(sel.excl || []).length ? `<dt>Exclusivo com</dt><dd class="exc">${sel.excl.map(x => "⊘ " + esc(focusName(G, x))).join("<br>")}</dd>` : ""}
      ${sel.oport ? `<dt>⚡ Oportunidade</dt><dd>${esc(focusOppText(sel))}${f.rep[sel.id] ? ` ${esc(`Já aproveitada ${f.rep[sel.id]}×.`)}` : ""}</dd>` : ""}
      ${sel.avail ? `<dt>Quando</dt><dd>${esc(sel.availText || "")}</dd>` : ""}
      ${sel.lockIf ? `<dt>A história pode bloquear</dt><dd>${esc(sel.lockText || "")}</dd>` : ""}</dl>
      ${st.state === "active" ? `<button class="secondary" id="fCancel">Cancelar foco (perde o progresso)</button>`
        : st.state === "done" ? "" : `<button class="primary" id="fStart" ${bad ? "disabled" : ""}>Iniciar foco${sel.cost ? ` (${sel.cost} ${esc(C.money.short)})` : ""}</button>${bad ? `<small class="why">${esc(bad)}</small>` : ""}`}
    </div>`;
  }
  const legend = Object.entries(FSTATE).map(([k, [l, i]]) => `<span class="st-${k}"><em>${i}</em>${l}</span>`).join("") + `<span class="st-opp"><em>⚡</em>Oportunidade (aparece e expira)</span><span class="st-new"><em>✨</em>Novo neste turno</span><span>── pré-requisito</span><span>- - basta um</span><span style="color:#e07a62">⊘ exclusivo</span>`;
  el.innerHTML = `<div class="focuslayout${UI.ffull ? " ffull" : ""}">
    <div class="fmain">
      <div class="fbar2">${status}<div class="fzoom" role="group" aria-label="Zoom da árvore"><button class="btn-sm" data-z="-" aria-label="Diminuir zoom">−</button><span id="fzLbl" aria-live="polite">${Math.round(z * 100)}%</span><button class="btn-sm" data-z="+" aria-label="Aumentar zoom">+</button><button class="btn-sm" data-z="fit">Ajustar</button><button class="btn-sm" id="fFull" aria-pressed="${UI.ffull ? "true" : "false"}">${UI.ffull ? "✕ Sair da tela cheia" : "⛶ Tela cheia"}</button></div></div>
      ${oppBar}
      <div class="fnavhint"><span class="dk">🖱 <b>Arraste</b> para mover</span><span class="dk"><kbd>Roda</kbd> rola · <kbd>Shift</kbd>+<kbd>Roda</kbd> lateral</span><span class="dk"><kbd>Ctrl</kbd>+<kbd>Roda</kbd> zoom</span><span class="mb">☝ Arraste com o dedo · pinça para zoom</span><span>Toque num foco para ver os detalhes</span></div>
      <div class="ftree-wrap" id="ftWrap" tabindex="0" role="region" aria-label="Árvore de decisões: arraste ou role para navegar"><div class="ftree-size" id="ftSize" style="width:${Gm.W * z}px;height:${Gm.H * z}px"><div class="ftree" id="ftTree" style="width:${Gm.W}px;height:${Gm.H}px;transform:scale(${z})">${focusSVG(T, Gm)}${nodes}</div></div></div>
      <div class="flegend">${legend}</div>
    </div>${detail}</div>`;
  const wrap = $("#ftWrap"), size = $("#ftSize"), tree = $("#ftTree"), lbl = $("#fzLbl");
  const fc = UI.fcenter && focusDef(G, UI.fcenter); UI.fcenter = null; // chip da faixa de oportunidades: centraliza o foco
  if (UI.fscroll && !fc) { wrap.scrollLeft = UI.fscroll[0]; wrap.scrollTop = UI.fscroll[1]; }
  else { const c = fc || act || focusDef(G, "t_balanco") || T.nodes[0]; wrap.scrollLeft = Math.max(0, Gm.X(c.x) * z - wrap.clientWidth * (fc && wrap.clientWidth > 700 ? 0.3 : 0.5)); wrap.scrollTop = Math.max(0, Gm.Y(c.y) * z - 40); }
  wrap.onscroll = () => { UI.fscroll = [wrap.scrollLeft, wrap.scrollTop]; };
  // zoom no lugar, mantendo o ponto (px, py) da janela fixo
  const setZoom = (nz, px, py) => {
    nz = Math.max(0.3, Math.min(1.6, Math.round(nz * 100) / 100)); if (nz === z) return;
    if (px === undefined){ px = wrap.clientWidth / 2; py = wrap.clientHeight / 2; }
    const cx = (wrap.scrollLeft + px) / z, cy = (wrap.scrollTop + py) / z;
    z = UI.fz = nz;
    size.style.width = Gm.W * z + "px"; size.style.height = Gm.H * z + "px"; tree.style.transform = `scale(${z})`; lbl.textContent = Math.round(z * 100) + "%";
    wrap.scrollLeft = cx * z - px; wrap.scrollTop = cy * z - py; UI.fscroll = [wrap.scrollLeft, wrap.scrollTop];
  };
  wrap.addEventListener("wheel", e => {
    if (e.ctrlKey || e.metaKey){ e.preventDefault(); const r = wrap.getBoundingClientRect(); setZoom(z * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top); }
  }, { passive: false });
  // arrastar para mover (mouse/caneta); no toque, o próprio navegador rola, e dois dedos fazem zoom
  let drag = null;
  wrap.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop, moved: false, id: e.pointerId };
  });
  wrap.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5){ drag.moved = true; wrap.classList.add("drag"); try{ wrap.setPointerCapture(e.pointerId); }catch(_){} }
    if (drag.moved){ wrap.scrollLeft = drag.sl - dx; wrap.scrollTop = drag.st - dy; }
  });
  const endDrag = () => { if (drag && drag.moved){ wrap.classList.remove("drag"); wrap.dataset.dragged = "1"; setTimeout(() => delete wrap.dataset.dragged, 0); } drag = null; };
  wrap.addEventListener("pointerup", endDrag); wrap.addEventListener("pointercancel", endDrag);
  let pinch = null;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  wrap.addEventListener("touchstart", e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), z }; }, { passive: true });
  wrap.addEventListener("touchmove", e => {
    if (pinch && e.touches.length === 2){ e.preventDefault(); const r = wrap.getBoundingClientRect(); setZoom(pinch.z * dist(e.touches) / pinch.d, (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top); }
  }, { passive: false });
  wrap.addEventListener("touchend", e => { if (e.touches.length < 2) pinch = null; });
  wrap.addEventListener("keydown", e => {
    if (e.target !== wrap) return;
    const st = 60, k = e.key;
    if (k === "ArrowLeft") wrap.scrollLeft -= st; else if (k === "ArrowRight") wrap.scrollLeft += st;
    else if (k === "ArrowUp") wrap.scrollTop -= st; else if (k === "ArrowDown") wrap.scrollTop += st;
    else if (k === "+" || k === "=") setZoom(z + 0.1); else if (k === "-") setZoom(z - 0.1); else return;
    e.preventDefault();
  });
  el.querySelectorAll("[data-fid]").forEach(b => b.onclick = () => { if (wrap.dataset.dragged) return; UI.selFocus = b.dataset.fid; if (b.classList.contains("fchip")) UI.fcenter = b.dataset.fid; tabDecisoes(el); });
  el.querySelectorAll("[data-z]").forEach(b => b.onclick = () => {
    const k = b.dataset.z;
    if (k === "fit"){ setZoom(Math.max(0.3, Math.min(1.2, (wrap.clientWidth - 4) / Gm.W))); wrap.scrollLeft = 0; }
    else setZoom(z + (k === "+" ? 0.1 : -0.1));
  });
  $("#fFull").onclick = () => { UI.ffull = !UI.ffull; UI.fscroll = [wrap.scrollLeft, wrap.scrollTop]; document.body.classList.toggle("noscroll", !!UI.ffull); tabDecisoes(el); };
  if (UI.ffull && !tabDecisoes._esc){ tabDecisoes._esc = e => { if (e.key === "Escape" && UI.ffull && UI.tab === "decisoes" && !coachBusy()){ UI.ffull = false; document.body.classList.remove("noscroll"); document.removeEventListener("keydown", tabDecisoes._esc); tabDecisoes._esc = null; const b = $("#tabBody"); if (b) tabDecisoes(b); } }; document.addEventListener("keydown", tabDecisoes._esc); }
  if ($("#fClose")) $("#fClose").onclick = () => { UI.selFocus = null; tabDecisoes(el); };
  if ($("#fStart")) $("#fStart").onclick = () => afterAct(startFocus(G, sel.id));
  if ($("#fCancel")) $("#fCancel").onclick = () => { if (confirm(trText(focusCancelPrompt(G)))) afterAct(cancelFocus(G)); };
}
