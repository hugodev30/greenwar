// js/data/2022/historia.js — Cenário 2022 "A Faixa Presidencial" — história roteirizada (nós-chave, escolhas, finais) e mapa inicial.
// Guia completo no README ("Como atualizar o jogo").
/* =====================================================================
   DADOS DA HISTÓRIA
   Para expandir: adicione nós em STORY.nodes. Cada escolha tem:
     text   – texto do botão
     effects – {apoio, tesouro, militar, diplomacia} (somados, limitados a 0–100)
     next   – id do próximo nó  OU  lista de ramos condicionais:
              [{ if:{min:{militar:55}, max:{apoio:30}}, to:'id' }, ..., { to:'padrao' }]
     req    – (opcional) condição para a escolha estar disponível: {min:{...}, max:{...}}
     flag   – (opcional) marca um fato na história (ex.: 'isabel_aliada')
   Nós com ending:true são finais; outcome diz se é vitória, final intermediário (parcial) ou derrota (tela final e avisos do modo Fácil).
   ===================================================================== */
/* ---------- Cenário 2022 (história alternativa) — único jogável ---------- */
const STORY_2022 = {
  start: "apuracao",
  stats: {
    apoio:         { label: "Apoio Popular",       color: "#c9a45c", initial: 49 },
    militar:       { label: "Apoio Militar",       color: "#a8402f", initial: 40 },
    base:          { label: "Base Política",       color: "#5f8f5a", initial: 50 },
    internacional: { label: "Relações Int.",       color: "#4f7aa3", initial: 40 }
  },
  factions: {
    voto_lula:   { label: "Maioria Lula (2º turno)",        color: "#b9483f" },
    voto_bolso:  { label: "Maioria Bolsonaro (2º turno)",   color: "#3c73b0" },
    legal:       { label: "Governo constitucional",         color: "#56677a" },
    oposicao:    { label: "Reduto bolsonarista",            color: "#6c95c9" },
    regime:      { label: "Regime de exceção",              color: "#7a5230" },
    resistencia: { label: "Resistência constitucional",     color: "#2f8f7a" },
    separatista: { label: "Liga do Sul (separatistas)",     color: "#d9a43c" }
  },
  // Mapa inicial: vencedor real de cada UF no 2º turno de 2022 (fonte: TSE). Apenas ambientação.
  initialMap: {
    AL:"voto_lula", AM:"voto_lula", BA:"voto_lula", CE:"voto_lula", MA:"voto_lula", MG:"voto_lula", PA:"voto_lula",
    PB:"voto_lula", PE:"voto_lula", PI:"voto_lula", RN:"voto_lula", SE:"voto_lula", TO:"voto_lula",
    AC:"voto_bolso", AP:"voto_bolso", DF:"voto_bolso", ES:"voto_bolso", GO:"voto_bolso", MT:"voto_bolso", MS:"voto_bolso",
    PR:"voto_bolso", RJ:"voto_bolso", RS:"voto_bolso", RO:"voto_bolso", RR:"voto_bolso", SC:"voto_bolso", SP:"voto_bolso"
  },
  // Texto extra no tooltip de cada estado (resultado real do 2º turno, % dos votos válidos — TSE)
  stateNotes: {
    AC:"Lula 29,70% · Bolsonaro 70,30%", AL:"Lula 58,68% · Bolsonaro 41,32%", AP:"Lula 48,64% · Bolsonaro 51,36%",
    AM:"Lula 51,10% · Bolsonaro 48,90%", BA:"Lula 72,12% · Bolsonaro 27,88%", CE:"Lula 69,97% · Bolsonaro 30,03%",
    DF:"Lula 41,19% · Bolsonaro 58,81%", ES:"Lula 41,96% · Bolsonaro 58,04%", GO:"Lula 41,29% · Bolsonaro 58,71%",
    MA:"Lula 71,14% · Bolsonaro 28,86%", MT:"Lula 34,92% · Bolsonaro 65,08%", MS:"Lula 40,51% · Bolsonaro 59,49%",
    MG:"Lula 50,20% · Bolsonaro 49,80%", PA:"Lula 54,75% · Bolsonaro 45,25%", PB:"Lula 66,62% · Bolsonaro 33,38%",
    PR:"Lula 37,60% · Bolsonaro 62,40%", PE:"Lula 66,93% · Bolsonaro 33,07%", PI:"Lula 76,86% · Bolsonaro 23,14%",
    RJ:"Lula 43,47% · Bolsonaro 56,53%", RN:"Lula 65,10% · Bolsonaro 34,90%", RS:"Lula 43,65% · Bolsonaro 56,35%",
    RO:"Lula 29,34% · Bolsonaro 70,66%", RR:"Lula 23,92% · Bolsonaro 76,08%", SC:"Lula 30,73% · Bolsonaro 69,27%",
    SP:"Lula 44,76% · Bolsonaro 55,24%", SE:"Lula 67,21% · Bolsonaro 32,79%", TO:"Lula 51,36% · Bolsonaro 48,64%"
  },
  stateNotesLabel: "2º turno 2022",
  collapse: { apoio: [ { if: { visited: ["golpe_inicial"] }, to: "fim_restauracao" }, { to: "fim_ostracismo" } ] }, // no regime, sem apoio o regime cai
  nodes: {
    apuracao: {
      chapter: "30 de outubro de 2022 — noite",
      title: "A Apuração",
      text: [
        "O TSE conclui a totalização pouco depois da meia-noite: 50,90% dos votos válidos para o candidato da oposição, 49,10% para você. É a disputa presidencial mais apertada desde a redemocratização — pouco mais de dois milhões de votos de diferença.",
        "No Palácio da Alvorada, assessores andam de um lado para o outro. Governos estrangeiros já cumprimentam o vencedor. Nas estradas, caminhões e apoiadores começam a bloquear rodovias em vários estados. Aliados no Congresso aguardam um sinal antes de se posicionar.",
        "Você ainda não falou. O país inteiro espera."
      ],
      choices: [
        { text: "Reconhecer a derrota em pronunciamento e autorizar a transição.", effects: { apoio: -5, internacional: 20, base: 5 }, next: "transicao" },
        { text: "Ficar em silêncio por enquanto e deixar a base se manifestar.", effects: { apoio: 5, internacional: -5 }, next: "silencio" },
        { text: "Contestar o resultado no TSE, pedindo a anulação de parte das urnas.", effects: { apoio: 5, base: -10, internacional: -10 }, next: "contestacao" },
        { text: "Convocar em sigilo os comandantes das Forças Armadas.", effects: { militar: 5, base: -5, internacional: -10 }, flag: "conspiracao", next: "sondagem" }
      ]
    },
    transicao: {
      chapter: "Novembro de 2022",
      title: "A Transição",
      onEnter: { map: {}, resolve: { voto_lula: "legal", voto_bolso: "oposicao" } },
      text: [
        "A equipe de transição do presidente eleito se instala em Brasília e os ministérios começam a entregar relatórios. No mapa do poder, o país volta a ter um só governo — mas os estados onde você venceu continuam sendo o seu território político.",
        "Parte da base, porém, não aceita. Nas redes, há quem chame a transição de traição. Nas rodovias, bloqueios persistem, e transportadoras contabilizam prejuízos. Seus aliados querem saber que tom você vai adotar daqui até a posse."
      ],
      choices: [
        { text: "Pedir publicamente o fim dos bloqueios nas estradas.", effects: { apoio: -10, internacional: 10, base: 5 }, next: "crise_janeiro" },
        { text: "Adotar um tom ambíguo: respeitar a lei, mas legitimar a indignação.", effects: { apoio: 5, internacional: -5 }, next: "crise_janeiro" }
      ]
    },
    silencio: {
      chapter: "Novembro de 2022",
      title: "O Silêncio",
      text: [
        "Os dias passam sem que você reconheça ou conteste o resultado. Seus ministros, por conta própria, começam a cooperar com a equipe do presidente eleito. Diante de quartéis em várias cidades, apoiadores montam acampamentos e pedem que as Forças Armadas intervenham.",
        "Comandantes militares evitam declarações. Embaixadores perguntam discretamente ao Itamaraty o que o seu silêncio significa. Cada dia sem resposta aumenta a temperatura — e diminui suas saídas."
      ],
      choices: [
        { text: "Quebrar o silêncio e autorizar formalmente a transição.", effects: { internacional: 10, apoio: -5 }, next: "transicao" },
        { text: "Viajar para o exterior antes da posse, sem passar a faixa.", effects: { apoio: -5, base: -5, internacional: -5 }, next: "crise_janeiro" },
        { text: "Incentivar os acampamentos e sondar os militares.", effects: { militar: 10, internacional: -10 }, flag: "conspiracao", next: "sondagem" },
        { text: "Romper o silêncio e contestar o resultado no TSE.", effects: { base: 3, internacional: -5 }, next: "contestacao" }
      ]
    },
    contestacao: {
      chapter: "Novembro de 2022",
      title: "A Ação no TSE",
      text: [
        "Seus advogados protocolam um pedido para invalidar votos de parte das urnas eletrônicas. A resposta do tribunal é rápida: o pedido é rejeitado por falta de provas e a coligação recebe uma multa pesada por litigância de má-fé.",
        "No Congresso, aliados do Centrão se afastam em silêncio; já negociam espaço com o novo governo. Nas ruas, a decisão inflama a parcela mais radical da base."
      ],
      choices: [
        { text: "Acatar a decisão e liberar a transição.", effects: { base: 5, internacional: 5, apoio: -5 }, next: "transicao" },
        { text: "Recorrer às ruas e às Forças Armadas.", effects: { militar: 5, base: -10 }, flag: "conspiracao", next: "sondagem" },
        { text: "Não desistir: montar uma frente legal (auditorias, tribunais, Congresso e ruas) para virar o resultado sem romper a lei.", effects: { base: 5, internacional: -3 }, flag: "contesta_urna", urna: true, next: "julgamento_tse" }
      ]
    },
    // ---- Contestação das urnas: o caminho para vencer sem guerra (js/core/urnas.js) ----
    julgamento_tse: {
      chapter: "Janeiro de 2023",
      title: "O Julgamento no TSE",
      text: [
        "Às vésperas da posse, o plenário do TSE julga o pedido da sua coligação: auditoria completa das seções contestadas e suspensão da diplomação até lá. Brasília inteira para diante da TV.",
        "Seus advogados sabem que o placar depende do que você construiu nas últimas semanas: laudos, apoio no Congresso e a calma das ruas. Um voto muda tudo."
      ],
      choices: [
        { text: "Fazer uma defesa técnica no plenário: só laudos e argumentos.", effects: { internacional: 3 }, next: [{ if: { urna: { min: 43 } }, to: "posse_adiada" }, { to: "contestacao_derrotada" }] },
        { text: "Lotar a Esplanada durante o julgamento para pressionar os ministros.", effects: { apoio: 3, internacional: -5 }, next: [{ if: { urna: { min: 43 } }, to: "posse_adiada" }, { to: "contestacao_derrotada" }] }
      ]
    },
    posse_adiada: {
      chapter: "Janeiro de 2023",
      title: "A Posse Suspensa",
      text: [
        "Por um voto, o TSE manda auditar as seções contestadas e suspende a diplomação do vencedor até o fim de março. Pela primeira vez na história, a posse presidencial é adiada; o presidente da Câmara assume interinamente.",
        "Do lado de fora, metade do país comemora e metade fala em golpe de toga. Você tem dois meses para provar o que diz, sem perder a credibilidade nem deixar as ruas saírem do controle."
      ],
      choices: [
        { text: "Manter a frente dentro da lei até o fim.", effects: { internacional: 3, base: 3 }, next: "veredito" },
        { text: "Pressionar o Congresso por uma nova eleição.", effects: { base: 5, internacional: -3 }, next: "veredito" }
      ]
    },
    veredito: {
      chapter: "Março de 2023",
      title: "O Veredito",
      text: [
        "A auditoria termina e o TSE marca a sessão final. Se a contestação convenceu, o tribunal anula o resultado e convoca uma nova votação. Se não, o vencedor toma posse e a sua frente se desfaz.",
        "Seus advogados pedem silêncio; seus aliados mais radicais pedem as ruas cheias. É a última jogada."
      ],
      choices: [
        { text: "Aguardar a decisão com serenidade.", effects: { internacional: 3 }, next: [{ if: { urna: { min: 100 } }, to: "fim_urnas" }, { if: { urna: { credMax: 15 } }, to: "fim_cassado" }, { to: "contestacao_derrotada" }] },
        { text: "Convocar a base para as ruas no dia da decisão.", effects: { apoio: 3, internacional: -5 }, next: [{ if: { urna: { min: 100 } }, to: "fim_urnas" }, { if: { urna: { credMax: 15 } }, to: "fim_cassado" }, { to: "contestacao_derrotada" }] }
      ]
    },
    escalada: {
      chapter: "Contestação das urnas",
      title: "As Ruas Passam do Limite",
      text: [
        "Caminhoneiros fecham as principais rodovias, um grupo tenta invadir a sede da Polícia Federal e, diante dos quartéis, os acampamentos pedem abertamente uma intervenção militar. A contestação legal virou outra coisa.",
        "Um general liga para o Planalto: há oficiais dispostos a agir, se você der a ordem. Seus advogados avisam que, se você não puser freio agora, o TSE vai tratar a frente inteira como golpista."
      ],
      choices: [
        { text: "Ir à TV pedir calma e desmobilizar os bloqueios.", effects: { apoio: -5, internacional: 5 }, next: [{ if: { visited: ["posse_adiada"] }, to: "veredito" }, { to: "julgamento_tse" }] },
        { text: "Aproveitar a onda e convocar os comandantes.", effects: { militar: 5, internacional: -10 }, flag: "conspiracao", next: "sondagem" }
      ]
    },
    contestacao_derrotada: {
      chapter: "Contestação das urnas",
      title: "O Fim da Contestação",
      text: [
        "O tribunal rejeita a contestação por ampla maioria e manda a Polícia Federal investigar quem financiou os bloqueios. Os aliados do Centrão que ainda estavam com você começam a negociar com o novo governo.",
        "A frente legal acabou. Resta decidir como você sai dela."
      ],
      choices: [
        { text: "Reconhecer a decisão e passar a faixa.", effects: { internacional: 8, apoio: -5, base: -5 }, next: "crise_janeiro" },
        { text: "Não reconhecer: chamar as ruas e os quartéis.", effects: { militar: 5, internacional: -10, base: -5 }, flag: "conspiracao", req: { notVisited: ["posse_adiada"] }, next: "sondagem" }
      ]
    },
    crise_janeiro: {
      chapter: "Janeiro de 2023",
      title: "A Praça dos Três Poderes",
      onEnter: { resolve: { voto_lula: "legal", voto_bolso: "oposicao" } },
      textAlt: [
        { if: { visited: ["posse_adiada"] }, text: ["Com a contestação derrotada, a posse adiada finalmente acontece no fim de março. Uma semana depois, milhares de manifestantes invadem e depredam as sedes do Congresso, do Planalto e do STF. As imagens correm o mundo; líderes estrangeiros condenam o ataque em uníssono.", "Centenas são presos. Investigadores querem saber quem financiou, quem organizou e quem incentivou. Todos os olhares se voltam para você, que acompanha tudo à distância."] },
        { if: { visited: ["contestacao_derrotada"] }, text: ["Com a contestação derrotada, a posse acontece em 1º de janeiro. Uma semana depois, milhares de manifestantes invadem e depredam as sedes do Congresso, do Planalto e do STF. As imagens correm o mundo; líderes estrangeiros condenam o ataque em uníssono.", "Centenas são presos. Investigadores querem saber quem financiou, quem organizou e quem incentivou. Todos os olhares se voltam para você, que acompanha tudo à distância."] }
      ],
      text: [
        "A posse acontece em 1º de janeiro. Uma semana depois, milhares de manifestantes invadem e depredam as sedes do Congresso, do Planalto e do STF. As imagens correm o mundo; líderes estrangeiros condenam o ataque em uníssono.",
        "Centenas são presos. Investigadores querem saber quem financiou, quem organizou e quem incentivou. Todos os olhares se voltam para você, que acompanha tudo à distância."
      ],
      choices: [
        { text: "Condenar a invasão imediatamente e com clareza.", effects: { internacional: 10, apoio: -5, base: 5 }, next: "oposicao" },
        { text: "Ficar em silêncio e esperar a poeira baixar.", effects: { base: -10, internacional: -10 }, flag: "jan", next: "oposicao" }
      ]
    },
    oposicao: {
      chapter: "2023",
      title: "O Líder da Oposição",
      text: [
        "Fora do Planalto, você ainda é a figura mais forte da direita brasileira. Seu partido elegeu a maior bancada da Câmara, e governadores aliados comandam estados importantes. Mas sem a caneta presidencial, cada aliança precisa ser reconquistada.",
        "Seus conselheiros discordam sobre o caminho até 2026: uns querem disciplina parlamentar, outros querem as ruas, outros querem o centro."
      ],
      choices: [
        { text: "Liderar a oposição no Congresso com disciplina.", effects: { base: 15, apoio: 5 }, next: "justica" },
        { text: "Rodar o país em atos e motociatas, mirando 2026.", effects: { apoio: 15, base: -5, internacional: -5 }, map: { MG: "oposicao" }, next: "justica" },
        { text: "Moderar o discurso e se aproximar do centro.", effects: { base: 10, internacional: 10, apoio: -10 }, next: "justica" }
      ]
    },
    justica: {
      chapter: "2023–2024",
      title: "Nos Tribunais",
      text: [
        "O TSE julga uma ação que pede sua inelegibilidade por abuso de poder durante a campanha. Em paralelo, a Polícia Federal abre inquéritos e cumpre mandados de busca contra antigos auxiliares. Cada documento apreendido vira manchete.",
        "Seus advogados avisam: o que foi feito — ou apenas cogitado — entre a eleição e a posse vai pesar no julgamento."
      ],
      choices: [
        { text: "Montar uma defesa técnica e evitar ataques aos tribunais.", effects: { base: 5, internacional: 5 },
          next: [ { if: { noFlags: ["conspiracao", "jan"], min: { base: 55 } }, to: "campanha2026" }, { to: "inelegivel" } ] },
        { text: "Atacar publicamente o tribunal e mobilizar as ruas.", effects: { apoio: 10, internacional: -10, base: -10 }, next: "inelegivel" },
        { text: "Articular no Congresso uma lei de anistia ampla.", req: { min: { base: 60 } }, effects: { internacional: -5 },
          next: [ { if: { min: { base: 65 } }, to: "campanha2026" }, { to: "inelegivel" } ] }
      ]
    },
    inelegivel: {
      chapter: "2024",
      title: "Inelegível",
      text: [
        "Por maioria, o tribunal declara você inelegível por oito anos. A decisão cai como uma bomba na direita: governadores, pastores, empresários e deputados começam a se perguntar quem herdará os seus votos em 2026.",
        "Você ainda move multidões. A questão é o que fazer com elas."
      ],
      choices: [
        { text: "Escolher e apoiar um herdeiro político para 2026.", flag: "herdeiro",
          next: "eleicao_herdeiro" },
        { text: "Insistir na própria candidatura, desafiando a Justiça.", effects: { apoio: 5, base: -15 }, next: "fim_ostracismo" },
        { text: "Recolher-se e comandar a direita como conselheiro.", effects: { base: 5 }, next: "fim_oposicao" }
      ]
    },
    campanha2026: {
      chapter: "Outubro de 2026",
      title: "A Revanche",
      onEnter: { map: { MG: "oposicao" } },
      text: [
        "Contra todas as apostas de 2022, você chega elegível à eleição de 2026. As pesquisas mostram empate técnico. Minas Gerais, Amazonas e Tocantins — estados que você perdeu por pouco — voltam a ser o centro do mapa.",
        "Faltam três semanas. A estratégia final é sua."
      ],
      choices: [
        { text: "Campanha centrada na economia e em alianças com o centro.",
          next: [ { if: { min: { apoio: 50, base: 60 } }, to: "fim_retorno" }, { to: "derrota_urnas" } ] },
        { text: "Campanha de mobilização máxima da base.", effects: { apoio: 5 },
          next: [ { if: { min: { apoio: 65 } }, to: "fim_retorno" }, { to: "derrota_urnas" } ] }
      ]
    },

    /* ---- campanha sem prazo: depois de 2026 o jogo continua até você ganhar ou desistir ---- */
    eleicao_herdeiro: {
      chapter: "Outubro de 2026",
      title: "O Herdeiro nas Urnas",
      text: [
        "Inelegível, você passa dois anos percorrendo o país ao lado do candidato que escolheu. Agora chega a hora da verdade: os seus votos vão migrar para ele?",
        "As pesquisas mostram uma disputa apertada. O último empurrão da campanha é seu."
      ],
      choices: [
        { text: "Subir no palanque em todos os estados ao lado do herdeiro.", effects: { apoio: 3 },
          next: [ { if: { min: { apoio: 57, base: 55 } }, to: "fim_herdeiro" }, { to: "derrota_urnas" } ] },
        { text: "Deixar o herdeiro brilhar sozinho e costurar alianças com o centro.", effects: { base: 4 },
          next: [ { if: { min: { apoio: 52, base: 66 } }, to: "fim_herdeiro" }, { to: "derrota_urnas" } ] }
      ]
    },
    derrota_urnas: {
      chapter: "Depois da eleição",
      title: "Derrota nas Urnas",
      text: [
        "Desta vez o resultado não favorece o seu campo. A direita sai das urnas machucada, mas não destruída: ainda tem bancada, governadores e milhões de eleitores.",
        "Daqui a quatro anos haverá outra eleição. A pergunta é se você ainda estará no centro do palco."
      ],
      choices: [
        { text: "Recomeçar: reconstruir a base para a próxima eleição.", req: { min: { base: 25 } }, effects: { base: -8, apoio: 2 }, next: "nova_eleicao" },
        { text: "Passar o bastão a um nome novo e trabalhar nos bastidores.", effects: { base: 4, apoio: -6 }, flag: "herdeiro", next: "nova_eleicao" },
        { text: "Aceitar o papel de líder da oposição (encerra a campanha).", next: "fim_oposicao" }
      ]
    },
    nova_eleicao: {
      chapter: "Quatro anos depois",
      title: "Mais Uma Eleição",
      text: [
        "Quatro anos de oposição, processos, alianças e brigas internas. O país vai às urnas de novo, e o seu campo chega à reta final competitivo.",
        "É a chance de virar o jogo — ou de descobrir que o país mudou de assunto."
      ],
      choices: [
        { text: "Campanha pela economia e alianças com o centro.",
          next: [ { if: { flags: ["herdeiro"], min: { apoio: 56, base: 62 } }, to: "fim_herdeiro" }, { if: { min: { apoio: 58, base: 62 } }, to: "fim_retorno" }, { if: { diff: ["dificil"] }, to: "fim_oposicao" }, { to: "derrota_urnas" } ] },
        { text: "Campanha de mobilização máxima da base.", effects: { apoio: 4 },
          next: [ { if: { flags: ["herdeiro"], min: { apoio: 66 } }, to: "fim_herdeiro" }, { if: { min: { apoio: 69 } }, to: "fim_retorno" }, { if: { diff: ["dificil"] }, to: "fim_oposicao" }, { to: "derrota_urnas" } ] }
      ]
    },

    /* ----------------- CAMINHO DA RUPTURA ----------------- */
    sondagem: {
      chapter: "Dezembro de 2022",
      title: "A Reunião Secreta",
      text: [
        "Numa sala sem celulares, você recebe os comandantes das três Forças. Um deles ouve em silêncio e se mostra receptivo. Outro avisa que o Exército não se moverá sem respaldo constitucional. O terceiro pede tempo.",
        "Sobre a mesa, um assessor deixa a minuta de um decreto de estado de defesa sobre o TSE. Seus próprios juristas avisam: é inconstitucional, e quem assinar responderá por isso."
      ],
      choices: [
        { text: "Recuar. Engavetar a minuta e deixar a transição seguir.", effects: { militar: -5, base: 5 }, next: "transicao" },
        { text: "Substituir o comandante do Exército por um general alinhado.", effects: { militar: 15, internacional: -10, base: -10 }, next: "expurgo" },
        { text: "Assinar o decreto e testar a reação das tropas.", effects: { internacional: -10 }, next: "decreto" }
      ]
    },
    expurgo: {
      chapter: "Dezembro de 2022",
      title: "A Troca de Comando",
      text: [
        "O novo comandante assume numa cerimônia relâmpago. No Alto-Comando, generais pedem passagem para a reserva em protesto. Embaixadas emitem notas de \"preocupação\" e o dólar dispara.",
        "O STF, o Congresso e a imprensa já falam abertamente em tentativa de golpe. Ainda há tempo de voltar atrás — mas cada hora custa mais caro."
      ],
      choices: [
        { text: "Seguir em frente: publicar o decreto.", effects: { militar: 5 }, next: "decreto" },
        { text: "Recuar diante da resistência e deixar a posse acontecer.", effects: { militar: -10, apoio: -5 }, next: "transicao" }
      ]
    },
    decreto: {
      chapter: "Dezembro de 2022",
      title: "O Decreto",
      text: [
        "O decreto é publicado numa edição extra do Diário Oficial. Em poucas horas, o STF suspende seus efeitos, a presidência do Congresso o declara nulo e governadores de quase todos os estados divulgam notas de repúdio.",
        "Agora tudo depende de uma única pergunta: as tropas vão sair dos quartéis?"
      ],
      choices: [
        { text: "Ordenar que tropas cerquem o TSE e o Congresso.", effects: { internacional: -15 },
          next: [ { if: { min: { militar: 60 } }, to: "golpe_inicial" }, { to: "golpe_fracassa" } ] },
        { text: "Esperar a adesão espontânea dos quartéis.",
          next: [ { if: { min: { militar: 70 } }, to: "golpe_inicial" }, { to: "golpe_fracassa" } ] }
      ]
    },
    golpe_fracassa: {
      chapter: "Dezembro de 2022",
      title: "Os Quartéis Não Se Movem",
      onEnter: { resolve: { voto_lula: "legal", voto_bolso: "legal" } },
      text: [
        "A ordem chega aos quartéis — e fica lá. O Alto-Comando divulga nota curta: as Forças Armadas cumprirão a Constituição. O Congresso instala uma comissão, o STF determina a preservação de documentos e a Polícia Federal pede autorização para medidas contra você.",
        "Os aliados param de atender o telefone. No Alvorada, só restam alguns assessores e o barulho distante dos helicópteros da imprensa."
      ],
      choices: [
        { text: "Deixar o país antes que uma ordem de prisão chegue.", effects: { apoio: -10 }, next: "fim_exilio" },
        { text: "Permanecer e enfrentar as consequências.", next: "fim_golpe_fracassado" }
      ]
    },
    golpe_inicial: {
      chapter: "1º de janeiro de 2023",
      title: "Blindados na Esplanada",
      onEnter: { resolve: { voto_bolso: "regime", voto_lula: "resistencia" },
                 map: { DF: "regime", MG: "regime", RJ: "regime", ES: "regime", AP: "regime" },
                 split: { MG: "resistencia", RJ: "resistencia", ES: "resistencia", AP: "resistencia", TO: "regime" } },
      text: [
        "Não há posse. Blindados cercam a Praça dos Três Poderes; o Congresso é fechado \"temporariamente\". Mas o país não obedece em bloco: governadores do Nordeste e do Norte recusam o decreto, e o presidente eleito, ao lado de parlamentares, instala um governo constitucional provisório no Recife.",
        "Nos estados do Sudeste, polícias e prefeituras se dividem. O Brasil acorda com dois governos — e nenhum deles controla tudo."
      ],
      choices: [
        { text: "Negociar com governadores e prometer novas eleições em um ano.", effects: { base: 10, internacional: 10, militar: -10 }, next: "reacao_internacional" },
        { text: "Decretar intervenção federal nos estados que resistem.", effects: { militar: 10, apoio: -15, internacional: -15 }, map: { RJ: "regime", ES: "regime" }, next: "reacao_internacional" },
        { text: "Censurar imprensa e redes para conter a resistência.", effects: { apoio: -10, internacional: -10, militar: 5 }, next: "reacao_internacional" }
      ]
    },
    reacao_internacional: {
      chapter: "Janeiro de 2023",
      title: "O Mundo Reage",
      text: [
        "Estados Unidos, União Europeia e quase todos os vizinhos sul-americanos se recusam a reconhecer o novo governo. O Mercosul suspende o Brasil, bancos estrangeiros congelam linhas de crédito e o real perde um terço do valor em duas semanas.",
        "Nos supermercados, os preços sobem dia após dia. Exportadores do agronegócio — parte da sua base — ligam desesperados: contratos estão sendo cancelados."
      ],
      choices: [
        { text: "Prometer eleições supervisionadas para obter reconhecimento.", effects: { internacional: 15, militar: -10 }, next: "racha_militar" },
        { text: "Buscar apoio em governos simpáticos e ignorar o Ocidente.", effects: { internacional: -5, base: 5 }, next: "racha_militar" },
        { text: "Congelar preços e decretar controle de câmbio.", effects: { apoio: 5, base: -10 }, next: "racha_militar" }
      ]
    },
    racha_militar: {
      chapter: "Fevereiro de 2023",
      title: "O Racha nas Forças",
      onEnter: { map: { AM: "resistencia", AP: "resistencia" } },
      text: [
        "O que se temia acontece: o comando militar do Nordeste e unidades da Marinha declaram lealdade ao governo constitucional. Generais que antes hesitavam agora escolhem lados. Amazonas e Amapá passam para a resistência. E no Sul, os governadores do Rio Grande do Sul e de Santa Catarina — a chamada Liga do Sul — observam o racha e medem até onde Brasília ainda manda neles.",
        "Pela primeira vez em mais de um século, tropas brasileiras estão frente a frente com tropas brasileiras."
      ],
      choices: [
        { text: "Oferecer anistia e promoções aos oficiais que voltarem.", effects: { militar: 5, base: 5 }, map: { MG: "regime" }, next: "guerra" },
        { text: "Ordenar uma ofensiva para retomar o Nordeste.", effects: { militar: -10, apoio: -10, internacional: -10 }, map: { TO: "regime" }, split: { BA: "regime" }, next: "guerra" },
        { text: "Abrir negociação secreta com o governo constitucional.", effects: { base: 10, internacional: 10, militar: -10 },
          next: [ { if: { min: { internacional: 15 } }, to: "fim_restauracao" }, { to: "guerra" } ] }
      ]
    },
    guerra: {
      chapter: "2023",
      title: "O País Partido",
      text: [
        "A frente de batalha corta Minas Gerais e o oeste da Bahia. A economia está em colapso; milhares de famílias fogem para o Paraguai, a Bolívia e o Uruguai. No Sul, a Liga do Sul mede forças com Brasília: se a tensão passar do limite, ela abre uma terceira frente.",
        "O Brasil, que entrou em 2022 como um país polarizado, agora corre o risco de não ser mais um país."
      ],
      textAlt: [
        { if: { flags: ["sul_aliado"] }, text: ["A frente de batalha corta Minas Gerais e o oeste da Bahia. A economia está em colapso; milhares de famílias fogem para o Paraguai, a Bolívia e o Uruguai. No Sul, o Pacto Federativo segura: as brigadas gaúchas e catarinenses lutam ao lado de Brasília.", "O Brasil, que entrou em 2022 como um país polarizado, agora corre o risco de não ser mais um país."] },
        { if: { flags: ["sul_revolta"], anyControl: ["separatista"] }, text: ["A frente de batalha corta Minas Gerais e o oeste da Bahia. A economia está em colapso; milhares de famílias fogem para o Paraguai, a Bolívia e o Uruguai. No Sul, a Liga do Sul consolida o que tomou e já fala em fronteira própria.", "O Brasil, que entrou em 2022 como um país polarizado, agora corre o risco de não ser mais um país."] }
      ],
      choices: [
        { text: "Seguir lutando: a guerra continua até um lado ceder.", next: "impasse" },
        { text: "Aceitar um cessar-fogo com as linhas atuais congeladas.", effects: { base: 5 }, next: "fim_divisao" },
        { text: "Renunciar e negociar uma saída do país.", next: "fim_restauracao" }
      ]
    },

    impasse: {
      chapter: "A guerra se arrasta",
      title: "Impasse",
      text: [
        "Meses de combate depois, nenhum lado consegue o golpe decisivo. Cidades vivem sob racionamento, as famílias contam os mortos e os dois exércitos estão exaustos. O cansaço da guerra pesa sobre o Apoio Popular e deixa as frentes mais voláteis a cada mês.",
        "Diplomatas, bispos e generais batem à sua porta com a mesma pergunta: até quando?"
      ],
      choices: [
        { text: "Nenhuma paz sem vitória: a guerra continua.", effects: { militar: 2, apoio: -4 }, next: "impasse" },
        { text: "Aceitar a mediação e uma trégua de três meses.", effects: { internacional: 5, militar: -3 }, next: "impasse" },
        { text: "Lançar tudo numa ofensiva final.", req: { min: { militar: 55 } },
          next: [ { if: { min: { militar: 65, apoio: 30 } }, to: "fim_regime" }, { if: { min: { militar: 50 } }, to: "fim_divisao" }, { to: "fim_restauracao" } ] },
        { text: "Aceitar um cessar-fogo com as linhas atuais congeladas.", effects: { base: 5 }, next: "fim_divisao" },
        { text: "Renunciar e negociar uma saída do país.", next: "fim_restauracao" }
      ]
    },

    /* ======================= FINAIS ======================= */
    fim_retorno: {
      ending: true, outcome: "vitoria", endingName: "De Volta pelas Urnas", dica: "Aceite o resultado, faça uma defesa técnica nos tribunais (Base Política 55 ou mais) e dispute 2026 com o Apoio Popular alto.",
      onEnter: { map: { MG: "oposicao", AM: "oposicao", TO: "oposicao" } },
      chapter: "Epílogo", title: "A Revanche Democrática",
      text: [
        "Na madrugada da apuração, desta vez a margem estreita favorece você. O adversário reconhece o resultado, e a transição acontece sem tanques nem bloqueios.",
        "Você volta ao Planalto pelo caminho que a Constituição prevê. Os historiadores vão discutir por décadas se 2022 foi o fim de uma era ou apenas um intervalo."
      ]
    },
    fim_urnas: {
      ending: true, outcome: "vitoria", endingName: "A Virada nas Urnas", dica: "Na cena 'A Ação no TSE', monte a frente legal. Leve a contestação a 100 com auditorias, tribunais e o Congresso, sem deixar a credibilidade zerar nem a escalada chegar a 100.",
      chapter: "Epílogo", title: "A Virada nas Urnas",
      text: [
        "Numa sessão de onze horas, o TSE anula o resultado em parte das seções e convoca uma nova votação. Sem um tiro, sem um tanque, sem um decreto: só papel timbrado, laudos e uma maioria apertada de ministros.",
        "Meses depois, numa eleição que o mundo inteiro acompanha, você vence por menos de um ponto. Metade do país jamais vai aceitar essa vitória, mas não há como chamá-la de golpe: ela passou por todos os tribunais."
      ]
    },
    fim_cassado: {
      ending: true, outcome: "derrota", endingName: "Inelegível", dica: "Na contestação das urnas, deixe a credibilidade chegar a zero (ofensivas nas redes e ataques aos ministros) e o TSE declara você inelegível.",
      chapter: "Epílogo", title: "Fora do Jogo",
      text: [
        "O TSE considera a sua contestação um ataque deliberado ao sistema eleitoral: abuso de poder político e uso indevido dos meios de comunicação. Por unanimidade, você fica inelegível por oito anos.",
        "O vencedor toma posse sem incidentes. Seus aliados pedem distância, e o seu nome vira sinônimo de uma briga que não convenceu nem os tribunais, nem o país."
      ]
    },
    fim_oposicao: {
      ending: true, outcome: "parcial", endingName: "Líder da Oposição", dica: "Aceite o resultado e, no fim, escolha comandar a direita sem disputar o cargo (ou aceite esse papel depois de perder uma eleição).",
      chapter: "Epílogo", title: "A Voz da Oposição",
      text: [
        "Você não volta ao Planalto, mas também não desaparece. Seu partido continua entre os maiores do Congresso, e nenhum candidato de direita se elege sem pedir a sua bênção.",
        "Para uns, você é o líder que aceitou as regras do jogo; para outros, uma promessa adiada. Em Brasília, todos concordam numa coisa: ninguém pode ignorá-lo."
      ]
    },
    fim_herdeiro: {
      ending: true, outcome: "vitoria", endingName: "O Herdeiro", dica: "Se ficar inelegível, apoie um herdeiro político e chegue à eleição com Apoio Popular e Base Política em 50 ou mais.",
      onEnter: { map: { MG: "oposicao" } },
      chapter: "Epílogo", title: "O Fazedor de Reis",
      text: [
        "Inelegível, você percorre o país ao lado do candidato que escolheu. Os votos que eram seus migram para ele — e, numa eleição apertada, o seu herdeiro vence.",
        "Você não tem cargo, mas tem influência. A pergunta que domina a nova legislatura é quanto tempo o herdeiro aceitará viver à sombra de quem o fez."
      ]
    },
    fim_ostracismo: {
      ending: true, outcome: "derrota", endingName: "Ostracismo", dica: "Fora do regime, deixe o Apoio Popular chegar a zero, ou insista na própria candidatura depois de ficar inelegível.",
      onEnter: { resolve: { oposicao: "legal" }, map: { SC: "oposicao", RR: "oposicao", RO: "oposicao", AC: "oposicao" } },
      chapter: "Epílogo", title: "O Lento Apagar das Luzes",
      text: [
        "Os processos se acumulam, os aliados se dispersam e novos nomes disputam o espólio da direita. A base, antes unida, se fragmenta em correntes que já não esperam por você.",
        "Restam alguns redutos fiéis e uma pergunta que você repete em entrevistas cada vez mais raras: em que momento o país mudou de assunto?"
      ]
    },
    fim_golpe_fracassado: {
      ending: true, outcome: "derrota", endingName: "O Golpe Que Não Veio", dica: "Tente a ruptura sem Apoio Militar suficiente e decida permanecer no país.",
      chapter: "Epílogo", title: "O Banco dos Réus",
      text: [
        "A tentativa de ruptura termina em papel: um decreto anulado, uma ordem ignorada, uma reunião registrada em atas e depoimentos. Você é denunciado por crimes contra o Estado Democrático de Direito e responde ao processo no Brasil.",
        "As instituições resistiram — e o julgamento vira um marco para todo o continente. A democracia brasileira sai arranhada, mas de pé."
      ]
    },
    fim_exilio: {
      ending: true, outcome: "derrota", endingName: "Exílio", dica: "Tente a ruptura sem Apoio Militar suficiente e decida deixar o país.",
      chapter: "Epílogo", title: "Longe de Casa",
      text: [
        "Um avião decola de madrugada. No exterior, você concede entrevistas, recebe visitas de aliados e acompanha pela televisão os processos que correm à sua revelia.",
        "Os anos passam. A cada eleição, alguém promete trazê-lo de volta; a cada eleição, a promessa fica menor. A pátria que você quis governar sem as urnas segue em frente sem você."
      ]
    },
    fim_regime: {
      ending: true, outcome: "vitoria", endingName: "Regime de Exceção", dica: "Siga a ruptura com Apoio Militar alto e vença a guerra até dominar quase todo o território.",
      onEnter: { resolve: { resistencia: "regime", separatista: "regime" } },
      chapter: "Epílogo", title: "Vitória Amarga",
      text: [
        "A resistência se rende. O país volta a ter um só governo — o seu. Mas o preço é visível em cada esquina: imprensa sob censura, Congresso de fachada, tribunais esvaziados, sanções que estrangulam a economia e uma geração inteira de profissionais emigrando.",
        "Você venceu a guerra. Resta saber por quanto tempo é possível governar um país que nunca o escolheu dessa forma."
      ]
    },
    fim_divisao: {
      ending: true, outcome: "parcial", endingName: "O Brasil Partido", dica: "Durante a guerra (ou no impasse), aceite um cessar-fogo com as linhas congeladas.",
      chapter: "Epílogo", title: "Três Bandeiras",
      text: [
        "O cessar-fogo vira fronteira. Brasília controla o Centro-Sul; o governo constitucional, o Norte e o Nordeste; a Liga do Sul hasteia sua própria bandeira entre o Paraná e o Uruguai. Minas Gerais continua cortada por trincheiras.",
        "Diplomatas falam em \"conflito congelado\". Nas famílias separadas pela linha de frente, ninguém usa essa palavra. A guerra de separação que muitos julgavam impossível tornou-se o novo normal."
      ],
      textAlt: [
        { if: { noFlags: ["sul_revolta"] }, title: "Duas Bandeiras", text: ["O cessar-fogo vira fronteira. Brasília controla o Centro-Sul e o Sul — os governadores sulistas nunca romperam —; o governo constitucional fica com o Norte e o Nordeste. Minas Gerais continua cortada por trincheiras.", "Diplomatas falam em \"conflito congelado\". Nas famílias separadas pela linha de frente, ninguém usa essa palavra. A guerra de separação que muitos julgavam impossível tornou-se o novo normal."] }
      ]
    },
    fim_restauracao: {
      ending: true, outcome: "derrota", endingName: "Restauração Democrática", dica: "No regime, perca a maioria dos estados, deixe o Apoio Popular chegar a zero ou negocie uma saída.",
      onEnter: { resolve: { regime: "legal", resistencia: "legal", separatista: "legal", voto_lula: "legal", voto_bolso: "legal" } },
      chapter: "Epílogo", title: "O Fim da Aventura",
      text: [
        "Sem dinheiro, sem reconhecimento e com as tropas desertando, o regime desmorona. O governo constitucional retorna a Brasília, o Congresso é reaberto e uma comissão nacional começa a apurar responsabilidades.",
        "Você é preso e julgado. O país levará anos para reconstruir a economia e a confiança entre vizinhos — mas reconstrói, dentro da Constituição que você tentou rasgar."
      ]
    },
    fim_isolamento: {
      ending: true, outcome: "derrota", endingName: "Isolamento Total", dica: "Fique meses sem reconhecimento das potências e sob sanções ou hostilidade da maioria delas.",
      chapter: "Epílogo", title: "Portas Fechadas",
      text: [
        "Embaixadas fecham uma após a outra. Linhas de crédito externas somem, o dólar some das reservas e até aliados discretos preferem o silêncio. Sem reconhecimento e sob pressão prolongada, o governo fica sem oxigênio político.",
        "Você ainda ocupa o Planalto — mas o mundo já tratou o Brasil como um parêntese. O Isolamento total encerra a aventura antes que a guerra ou as urnas o façam."
      ]
    }
  }
};
