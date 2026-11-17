// js/data/2022/urnas.js — Cenário 2022 — dados da "Contestação das urnas" (vitória sem guerra) e da abertura em quinzenas.
// O núcleo fica em js/core/urnas.js (medidor, metas e finais) e js/core/quinzenas.js (turnos de 15 dias).
/* ---------- Abertura em quinzenas ---------- */
// Até "ate" (ou até a guerra começar) cada turno vale meia-mês: receita pela metade, eventos com metade da chance,
// ações renovadas a cada quinzena e cada quinzena conta como um passo do foco nacional (mais decisões nacionais).
const QUINZENAS_2022 = { ate: "2023-03", foco: 1, evento: 0.5 };
/* ---------- Contestação das urnas ---------- */
// Três números (0–100): Progresso da contestação (chega a 100 = vitória), Credibilidade (0 = inelegível) e Escalada (100 = as ruas
// saem do controle e a crise vira caso de quartel). Ganhos de progresso são multiplicados pela credibilidade.
const URNAS_2022 = {
  flag: "contesta_urna",
  cred0: 50, esc0: 25,
  warnEsc: 70, warnCred: 20,
  ganho: 0.9,              // v1.24: todo ganho de progresso vale 90% (o caminho legal vencia quase sempre)
  julgamento: 43,          // progresso mínimo no julgamento do TSE (janeiro) — a dificuldade dá folga
  // por quinzena (um turno de mês vale o dobro)
  passivo: { base: 0.3, apoio: 0.06, baseStat: 0.08, centrao: 0.05 }, // progresso: 1 + (Apoio−50)·0,06 + (Base−50)·0,08 + (Centrão−45)·0,05
  esfria: 4,               // a escalada cai sozinha
  // a contestação acaba (sem vitória) quando a história segue outro rumo
  fecha: { visitedAny: ["transicao", "crise_janeiro", "sondagem", "contestacao_derrotada", "oposicao", "golpe_inicial"] },
  marta: {
    entrada: "Agora é pelas regras, mas é guerra de nervos. Três números: o progresso vence em 100; a credibilidade não pode zerar, ou o TSE te torna inelegível; e a escalada não pode chegar a 100, ou as ruas viram caso de quartel.",
    pouco: "Seu progresso está baixo para o julgamento de janeiro ({p}/{meta}). Auditoria, ações no TSE e o Congresso rendem mais com credibilidade alta.",
    escalada: "As ruas estão no limite (escalada {e}). Mais um ato e os acampamentos viram caso de quartel. Use 'Baixar a temperatura' agora.",
    cred: "Sua credibilidade está em {c}. Abaixo de zero, o TSE declara você inelegível. Pare com as redes e traga observadores ou peritos.",
    bom: "Está funcionando: {p}/100 de progresso, credibilidade {c}, escalada {e}. Mantenha a frente dentro da lei.",
    posse: "O TSE adiou a posse para auditar as seções. Até março, cada quinzena conta: leve o progresso a 100 sem perder a credibilidade.",
    porta: "Existe um caminho sem guerra: em 'A Ação no TSE', escolha montar a frente da contestação. É lento e exige cuidado com a credibilidade, mas não dispara um tiro."
  }
};
