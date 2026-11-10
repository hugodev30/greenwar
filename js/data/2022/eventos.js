// js/data/2022/eventos.js — Cenário 2022 — eventos aleatórios e encadeados do mês.
// Cada evento: ev(id, título, texto(s), escolhas, { if, weight, once, cooldown, crisisOf, chain... }).
// Cada escolha: { text, fx: { s:{apoio…}, money, fac:{…}, act:{…}, south… }, req? }.
const EVENTOS_2022 = [
    ev("c_mil_regime", "Defecções nos quartéis", "Unidades inteiras se declaram leais à Constituição.", [
      { text: "Oferecer anistia e promoções a quem voltar.", fx: { money: -6, fac: { militares: 22 } } },
      { text: "Expurgar os comandantes rebeldes.", fx: { s: { militar: -6 }, reserve: -1, fac: { militares: 8 } } } ], { crisisOf: "militares", if: { phase: "regime" } }),
    ev("c_mil", "Comandantes reafirmam a Constituição", "Os comandos divulgam nota defendendo o respeito às instituições.", [
      { text: "Elogiar a nota e baixar o tom.", fx: { s: { internacional: 4 }, fac: { militares: 20, stf: 4 } } },
      { text: "Criticar a nota publicamente.", fx: { s: { militar: -6, apoio: 2 }, fac: { militares: 5 } } } ], { crisisOf: "militares" }),
    ev("c_centrao", "Debandada do Centrão", "Partidos aliados anunciam independência e negociam com o outro lado.", [
      { text: "Oferecer espaço e verbas.", fx: { money: -5, fac: { centrao: 25 } } },
      { text: "Deixar ir e apostar na base fiel.", fx: { s: { base: -8, apoio: 2 } } } ], { crisisOf: "centrao" }),
    ev("c_agro", "Mercado em alerta", "Empresários e exportadores temem instabilidade e cortam doações.", [
      { text: "Garantias públicas de estabilidade.", fx: { s: { internacional: 3 }, fac: { agro: 22 } } },
      { text: "Acusar os críticos de traição.", fx: { money: -6, s: { apoio: 2 } } } ], { crisisOf: "agro" }),
    ev("c_evangelicos", "Lideranças pedem distância", "Pastores influentes evitam aparecer ao seu lado.", [
      { text: "Reunião reservada com as lideranças.", fx: { money: -2, fac: { evangelicos: 22 } } },
      { text: "Falar diretamente aos fiéis.", fx: { s: { apoio: -4 } } } ], { crisisOf: "evangelicos" }),
    ev("c_movimentos_regime", "Greve geral contra o regime", "Sindicatos e movimentos param capitais inteiras.", [
      { text: "Negociar uma trégua social.", fx: { money: -5, s: { militar: -3 }, fac: { movimentos: 20 } } },
      { text: "Reprimir a greve.", fx: { unrestAll: 12, s: { internacional: -8, apoio: -5 } } } ], { crisisOf: "movimentos", if: { phase: "regime" } }),
    ev("c_movimentos", "Grandes manifestações", "Movimentos sociais lotam avenidas em várias capitais.", [
      { text: "Ignorar e reforçar a própria mobilização.", fx: { s: { apoio: 1 }, unrestAll: 6 } },
      { text: "Baixar o tom e evitar confronto.", fx: { fac: { movimentos: 18 }, s: { apoio: -2 } } } ], { crisisOf: "movimentos" }),
    ev("c_stf_regime", "Tribunais declaram atos nulos", "Juízes e tribunais declaram ilegais os decretos do regime.", [
      { text: "Ignorar as decisões.", fx: { s: { internacional: -8 }, actAll: -4 } },
      { text: "Negociar uma saída jurídica.", fx: { s: { militar: -4, internacional: 4 }, fac: { stf: 20 } } } ], { crisisOf: "stf", if: { phase: "regime" } }),
    ev("c_stf", "Inquéritos avançam", "Investigações sobre você e aliados ganham novas etapas.", [
      { text: "Colaborar e apresentar defesa técnica.", fx: { s: { base: 2 }, fac: { stf: 20 } } },
      { text: "Atacar publicamente os ministros.", fx: { s: { apoio: 3, internacional: -5, base: -4 } } } ], { crisisOf: "stf" }),
    ev("r_bloqueios", "Bloqueios em rodovias", "Apoiadores bloqueiam estradas em vários estados contestando o resultado.", [
      { text: "Pedir a desmobilização.", fx: { s: { apoio: -3, internacional: 5 }, fac: { agro: 5, stf: 4 } } },
      { text: "Ficar em silêncio e deixar seguir.", fx: { s: { apoio: 3, internacional: -5 }, fac: { agro: -5 } } } ], { if: { until: "2022-12" }, weight: 3, once: true }),
    ev("r_inflacao", "Alta nos alimentos", "O preço da comida volta a pesar no orçamento das famílias.", [
      { text: "Culpar o governo de turno.", fx: { s: { apoio: 2 } }, req: { phase: "oposicao" } },
      { text: "Propor medidas de alívio.", fx: { money: -3, s: { apoio: 2 } } } ]),
    ev("r_chuvas", "Chuvas e deslizamentos", "Temporais deixam desabrigados no litoral.", [
      { text: "Visitar as áreas e mobilizar doações.", fx: { money: -3, s: { apoio: 3 } } },
      { text: "Manter a agenda.", fx: { s: { apoio: -2 } } } ]),
    ev("r_vazamento", "Vazamento de mensagens", "Conversas de aliados são divulgadas pela imprensa.", [
      { text: "Afastar os envolvidos.", fx: { s: { base: -3, internacional: 2 } } },
      { text: "Negar e falar em perseguição.", fx: { s: { apoio: 2, internacional: -3 }, fac: { stf: -5 } } } ], { cooldown: 9 }),
    ev("r_pf", "Operação policial em aliados", "Uma operação cumpre mandados contra pessoas próximas.", [
      { text: "Defender a legalidade e esperar o processo.", fx: { fac: { stf: 6 }, s: { base: -2 } } },
      { text: "Convocar apoiadores em protesto.", fx: { s: { apoio: 3 }, fac: { stf: -8 }, unrestAll: 4 } } ], { if: { phase: "oposicao" } }),
    ev("r_argentina", "Novo governo na Argentina", "Um presidente de direita, crítico do governo brasileiro, toma posse em Buenos Aires.", [
      { text: "Comparecer à posse.", fx: { act: { argentina: 35 }, s: { internacional: 2 } } },
      { text: "Enviar apenas uma mensagem.", fx: { act: { argentina: 15 } } } ], { if: { phase: "oposicao", from: "2023-12", until: "2024-06" }, once: true, weight: 6 }),
    ev("r_commodities", "Preço das commodities dispara", "Exportações de soja e minério batem recorde.", [
      { text: "Capitalizar politicamente.", fx: { money: 4, fac: { agro: 4 } } },
      { text: "Não comentar.", fx: { money: 2 } } ]),
    ev("r_sancoes", "Sanções secundárias", "Bancos estrangeiros congelam operações ligadas ao regime.", [
      { text: "Buscar canais alternativos.", fx: { money: -3, act: { china: 4, russia: 4 } } },
      { text: "Absorver o golpe.", fx: { money: -6 } } ], { if: { phase: "regime" } }),
    ev("r_corredor", "Pedido de corredor humanitário", "Organismos internacionais pedem passagem segura para civis em áreas de combate.", [
      { text: "Autorizar o corredor.", fx: { s: { internacional: 8, militar: -3 }, act: { onu: 10 } } },
      { text: "Recusar.", fx: { s: { internacional: -8 }, act: { onu: -10 } } } ], { if: { phase: "regime" }, weight: 1.5 }),
    // ======== Eventos ampliados (2022) ========
    // Fios condutores: economia, redes, instituições, igrejas, quartéis, governadores, mundo, Amazônia, desastres, guerra.
    // Opções: { if, weight, once, cooldown, chained } · chained = só chega como desdobramento (fx.chain) de outra escolha.

    // ---- Transição (presidente em fim de mandato) ----
    ev("n_dolar", "Dólar dispara depois da eleição", ["A incerteza sobre a transição derruba a bolsa e empurra o dólar para cima.", "Bancos e exportadores ligam para o Planalto pedindo um sinal."], [
      { text: "Reunir-se com a equipe econômica e acalmar o mercado.", fx: { money: -2, s: { internacional: 3 }, fac: { agro: 6, centrao: 2 } } },
      { text: "Culpar a vitória do adversário pela fuga de capitais.", fx: { s: { apoio: 2, internacional: -3 }, fac: { agro: -4 } } },
      { text: "Não comentar: o mercado que se acalme sozinho.", fx: { s: { base: -2 }, fac: { agro: -2 } } } ], { if: { phase: "governo" }, once: true, weight: 2 }),
    ev("n_acampamentos", "Acampamentos em frente aos quartéis", ["Milhares de apoiadores montam barracas diante de unidades militares e pedem intervenção.", "Comandantes pedem uma orientação clara do presidente."], [
      { text: "Pedir publicamente que voltem para casa.", fx: { s: { apoio: -4, internacional: 4 }, fac: { stf: 6, militares: -3 } } },
      { text: "Visitar um acampamento e agradecer o apoio.", fx: { s: { apoio: 4, militar: 3, internacional: -5 }, fac: { stf: -8 }, chain: { id: "n_acampamentos_radical", in: 2 } } },
      { text: "Ficar em silêncio e deixar que os comandos decidam.", fx: { s: { base: -2 }, fac: { militares: 2 } } } ], { if: { phase: "governo" }, once: true, weight: 3 }),
    ev("n_acampamentos_radical", "Acampamentos se radicalizam", ["Grupos que saíram dos acampamentos planejam atos violentos em Brasília.", "A Polícia Federal monitora; jornalistas perguntam se você apoia os radicais."], [
      { text: "Condenar a violência em rede nacional.", fx: { s: { apoio: -3, internacional: 5 }, fac: { stf: 5, evangelicos: 2 } } },
      { text: "Ficar em silêncio e culpar “infiltrados”.", fx: { s: { internacional: -6 }, fac: { stf: -6, militares: 3 }, unrestUF: { DF: 10 } } } ], { chained: true }),
    ev("n_transicao_dados", "Equipe de transição pede informações", "A equipe do presidente eleito pede dados sobre orçamento, reservas e contratos em andamento.", [
      { text: "Colaborar plenamente.", fx: { s: { internacional: 4, base: -2 }, fac: { stf: 4 }, act: { eua: 5, ue: 5 } } },
      { text: "Atrasar e dificultar o acesso.", fx: { s: { base: 2, internacional: -3 }, fac: { stf: -6, centrao: -2 } } } ], { if: { phase: "governo", until: "2022-12" }, once: true, weight: 2 }),

    // ---- Qualquer fase: economia, redes, Amazônia, desastres, mundo ----
    ev("n_caminhoneiros", "Caminhoneiros ameaçam parar o país", ["Lideranças de transportadores marcam greve contra o preço do diesel.", "Postos e supermercados já temem desabastecimento."], [
      { text: "Prometer diesel mais barato e uma mesa de negociação.", fx: { money: -4, s: { apoio: 3 }, fac: { agro: 3 } } },
      { text: "Incentivar a paralisação.", fx: { s: { apoio: 4, internacional: -4 }, fac: { agro: -8, stf: -4 }, unrestAll: 5 } },
      { text: "Pedir calma e mediar com as transportadoras.", fx: { s: { base: -2, internacional: 2 }, fac: { agro: 4 } } } ], { cooldown: 12 }),
    ev("n_boatos", "Onda de boatos nas redes", ["Correntes de mensagens com informações falsas sobre o seu campo e o adversário explodem nos grupos de família.", "Agências de checagem pedem que você se posicione."], [
      { text: "Desmentir até os boatos que favorecem você.", fx: { s: { internacional: 3, apoio: -2 }, fac: { stf: 4 } } },
      { text: "Compartilhar os conteúdos mais virais.", fx: { s: { apoio: 3, internacional: -3 }, fac: { stf: -6 }, chain: { id: "n_inquerito_redes", in: 3 } } },
      { text: "Ficar em silêncio.", fx: { s: { base: -1 } } } ], { if: { notPhase: "regime" }, cooldown: 9 }),
    ev("n_inquerito_redes", "Inquérito sobre desinformação", "Um ministro do Supremo inclui perfis do seu campo num inquérito sobre redes de desinformação.", [
      { text: "Orientar os aliados a colaborar com as investigações.", fx: { s: { base: -3 }, fac: { stf: 8 } } },
      { text: "Chamar o inquérito de censura.", fx: { s: { apoio: 3, internacional: -3 }, fac: { stf: -10 }, act: { eua: -3 } } } ], { chained: true, if: { notPhase: "regime" } }),
    ev("n_juros", "Juros altos travam o crédito", "Com a taxa básica de juros nas alturas, empresas adiam investimentos e famílias se endividam.", [
      { text: "Criticar o Banco Central e prometer crédito barato.", fx: { s: { apoio: 2, internacional: -2 }, fac: { agro: 3 } } },
      { text: "Defender a disciplina fiscal.", fx: { s: { internacional: 3, apoio: -1 }, fac: { agro: 5, movimentos: -3 } } } ], { if: { notPhase: "governo" } }),
    ev("n_petroleiros", "Greve nacional dos petroleiros", "Petroleiros cruzam os braços contra a venda de refinarias; o abastecimento preocupa.", [
      { text: "Apoiar parte da pauta dos trabalhadores.", fx: { fac: { movimentos: 10, agro: -4 }, s: { base: -1 } } },
      { text: "Defender privatizações e cortar o ponto.", fx: { money: 2, fac: { agro: 6, movimentos: -8 }, unrestAll: 3 } } ], { cooldown: 12 }),
    ev("n_queimadas", "Queimadas batem recorde na Amazônia", ["Satélites registram o pior mês de queimadas em anos; a fumaça chega às capitais do Sudeste.", "Europeus ameaçam travar o acordo comercial com o Mercosul."], [
      { text: "Defender fiscalização dura contra o desmatamento.", fx: { s: { internacional: 5 }, fac: { agro: -5 }, act: { ue: 8, eua: 4 } } },
      { text: "Defender o produtor rural e criticar ONGs estrangeiras.", fx: { s: { internacional: -5, apoio: 1 }, fac: { agro: 8 }, act: { ue: -10 } } } ], { cooldown: 12 }),
    ev("n_seca", "Seca histórica nos rios amazônicos", "Rios secam a níveis nunca vistos; comunidades ribeirinhas ficam isoladas e cidades racionam água.", [
      { text: "Organizar ajuda e cobrar ação coordenada.", fx: { money: -3, s: { apoio: 2, internacional: 3 }, act: { onu: 5 }, unrestUF: { AM: -8, PA: -5 } } },
      { text: "Minimizar: é um fenômeno natural.", fx: { s: { apoio: -2, internacional: -3 }, act: { ue: -5 }, unrestUF: { AM: 6 } } } ], { if: { from: "2023-06" }, once: true }),
    ev("n_enchentes", "Enchentes devastam o Rio Grande do Sul", ["Chuvas sem precedentes alagam cidades inteiras; centenas de milhares estão desalojados.", "Voluntários de todo o país seguem para o Sul."], [
      { text: "Mobilizar doações e voluntários do seu movimento.", fx: { money: -4, s: { apoio: 4 }, unrestUF: { RS: -10 } } },
      { text: "Enviar tropas para o resgate.", req: { phase: "regime" }, fx: { reserve: -1, s: { apoio: 4, internacional: 2 }, unrestUF: { RS: -15, SC: -5 } } },
      { text: "Criticar a resposta das autoridades.", fx: { s: { base: 2, apoio: -2 }, unrestUF: { RS: 5 } } } ], { if: { from: "2023-09" }, once: true, weight: 1.5 }),
    ev("n_china_carne", "China suspende compras de carne", "Pequim suspende importações de frigoríficos brasileiros alegando questões sanitárias.", [
      { text: "Enviar emissários a Pequim.", fx: { money: -2, fac: { agro: 6 }, act: { china: 12 } } },
      { text: "Buscar novos mercados com os EUA.", fx: { money: -2, fac: { agro: -3 }, act: { eua: 6, china: -4 } } },
      { text: "Acusar a China de chantagem.", fx: { s: { apoio: 2 }, fac: { agro: -10 }, act: { china: -15 } } } ], { cooldown: 12 }),
    ev("n_mercosul", "Cúpula do Mercosul", "Presidentes da região se reúnem em Montevidéu; a pauta inclui o acordo com a União Europeia e a situação brasileira.", [
      { text: "Comparecer e defender o bloco.", fx: { s: { internacional: 3 }, act: { argentina: 8, mercosul: 8, venezuela: 4, ue: 3 } } },
      { text: "Boicotar a cúpula.", fx: { s: { apoio: 1, internacional: -2 }, act: { mercosul: -8, venezuela: -8, argentina: -5 } } } ], { if: { notPhase: "governo" }, cooldown: 12 }),
    ev("n_influenciador", "Influenciador rompe com você", "Um dos maiores influenciadores da direita grava um vídeo dizendo que se sentiu traído.", [
      { text: "Responder ao vivo, sem filtro.", fx: { s: { apoio: 2, base: -2 } } },
      { text: "Chamá-lo para uma conversa reservada.", fx: { money: -2, s: { apoio: 3 } } },
      { text: "Ignorar.", fx: { s: { apoio: -2 } } } ], { if: { notPhase: "governo" }, cooldown: 12 }),

    // ---- Líder da oposição ----
    ev("n_cpmi", "CPMI dos atos de janeiro", "O Congresso instala uma comissão mista para investigar os ataques às sedes dos Três Poderes.", [
      { text: "Indicar aliados combativos para a comissão.", fx: { money: -2, s: { base: 3 }, fac: { centrao: 4, stf: -3 } } },
      { text: "Boicotar os trabalhos.", fx: { s: { apoio: 2 }, fac: { stf: -6, centrao: -4 } } },
      { text: "Colaborar e pedir punição de quem depredou.", fx: { s: { base: -4, internacional: 3 }, fac: { stf: 8 } } } ], { if: { phase: "oposicao", visited: ["crise_janeiro"] }, once: true, weight: 2 }),
    ev("n_reforma_tributaria", "Votação da reforma tributária", "O governo leva ao plenário a reforma dos impostos sobre o consumo. Sua bancada decide o placar.", [
      { text: "Orientar voto contra.", fx: { s: { base: 3 }, fac: { agro: 3, centrao: -4 } } },
      { text: "Negociar exceções para o agro em troca de votos.", fx: { money: -2, fac: { agro: 8, centrao: 4 } } },
      { text: "Liberar a bancada.", fx: { s: { base: -2 }, fac: { centrao: 5 } } } ], { if: { phase: "oposicao", from: "2023-06" }, once: true }),
    ev("n_municipais", "Eleições municipais de 2024", "Prefeituras e câmaras em todo o país: um teste para medir a força do seu campo.", [
      { text: "Investir pesado nas campanhas.", fx: { money: -6, s: { base: 6, apoio: 3 }, opp: "o_popularidade" } },
      { text: "Apoiar apenas candidatos fortes.", fx: { money: -2, s: { base: 3 }, fac: { centrao: 3 } } },
      { text: "Ficar fora da disputa.", fx: { s: { base: -4 }, fac: { centrao: -4 } } } ], { if: { phase: "oposicao", from: "2024-07", until: "2024-12" }, once: true, weight: 5 }),
    ev("n_passaporte", "Justiça retém seu passaporte", "Num inquérito em andamento, um ministro determina a entrega do seu passaporte.", [
      { text: "Cumprir a ordem sem alarde.", fx: { s: { apoio: -2 }, fac: { stf: 6 } } },
      { text: "Recorrer e convocar um ato.", fx: { s: { apoio: 3 }, fac: { stf: -6 }, unrestAll: 2 } } ], { if: { phase: "oposicao", from: "2023-09" }, once: true }),
    ev("n_vaquinha", "Vaquinha de apoiadores", "Apoiadores organizam uma campanha de doações para cobrir suas despesas jurídicas.", [
      { text: "Aceitar e agradecer em vídeo.", fx: { money: 6, fac: { stf: -2 } } },
      { text: "Pedir que doem a obras sociais das igrejas.", fx: { s: { apoio: 2 }, fac: { evangelicos: 5 } } } ], { if: { phase: "oposicao" }, once: true }),
    ev("n_governador_desponta", "Governador do seu campo desponta", "Um governador do seu campo aparece à frente nas pesquisas para 2026. A imprensa pergunta se ele é o seu herdeiro.", [
      { text: "Apresentá-lo como herdeiro do movimento.", req: { flags: ["fo_a_herdeiro"] }, fx: { s: { base: 6, apoio: 2 }, fac: { centrao: 5 } } },
      { text: "Abraçá-lo como aliado, sem compromisso.", fx: { s: { base: 3, apoio: -1 }, fac: { centrao: 4 } } },
      { text: "Marcar território: o candidato sou eu.", fx: { s: { apoio: 3, base: -4 }, fac: { centrao: -3 } } } ], { if: { phase: "oposicao", from: "2024-01" }, cooldown: 12 }),
    ev("n_pregador", "Pregador famoso pede seu apoio", "Um líder de uma grande igreja convida você para um culto lotado e pede apoio a um projeto no Congresso.", [
      { text: "Subir ao púlpito e discursar.", fx: { s: { apoio: 2, internacional: -2 }, fac: { evangelicos: 10 } } },
      { text: "Gravar um vídeo de apoio.", fx: { fac: { evangelicos: 5 } } },
      { text: "Recusar e manter distância.", fx: { s: { internacional: 2 }, fac: { evangelicos: -8, stf: 2 } } } ], { if: { phase: "oposicao" }, cooldown: 12 }),
    ev("n_entrevista", "Grande entrevista no horário nobre", "Depois da reaproximação com a imprensa, uma emissora oferece uma entrevista longa e ao vivo.", [
      { text: "Tom conciliador.", fx: { s: { internacional: 5, apoio: 2 }, fac: { stf: 3 } } },
      { text: "Partir para cima dos entrevistadores.", fx: { s: { apoio: 3, internacional: -4 } } } ], { if: { phase: "oposicao", flags: ["fo_s_imprensa"] }, once: true, weight: 3 }),
    ev("n_plataforma", "Plataforma derruba rede de perfis", "Uma rede social remove centenas de perfis da sua máquina digital por comportamento inautêntico.", [
      { text: "Aceitar e mudar a estratégia.", fx: { s: { base: -3 }, fac: { stf: 4 } } },
      { text: "Migrar a base para outra plataforma.", fx: { money: -3, s: { apoio: 2 } } },
      { text: "Denunciar censura internacional.", fx: { s: { apoio: 3 }, fac: { stf: -6 }, act: { eua: -6, ue: -8 } } } ], { if: { notPhase: "governo", flags: ["fo_s_redes"] }, once: true, weight: 3 }),
    ev("n_buenos_aires", "Convite de Buenos Aires", "O governo argentino convida você para um fórum conservador com lideranças de vários países.", [
      { text: "Viajar e discursar.", fx: { money: -2, s: { internacional: 3, apoio: 1 }, act: { argentina: 12, eua: 3 } } },
      { text: "Agradecer e recusar.", fx: { act: { argentina: -5 } } } ], { if: { notPhase: "governo", actor: { argentina: { min: 20 } } }, cooldown: 12 }),
    ev("n_delacao", "Ex-assessor negocia delação", ["Um antigo assessor, investigado pelas conversas sobre ruptura, negocia um acordo com a Polícia Federal.", "Seus advogados pedem uma estratégia."], [
      { text: "Desqualificar o delator em público.", fx: { s: { apoio: 2 }, fac: { stf: -8 } } },
      { text: "Ficar em silêncio e apostar na defesa técnica.", fx: { money: -3, fac: { stf: 3 } } } ], { if: { phase: "oposicao", flags: ["conspiracao"] }, once: true, weight: 3 }),
    ev("n_ato_paulista", "Grande ato na Avenida Paulista", "Aliados convocam um ato para mostrar força; a polícia estima centenas de milhares de pessoas.", [
      { text: "Discursar com moderação.", fx: { money: -2, s: { apoio: 4, internacional: 1 } } },
      { text: "Discurso inflamado contra o Supremo.", fx: { money: -2, s: { apoio: 6 }, fac: { stf: -10 }, unrestUF: { SP: 6 } } } ], { if: { phase: "oposicao", from: "2023-09" }, cooldown: 15 }),

    // ---- Regime de exceção / guerra ----
    ev("n_desercao", "Deserções em massa", "Soldados abandonam os quartéis em vários estados; as famílias pedem que voltem para casa.", [
      { text: "Pagar bônus de permanência.", fx: { money: -6, org: 6, fac: { militares: 5 } } },
      { text: "Prender os desertores capturados.", fx: { s: { militar: 2, apoio: -4, internacional: -4 }, fac: { militares: 3 } } },
      { text: "Aceitar a perda e reorganizar as unidades.", fx: { reserve: -1, org: 4 } } ], { if: { phase: "regime" }, cooldown: 4, weight: 1.5 }),
    ev("n_sabotagem", "Sabotagem numa refinaria", "Uma explosão paralisa a maior refinaria sob seu controle; o combustível do Exército começa a faltar.", [
      { text: "Racionar o combustível civil.", fx: { s: { apoio: -4 }, unrest: 5 } },
      { text: "Infiltrar agentes na rede de sabotadores.", fx: { money: -3, org: -3, chain: { id: "n_rede_sabotadores", in: 2 } } },
      { text: "Comprar combustível no mercado paralelo.", fx: { money: -6, act: { russia: 4 } } } ], { if: { phase: "regime" }, cooldown: 6 }),
    ev("n_rede_sabotadores", "Infiltrados chegam à rede de sabotadores", "Seus agentes descobrem quem planeja os próximos ataques — e onde a resistência guarda armas.", [
      { text: "Desmontar a rede de uma vez.", fx: { enemyLoss: 12, s: { internacional: -3 }, unrest: 3 } },
      { text: "Vigiar em silêncio e emboscar as colunas.", fx: { front: 12, malus: { v: 1, months: 2 } } } ], { chained: true, if: { phase: "regime" } }),
    ev("n_espiao", "Espião no Estado-Maior", "A contrainteligência descobre que um coronel do seu gabinete passava planos à resistência.", [
      { text: "Expurgar o gabinete inteiro.", fx: { org: -5, fac: { militares: -4 }, s: { militar: 3 } } },
      { text: "Usá-lo para vazar planos falsos.", fx: { chain: { id: "n_contraespionagem", in: 1 } } } ], { if: { phase: "regime" }, once: true }),
    ev("n_contraespionagem", "Os planos falsos funcionaram", "A resistência acreditou na informação plantada e deslocou tropas para o lugar errado.", [
      { text: "Atacar onde estão fracos.", fx: { front: 18, enemyLoss: 8 } },
      { text: "Guardar a vantagem para negociar.", fx: { malus: { v: 1, months: 3 }, s: { internacional: 2 } } } ], { chained: true, if: { phase: "regime" } }),
    ev("n_governador_lado", "Governador oferece mudar de lado", "O governador de um estado na linha de frente manda emissários: aceita apoiar o regime em troca de verbas e cargos.", [
      { text: "Aceitar e pagar.", fx: { money: -6, front: 20, fac: { centrao: 4 } } },
      { text: "Exigir rendição incondicional.", fx: { s: { militar: 2 }, front: -5 } } ], { if: { phase: "regime" }, cooldown: 6 }),
    ev("n_mercenarios", "Oferta de empresa militar privada", "Uma empresa estrangeira de segurança oferece veteranos, drones e instrutores — pagamento adiantado.", [
      { text: "Contratar.", fx: { money: -8, reserve: 2, s: { internacional: -6 }, act: { onu: -8 } } },
      { text: "Recusar.", fx: { s: { internacional: 1 } } } ], { if: { phase: "regime" }, once: true }),
    ev("n_onu_votacao", "Votação na Assembleia Geral da ONU", "Uma resolução pede cessar-fogo imediato no Brasil e eleições supervisionadas.", [
      { text: "Mandar uma delegação e aceitar uma trégua.", fx: { ceasefire: 1, s: { internacional: 5, militar: -3 }, act: { onu: 10 } } },
      { text: "Ignorar a votação.", fx: { s: { internacional: -6 }, act: { onu: -10 } } },
      { text: "Pedir à China que trave a resolução.", req: { actor: { china: { min: 20 } } }, fx: { act: { china: -5, onu: -5, eua: -6 }, s: { militar: 2 } } } ], { if: { phase: "regime" }, once: true, weight: 1.5 }),
    ev("n_tregua_igrejas", "Igrejas propõem trégua", "Lideranças católicas e evangélicas pedem um mês sem combates para enterrar os mortos.", [
      { text: "Aceitar a trégua.", fx: { ceasefire: 1, s: { apoio: 3, militar: -2 }, fac: { evangelicos: 8 } } },
      { text: "Recusar: a guerra não espera.", fx: { s: { militar: 2, apoio: -2 }, fac: { evangelicos: -8 } } } ], { if: { phase: "regime" }, once: true }),
    ev("n_voluntarios", "Fila de voluntários nos quartéis", "Depois de um discurso na TV, jovens formam filas para se alistar.", [
      { text: "Formar brigadas de voluntários.", fx: { money: -3, reserve: 2, org: -2 } },
      { text: "Mandá-los para a defesa civil.", fx: { s: { apoio: 3 }, unrest: -5, opp: "o_retaguarda" } } ], { if: { phase: "regime", min: { apoio: 35 } }, cooldown: 6 }),
    ev("n_pm_dividida", "A PM de um estado se divide", "Metade dos batalhões de uma polícia militar estadual declara apoio ao regime; a outra metade, à resistência.", [
      { text: "Incorporar os batalhões leais.", fx: { reserve: 1, front: 5, fac: { militares: 3 } } },
      { text: "Desarmar a corporação inteira.", fx: { s: { militar: 3 }, unrestAll: 4 } } ], { if: { phase: "regime" }, cooldown: 8 }),
    ev("n_hackers", "Hackers derrubam sistemas do governo", "Ataques digitais tiram do ar ministérios, bancos públicos e a rede de comunicação militar.", [
      { text: "Cortar a internet nas capitais.", fx: { unrest: -6, s: { internacional: -8, apoio: -4 }, act: { ue: -6 } } },
      { text: "Contratar especialistas e aguentar o prejuízo.", fx: { money: -4, org: -2 } } ], { if: { phase: "regime" }, cooldown: 8 }),
    ev("n_drones", "Ataque de drones a uma base aérea", "A resistência atinge aviões e depósitos de munição numa base aérea do regime.", [
      { text: "Retaliar com bombardeios.", fx: { front: 10, s: { internacional: -8, apoio: -2 }, act: { onu: -10 } } },
      { text: "Reforçar a defesa antiaérea.", fx: { money: -5, org: 3 } } ], { if: { phase: "regime", sideCount: { enemy: { min: 6 } } }, cooldown: 6 }),
    ev("n_refugiados", "Refugiados nas fronteiras", "Dezenas de milhares de brasileiros cruzam para o Paraguai, a Bolívia e o Uruguai.", [
      { text: "Abrir corredores e pedir ajuda humanitária.", fx: { s: { internacional: 5, militar: -2 }, act: { venezuela: 6, mercosul: 6, onu: 5 } } },
      { text: "Fechar as fronteiras.", fx: { s: { internacional: -4, militar: 2 }, act: { venezuela: -8, mercosul: -6 } } } ], { if: { phase: "regime" }, once: true }),
    ev("n_trigo", "Falta trigo e diesel", "Com bancos e portos sob sanções, o país fica sem trigo e diesel suficientes.", [
      { text: "Racionamento nacional.", fx: { s: { apoio: -4 }, unrestAll: 4 } },
      { text: "Comprar de Moscou com desconto.", fx: { money: -4, act: { russia: 8, eua: -6, ue: -6 } } },
      { text: "Pedir uma linha de crédito à China.", req: { actor: { china: { min: 0 } } }, fx: { money: -1, act: { china: 6 }, fac: { agro: -3 } } } ], { if: { phase: "regime", max: { internacional: 55 } }, cooldown: 6, weight: 2.5 }),
    ev("n_vitoria", "Ofensiva vitoriosa levanta o moral", "Depois de semanas de avanço, a propaganda do regime fala em “vitória próxima”.", [
      { text: "Desfile militar em Brasília.", fx: { money: -3, org: 6, s: { apoio: 4, internacional: -2 } } },
      { text: "Discurso de reconciliação com quem se render.", fx: { s: { internacional: 5 }, fac: { movimentos: 5, militares: -3 }, unrestAll: -4 } } ], { if: { phase: "regime", sideCount: { player: { min: 13 } } }, cooldown: 8 }),
    ev("n_panico", "Pânico depois das derrotas", "Cidades sob o regime vivem filas, boatos de rendição e saques.", [
      { text: "Toque de recolher.", fx: { unrest: -6, s: { apoio: -4, internacional: -3 } } },
      { text: "Pedir mediação internacional.", fx: { ceasefire: 1, s: { internacional: 4 }, fac: { militares: -6 } } },
      { text: "Prometer uma contraofensiva.", fx: { org: 4, s: { militar: 2, apoio: -2 } } } ], { if: { phase: "regime", recentLoss: 2 }, cooldown: 8 }),
    ev("n_liga_proposta", "A Liga do Sul manda emissários", "Os separatistas do Sul propõem um pacto de não agressão enquanto você enfrenta a resistência.", [
      { text: "Pagar pela neutralidade.", fx: { money: -6, malus: { v: 1, months: 3 }, s: { militar: -2 }, south: -20 } },
      { text: "Ameaçar com uma ofensiva.", fx: { s: { militar: 3 }, enemy: 1, south: 5 } } ], { if: { phase: "regime", anyControl: ["separatista"] }, once: true, weight: 3 }),
    ev("e_sul_cupula", "Cúpula de Porto Alegre", ["Os governadores do Rio Grande do Sul, de Santa Catarina e do Paraná pedem uma reunião de emergência. Querem verbas, autonomia fiscal e garantias de que Brasília não mandará interventores.", "Se nada mudar, dizem, não respondem pelo que a Liga do Sul fará."], [
      { text: "Aceitar o acordo: verbas e autonomia fiscal para o Sul.", req: { money: { min: 15 } }, fx: { money: -15, south: -35, fac: { militares: -4 }, flag: "sul_cupula" } },
      { text: "Prometer estudar as demandas.", fx: { south: -8, s: { base: -2 } } },
      { text: "Ameaçar com intervenção federal.", fx: { south: 15, s: { militar: 3 }, fac: { militares: 3 } } } ], { if: { phase: "regime", south: { min: 55, state: ["calmo"] } }, once: true, chained: true }),
    ev("n_sancoes_eua", "Washington congela ativos", "O Tesouro americano congela bens de generais e empresários ligados ao regime.", [
      { text: "Contratar lobistas e negociar.", fx: { money: -5, act: { eua: 10 }, fac: { agro: 3 } } },
      { text: "Denunciar o imperialismo em rede nacional.", fx: { s: { apoio: 3, internacional: -4 }, act: { eua: -10, russia: 4 }, fac: { agro: -5 } } } ], { if: { phase: "regime", max: { internacional: 50 } }, once: true, weight: 2.5 }),
    // ---- Contestação das urnas (só com a frente legal montada) ----
    ev("u_laudo", "O laudo dos militares", "O relatório técnico das Forças Armadas sobre as urnas não aponta fraude, mas diz que \"não é possível excluir\" falhas de programação.", [
      { text: "Explorar a ambiguidade nas entrevistas.", fx: { urna: { prog: 6, cred: -5, esc: 6 } } },
      { text: "Citar só os trechos técnicos e pedir mais testes.", fx: { urna: { prog: 3, cred: 4 } } } ], { if: { urna: { on: true } }, once: true, weight: 4 }),
    ev("u_bloqueios", "Rodovias bloqueadas", "Caminhoneiros fecham estradas em dez estados em apoio à contestação. Faltam combustível e alimentos em algumas cidades.", [
      { text: "Endossar os bloqueios.", fx: { urna: { prog: 4, esc: 16 }, s: { apoio: 2 }, fac: { agro: -5 } } },
      { text: "Pedir a liberação das estradas.", fx: { urna: { esc: -12, cred: 4 }, s: { apoio: -3 } } } ], { if: { urna: { on: true } }, once: true, weight: 4 }),
    ev("u_multa", "Multa por litigância de má-fé", "O relator multa a sua coligação e bloqueia o fundo partidário até o pagamento.", [
      { text: "Pagar e seguir pelos autos.", fx: { money: -6, urna: { cred: 3 } } },
      { text: "Atacar o ministro relator em rede nacional.", fx: { urna: { cred: -8, esc: 8 }, s: { apoio: 2 }, fac: { stf: -8 } } } ], { if: { urna: { on: true } }, once: true, weight: 3 }),
    ev("u_centrao", "O Centrão faz as contas", "Líderes partidários perguntam o que ganham assinando o pedido de auditoria no Congresso.", [
      { text: "Prometer cargos e verbas.", fx: { money: -6, urna: { prog: 6 }, fac: { centrao: 8 } } },
      { text: "Recusar o balcão de negócios.", fx: { urna: { cred: 3 }, s: { base: -3 } } } ], { if: { urna: { on: true } }, once: true, weight: 3 }),
    // ======== Quinzenas da abertura (v1.19): um evento garantido por quinzena que ainda não tinha (once + if.half) ====
    // Já garantidos pela história: 2ª out (início), 1ª nov (caminho da transição) e 1ª jan (crise/julgamento).
    // Efeitos leves de propósito: a abertura ganha cor sem mudar o equilíbrio das IAs.
    ev("q_lives", "Lives de meia-noite", ["Influenciadores ligados à sua base marcam lives simultâneas à meia-noite pedindo um sinal.", "A imprensa já montou o plantão; os comandantes pedem discrição."], [
      { text: "Entrar numa live e pedir calma.", fx: { s: { apoio: 1, internacional: 1 }, fac: { militares: -1 } } },
      { text: "Mandar um recado curto pedindo que desliguem as câmeras.", fx: { s: { base: 1 }, fac: { evangelicos: 1 } } },
      { text: "Ignorar e dormir cedo.", fx: { s: { apoio: -1 } } } ], { if: { from: "2022-11", until: "2022-11", half: 1 }, once: true, weight: 10 }),
    ev("q_natal", "Lista de Natal no Planalto", ["Chega uma lista de pedidos: indultos, cargos e um pronunciamento de fim de ano.", "A assessoria pergunta o que vai para a TV."], [
      { text: "Pronunciamento só de confraternização, sem política.", fx: { s: { apoio: 1, base: -1 } } },
      { text: "Falar em paz e citar a transição com respeito.", fx: { s: { internacional: 2, apoio: -1 }, fac: { stf: 2 } } },
      { text: "Usar o horário para atacar o resultado das urnas.", fx: { s: { apoio: 2, internacional: -2 }, fac: { stf: -3 } } } ], { if: { from: "2022-12", until: "2022-12", half: 0 }, once: true, weight: 10 }),
    ev("q_reveillon", "Réveillon sob tensão", ["Assessores discutem se você passa a virada em Brasília, no litoral ou em rede nacional.", "A base quer um gesto; o Itamaraty quer silêncio."], [
      { text: "Ficar em Brasília e gravar uma mensagem curta.", fx: { s: { base: 1, apoio: -1 } } },
      { text: "Ir ao litoral com a família e sumir das redes.", fx: { s: { internacional: 1 } } },
      { text: "Fazer um pronunciamento inflamado à meia-noite.", fx: { s: { apoio: 2, internacional: -2 }, unrestAll: 1 } } ], { if: { from: "2022-12", until: "2022-12", half: 1 }, once: true, weight: 10 }),
    ev("q_posse_fotos", "Fotos da posse circulam", ["Imagens da posse nova dominam as redes. Aliados pedem que você comente; adversários provocam.", "Uma frase errada vira manchete."], [
      { text: "Desejar sucesso às instituições, sem elogiar ninguém.", fx: { s: { internacional: 1, apoio: -1 }, fac: { stf: 1 } } },
      { text: "Ficar em silêncio absoluto.", fx: {} },
      { text: "Criticar o tom da cerimônia em rede social.", fx: { s: { apoio: 1, internacional: -2 }, fac: { stf: -2 } } } ], { if: { from: "2023-01", until: "2023-01", half: 1 }, once: true, weight: 10 }),
    ev("q_volta_aulas", "Volta às aulas e às ruas", ["O ano letivo recomeça e grupos marcam atos em frente a escolas e universidades.", "Prefeitos pedem que Brasília não esquente o clima."], [
      { text: "Visitar uma escola e falar em rotina e paz.", fx: { money: -1, s: { apoio: 1 } } },
      { text: "Pedir que apoiadores evitem os portões das escolas.", fx: { s: { internacional: 1 }, fac: { movimentos: 2 } } },
      { text: "Incentivar presença pacífica nas ruas.", fx: { s: { apoio: 1 }, unrestAll: 2, fac: { stf: -1 } } } ], { if: { from: "2023-02", until: "2023-02", half: 0 }, once: true, weight: 10 }),
    ev("q_carnaval", "Carnaval político", ["Blocos anunciam fantasias e refrões com o seu nome — a favor e contra.", "Governadores querem saber se haverá discurso."], [
      { text: "Pedir respeito ao feriado e evitar política nos trios.", fx: { s: { apoio: -1 }, fac: { centrao: 1 } } },
      { text: "Mandar uma fantasia simbólica e brincar junto.", fx: { money: -1, s: { apoio: 2 }, fac: { evangelicos: -1 } } },
      { text: "Ignorar o Carnaval e trabalhar no Congresso.", fx: { s: { base: 1 } } } ], { if: { from: "2023-02", until: "2023-02", half: 1 }, once: true, weight: 10 }),

    ev("u_oea", "Missão da OEA divulga relatório", "Os observadores internacionais dizem que a eleição foi limpa, mas recomendam ampliar a auditoria pública das urnas.", [
      { text: "Contestar o relatório.", fx: { urna: { prog: 3, cred: -6 }, act: { onu: -10 } } },
      { text: "Abraçar as recomendações de auditoria.", fx: { urna: { prog: 4, cred: 6 }, s: { internacional: 3 } } } ], { if: { urna: { on: true } }, once: true, weight: 3 }),

    // ======== Telegramas diplomáticos (v1.20): pedidos, convites e ameaças — cadeias curtas ====
    ev("t_eua_aviso", "Telegrama de Washington", "A embaixada dos EUA pede um gesto público de respeito às urnas e avisa que sem isso vêm sanções seletivas.", [
      { text: "Publicar o gesto pedido.", fx: { act: { eua: 12, ue: 4 }, s: { internacional: 2, apoio: -1 } } },
      { text: "Responder com neutralidade diplomática.", fx: { act: { eua: 3 } } },
      { text: "Ignorar o telegrama.", fx: { act: { eua: -10 }, chain: { id: "t_eua_sancao", in: 2 } } } ], { if: { notPhase: "governo" }, cooldown: 10, weight: 1.4 }),
    ev("t_eua_sancao", "Aviso de sanção americana", "Washington prepara lista de sanções a aliados seus se a postura não mudar.", [
      { text: "Abrir canal discreto e prometer revisão.", fx: { act: { eua: 8 }, money: -2, s: { internacional: 2 } } },
      { text: "Denunciar interferência.", fx: { act: { eua: -12, russia: 4 }, s: { apoio: 2, internacional: -3 } } } ], { chained: true, once: true }),
    ev("t_israel_convite", "Convite de Tel Aviv", "Israel oferece cooperação em segurança e tecnologia e pede um gesto sobre a posição do Brasil no Oriente Médio.", [
      { text: "Aceitar a parceria e marcar agenda.", fx: { act: { israel: 14, eua: 4 }, fac: { evangelicos: 3 }, s: { militar: 1 } } },
      { text: "Receber o enviado sem compromisso.", fx: { act: { israel: 5 } } },
      { text: "Declinar em público.", fx: { act: { israel: -12, eua: -4 }, fac: { evangelicos: -2 }, chain: { id: "t_israel_critica", in: 1 } } } ], { cooldown: 12, weight: 1.3 }),
    ev("t_israel_critica", "Crítica pública de Israel", "Um comunicado de Israel critica sua postura; diplomatas americanos reagem com frieza.", [
      { text: "Suavizar o tom e pedir reunião.", fx: { act: { israel: 6, eua: 2 }, money: -1 } },
      { text: "Manter a linha.", fx: { act: { israel: -6, eua: -8 }, s: { internacional: -2 } } } ], { chained: true, once: true }),
    ev("t_china_credito", "Linha de crédito chinesa", "Pequim oferece financiamento de infraestrutura em troca de um gesto comercial.", [
      { text: "Aceitar o pacote.", fx: { money: 6, act: { china: 10, eua: -6 }, fac: { agro: 3 } } },
      { text: "Negociar só commodities, sem obras.", fx: { money: 2, act: { china: 4 } } },
      { text: "Recusar para não irritar Washington.", fx: { act: { china: -8, eua: 5 } } } ], { cooldown: 14, weight: 1.2 }),
    ev("t_ue_amazonia", "Bruxelas cobra a Amazônia", "A Comissão Europeia liga o diálogo político a metas ambientais e ao acordo Mercosul–UE.", [
      { text: "Anunciar compromisso ambiental.", fx: { act: { ue: 12, mercosul: 4 }, fac: { agro: -4 }, s: { internacional: 3 } } },
      { text: "Prometer estudo técnico sem prazo.", fx: { act: { ue: 3 } } },
      { text: "Acusar protecionismo europeu.", fx: { act: { ue: -10 }, fac: { agro: 3 }, s: { internacional: -2 } } } ], { cooldown: 12, weight: 1.2 }),
    ev("t_onu_mediacao", "Oferta de mediação da ONU", "A ONU/OEA oferece bons ofícios para baixar a temperatura política ou militar.", [
      { text: "Aceitar mediação pública.", fx: { act: { onu: 12, ue: 4 }, s: { internacional: 3 }, south: -6 } },
      { text: "Aceitar só canais reservados.", fx: { act: { onu: 5 }, s: { internacional: 1 } } },
      { text: "Recusar: assunto interno.", fx: { act: { onu: -8 }, s: { internacional: -2 } } } ], { if: { notPhase: "governo" }, cooldown: 10, weight: 1.3 }),
    ev("t_vaticano", "Mensagem do Vaticano", "O núncio transmite apelo por paz e gestos humanitários.", [
      { text: "Acolher o apelo em público.", fx: { act: { vaticano: 12, portugal: 3 }, s: { internacional: 2 }, south: -4 } },
      { text: "Agradecer em privado.", fx: { act: { vaticano: 5 } } },
      { text: "Dizer que a prioridade é a soberania.", fx: { act: { vaticano: -6 }, fac: { evangelicos: 2 } } } ], { cooldown: 14, weight: 1.0 }),
    ev("t_golfo_fundo", "Fundo soberano do Golfo", "Enviados do Golfo oferecem investimento em energia e portos.", [
      { text: "Abrir a porta ao capital.", fx: { money: 5, act: { golfo: 12, china: 2 } } },
      { text: "Limitar a setores não estratégicos.", fx: { money: 2, act: { golfo: 5 } } },
      { text: "Recusar por agora.", fx: { act: { golfo: -5 } } } ], { cooldown: 16, weight: 1.0 }),
    ev("t_mercosul_cupula", "Convite à cúpula do Mercosul", "Paraguai e Uruguai pedem presença e um gesto de unidade do bloco.", [
      { text: "Ir e reforçar o bloco.", fx: { act: { mercosul: 12, argentina: 6 }, s: { internacional: 2 } } },
      { text: "Enviar chanceler.", fx: { act: { mercosul: 4, argentina: 2 } } },
      { text: "Boicotar.", fx: { act: { mercosul: -10, argentina: -4 }, s: { internacional: -1 } } } ], { cooldown: 12, weight: 1.1 }),
];
