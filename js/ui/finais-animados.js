// js/ui/finais-animados.js — Interface: cena animada de cada final (fase 16), antes da tela do final.
// Tudo em SVG + CSS (css/finais-animados.css), sem imagens: Recife caiu, Brasília caiu, motim por falta de soldo, A Virada nas Urnas,
// Inelegível, De Volta pelas Urnas, O Brasil Partido e os outros finais. Pulável (botão, toque, Esc/Enter), some sozinha depois de
// alguns segundos e, com "reduzir animações" (ou prefers-reduced-motion), mostra só o quadro final, parado.
/* A cena sai de g.ended.cause (por que acabou: "df", "recife", "motim", "militares", "estados", "territorio", "urnas", "cassado")
   ou, sem cause, do próprio final (g.ended.node). g.ended.anim marca que a cena já passou (não repete ao reabrir o save);
   na tela do final, "🎬 Rever cena" mostra de novo. */
const FA_W = 400, FA_H = 240;
// pedaços de cenário reaproveitados
const FA_PART = {
  sky: (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${FA_W}" height="${FA_H}" fill="url(#${id})"/>`,
  ground: c => `<rect y="200" width="${FA_W}" height="40" fill="${c}"/>`,
  // Congresso Nacional: duas torres, a cúpula e a "tigela"
  congresso: c => `<g fill="${c}"><rect x="186" y="96" width="12" height="104"/><rect x="202" y="96" width="12" height="104"/><rect x="120" y="176" width="160" height="24"/>
    <path d="M140,176a24,13 0 0 1 48,0z"/><path d="M212,166h48a24,12 0 0 1-48,0z"/></g>`,
  // Planalto: prédio baixo com colunas
  planalto: c => `<g fill="${c}"><rect x="110" y="164" width="180" height="10"/><rect x="118" y="174" width="164" height="22"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${122 + i * 20},196q6,-14 12,0z"/>`).join("")}<rect x="100" y="196" width="200" height="4"/></g>`,
  // Recife: prédios, a ponte e o rio
  recife: c => `<g fill="${c}"><rect x="40" y="150" width="26" height="50"/><rect x="70" y="128" width="20" height="72"/><rect x="94" y="160" width="30" height="40"/><rect x="268" y="138" width="22" height="62"/><rect x="294" y="116" width="26" height="84"/><rect x="324" y="156" width="34" height="44"/>
    <path d="M130,200q70,-60 140,0h-10q-60,-48 -120,0z"/></g><path class="fa-wave" d="M0,214q20,-6 40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0" stroke="#7fb7e0" stroke-width="2" fill="none" opacity=".6"/>`,
  flag: (x, y, col, cls) => `<g class="${cls || "fa-flag"}" style="--fx:${x}px"><rect x="${x}" y="${y}" width="2.5" height="${200 - y}" fill="#ddd"/><g class="fa-flagup"><path d="M${x + 2.5},${y}h34l-6,9 6,9h-34z" fill="${col}" stroke="#0006"/></g></g>`,
  bursts: (pts, cols) => pts.map(([x, y], i) => `<g transform="translate(${x},${y})"><g class="fa-burst" style="animation-delay:${1.1 + i * 0.45}s">${Array.from({ length: 10 }, (_, k) => { const a = k * Math.PI / 5; return `<line x1="0" y1="0" x2="${(Math.cos(a) * 16).toFixed(1)}" y2="${(Math.sin(a) * 16).toFixed(1)}" stroke="${cols[(i + k) % cols.length]}" stroke-width="2.2" stroke-linecap="round"/>`; }).join("")}</g></g>`).join(""),
  confetti: cols => Array.from({ length: 26 }, (_, i) => `<rect class="fa-conf" style="animation-delay:${(i % 9) * 0.18}s;--cx:${(i * 37) % 30 - 15}px" x="${(i * 53) % FA_W}" y="-8" width="5" height="8" fill="${cols[i % cols.length]}"/>`).join(""),
  smoke: (x, n) => Array.from({ length: n }, (_, i) => `<circle class="fa-smoke" style="animation-delay:${i * 0.5}s" cx="${x + (i % 3) * 8}" cy="150" r="${8 + i * 2}" fill="#5a5552"/>`).join(""),
  person: (x, c, s) => `<g fill="${c}" transform="translate(${x},0) scale(${s || 1})"><circle cx="0" cy="150" r="9"/><path d="M-12,200v-30q0,-10 12,-10t12,10v30z"/></g>`,
  tank: c => `<g class="fa-tank" fill="${c}"><rect x="0" y="180" width="70" height="14" rx="6"/><rect x="12" y="168" width="38" height="14" rx="4"/><rect x="48" y="172" width="38" height="4"/>${[8, 22, 36, 50, 62].map(x => `<circle cx="${x}" cy="194" r="5" fill="#222"/>`).join("")}</g>`
};
// cenas: tone (vit/der/par), sub (frase curta, traduzível) e o desenho
const FA_CENAS = {
  recife: { tone: "vit", sub: "Recife caiu: a bandeira do regime sobe sobre a capital da Resistência.", fala: "vitoriaSub",
    svg: () => FA_PART.sky("fa-s1", "#f6b04b", "#7a3d17") + `<circle class="fa-sun" cx="200" cy="120" r="44" fill="#ffe08a" opacity=".85"/>` + FA_PART.recife("#2a1a10") + FA_PART.flag(305, 70, "#2a5d93") + FA_PART.bursts([[90, 70], [320, 50], [200, 40], [60, 110]], ["#ffd166", "#9cc3ea", "#fff"]) },
  regime: { tone: "vit", sub: "O regime controla o país: a bandeira sobe sobre o Planalto.",
    svg: () => FA_PART.sky("fa-s2", "#f3c969", "#6b3a16") + FA_PART.planalto("#2a1a10") + FA_PART.flag(198, 90, "#2a5d93") + FA_PART.bursts([[80, 60], [320, 70], [200, 40]], ["#ffd166", "#9cc3ea", "#fff"]) },
  df: { tone: "der", sub: "Brasília caiu: a resistência entra no Congresso e na Esplanada.",
    svg: () => FA_PART.sky("fa-s3", "#3a0d0a", "#140606") + `<circle class="fa-glow" cx="200" cy="150" r="90" fill="#ff5a42" opacity=".18"/>` + FA_PART.smoke(150, 5) + FA_PART.smoke(240, 4) + FA_PART.congresso("#0c0807") + FA_PART.flag(222, 60, "#c0392b") + FA_PART.ground("#0a0605") + FA_PART.tank("#3b1d16") },
  motim: { tone: "der", sub: "Sem dinheiro para o soldo, as tropas largam as armas e abandonam o regime.",
    svg: () => FA_PART.sky("fa-s4", "#4a5563", "#161a20") + FA_PART.ground("#2a2622") +
      `<g class="fa-cofre"><rect x="168" y="150" width="64" height="50" rx="4" fill="#4a4f57" stroke="#9aa3ad"/><circle cx="200" cy="175" r="10" fill="none" stroke="#9aa3ad" stroke-width="3"/><g class="fa-porta"><rect x="168" y="150" width="64" height="50" rx="4" fill="#5c626b" stroke="#9aa3ad"/></g></g>` +
      [0, 1, 2].map(i => `<circle class="fa-coin" style="animation-delay:${0.3 + i * 0.25}s" cx="${192 + i * 8}" cy="160" r="5" fill="#f3c969"/>`).join("") +
      [60, 100, 300, 340].map((x, i) => `<g class="fa-sold" style="animation-delay:${1 + i * 0.2}s">${FA_PART.person(x, "#6b7d4f")}<rect class="fa-rifle" style="animation-delay:${1.2 + i * 0.2}s;transform-origin:${x + 10}px 170px" x="${x + 9}" y="140" width="3" height="40" fill="#2a2a2a"/></g>`).join(""), stamp: "SEM SOLDO" },
  militares: { tone: "der", sub: "Sem a lealdade das Forças Armadas, o regime desmorona.",
    svg: () => FA_PART.sky("fa-s5", "#26303a", "#0d1013") + FA_PART.ground("#111") + [90, 160, 240, 310].map((x, i) => `<g>${FA_PART.person(x, "#3a4a36")}<path d="M${x - 11},142h22l-4,-8h-14z" fill="#22301f"/></g>` +
      `<g transform="translate(${x},166)"><path class="fa-star" style="animation-delay:${0.6 + i * 0.3}s" d="M0,-6L1.8,-2L6,-2L2.6,1L4,5.6L0,3L-4,5.6L-2.6,1L-6,-2L-1.8,-2z" fill="#f3c969"/></g>`).join("") },
  estados: { tone: "der", sub: "A resistência passa a controlar a maioria dos estados.",
    svg: () => FA_PART.sky("fa-s6", "#2a1410", "#0e0806") + `<g transform="translate(92,40)">${Array.from({ length: 27 }, (_, i) => `<rect class="fa-uf" style="animation-delay:${0.2 + i * 0.08}s" x="${(i % 9) * 24}" y="${Math.floor(i / 9) * 30 + (i % 2) * 6}" width="20" height="24" rx="3"/>`).join("")}</g>` },
  urnas: { tone: "vit", sub: "O TSE anula o resultado: na nova votação, a virada é sua.",
    svg: () => FA_PART.sky("fa-s7", "#1f6b45", "#0e2a1d") + `<g><rect x="150" y="130" width="100" height="70" rx="6" fill="#e9eef2" stroke="#8aa"/><rect x="185" y="126" width="30" height="6" rx="2" fill="#333"/></g>` +
      [0, 1, 2].map(i => `<rect class="fa-voto" style="animation-delay:${0.2 + i * 0.35}s" x="190" y="60" width="20" height="14" fill="#fff" stroke="#999"/>`).join("") +
      `<path class="fa-check" d="M168,166l20,20l46,-50" fill="none" stroke="#ffd166" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` + FA_PART.confetti(["#ffd166", "#2ecc71", "#2a5d93", "#fff"]) },
  retorno: { tone: "vit", sub: "Quatro anos depois, você volta ao Planalto pelo voto.",
    svg: () => FA_PART.sky("fa-s8", "#ffcf7a", "#c0602a") + `<circle class="fa-sunrise" cx="200" cy="200" r="60" fill="#fff1b8"/>` + FA_PART.planalto("#3a2414") + FA_PART.person(200, "#1b1b1b", 1.1) +
      `<path class="fa-faixa" d="M190,170l22,22" stroke="#2ecc71" stroke-width="5"/><path class="fa-faixa" d="M190,170l22,22" stroke="#ffd166" stroke-width="2"/>` + FA_PART.confetti(["#2ecc71", "#ffd166", "#2a5d93"]) },
  cassado: { tone: "der", sub: "O TSE declara você inelegível.",
    svg: () => FA_PART.sky("fa-s9", "#2a2320", "#0e0b09") + `<rect x="80" y="180" width="240" height="20" fill="#4a3424"/><rect x="170" y="168" width="60" height="12" rx="3" fill="#6b4a30"/>` +
      `<g class="fa-martelo"><rect x="196" y="70" width="8" height="90" rx="3" fill="#8a5a35"/><rect x="172" y="56" width="56" height="26" rx="6" fill="#6b4024"/></g><circle class="fa-impact" cx="200" cy="168" r="30" fill="none" stroke="#ffd166" stroke-width="3"/>`, stamp: "INELEGÍVEL" },
  divisao: { tone: "par", sub: "O país se parte em dois: cada lado com seu governo.",
    svg: () => FA_PART.sky("fa-s10", "#2b2f3a", "#101218") + `<g class="fa-metade1"><path d="M200,30C150,32 110,60 96,100C84,140 120,170 140,200L200,210L188,150L206,110L192,70z" fill="#2a5d93"/></g>
      <g class="fa-metade2"><path d="M200,30C250,32 300,60 312,104C322,150 280,190 250,206L200,210L188,150L206,110L192,70z" fill="#a3301f"/></g>
      <path class="fa-crack" d="M200,30L192,70L206,110L188,150L200,210" fill="none" stroke="#ffe08a" stroke-width="3"/>` },
  restauracao: { tone: "der", sub: "A democracia é restaurada: o país vira a página — sem você.",
    svg: () => FA_PART.sky("fa-s11", "#5a8fc0", "#f0c27a") + FA_PART.congresso("#29323d") + FA_PART.ground("#2b3440") +
      Array.from({ length: 14 }, (_, i) => `<g class="fa-povo" style="animation-delay:${i * 0.08}s">${FA_PART.person(20 + i * 28, "#1b2027", 0.8)}</g>`).join("") +
      `<g class="fa-faixa2"><rect x="120" y="120" width="160" height="22" rx="3" fill="#ffd166"/><rect x="120" y="120" width="160" height="22" rx="3" fill="none" stroke="#2ecc71" stroke-width="3"/></g>`, stamp: "DEMOCRACIA" },
  oposicao: { tone: "par", sub: "Você vira o líder da oposição: o palanque continua seu.",
    svg: () => FA_PART.sky("fa-s12", "#20263a", "#0c0e16") + `<path class="fa-luz" d="M200,0L140,200h120z" fill="#fff6c8" opacity=".18"/>` + FA_PART.person(200, "#151515", 1.1) +
      `<rect x="176" y="172" width="48" height="28" fill="#2a5d93"/><rect x="198" y="150" width="4" height="22" fill="#999"/><circle cx="200" cy="148" r="5" fill="#333"/>` + FA_PART.ground("#0a0a0f") },
  herdeiro: { tone: "vit", sub: "A faixa passa para o seu herdeiro político.",
    svg: () => FA_PART.sky("fa-s13", "#f3c969", "#7a4a1a") + FA_PART.planalto("#3a2414") + FA_PART.person(140, "#1b1b1b", 1.1) + FA_PART.person(260, "#1b1b1b", 1.1) +
      `<g class="fa-passa"><path d="M150,170l22,22" stroke="#2ecc71" stroke-width="5"/><path d="M150,170l22,22" stroke="#ffd166" stroke-width="2"/></g>` + FA_PART.bursts([[200, 60]], ["#ffd166", "#fff"]) },
  ostracismo: { tone: "der", sub: "O telefone para de tocar: o país segue em frente sem você.",
    svg: () => FA_PART.sky("fa-s14", "#4a4f57", "#1a1c20") + FA_PART.ground("#25282d") + `<g class="fa-anda">${FA_PART.person(120, "#111")}</g>` + `<rect class="fa-nevoa" x="0" y="0" width="${FA_W}" height="${FA_H}" fill="#9aa3ad"/>` },
  golpe: { tone: "der", sub: "O golpe fracassa: os quartéis não saem e a lei chega.",
    svg: () => FA_PART.sky("fa-s15", "#2a2a33", "#0d0d12") + FA_PART.ground("#16161b") + `<g transform="translate(150,0)">${FA_PART.tank("#3a3f33")}</g>` +
      `<g class="fa-algema"><circle cx="170" cy="110" r="14" fill="none" stroke="#c9ced6" stroke-width="5"/><circle cx="230" cy="110" r="14" fill="none" stroke="#c9ced6" stroke-width="5"/><path d="M184,110h32" stroke="#c9ced6" stroke-width="3" stroke-dasharray="4 3"/></g>` },
  exilio: { tone: "der", sub: "Você deixa o país num voo de madrugada.",
    svg: () => FA_PART.sky("fa-s16", "#0d1630", "#050812") + Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 71) % FA_W}" cy="${(i * 37) % 140}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity=".7"/>`).join("") + FA_PART.ground("#0a0d18") +
      Array.from({ length: 8 }, (_, i) => `<circle cx="${30 + i * 48}" cy="206" r="2.5" fill="#ffd166"/>`).join("") +
      `<g class="fa-aviao"><path d="M0,0l40,-4l14,-10h6l-6,12l18,-2l6,-6h4l-3,8l3,8h-4l-6,-6l-18,-2l6,12h-6l-14,-10l-40,-4z" fill="#dfe6f0" transform="translate(60,190) rotate(-14)"/></g>` },
  isolamento: { tone: "der", sub: "O mundo fecha as portas: sem reconhecimento, o governo asfixixa.",
    svg: () => FA_PART.sky("fa-s17", "#1a2030", "#07090f") + FA_PART.ground("#12151c") + FA_PART.planalto("#1c222c") +
      `<g opacity=".55">${Array.from({ length: 6 }, (_, i) => `<rect x="${40 + i * 55}" y="70" width="36" height="50" rx="3" fill="#2a3140" stroke="#6a7388"/><path d="M${48 + i * 55},95h20M${58 + i * 55},85v20" stroke="#c0392b" stroke-width="3"/>`).join("")}</g>` +
      FA_PART.person(200, "#111", 1.05) + `<circle class="fa-glow" cx="200" cy="120" r="70" fill="#4a5568" opacity=".15"/>`, stamp: "ISOLADO" }
};
// qual cena: pela causa; senão pelo final
const FA_POR_FINAL = { fim_regime: "regime", fim_restauracao: "restauracao", fim_urnas: "urnas", fim_cassado: "cassado", fim_retorno: "retorno", fim_divisao: "divisao",
  fim_oposicao: "oposicao", fim_herdeiro: "herdeiro", fim_ostracismo: "ostracismo", fim_golpe_fracassado: "golpe", fim_exilio: "exilio", fim_isolamento: "isolamento" };
