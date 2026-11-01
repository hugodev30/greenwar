// js/ui/tutorial.js — Interface: tutorial em dicas curtas (coach marks), por aba/função.
/* =====================================================================
   DICAS CONTEXTUAIS (tutorial em pop-ups curtos, um por aba/função)
   Progresso em localStorage (gw_tut_v3): { off: bool, seen: { contexto: true } }
   ===================================================================== */
const TUT_KEY = "gw_tut_v3";
function tutState(){ let s = null; try{ s = JSON.parse(localStorage.getItem(TUT_KEY)); }catch(e){} return s && typeof s === "object" ? Object.assign({ off: false, seen: {} }, s, { seen: Object.assign({}, s.seen) }) : { off: false, seen: {} }; }
function tutSave(s){ try{ localStorage.setItem(TUT_KEY, JSON.stringify(s)); }catch(e){} }
function tutMark(ctx){ const s = tutState(); s.seen[ctx] = true; tutSave(s); }
function tutSkipAll(){ const s = tutState(); s.off = true; tutSave(s); coachClose(); toast("Tutorial desativado. Para ver de novo: ? Ajuda → Refazer tutorial.", "mid"); }
function tutReset(){ tutSave({ off: false, seen: {} }); }
// Cada contexto: lista de passos { sel (alvo destacado; opcional), t (título), h (HTML do texto), when (opcional) }
function tutSteps(ctx){
  const C = SCEN.campaign, M = C.money.label, ph = G ? phaseOf(G) : {};
  const S = {
    hud: [
      { t: "Bem-vindo ao comando", h: `<p>Estas dicas aparecem <b>uma vez</b>, na primeira vez que você abre cada aba ou função. São curtas — leia e clique em <b>Próximo</b>.</p><p>Não quer ajuda? <b>Pular tutorial</b> desliga todas. Dá para refazer depois em <b>? Ajuda</b>.</p>` },
      { sel: ".hud-date", t: "Data, turno e fase", h: `<p>Cada turno vale <b>um mês</b> (em fases calmas, até 3 meses).</p><p>A <b>fase</b> (ex.: “${esc(ph.label || "")}”) define as regras do momento: se há guerra, se você comanda tropas e quanto recebe por mês.</p>` },
      { sel: ".dbadge", t: "Dificuldade", h: `<p>Este selo mostra a dificuldade escolhida ao começar (Fácil, Normal ou Difícil). Ela não muda no meio da campanha.</p><p>No Fácil, a interface é simples: os exércitos agem sozinhos e Diplomacia e Facções ficam no botão “Mais”. Dá para mudar isso em Configurações.</p>` },
      { sel: ".advisor", t: "Sua conselheira", h: `<p>Marta Siqueira, sua chefe de gabinete, sugere 1 ou 2 coisas por mês. O botão “Fazer isso” faz a sugestão por você.</p><p>Não precisa seguir: o × esconde as dicas até o próximo mês, e em Configurações dá para desligar.</p><p>Se você seguir pelo caminho do golpe, ela vira sua estrategista: o quadro <b>Prontidão do golpe</b> mostra o que falta, a melhor hora de agir e os riscos. Se aceitar o resultado, ela volta às dicas normais.</p>` },
      { sel: ".hud-res > div:first-child", t: "Ações (AP)", h: `<p>Os <b>pontos de ação</b> são o seu tempo e a sua atenção neste turno. Quase tudo custa <b>1 AP</b>: ações e propostas diplomáticas${C.facMoney ? " (facções são pagas só com " + esc(M) + ")" : ", agradar ou enfraquecer facções"}.</p>${C.apScale ? `<p><b>Quantas você tem:</b> 3 de base; com <b>Apoio Popular 60+</b> são 4, e com <b>75+</b> são 5. Também dá para <b>comprar +1</b> com ${esc(M)} uma vez por turno. Clique aqui para ver de onde vem cada uma.</p>` : ""}<p><b>Decisões nacionais</b> (focos) não gastam AP.</p><p>Os AP <b>recarregam</b> ao encerrar o mês e <b>não acumulam</b> — use-os.</p>` },
      { sel: ".hud-res > div:nth-child(2)", t: M, h: `<p>Capital político: verbas, cargos e favores. Paga investimentos, agrados a facções, missões e tropas.</p><p>O número pequeno (<b>+N/mês</b>) é a renda líquida: território, economia e facções leais, menos manutenção de tropas e sanções.</p>${Number.isFinite(moneyCap(G)) ? `<p><b>Teto de ${moneyCap(G)}:</b> o que passar disso ao encerrar o turno se perde — gaste em facções, no mapa ou converta em ações.</p>` : ""}<p><b>Abaixo de zero</b>, você perde apoio todo mês. Clique aqui para ver renda e usos.</p>` },
      { sel: ".hudarmy", t: C.forces.label, h: G && frontMode(G) ? `<p>Total das suas tropas, quantos exércitos você tem e quantos já têm ordem. Clique para abrir o mapa militar.</p><p>Em algumas fases (por exemplo, fora do governo) você <b>não comanda tropas</b>.</p>` : `<p>Soma da força dos seus exércitos. Clique para abrir o mapa militar.</p><p>Em algumas fases (por exemplo, fora do governo) você <b>não comanda tropas</b>.</p>` },
      { sel: ".stats", t: "Os quatro pilares", h: `<ul>${Object.entries(STORY.stats).map(([k, s]) => `<li><b>${esc(s.label)}</b>: ${esc(STAT_HELP[k] || "")}</li>`).join("")}</ul><p>Vão de 0 a 100. <b>Se algum chegar a zero, a campanha acaba.</b> Eles também liberam ou bloqueiam escolhas da história.</p>` },
      { sel: "#btnEnd", t: "Encerrar mês", h: `<p>Quando terminar de agir, clique aqui. O mês passa: renda, combates, agitação nos estados, humor das facções e reação de outros países.</p><p>No começo da campanha cada turno é uma quinzena (15 dias): mais decisões antes da posse. Depois, cada turno vira um mês.</p><p>Fica bloqueado enquanto houver evento esperando decisão.</p>` },
      { sel: ".tabs", t: "As abas", h: `<p><b>História</b>: eventos e decisões. <b>Decisões</b>: focos nacionais de longo prazo. <b>Mapa</b>: estados, agitação e exércitos. <b>Diplomacia</b>, <b>Facções</b> e <b>Ações</b>.</p><p>Cada aba tem uma dica curta na primeira visita.</p>` }
    ],
    historia: [
      { sel: ".card.story, .card.event, .card.quiet", t: "História e eventos", h: `<p>Aqui chegam os <b>eventos-chave</b> da trama (em datas certas) e os <b>eventos</b> e <b>crises</b> do mês.</p><p>Cada opção mostra os efeitos embaixo. Opções cinza exigem atributos ou decisões anteriores.</p><p>O rosto no cartão mostra quem está falando com você. São personagens inventados; pessoas reais e instituições aparecem só como ícone ou silhueta.</p>` },
      { sel: ".card.report", t: "Relatório do mês", h: `<p>Tudo o que aconteceu ao encerrar o mês: renda, agitação, facções, diplomacia e batalhas (toque numa batalha para ver o porquê do resultado).</p>` },
      { t: "Como a campanha termina", h: `<p>Cada campanha acaba num dos finais da história: vitória, intermediário ou derrota.</p><p>Na tela de final você recebe uma <b>nota de S a C</b>, um resumo da sua história e <b>conquistas</b>.</p><p>O botão <b>Tentar outro final</b> dá dicas de como chegar aos finais que você ainda não viu.</p>` }
    ],
    mapa: [
      { sel: ".layerbar", t: "Camadas do mapa", h: `<p>O mapa tem <b>duas camadas</b>:</p><ul><li><b>Controle</b>: quem manda em cada estado.</li><li><b>Agitação</b>: o risco de protestos e revoltas em cada estado.</li></ul><p>O botão <b>ⓘ</b> explica a agitação em detalhes.</p>` },
      { sel: "#mapMain", t: "Estados", h: `<p>Passe o mouse (ou toque) para ver controle e agitação. Clique num estado para abrir o painel ao lado: <b>investir</b>, <b>propaganda</b> ou <b>acordo com o governador</b>.</p>` },
      { sel: ".sidepanel", t: "Painel lateral", h: `<p>Mostra o estado ou exército selecionado. Sem seleção, mostra o resumo do país e as frentes de combate.</p>` }
    ],
    exercitos2: [
      { sel: ".simplebox", t: G && frontMode(G) ? "Exércitos no automático" : "Exércitos no automático", h: G && frontMode(G) ? `<p>No modo simples, o comando automático move e ataca com seus exércitos todo mês. Você só precisa recrutar quando quiser mais tropas.</p><p>Quer dar as ordens? Toque num exército no mapa ou no botão “Toque num exército”.</p>` : `<p>No modo simples, seus exércitos agem sozinhos todo mês: atacam onde a chance é boa e defendem o resto. Você só precisa recrutar quando quiser mais tropas.</p><p>Quer controlar cada exército? Clique em “Comandar manualmente”.</p>` },
      { sel: ".myarmies .acard", t: "Meus exércitos", h: `<p>Cada cartão é um exército seu: <b>onde está</b>, a <b>força</b> e a <b>ordem</b> deste mês. Laranja = <b>sem ordem</b> (vai ficar parado).</p><p>No mapa, ele é a <b>ficha azul</b> com o mesmo número.</p>` },
      { sel: ".myarmies .abtns", t: "Uma ordem, um clique", h: `<ul><li><b>⚔ Atacar</b>: já sugere o alvo com a melhor chance e mostra a previsão. Clique de novo (ou ✔) para confirmar.</li><li><b>➜ Mover</b>: destaca no mapa só os destinos possíveis.</li><li><b>🛡 Defender</b> e <b>＋ Reforçar</b>: valem na hora.</li></ul><p>Errou? <b>↶ Desfazer ordem</b>.</p>` },
      { sel: ".ordsum", t: "Manobras restantes", h: `<p>Atacar e mover gastam <b>manobras</b> — o número grande mostra quantas sobram neste mês (depende do Apoio Militar e da lealdade das Forças). Defender e reforçar são livres.</p><p>Ordens <b>não gastam AP</b> e acontecem ao <b>encerrar o mês</b>.</p>` },
      { sel: ".autobox", t: "Ordens automáticas", h: `<p>Sem tempo para microgerenciar? <b>🛡 Defender fronteiras</b> leva quem está na retaguarda para a frente e põe o resto em defesa. <b>🤖 Ordens automáticas</b> também ataca onde a chance é boa.</p><p>No seletor, deixe isso acontecer <b>todo mês</b> com quem ficou sem ordem.</p>` },
      { sel: "#btnRecruit", t: "Recrutar", h: `<p>Cria um novo exército por alguns ${esc(C.money.short)}, sem AP (até 2 por mês). Exércitos fracos em descanso no seu território também se reforçam sozinhos.</p>` }
    ],
    frentes: [
      { sel: ".tphud, .tpsteps", t: "Como jogar a guerra", h: `<p>Seus exércitos são as fichas azuis no mapa; o número é a força. As fichas vermelhas são do inimigo. Cada exército é separado: vários no mesmo estado viram uma pilha (×2, ×3) — toque de novo para passar ao próximo.</p><ol><li>Escolha um exército (no mapa, na lista ou com ⏭).</li><li>Toque no destino: os estados destacados mostram a chance (⚔ ataque) ou ➜ (movimento); o caminho aparece tracejado.</li><li>Confirme. A ordem fica no mapa e na barra de ordens; o ✕ cancela.</li><li>Encerre o mês: as batalhas acontecem no fim do mês.</li></ol><p>As ordens não gastam AP. Tome Recife e a resistência se rende. Se Brasília cair, você perde.</p>` },
      { sel: ".tpnext", t: "Próximo exército", h: `<p>⏭ pula para o próximo exército sem ordem e aproxima o mapa nele. O número mostra quantos ainda estão parados.</p>` },
      { sel: ".tppend", t: "Ordens dadas", h: `<p>Cada ordem deste mês aparece aqui e como seta no mapa, com a chance do ataque. Toque para ver o exército; ✕ cancela a ordem.</p>` },
      { sel: ".tpapanel, .tplist", t: "Seus exércitos", h: `<p>Cada linha é um exército, com nome, general, força, moral e experiência (★). Use a busca para achar um exército e toque para selecionar.</p><p><span>Exércitos no mesmo estado ficam lado a lado no mapa e não se juntam sozinhos.</span></p><p><b>👥 Neste estado</b>: <span>marque 2 ou 3 exércitos e toque em Unificar (só do mesmo estado).</span> <b>✂ Dividir em dois</b>: <span>precisa de força 50 ou mais.</span> <span>✎ renomeia; máximo de 3 exércitos por estado.</span></p><p>No cartão do exército: <b>⚔ Atacar</b> vem primeiro, com a chance; os movimentos ficam em <b>➜ Mover</b>. <b>🛡 Defender</b> é a ordem padrão: o exército fica e se entrincheira (+20%).</p>` },
      { sel: ".tptally", t: "Recife, ímpeto e cerco", h: `<p>🎯 Quantos estados faltam até Recife pelo caminho mais curto.</p><p>⚡ <b>Ímpeto</b>: vitórias seguidas dão até +21% de força; derrotas tiram.</p><p>⛓ <b>Cerco</b>: um exército sem ligação por terra com a capital dele perde força todo mês e se rende.</p>` },
      { sel: ".tpthreat, .ordhead", t: "O plano do inimigo", h: `<p>Você vê os ataques que o inimigo prepara (setas vermelhas no mapa) e a chance dele.</p><p>Deixe um exército no estado ameaçado ou mande reforço.</p>` },
      { sel: ".recruit", t: "Recrutar", h: `<p>Escolha o estado e recrute, sem gastar AP (até 2 vezes por mês).</p><p>Escolha entre formar um exército novo (se ainda houver lugar no estado) ou reforçar um exército que já está lá.</p><p><b>Atalho:</b> toque num estado seu no mapa e use <b>＋ Recrutar aqui</b>.</p><p>Atenção ao soldo: se os ${esc(C.money.short)} ficarem muito negativos por meses seguidos, as tropas se amotinam.</p>` },
      { sel: ".fauto", t: "Comando automático", h: `<p>Automático: quem está sem ordem ataca onde a chance é boa e o resto vai para a linha.</p><p>Só defender: ninguém ataca. As suas ordens sempre têm prioridade.</p>` }
    ],
    sul: [
      { sel: "#btnSouth", t: "Tensão no Sul", h: `<p>Mede o quanto RS, SC e PR (a <b>Liga do Sul</b>) estão perto de se rebelar. Em <b>100</b>, eles rompem com você; a partir de <b>70</b> aparece um alerta com quantos meses faltam.</p><p><b>Dá para evitar:</b> ações da categoria <b>Sul</b>, investir ou negociar nesses estados e, com a tensão baixa, o <b>Pacto Federativo</b>, que torna o Sul seu aliado.</p><p>Clique na barra para ver o que sobe, o que baixa e agir.</p>` }
    ],
    decisoes: [
      { sel: "#ftWrap", t: "Árvore de decisões nacionais", h: `<p>Cada caixa é um <b>foco</b>: um projeto de alguns meses. Escolha <b>um por vez</b> — não gasta ações políticas; ele avança a cada mês e, ao concluir, aplica efeitos e libera ações, eventos e opções.</p><p><b>Navegação:</b> arraste para mover, use a roda do mouse ou o trackpad para rolar e <b>Ctrl + roda</b> (ou pinça no celular) para o zoom.</p>` },
      { sel: ".flegend", t: "Como ler a árvore", h: `<p>Linhas sólidas: pré-requisito. Tracejadas: basta um. <b>⊘ vermelho</b>: caminhos exclusivos — escolher um fecha o outro. Decisões da história também abrem e fecham ramos.</p>` },
      { sel: ".fopps", t: "Oportunidades e focos novos", h: `<p><b>⚡ Oportunidades</b> aparecem conforme a situação (apoio alto, caixa vazio, guerra longa…) e <b>somem em poucos meses</b>. Ficam na coluna laranja e nesta faixa, com a contagem regressiva.</p><p>Quando um foco novo fica disponível, ele ganha a etiqueta <b>NOVO</b> e a aba mostra <b>✨</b>.</p>` },
      { sel: ".fzoom", t: "Zoom e tela cheia", h: `<p>Use <b>−/+</b>, <b>Ajustar</b> (cabe na largura) e <b>Tela cheia</b> para ver a árvore inteira.</p>` }
    ],
    faccoes: [
      { sel: ".fhelp", t: "Facções", h: `<p>Grupos internos com <b>lealdade</b> (o quanto estão do seu lado) e <b>influência</b> (o quanto pesam).</p><p>Toque no <b>?</b> para ver as regras gerais e o efeito de <b>Agradar</b> e <b>Enfraquecer</b>.</p>` },
      { sel: ".fac", t: "Cada facção", h: `<p>Cada cartão mostra o que a facção faz em cada nível de lealdade; a linha <b>destacada (▸)</b> é o efeito de agora. Embaixo de cada botão aparece o resultado (ou por que está bloqueado).</p><p><b>Perigo:</b> lealdade abaixo de 15 com influência 25 ou mais provoca uma <b>crise</b>.</p>` }
    ],
    diplomacia: [
      { sel: ".actors", t: "Diplomacia", h: `<p>Governos e organismos, com a <b>opinião</b> que têm de você (−100 a +100). Escolha um para negociar.</p>` },
      { sel: ".dealpanel", t: "Acordos", h: `<p>Marque o que você <b>pede</b> e o que <b>oferece</b>; a <b>previsão</b> mostra a chance antes de propor (1 AP). A <b>missão diplomática</b> melhora a opinião.</p><p>Acordos têm custo: dívidas, dependência e reação de rivais e facções.</p>` }
    ],
    acoes: [
      { sel: ".actgrid", t: "Ações", h: `<p>Ações do governo separadas por área, em abas (após o golpe, também Sul). Cada cartão mostra o custo em AP e ${esc(M)}, os efeitos (verde ajuda, vermelho atrapalha) e o risco. Cada ação pode ser usada uma vez por turno.</p><p>A ⭐ marca a sugestão da Marta. Ações apagadas mostram 🔒 o motivo.</p>` }
    ]
  };
  return S[ctx] || [];
}
const STAT_HELP = {
  apoio: "opinião pública. Alto acalma os estados e, em 2022, dá mais ações por turno (60+ → 4, 75+ → 5); baixo alimenta protestos e revoltas.",
  militar: "o quanto os quartéis seguem você. Define a moral e o limite de ordens das tropas.",
  base: "partidos e Congresso. Dá governabilidade e abre opções políticas.",
  internacional: "imagem no exterior. Baixa traz sanções e isolamento.",
  economia: "saúde econômica. Gera renda e acalma os estados.",
  legitimidade: "o quanto o país e o mundo aceitam você como governo legítimo."
};
let coachEl = null, coachPoll = null;
function coachClose(){ if (coachEl){ coachEl.remove(); coachEl = null; window.removeEventListener("resize", coachEl_pos); document.removeEventListener("keydown", coachKey, true); } }
let coachEl_pos = () => {}, coachKey = () => {};
function coachBusy(){ return !!document.querySelector(".overlay, .major, .modal, .coach"); }
function tutContexts(){
  if (!G || G.ended) return [];
  const list = ["hud", UI.tab];
  if (UI.tab === "mapa" && frontMode(G) && phaseOf(G).war && G.war.fronts.length) list.push(G.simple && !UI.manual ? "exercitos2" : "frentes");
  else if (UI.tab === "mapa" && !phaseOf(G).noArmies && armiesOf(G, "player").length) list.push("exercitos2");
  if (southOn(G) && G.south.state !== "aliado" && G.south.state !== "esmagada") list.push("sul");
  return list;
}
function tutAfterRender(){
  clearTimeout(coachPoll);
  const s = tutState(); if (s.off || !G) return;
  const ctx = tutContexts().find(c => !s.seen[c] && tutSteps(c).some(st => !st.sel || document.querySelector(st.sel)));
  if (!ctx) return;
  if (coachBusy()){ if (!document.querySelector(".coach")) coachPoll = setTimeout(tutAfterRender, 700); return; }
  coachRun(ctx);
}
function coachRun(ctx){
  coachClose();
  const steps = tutSteps(ctx).filter(st => !st.sel || document.querySelector(st.sel));
  if (!steps.length){ tutMark(ctx); return; }
  let i = 0;
  const el = document.createElement("div"); el.className = "coach"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "coachT");
  el.innerHTML = `<div class="cblock"></div><div class="cring"></div><div class="cbub" aria-live="polite"></div>`;
  document.body.appendChild(el); coachEl = el;
  const ring = el.querySelector(".cring"), bub = el.querySelector(".cbub");
  const done = () => { tutMark(ctx); coachClose(); setTimeout(tutAfterRender, 250); };
  const pos = () => {
    const st = steps[i], t = st.sel && document.querySelector(st.sel);
    const vw = window.innerWidth, vh = window.innerHeight, bw = Math.min(360, vw - 20);
    if (!t){ ring.className = "cring none"; ring.removeAttribute("style"); bub.style.left = (vw - bw) / 2 + "px"; bub.style.top = Math.max(10, vh * 0.25) + "px"; return; }
    const r = t.getBoundingClientRect(), pad = 6;
    const R = { l: Math.max(4, r.left - pad), t: Math.max(4, r.top - pad), r: Math.min(vw - 4, r.right + pad), b: Math.min(vh - 4, r.bottom + pad) };
    ring.className = "cring"; Object.assign(ring.style, { left: R.l + "px", top: R.t + "px", width: (R.r - R.l) + "px", height: (R.b - R.t) + "px" });
    const bh = bub.offsetHeight || 200;
    let top = R.b + 12; if (top + bh > vh - 8) top = R.t - bh - 12; if (top < 8) top = Math.max(8, Math.min(vh - bh - 8, R.t + 12));
    let left = Math.min(Math.max(10, R.l), vw - bw - 10);
    bub.style.left = left + "px"; bub.style.top = top + "px";
  };
  const show = () => {
    const st = steps[i], t = st.sel && document.querySelector(st.sel);
    if (t){ const r = t.getBoundingClientRect(); if (r.top < 60 || r.bottom > window.innerHeight - 60) t.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? "start" : "center" }); }
    bub.innerHTML = `<div class="ck">Dica ${steps.length > 1 ? `${i + 1} de ${steps.length}` : ""}</div><h4 id="coachT">${esc(st.t)}</h4>${st.h}
      <div class="cbtns"><button class="cskip" data-c="skip" title="Desliga todas as dicas (pode refazer em ? Ajuda)">Pular tutorial</button><div class="r">${i > 0 ? `<button class="secondary cprev" data-c="prev">◂</button>` : ""}<button class="primary cnext" data-c="next">${i < steps.length - 1 ? `Próximo (${i + 1}/${steps.length})` : "Entendi"}</button></div></div>`;
    bub.querySelector("[data-c=next]").onclick = () => { if (i < steps.length - 1){ i++; show(); } else done(); };
    bub.querySelector("[data-c=skip]").onclick = tutSkipAll;
    if (bub.querySelector("[data-c=prev]")) bub.querySelector("[data-c=prev]").onclick = () => { i--; show(); };
    requestAnimationFrame(() => { pos(); const x = bub.querySelector("[data-c=next]"); if (x) x.focus({ preventScroll: true }); });
  };
  coachEl_pos = pos; coachKey = e => { if (!coachEl) return; if (e.key === "Escape"){ e.preventDefault(); done(); } else if (e.key === "ArrowRight"){ e.preventDefault(); bub.querySelector("[data-c=next]").click(); } else if (e.key === "ArrowLeft" && i > 0){ e.preventDefault(); i--; show(); } };
  window.addEventListener("resize", pos); document.addEventListener("keydown", coachKey, true);
  el.querySelector(".cblock").onclick = () => bub.querySelector("[data-c=next]").focus();
  show();
}
