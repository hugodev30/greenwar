// js/data/novidades.js — Dados: "Novidades" (changelog) mostradas no painel da tela inicial (js/ui/novidades.js).
/* A versão mais nova vem PRIMEIRO. Cada versão: { v, data (AAAA-MM-DD), titulo, itens: [frases curtas em PT-BR] }.
   As frases são traduzidas pelos dicionários em js/i18n/{en,zh,ru}.js (seção "exact"), como o resto do jogo.
   Ao lançar uma fase nova: acrescente uma versão no topo (ver README → "Como atualizar o jogo"). */
const NOVIDADES = [
  { v: "1.18.1", data: "2026-11-01", titulo: "Oportunidades sempre terminam", itens: [
    "Correção: uma oportunidade começada agora sempre termina, mesmo que o prazo dela acabe enquanto está em andamento.",
    "O prazo de uma oportunidade só limita quando dá para começá-la, contado em quinzenas ou meses conforme o turno.",
    "Oportunidades concluídas aparecem como concluídas, com a data em que podem voltar."
  ] },
  { v: "1.18", data: "2026-11-01", titulo: "Exércitos lado a lado, unificar e dividir", itens: [
    "Vários exércitos no mesmo estado agora aparecem lado a lado no mapa, cada um com seu toque.",
    "Unificar: marque 2 ou 3 exércitos do mesmo estado (caixas no cartão, Shift+clique ou toque longo na ficha) e junte todos num só.",
    "Dividir em dois: só com força 50 ou mais; o novo exército ganha nome automático.",
    "Os botões ficam à vista no cartão do exército, em 👥 Neste estado."
  ] },
  { v: "1.17", data: "2026-10-31", titulo: "Ordens mais claras e recrutar no mapa", itens: [
    "O cartão de cada exército ficou compacto: ataques primeiro, com a chance; movimentos recolhidos; botão Defender como ordem padrão.",
    "A ofensiva especial explica ganho, risco, custo e espera, e diz por que está bloqueada.",
    "Toque num estado seu durante a guerra para recrutar ali: exército novo ou reforço, com custo e manutenção à vista.",
    "Decisões nacionais não gastam mais ações políticas.",
    "Facções: cada cartão mostra o efeito em cada nível de lealdade, com o de agora destacado; as regras ficam no botão ?.",
    "Mapa: siglas do Nordeste dentro dos estados, fichas junto à costa e Recife com rótulo curto."
  ] },
  { v: "1.16.1", data: "2026-10-30", titulo: "Diplomacia traduzida", itens: [
    "A aba Diplomacia agora aparece inteira em inglês, chinês e russo: previsão, motivos, consequências e respostas dos países.",
    "Os relatórios do mês sobre dívidas, sanções e apoio estrangeiro também foram traduzidos."
  ] },
  { v: "1.16", data: "2026-10-30", titulo: "Finais animados e exércitos de verdade", itens: [
    "Cada final ganhou uma cena animada: Recife caiu, Brasília caiu, motim por falta de soldo, A Virada nas Urnas, Inelegível e os outros.",
    "Exércitos não se juntam mais sozinhos: cada um tem nome, general, moral e experiência. Juntar, dividir e renomear é escolha sua.",
    "Mover tropas ficou mais fácil: escolha o exército, veja a chance em cada destino e o caminho, e confirme. Ordens ficam no mapa e podem ser canceladas.",
    "Botão ⏭ leva ao próximo exército sem ordem, e o painel de exércitos tem busca.",
    "Inimigo mais esperto: planeja por meses, concentra forças, ataca exércitos fracos ou cercados e recua os feridos.",
    "Aba Ações reorganizada em abas, com custo, efeitos e motivo de bloqueio à vista.",
    "Soldo das tropas: com o caixa muito negativo (abaixo de −35) por 5 meses seguidos, as tropas se amotinam.",
    "Só existe a campanha completa (sem partida rápida), ainda com Fácil, Normal e Difícil."
  ] },
  { v: "1.15", data: "2026-10-30", titulo: "Quinzenas e contestação das urnas", itens: [
    "A abertura da campanha agora anda de quinze em quinze dias.",
    "Dá para vencer sem guerra, contestando as urnas pelas vias legais."
  ] },
  { v: "1.14", data: "2026-10-30", titulo: "Guerra nos estados", itens: [
    "A guerra voltou a ser por estados, com flanco, cerco e ímpeto.",
    "Batalha de Recife: tome a capital da Resistência para vencer a guerra."
  ] },
  { v: "1.12", data: "2026-10-30", titulo: "Recife capital e zoom no mapa", itens: [
    "Recife virou a capital da Resistência.",
    "Zoom e arrastar no mapa, no computador e no celular.",
    "Estatísticas contam só campanhas concluídas."
  ] },
  { v: "1.10", data: "2026-10-30", titulo: "Chinês e russo", itens: [
    "O jogo inteiro agora em chinês (简体中文) e russo (Русский)."
  ] },
  { v: "1.9", data: "2026-10-30", titulo: "Mapa de guerra visual", itens: [
    "Placar de força em cada linha de frente, setas do último mês e modo daltônico no mapa."
  ] },
  { v: "1.8", data: "2026-10-30", titulo: "Árvore de decisões de 2022", itens: [
    "Árvore de decisões nacionais dinâmica, com oportunidades que expiram.",
    "Campanha sem prazo: joga-se até a vitória ou a derrota."
  ] },
  { v: "1.7", data: "2026-10-30", titulo: "Reformulação do combate", itens: [
    "Guerra por frentes de batalha, com exércitos, generais e moral."
  ] },
  { v: "1.5", data: "2026-10-30", titulo: "Conselheira, nota e conquistas", itens: [
    "Marta Siqueira, sua chefe de gabinete, dá dicas todo mês.",
    "Tela de final com nota S/A/B/C e conquistas.",
    "Dificuldades Fácil, Normal e Difícil."
  ] },
  { v: "1.3", data: "2026-10-29", titulo: "Configurações e acessibilidade", itens: [
    "Configurações, acessibilidade, inglês e trilha sonora."
  ] },
  { v: "1.1", data: "2026-10-29", titulo: "Tutorial", itens: [
    "Tutorial contextual que pode ser pulado e refeito."
  ] },
  { v: "1.0", data: "2026-10-29", titulo: "Lançamento", itens: [
    "Contas, perfis e saves na nuvem (opcional).",
    "Cenário de 2022 com árvore de decisões e combate no mapa."
  ] }
];
