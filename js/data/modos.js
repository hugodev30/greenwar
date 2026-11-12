// js/data/modos.js — Dados: níveis de dificuldade (Fácil / Normal / Difícil). "Normal" é o jogo original, sem nenhuma mudança.
// Cada campo ajusta a campanha (veja js/core/modos.js):
//   inimigo  multiplica a força do inimigo (exércitos iniciais, reforços e ataques por mês)
//   sul      multiplica o quanto a Tensão no Sul sobe por mês e o salto do racha militar
//   dinheiro Recursos a mais (ou a menos) no início · renda: Recursos a mais (ou a menos) por mês
//   status   pontos a mais (ou a menos) nos atributos iniciais
//   folga    tolerância nos testes da história ("precisa de Apoio 60" vira 52 com folga 8)
//   simples  interface reduzida (esconde a conversão de Recursos e o comando manual dos exércitos)
//   desgaste Apoio Popular e Base Política acima deste valor caem 1 ponto por mês (só no Difícil: popularidade alta cansa)
//   ordensAuto ordens automáticas dos exércitos já ligadas ("auto" = atacar com boa chance ou defender)
//   ia       nível da IA do inimigo na guerra (0 = simples, 1 = plano de vários meses e contra-ataques, 2 = também cercos; js/core/ia-inimiga.js)
const DIFICULDADES = {
  facil: { label: "Fácil", icone: "🌱", resumo: "Para quem nunca jogou estratégia: inimigo mais fraco, Sul mais calmo, mais Recursos e uma interface mais simples. Os exércitos lutam sozinhos.",
    inimigo: 0.6, sul: 0.4, dinheiro: 15, renda: 2, status: { apoio: 10, militar: 10, base: 10, internacional: 5 }, folga: 12, simples: true, ordensAuto: "auto", nota: -1, ia: 0 },
  normal: { label: "Normal", icone: "⚖️", resumo: "O jogo como foi pensado: decisões com peso e guerra equilibrada.",
    inimigo: 1, sul: 1, dinheiro: 0, renda: 0, status: {}, folga: 0, simples: false, ordensAuto: "off", nota: 0, ia: 1 },
  dificil: { label: "Difícil", icone: "🔥", resumo: "Inimigo mais forte, menos Recursos, o Sul mais inquieto, popularidade alta que se desgasta e só uma revanche nas urnas. Para quem já conhece o jogo.",
    inimigo: 1.16, sul: 1.25, dinheiro: -5, renda: -1, status: { apoio: -3, militar: -3, base: -3 }, folga: -4, pd: -1, desgaste: 65, simples: false, ordensAuto: "off", nota: 1, ia: 2 }
};
const DIF_ORDEM = ["facil", "normal", "dificil"];
