// js/data/cenarios.js — Lista de cenários do menu (SCENARIOS). Para um cenário novo, acrescente uma entrada aqui.
/* =====================================================================
   LISTA DE CENÁRIOS (estilo seleção de ano/bookmark).
   Para adicionar um cenário: crie um objeto STORY_x como os acima e acrescente uma entrada aqui.
   Entradas com soon:true (só marcador) ou locked:true (dados completos, mas bloqueado) aparecem como "Em breve" e não são jogáveis.
   ===================================================================== */
const SCENARIOS = [
  {
    id: "brasil1964", year: "1964", date: "2 de abril de 1964", locked: true, // indisponível por enquanto: aparece como "Em breve"
    title: "Os Anos Decisivos", tag: "História alternativa",
    character: "Chefe do novo governo militar (papel genérico)",
    description: "Goulart caiu. Você comanda o governo instalado pelos militares. Devolver o poder aos civis em 1965 ou endurecer com atos institucionais, cassações e censura? Linha dura, Congresso, Igreja, estudantes, o Sul de Brizola e Washington vão pressionar.",
    saveKey: "jogo_br_save_brasil1964", endingsKey: "jogo_br_endings_brasil1964",
    intro: {
      kicker: "Cenário 1964", title: "Os Anos Decisivos",
      sub: "E se os primeiros anos depois de 1964 tivessem tomado outro rumo?",
      paragraphs: [
        "2 de abril de 1964. O governo de João Goulart foi derrubado e o Congresso declarou a Presidência vaga. Você assume a chefia do novo governo militar — um papel genérico, não uma pessoa real — num país dividido, com inflação acima de 90% ao ano e resistência armada possível no Rio Grande do Sul.",
        "Entre a linha dura e os moderados, entre Washington e as ruas, cada decisão pode devolver o poder aos civis, prolongar o regime por décadas ou rachar o país numa guerra civil. O mapa usa a divisão atual dos estados; passe o mouse para ver a situação de 1964."
      ],
      disclaimer: "Ficção de história alternativa. O ponto de partida é histórico; as decisões e desfechos são inventados e não representam fatos nem endosso. Figuras reais aparecem apenas em seus papéis públicos, sem falas atribuídas. O jogo não glorifica a repressão: caminhos autoritários têm custos humanos reais, apresentados com sobriedade."
    },
    story: STORY_1964, campaign: CAMPAIGN_1964
  },
  {
    id: "brasil2022", year: "2022", date: "31 de outubro de 2022",
    title: "A Faixa Presidencial", tag: "História alternativa",
    character: "Jair Bolsonaro — presidente em fim de mandato",
    description: "O TSE confirma a derrota no 2º turno por 1,8 ponto. Reconhecer o resultado, contestar, ficar em silêncio — ou tentar romper a ordem constitucional? Instituições, quartéis, ruas e o mundo vão reagir.",
    saveKey: "jogo_br_save_brasil2022", endingsKey: "jogo_br_endings_brasil2022",
    intro: {
      kicker: "Cenário 2022", title: "A Faixa Presidencial",
      sub: "E se a noite de 30 de outubro de 2022 tivesse terminado de outro jeito?",
      paragraphs: [
        "30 de outubro de 2022. A apuração termina com a menor margem da história recente: o candidato da oposição vence o 2º turno com 50,90% dos votos válidos. Você joga como o presidente derrotado, Jair Bolsonaro, nas horas e meses seguintes.",
        "O mapa começa com o resultado real do 2º turno em cada estado. A partir da primeira decisão, a história se torna alternativa: suas escolhas movem o apoio popular, os quartéis, o Congresso e o olhar do mundo — e podem levar o país da transição pacífica à ruptura e até a uma guerra de separação."
      ],
      disclaimer: "Ficção de história alternativa, no estilo de mods de jogos de estratégia. Tudo o que acontece a partir da primeira escolha é inventado: não retrata fatos, não é previsão e não representa endosso a nenhuma pessoa, partido ou ação. Personagens reais aparecem apenas em papéis públicos, sem falas atribuídas. Golpe de Estado é crime contra a democracia — no jogo, ele tem as consequências que tem."
    },
    story: STORY_2022, campaign: CAMPAIGN_2022, retratos: RETRATOS_2022, golpe: GOLPE_2022, frentes: FRENTES_2022
  },
  {
    id: "brasil2002", year: "2002", soon: true,
    title: "Brasil 2002", tag: "História alternativa",
    description: "Um novo cenário ambientado no Brasil de 2002 está nos planos. Um dia será jogável; por enquanto, é apenas uma promessa."
  }
  // Para um novo ano: { id, year, date, title, tag, character, description, saveKey, endingsKey, intro, story, campaign }
  // ou um marcador { id: "em_breve", soon: true, year: "????", title: "Em breve", tag: "Próximo cenário", description: "..." }
];
