// js/ui/aba-faccoes.js — Interface: aba Facções.
// Cada cartão diz, em linhas curtas, o que a facção faz em cada nível de lealdade (a linha atual fica destacada).
// As regras gerais ficam num "?" discreto no topo (sem quadro fixo poluindo a tela).
function facLevel(L, cr){ return L >= 65 ? "leal" : L >= 35 ? "neutra" : L >= (cr || 15) ? "insat" : "crise"; }
// linhas por nível: [nível, rótulo, texto]
function facRows(F, f){
  const C = SCEN.campaign, M = esc(C.money.short), up = [], down = [];
  // cada pedaço num <span> próprio (o tradutor troca um por um)
  const st = (o, sg, lim) => Object.entries(o).map(([k, v]) => `<span>${esc(STORY.stats[k] ? STORY.stats[k].label : k)}</span> <span>${sg > 0 ? "+" : "−"}${Math.abs(v)}/mês (${lim})</span>`);
  if (F.boost){ up.push(...st(F.boost, 1, "≥70")); down.push(...st(F.boost, -1, "≤25")); }
  if (F.boostMoney){ up.push(`<span>+${F.boostMoney} ${M}/mês</span>`); down.push(`<span>−${F.boostMoney} ${M}/mês (≤25)</span>`); }
  if (C.nationalFac === F.id){ up.push("<span>+1 ordem por mês</span>"); down.push("<span>−1 ordem por mês (&lt;25)</span>"); }
  const cr = (C.events || []).filter(e => e.crisisOf === F.id).map(e => e.title).filter((t, i, a) => a.indexOf(t) === i);
  return [
    ["leal", "Leal", up.length ? up.join(" · ") : "<span>nenhum bônus</span>"],
    ["neutra", "Neutra", "<span>sem efeito</span>"],
    ["insat", "Insatisfeita", down.length ? down.join(" · ") : "<span>sem efeito</span>"],
    ["crise", "Em crise", f.influence >= 25 ? `<span>crise a qualquer momento</span>${cr.length ? ": " + cr.map(t => `<span>${esc(t)}</span>`).join(" / ") : ""}` : "<span>fraca demais para reagir (influência &lt; 25)</span>"]
  ];
}
function facLinks(F){
  if (!F.links) return "";
  const up = [], down = []; for (const [k, v] of Object.entries(F.links)) (v > 0 ? up : down).push(STORY.stats[k] ? STORY.stats[k].label : k);
  const L = (sym, a, tip) => a.length ? `<span class="fl" title="${tip}">${sym} ${a.map(x => `<span>${esc(x)}</span>`).join(", ")}</span>` : "";
  return [L("▲", up, "Sobe a lealdade"), L("▼", down, "Derruba a lealdade")].filter(Boolean).join(" ");
}
function facCostTxt(F, kind){ const c = facCost(G, F, kind), M = SCEN.campaign.money.short; return [c.ap ? `${c.ap} AP` : "", c.money ? `${c.money} ${M}` : ""].filter(Boolean).join(" · "); }
function tabFaccoes(el){
  const C = SCEN.campaign, busy = G.queue.length > 0, F0 = C.factions[0];
  const cards = C.factions.map(F => {
    const f = G.fac[F.id], stt = facStatus(f, F), cr = facCrise(F), cls = { "Leal": "good", "Neutra": "", "Insatisfeita": "mid", "Em crise": "bad" }[stt], lv = facLevel(f.loyalty, cr);
    const used1 = G.used["fac_agradar_" + F.id], used2 = G.used["fac_pressionar_" + F.id];
    const c1 = facCost(G, F, "agradar"), c2 = facCost(G, F, "pressionar");
    const bad1 = used1 || busy || G.ap < c1.ap || G.money < c1.money, bad2 = used2 || busy || G.ap < c2.ap || G.money < c2.money;
    const rv = (F.rivals || []).map(r => (C.factions.find(x => x.id === r) || {}).short || r);
    const why1 = used1 ? "já feito neste turno" : busy ? "evento pendente" : G.ap < c1.ap ? "sem AP" : G.money < c1.money ? `faltam ${esc(C.money.short)}` : `lealdade +14${rv.length ? `, ${esc(rv.join(", "))} −5` : ""}`;
    const why2 = used2 ? "já feito neste turno" : busy ? "evento pendente" : G.ap < c2.ap ? "sem AP" : G.money < c2.money ? `faltam ${esc(C.money.short)}` : "influência −10, lealdade −12";
    const rows = facRows(F, f).map(([k, l, t]) => `<div class="frow lv-${k}${k === lv ? " cur" : ""}"><em>${l}</em><div>${t}</div></div>`).join("");
    const extra = [C.nationalFac === F.id ? `<span>${esc(`Moral máxima das tropas: ${maxOrg(G, "player")}`)}</span>` : "", facLinks(F)].filter(Boolean).join(" ");
    return `<div class="fac ${cls}"><div class="fh"><strong>${esc(F.name)}</strong><em class="chip ${cls}">${stt}</em></div>${(fp => fp ? `<div class="fwho">${portraitImg(fp, 36)}<span>Porta-voz: <b>${esc(fp.nome)}</b></span></div>` : "")(portraitOf("faccoes", F.id))}<p>${esc(F.desc)}</p>
      <div class="fbar"><span>Lealdade</span><div class="bar" title="Linhas: ${cr} crise · 35 neutra · 65 leal"><i style="width:${f.loyalty}%;background:${f.loyalty < cr ? "#c2563f" : f.loyalty < 35 ? "#d0902a" : "#6fae6a"}"></i><u style="left:${cr}%"></u><u class="t35" style="left:35%"></u><u class="t65" style="left:65%"></u></div><b>${Math.round(f.loyalty)}</b></div>
      <div class="fbar"><span>Influência</span><div class="bar"><i style="width:${f.influence}%;background:#7d8fb3"></i></div><b>${Math.round(f.influence)}</b></div>
      <div class="frows">${rows}</div>${extra ? `<div class="flinks">${extra}</div>` : ""}
      <div class="fbtns"><button class="secondary sm" data-f="${F.id}" data-k="agradar" ${bad1 ? "disabled" : ""}>Agradar (${esc(facCostTxt(F, "agradar"))})<small>${why1}</small></button>
      <button class="secondary sm" data-f="${F.id}" data-k="pressionar" ${bad2 ? "disabled" : ""}>Enfraquecer (${esc(facCostTxt(F, "pressionar"))})<small>${why2}</small></button></div></div>`;
  }).join("");
  const help = `<details class="fhelp"><summary aria-label="Como funcionam as facções" title="Como funcionam as facções">?</summary><div class="fhpop"><ul>
      <li><b>Lealdade</b> — <span>Leal ≥ 65 · Neutra 35–64 · Insatisfeita até o limite de crise · Em crise abaixo dele (15; nas facções que começam leais, 25 ou 30 — veja a marca na barra).</span> <span>A linha destacada (▸) em cada cartão é o efeito de agora.</span></li>
      <li><b>Crise</b> — <span>lealdade abaixo do limite da facção (15; 25 para militares e agro; 30 para evangélicos) com influência 25 ou mais; no máximo uma a cada 4 meses.</span></li>
      <li><b>Agradar</b> <span>(${esc(facCostTxt(F0, "agradar"))})</span> — <span>lealdade +14, rivais −5.</span></li>
      <li><b>Enfraquecer</b> <span>(${esc(facCostTxt(F0, "pressionar"))})</span> — <span>influência −10, lealdade −12.</span></li>
      <li>${C.facMoney ? `<span>Pagos só com Recursos, sem gastar ações.</span> ` : ""}<span>Cada botão uma vez por facção, por turno.</span></li>
      <li><b>▲ / ▼</b> — <span>atributos que aumentam ou reduzem a lealdade.</span> <span>Todo mês ela volta um pouco ao ponto de partida.</span></li></ul></div></details>`;
  const top = `<div class="fachead"><span>Facções</span>${help}${busy ? `<a href="#" class="fbusy" data-go="historia">⚠ Resolva os eventos pendentes na História para agradar ou enfraquecer facções.</a>` : ""}</div>`;
  el.innerHTML = `${top}<div class="facgrid">${cards}</div>`;
  el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => afterAct(factionAction(G, b.dataset.f, b.dataset.k)));
  const go = el.querySelector(".fbusy"); if (go) go.onclick = e => { e.preventDefault(); UI.tab = "historia"; renderGame(); };
}