const FA_POR_CAUSA = { recife: "recife", df: "df", motim: "motim", militares: "militares", estados: "estados", territorio: "regime", urnas: "urnas", cassado: "cassado", isolamento: "isolamento" };
function endingSceneKey(g){
  const e = g && g.ended; if (!e) return null;
  if (e.cause && FA_POR_CAUSA[e.cause]) return FA_POR_CAUSA[e.cause];
  return FA_POR_FINAL[e.node] || (STORY.nodes[e.node] && STORY.nodes[e.node].outcome === "vitoria" ? "regime" : "restauracao");
}
const FA_TONE = { vit: "Vitória", der: "Derrota", par: "Final intermediário" };
// Mostra a cena (overlay). done: chamado ao fechar (pular, tocar, Esc/Enter ou depois de alguns segundos)
function playEndingScene(g, done){
  const key = endingSceneKey(g), S = FA_CENAS[key]; if (!S){ if (done) done(); return; }
  if (g.ended && !g.ended.anim){ g.ended.anim = 1; try { save(); } catch(e){} }
  closeOverlay("fimani");
  const node = STORY.nodes[g.ended.node] || {}, rm = reduceMotion();
  const o = document.createElement("div"); o.id = "fimani"; o.className = `overlay fa-ov fa-${S.tone} fa-k-${key}${rm ? " fa-rm" : ""}`;
  o.innerHTML = `<div class="fa-box" role="dialog" aria-label="${esc(node.endingName || "")}">
    <button class="fa-skip secondary" data-skip>${esc(tF("pular"))} ▸▸</button>
    <div class="fa-scene"><svg viewBox="0 0 ${FA_W} ${FA_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${S.svg()}</svg>${S.stamp ? `<div class="fa-stamp">${esc(S.stamp)}</div>` : ""}</div>
    <div class="fa-txt"><span class="fa-tag">${esc(FA_TONE[S.tone])}</span><h2>${esc(S.fala ? fFala("recife", "vitoriaTit") : node.endingName || "")}</h2><p>${esc(S.fala ? fFala("recife", S.fala) : S.sub)}</p>
    <button class="primary fa-go" data-go>${esc(fimFala("continuar"))} ▸</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  if (typeof AUDIO !== "undefined") AUDIO.sfx(S.tone === "vit" ? "win" : S.tone === "der" ? "lose" : "order");
  let closed = false; const tm = rm ? null : setTimeout(() => close(), 7500);
  function close(){ if (closed) return; closed = true; clearTimeout(tm); document.removeEventListener("keydown", key2); closeOverlay("fimani"); if (done) done(); }
  function key2(e){ if (e.key === "Escape" || e.key === "Enter" || e.key === " "){ e.preventDefault(); close(); } }
  document.addEventListener("keydown", key2);
  o.addEventListener("click", e => { if (e.target.closest("[data-skip],[data-go]") || !e.target.closest(".fa-txt")) close(); });
  const b = o.querySelector("[data-go]"); if (b) b.focus();
}
// frases da tela (traduzíveis)
function fimFala(k){ return { continuar: "Continuar", rever: "Rever cena" }[k] || k; }
