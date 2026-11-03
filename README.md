# Greenwar — Crônicas da Separação

Jogo de estratégia e história interativa sobre o Brasil, inspirado em Hearts of Iron. Funciona offline, é um site estático simples (HTML, CSS e JavaScript, sem instalação nem build). Você toma decisões mês a mês e vê no mapa quem controla cada estado.

> **Aviso:** este jogo é uma **obra de ficção**. Eventos, diálogos e desfechos são hipotéticos. Pessoas reais são tratadas de forma neutra, sem citações inventadas atribuídas a elas. Caminhos autoritários ou de ruptura têm consequências sérias dentro do jogo: o jogo não endossa nenhum deles.

## Cenários
| Ano | Cenário | Situação | Resumo |
|---|---|---|---|
| 2022 | **A Faixa Presidencial** | ✅ jogável | Depois da eleição de 2022: aceitar o resultado, contestar ou tentar uma ruptura. Tem a **árvore de decisões nacionais** (58 focos, 9 deles oportunidades que aparecem e expiram). |
| 1964 | **Os Anos Decisivos** | 🔒 em breve | A crise política de 1964 e suas alternativas. Os dados continuam no código, mas o cenário aparece no menu como "Em breve" e não pode ser aberto. |
| 2002 | **Brasil 2002** | 🔒 planejado | Um cenário futuro, atualmente apenas anunciado no menu. Ainda não tem história ou campanha jogável. |

O foco atual é o cenário de **2022**. Os cenários de 1964 e 2002 não podem ser jogados no momento. (O antigo cenário fictício de 1924, "Aurora do Sul", foi removido; continua no histórico do git.)

## Sistemas
- **Turnos:** um turno por mês (em 2022, a partir de março de 2023, cada turno vale 3 meses), com Pontos de Ação.
- **Diplomacia:** acordos com atores estrangeiros.
- **Facções internas:** cada uma tem lealdade.
- **Eventos (2022: 69 no total).** Mais de 50 eventos sorteáveis cobrem economia (dólar, juros, inflação, greves de caminhoneiros e petroleiros, agro, China comprando carne), mídia e redes (boatos, influenciadores, plataformas), STF/TSE/Congresso (CPMI, reforma tributária, passaporte, delação), igrejas, PMs e Forças Armadas, governadores, reação internacional (EUA, China, Argentina, ONU, Mercosul), Amazônia, desastres naturais (enchentes, seca, queimadas) e a guerra (deserções, sabotagem, espionagem, drones, mercenários, voluntários, refugiados, pânico ou euforia conforme o mapa). Alguns dependem de focos concluídos, da facção ou do estado da guerra. Alguns têm **desdobramentos**: a escolha marcada com "Pode ter desdobramentos" agenda um segundo evento para meses depois. No máximo um evento sorteado por turno.
- **Mapa interativo** dos 27 estados.
- **Guerra com exércitos nos estados (2022):** cada exército é uma ficha no mapa com a força escrita. Todo mês você toca num exército e num estado destacado (com a chance de vitória em %): mover até 2 estados pelo seu território ou atacar um estado inimigo vizinho. Atacar de dois lados dá **flanco**; exército sem caminho até a capital fica **cercado** e se rende; vitórias seguidas dão **ímpeto**. Tomar Recife (PE) na **Batalha de Recife** vence a guerra; perder Brasília (DF) é a derrota. Sem economia de guerra para administrar.
- **Exércitos e combate visual (1964):** exércitos com nome, força, moral (organização), experiência e general fictício aparecem no mapa como contadores no estilo OTAN. Você dá **uma ordem por exército por mês** (atacar, defender, mover, recuar, reforçar) **sem gastar AP**: toque no exército, depois no estado vizinho, confira a previsão e confirme. O mapa mostra setas animadas (suas ordens e as intenções inimigas conhecidas), linhas de frente e estados em batalha pulsando. No **Encerrar mês** há uma resolução animada (pode pular) e uma **tela de batalha** com rodadas, moral, general e modificadores (terreno, apoio local, suprimentos, armas estrangeiras).
- **Relatório pós-batalha:** toda batalha (na tela de batalha e na lista da resolução do mês) mostra **por que e como** você venceu ou perdeu: tabela fator por fator (tropas, moral, experiência, terreno, posições, apoio, comando, suprimentos, armas, defensor, sorte nas rolagens) com o valor de cada lado e quem foi favorecido, barra de poder, baixas, uma frase-resumo ("Você perdeu principalmente porque o inimigo tinha 2,5× mais tropas…") e dicas do que fazer melhor. As batalhas do mês ficam na aba **História** (e as anteriores em "Batalhas anteriores", até 30) e no painel do mapa.
- **Árvore de decisões nacionais** (focos no estilo HoI4), só no cenário de 2022. Desde a fase 8 os focos duram 1 ou 2 meses, há focos que só aparecem em certos momentos e uma coluna de **⚡ Oportunidades** (veja abaixo).
- **Finais múltiplos.**
- **Tutorial contextual (coach marks):** em vez de um texto longo, pequenos balões aparecem na primeira vez que você abre cada aba ou recurso (painel do topo, História, Mapa, Exércitos, Decisões, Facções, Diplomacia, Ações), destacando o elemento e explicando cada variável. **Pular tutorial** está sempre visível; **? Ajuda → ↻ Refazer tutorial** recomeça do zero. O progresso fica no `localStorage` (`gw_tut_v3`).
- **Grandes eventos:** momentos decisivos (a posse do eleito, o 8 de janeiro, o golpe, o racha nas Forças, a guerra, a inelegibilidade) abrem uma tela cheia com manchete e a lista **"O que muda para você"** (exércitos desmobilizados e por quê, nova fase, renda, ritmo dos turnos, mapa, atributos).
- **Decisões navegáveis:** a árvore ocupa a largura da tela, com arrastar para mover, Ctrl+roda ou pinça para zoom, setas e +/− no teclado, botão **⛶ Tela cheia** e o detalhe do foco num painel lateral (gaveta inferior no celular).
- **Facções explicadas:** o que cada nível de lealdade faz (Leal ≥65, Neutra ≥35, Insatisfeita ≥15, Em crise <15), os bônus e penalidades de **Agradar** e **Enfraquecer** e o que acontece com cada facção.
- **Mapa de agitação:** seletor de camada (Controle/Agitação) com legenda em gradiente e explicação; paleta **viridis** (legível para daltônicos) e o valor de cada estado escrito no mapa.
- **Ações escalam com o apoio (2022):** 3 ações por turno; **4 com Apoio Popular ≥ 60** e **5 com ≥ 75** (calculado no início do turno). O topo mostra de onde vem cada ação (base · apoio · comprada) e o "i" abre a explicação completa.
- **Recursos políticos rebalanceados (2022):** teto de **80** (o que passar disso se perde no Encerrar turno, com aviso antes); **Facções** passam a custar só Recursos (Agradar 8, Enfraquecer 6, sem gastar ações); **Converter 12 Recursos → +1 ação** uma vez por turno (aba Ações). A tela "Como funcionam ações e Recursos?" mostra renda por fonte, teto e onde gastar.
- **Mapa de guerra refeito:** mapa maior (e botão **⊕ Ampliar mapa**), fichas de exército maiores com a **força em número e barra**, símbolo OTAN (retângulo = seu, losango = inimigo) e marca dourada quando já tem ordem; frentes de batalha com contorno escuro (visíveis sobre qualquer cor) e legenda militar embaixo do mapa. Fluxo em 3 passos: **1. selecionar** o exército → **2. destino** (seta de prévia tracejada) → **3. previsão** (chance, barra de poder, principais modificadores, o que acontece se vencer/perder, manobras restantes) com **Confirmar**, **Comparação completa** e **Cancelar** (Esc). Tocar de novo no mesmo estado confirma.
- **⚙ Configurações** (botão no topo; ficam salvas no navegador): **idioma** Português (Brasil) / English / 简体中文 (chinês) / Русский (russo) — o cenário 2022 está todo traduzido nos três idiomas; **modo daltônico** (cada facção ganha uma textura além da cor, no mapa e na legenda); **alto contraste**; **tamanho da letra** (100%, 115% ou 130%); **reduzir animações**; **música** e **efeitos** com volume separado, além do botão 🔊 (tecla **M**) para silenciar.
- **Acessibilidade:** link "Pular para o conteúdo", navegação por teclado (Tab; **Enter/Espaço** num estado ou num exército do mapa equivale ao clique; **←/→** troca de aba; **Esc** fecha a prévia), avisos para leitores de tela (região `aria-live`) e o botão **📝 Descrição do mapa**, que descreve em texto quem controla cada estado, a agitação, os exércitos e, no 2022, cada frente (sua força × a do inimigo, para onde a linha andou no último mês, sua capital e os redutos inimigos). No mapa de guerra, o placar de cada frente também é focável com Tab e abre com Enter/Espaço.
- **Trilha sonora e efeitos:** música gerada no navegador com Web Audio (sem arquivos), com três climas: calmo, tenso e guerra, conforme a fase. Há efeitos para clique, ordem, fim de turno, batalha, vitória e derrota, e um alerta nos grandes eventos. O som começa no primeiro clique, como os navegadores exigem.

## Como jogar
Jogue online em **https://hugodev30.github.io/greenwar/** ou abra o arquivo `index.html` no navegador (Chrome, Edge, Firefox ou o navegador do celular). Não precisa instalar nada, ter internet nem criar conta: o progresso fica salvo no `localStorage` do navegador. Se o navegador não aceitar a gravação, um aviso persistente aparece até o salvamento voltar a funcionar.

Com uma conta (botão **👤 Entrar**, opcional), os saves e os finais também vão para a nuvem e você ganha um perfil público. Veja [Contas e saves na nuvem](#contas-e-saves-na-nuvem-supabase). Aberto como arquivo local (`file://`), o jogo roda sem a parte de contas.

Se preferir um servidor local:
```bash
npx serve .        # ou: python3 -m http.server 8000
```

### Novidades da fase 16 (2022)
- **🆕 Novidades na tela inicial:** um quadro mostra o que mudou na última versão (com o selo "novo" até você ver) e **Ver todas** abre a lista completa, versão por versão. Os textos ficam em `js/data/novidades.js`.
- **Finais animados:** cada final abre com uma cena curta em SVG/CSS — Recife caiu, Brasília caiu, motim por falta de soldo, A Virada nas Urnas, Inelegível, De Volta pelas Urnas, O Brasil Partido e os demais. Toque, **Pular** ou Esc/Enter fecha; some sozinha em alguns segundos; com "reduzir animações" mostra só o quadro final. Na tela do final, **🎬 Rever cena**.
- **Aba Ações por categorias:** abas (Urnas, Sul, Política, Economia, Militar, Diplomacia, Todas), custo (⚡ ações / 💰 Recursos) e efeitos em etiquetas verdes/vermelhas, a sugestão da Marta marcada com ⭐ e o motivo de cada ação bloqueada (🔒).
- **Exércitos distintos:** os exércitos não se fundem mais sozinhos. Cada um tem nome, força, general, moral e experiência; até **3 exércitos seus por estado** (o inimigo também). Juntar (mesmo estado) e dividir (força ≥ 20) só quando você escolhe; dá para **renomear**. Recrutar pergunta: exército novo ou reforçar um existente. O painel **Exércitos** lista todos para escolher, achar no mapa e renomear.
- **Mover tropas:** selecione um exército → os destinos acendem com a chance em % e o caminho → confirme. Ordens pendentes aparecem no mapa e na lista "Ordens do mês" (✕ cancela). **Próximo exército parado** pula para quem ainda não tem ordem. Funciona com toque e zoom.
- **Soldo:** na guerra, fechar o mês com Recursos abaixo de −35 atrasa o soldo (moral −4 em todos os seus exércitos). 5 meses seguidos assim e as tropas se **amotinam** (derrota). A Marta avisa antes.
- **IA do inimigo mais esperta (Normal e Difícil):** escolhe um estado-alvo seu e junta forças ao lado por alguns meses antes de atacar, contra-ataca exércitos fracos, cercados ou expostos dos dois lados, recua exércitos muito feridos e defende Recife. No Difícil também procura cercar seus exércitos. No Fácil continua a IA simples.
- **Só a campanha completa:** a escolha "partida rápida / campanha completa" saiu; ficam as três dificuldades. Saves de partida rápida viram campanha completa.
- **Saves:** v15. Saves antigos continuam abrindo (exércitos ganham tipo e experiência, e estados com exércitos demais são reagrupados uma única vez).

### Quinzenas e vitória pelas urnas (2022, fase 15)
- **Quinzenas:** no começo da campanha cada turno vale 15 dias (até março de 2023): mais decisões nacionais antes da posse. Receita e eventos são pela metade em cada quinzena. Quando a guerra começa (ou a abertura termina), aparece o aviso "Fim das quinzenas" e cada turno vira um mês.
- **Vencer sem guerra:** na cena "A Ação no TSE", escolha montar a frente legal. Leve o **progresso** a 100 com auditorias, ações no TSE, o Congresso, as ruas e os focos do ramo "Contestação institucional". Cuidado com a **credibilidade** (em 0 o TSE declara você inelegível — derrota) e com a **escalada** (em 100 a crise vai para os quartéis e vira guerra). Precisa de 43 no julgamento do TSE (janeiro) e de 100 no veredito (março). A barra no topo e o link "como vencer?" mostram tudo.
- **Saves:** v14. Saves antigos continuam funcionando, mês a mês.

### Frentes (2022) — exércitos nos estados (fase 14)
- **Como jogar a guerra:** 1) na aba Mapa, toque num exército azul; 2) os estados possíveis acendem com a **chance de vitória** em %; 3) toque num deles, confira o cartão (sua força × defesa, fatores) e confirme — a seta grande aparece no mapa; 4) encerre o mês. Ordens **não gastam AP**. Mover anda até 2 estados pelo seu território; atacar é só em estado inimigo vizinho. Dois exércitos seus no mesmo estado se juntam. Cada estado é de um lado só (não existe "em disputa").
- **Batalhas no fim do mês:** animação curta com mensagens ("Ataque pelos dois lados!", "Contra todas as chances: vitória!"). Quem vence fica com o estado; estado inimigo vazio é ocupado. Chance = A^2,4 / (A^2,4 + D^2,4); a defesa soma o exército parado (×1,2 se não se moveu), a guarnição local, o terreno e o bônus de capital. O relatório explica as forças, os fatores e por que ganhou ou perdeu.
- **Flanco:** atacar o mesmo estado vindo de 2 ou 3 estados diferentes soma as forças e dá +20% por estado extra. O cartão de confirmação avisa quando outro exército pode entrar pelo outro lado, e a Marta sugere o ataque ("Fazer isso").
- **Cerco:** exército sem caminho pelo próprio território até a capital dele fica **cercado** (ficha tracejada com ⛓): luta com 75% da força, perde 20% por mês e se rende em poucos meses. Vale para você e para o inimigo — corte as linhas dele.
- **Ímpeto:** barra de −3 a +3 no topo do painel; cada vitória empurra para o seu lado (+7% de força por ponto), cada derrota para o lado inimigo.
- **Batalha de Recife:** quando um exército seu encosta em Recife, escolha a tática — **Assalto frontal** (+25%, baixas maiores se falhar), **Cerco por dois lados** (flanco 2,5× maior) ou **Desembarque no porto** (ignora a fortificação, −15%). A Resistência faz a **última resistência** (+15% na defesa). Vencer mostra "Recife caiu!" e o final.
- **Inimigo:** a Resistência defende Recife, empurra rumo a Brasília e contra-ataca, sempre por estados vizinhos; as setas vermelhas tracejadas mostram o plano dela. A Liga do Sul, se se rebelar, tem exércitos próprios (capital Porto Alegre, que derruba a Liga).
- **Força do exército** = tropas × moral × general (agressivo, defensivo ou logístico) × apoio × ímpeto (e a dificuldade). A **ofensiva especial** reforça UM exército com ordem de ataque neste mês.
- **Mapa:** zoom com roda do mouse, pinça ou + / − / ⟲, arrastar para mover, "Ir para Recife"; o topo mostra "🎯 Recife a N estados" e o caminho mais curto tracejado. Nos estados pequenos do Nordeste as fichas ficam no mar, ao lado do nome.
- **Recrutar:** +20 de tropas por 10 Recursos, até 2 vezes por mês, sem AP, num estado seu (se já houver um exército seu lá, ele é reforçado). **Comando automático** e o **modo simples** (Fácil) deixam os generais darem as ordens.
- **Saves:** v13 (hoje v14, veja acima). Saves antigos são migrados: v7 (tropas das frentes), v9 ("em disputa" vira um dos lados), v10/v11 (eixos e rompimento descartados) e v12 (os exércitos das regiões do IBGE voltam para o estado de cada região). As regiões do IBGE (fases 11–13) foram removidas.

### Exércitos e ordens (1964)
- **Selecionar:** toque numa ficha azul (seu exército; o número é a força total no estado e o selo "×n" indica vários exércitos — toque de novo para alternar). Os estados alcançáveis ficam destacados: borda vermelha = atacar, azul = mover/recuar. Ao escolher um, aparece a **previsão** e o botão **Confirmar ordem**.
- **Ordens:** uma por exército por mês. Atacar, mover e recuar são **manobras**, limitadas pelo atributo militar e pela lealdade militar (o chip "Ordens x/y" no mapa). Defender é grátis; reforçar custa 3 recursos (+10 de força). Nada disso gasta AP.
- **Recrutar tropas:** botão azul **＋ Recrutar tropas** no painel do mapa (ou **no estado selecionado**, se for seu): exército novo com 20 de força por 8 recursos, até **2 por mês**. Se não der, o botão explica o motivo (recursos, limite do mês, limite de 8 exércitos, eventos pendentes).
- **Alistamento (guerra):** todo mês chegam voluntários (3–12 de força, conforme seus estados e o apoio popular) que reforçam sozinhos exércitos fracos parados no seu território; o excedente acumula e forma um exército novo na capital. A manutenção das tropas ficou mais barata (0,3 por 10 de força).
- **Paz:** em tempo de paz os exércitos só se reposicionam entre estados seus.
- **Batalhas:** toque num estado em disputa (ou em "Ver batalha") para abrir a tela de combate; sem batalha no mês, ela mostra as forças e uma previsão.
- **Saves antigos** (versão 2) são migrados automaticamente: as tropas viram exércitos.

### Meus exércitos (novo, fase 4)
- Na aba **Mapa**, o painel **Meus exércitos** lista todos os seus exércitos, cada um com o status da ordem ("sem ordem", "⚔ atacar MG", "🛡 defender"…) e quatro botões grandes: **⚔ Atacar** (já escolhe o melhor alvo e mostra a previsão; clique de novo para confirmar), **➜ Mover** (destaca os destinos em azul; se só há um, já fica pronto), **🛡 Defender** (grátis) e **＋ Reforçar** (3 Recursos).
- **↶ Desfazer ordem** em cada exército, **Desfazer todas**, o contador de **manobras restantes** e quantos exércitos estão sem ordem.
- **Ordens automáticas:** "Defender fronteiras" (todo mundo defende) ou "Ordens automáticas" (ataca onde a chance é boa, defende o resto), e a opção de repetir isso sozinho todo mês.
- No painel de um estado inimigo aparece **"Atacar com…"** com a chance de cada exército.

### Tensão no Sul (novo, fase 4)
- No regime de exceção aparece a barra **🌾 Tensão no Sul** (0–100). Ela mostra o ritmo por mês e em quantos meses a Liga do Sul se rebela. Clique nela para ver os motivos e as ações.
- **Baixa a tensão:** ações da categoria **Sul** (aba Ações), investir/negociar com o governador em RS/SC/PR, deixar exércitos no Sul, agradar o agronegócio. **Sobe:** o golpe, o racha nas Forças, agitação alta no Sul, Apoio Militar baixo.
- Em 60+ os governadores pedem uma **Cúpula**; com a tensão em 25 ou menos dá para assinar o **Pacto Federativo**: o Sul vira **aliado** e manda uma divisão.
- Se chegar a 100, a revolta começa **pequena** (só RS, exército de 15). Santa Catarina só adere se a tensão ficar acima de 85 por 2 meses. Baixar para 45 ou menos traz um **armistício**.

### Decisões dinâmicas e campanha sem prazo (novo, fase 8)
- **Focos mais curtos:** todos levam 1 ou 2 meses (antes 1 a 4).
- **Focos que dependem do momento:** alguns só ficam disponíveis em certas situações — "Renovar a direita" ⊘ "Dobrar a aposta" depois de um revés (inelegível ou derrota nas urnas), "Caravana de comícios" com Apoio Popular 55+, "Pacto com os governadores do Sul" com a Tensão no Sul acima de 55, "Canal secreto com o inimigo" depois de 10 meses de guerra. O tooltip diz quando cada um aparece.
- **⚡ Oportunidades:** 9 focos curtos (coluna laranja) que **abrem sozinhos** quando a situação permite (apoio alto, caixa vazio, escândalo do governo, guerra longa, revés na frente, relações internacionais altas, eleição chegando…), ficam abertos poucos meses e **expiram** se você não aproveitar. Vários voltam depois de um tempo; alguns eventos também abrem uma oportunidade. Uma faixa acima da árvore mostra as abertas, com contagem regressiva.
- **Aviso de foco novo:** quando um foco fica disponível, ele ganha a etiqueta **NOVO** e a aba Decisões mostra **✨N**; o relatório do mês também avisa. Clicar no aviso centraliza a árvore no foco. A Marta sugere a oportunidade aberta mais útil.
- **Sem limite de tempo na campanha completa:** o jogo continua até uma vitória ou derrota real. Perdeu a eleição? Há **Derrota nas Urnas** (recomeçar, passar o bastão ou aceitar ser líder da oposição) e **Mais Uma Eleição** quatro anos depois. Inelegível? O herdeiro disputa **O Herdeiro nas Urnas** em 2026. Na guerra, "seguir lutando" leva a **A guerra se arrasta**, que se repete até alguém ceder (ofensiva final, cessar-fogo, mediação com trégua, renúncia).
- **Cansaço da guerra:** depois de 12 meses de combate, o Apoio Popular cai 1 ponto a cada 3 meses e as frentes ficam mais voláteis (até +150%), então impasses se resolvem sozinhos. Tréguas pausam o desgaste.
- **Difícil** tem só uma revanche nas urnas e Apoio/Base acima de 65 caem 1 ponto por mês.
- Saves v8 são migrados para v9.

### Dificuldade (fase 5; duração removida na fase 16)
- Ao clicar em **Nova campanha** abre uma janela com a **dificuldade**. A escolha aparece no topo (selo ao lado da data) e em **⚙ Configurações → Campanha atual**, e não muda no meio da campanha.
- **🌱 Fácil** (para quem não joga estratégia): inimigo 40% mais fraco, Tensão no Sul subindo bem mais devagar, +15 Recursos no início e +2 por mês, atributos iniciais um pouco maiores e uma pequena folga nos testes da história. Inclui o **modo simples**: os exércitos lutam sozinhos (ordens automáticas ligadas; o comando manual fica em "Comandar manualmente"), a conversão de Recursos fica escondida, Diplomacia e Facções vão para o botão **Mais ▾**, e as escolhas da história que encerram a campanha avisam antes se dão vitória, derrota ou um final intermediário. O modo simples pode ser desligado em Configurações.
- **⚖️ Normal:** o jogo original, sem nenhuma mudança.
- **🔥 Difícil:** inimigo 30% mais forte, −5 Recursos no início e −1 por mês, Sul 25% mais inquieto e testes da história um pouco mais exigentes.
- **Duração:** desde a fase 16 só existe a campanha completa (a partida rápida saiu; saves antigos de partida rápida continuam como campanha completa).
- Saves antigos continuam abrindo: sem dificuldade viram Normal.

### Conselheira (novo, fase 5)
- **Marta Siqueira, chefe de gabinete** (personagem fictícia), aparece num cartão acima das abas com **1 ou 2 dicas por mês** em linguagem simples, cada uma com o botão **Fazer isso**: responder um evento pendente, agradar uma facção quase em crise, subir um atributo perigosamente baixo, acalmar o Sul, ligar as ordens automáticas, recrutar quando o inimigo é bem mais forte, gastar Recursos perto do teto, começar uma decisão nacional ou usar as ações que sobraram. Sem nada urgente, ela sugere encerrar o mês.
- Ela não empurra para a ruptura: se você aceita o resultado da eleição, ela só dá as dicas normais.
- **Linha do golpe (fase 6, ficção do cenário 2022):** se você escolhe o caminho do golpe (convocar os comandantes, ou antes da posse enquanto ainda dá), ela vira sua estrategista. Na apuração ela mostra as "duas portas"; durante a conspiração sugere as decisões do plano (avaliar a derrota → abrir caminho → quartéis → minuta), quais facções precisam de mais lealdade (militares, agro, evangélicos, Centrão), como subir o Apoio Militar e acalmar o Sul, e nas cenas da história (reunião secreta, troca de comando, decreto, dia seguinte) diz qual escolha fazer — o botão **Fazer isso** escolhe por você. O quadro **Prontidão do golpe** mostra a %, se as tropas vão marchar no dia do decreto, o que falta, a melhor hora e os riscos (Sul, reação internacional). No Fácil ela mostra tudo com números; no Normal, o principal; no Difícil, só o essencial e conselhos vagos nas escolhas.
- O **×** esconde as dicas até o próximo mês. Em **⚙ Configurações → Conselheira**: Automática (ligada no Fácil e no Normal, desligada no Difícil), Sempre ligada ou Desligada.

### Tela de final e conquistas (novo, fase 5)
- Ao chegar num final, a tela mostra a **nota (S, A, B ou C)**, um resumo em texto da sua campanha (duração, território, ações, ponto forte e fraco), os **momentos marcantes** (suas escolhas na história), as **conquistas** e o **mapa final**. "Como a nota foi calculada" abre a conta.
- **Nota:** tipo de final (vitória 52, intermediário 34, derrota 14) + 30% da média dos atributos + território (sem guerra, 6 pontos fixos) + decisões nacionais (até 5) + paz com o Sul (4) + dificuldade (Fácil −4, Difícil +4). S a partir de 85, A de 70, B de 50. Derrota fica no máximo em B, intermediário no máximo em A, vitória no mínimo em B. Os números ficam em `js/data/conquistas.js`.
- **13 conquistas** (primeira campanha, vitória, nota S, vencer no Difícil, pelas urnas, a virada no tribunal, sem batalhas, pacto com o Sul, veterano, planejador, boa equipe com a conselheira, 5 finais, todos os finais). Ficam no aparelho (`gw_conquistas_v1`) e, com login, na nuvem.
- Botões: **Jogar de novo** (mesma dificuldade e duração), **Tentar outro final** (lista os finais que faltam, com uma dica de como chegar em cada um; campo `dica` dos finais em `historia.js`) e **Compartilhar** (menu de compartilhar do celular; no computador copia o texto, com o link do jogo).

### Rostos dos personagens (novo, fase 5)
- Os personagens **fictícios** do cenário 2022 têm rosto (retratos ilustrados, inventados): a conselheira, os porta-vozes das facções, os embaixadores e enviados da aba Diplomacia, os generais dos exércitos e quem aparece nos cartões da história e dos eventos.
- **Pessoas reais nunca têm rosto.** Quando um texto fala de alguém real ou de uma instituição (TSE, Planalto, governo eleito, governo argentino, Mercosul…), o cartão mostra um **ícone da instituição**; personagens genéricos (o herdeiro político, um governador, um influenciador) aparecem como **silhueta**.
- Imagens em `assets/retratos/` (webp 256×256, até 60 KB cada). Quem aparece onde fica em `js/data/2022/retratos.js` (`RETRATOS_2022`: `pessoas`, `faccoes`, `atores`, `generais`, `historia`, `eventos`). Para trocar um rosto, substitua o arquivo webp com o mesmo nome; para pôr rosto num evento novo, acrescente `id_do_evento: "chave_da_pessoa"` em `eventos`. O `check.js` confere arquivos, ids e a regra de pessoas reais.

## Contas e saves na nuvem (Supabase)
O login é **opcional**. Sem conta, offline ou se o Supabase estiver fora do ar, o jogo continua igual, com os saves no `localStorage`.

**O que existe:**
- cadastro e login por e-mail e senha, link mágico, "Esqueci a senha" e troca de senha;
- botão do Google pronto, mas escondido (`FEATURES.googleLogin` em `js/nuvem/config.js`);
- perfil com nome de exibição, `@usuário`, emblema (ícones embutidos ou iniciais, sem upload) e bio;
- estatísticas: campanhas **concluídas** (que chegaram a um final, vitória ou derrota) e finais desbloqueados por cenário — campanhas abandonadas ou em andamento não contam;
- aba **Jogadores**, com o ranking por finais e os perfis públicos;
- saves na nuvem (um por cenário), enviados ao "Encerrar mês", ao chegar num final e ao começar uma campanha;
- ao entrar, o jogo junta os saves deste aparelho com os da nuvem. Se os dois forem diferentes, ele pergunta qual manter e mostra qual é o mais recente. Os finais e as conquistas são unidos nos dois sentidos (as conquistas ficam numa linha extra da tabela `saves`, com `scenario_id = "_conquistas"`; não precisa de migração).

**Arquivos:**
- `js/nuvem/config.js`: URL do projeto e a *publishable key* (pública por design; quem protege os dados é o RLS);
- `js/nuvem/cloud.js`: módulo carregado pelo `index.html`;
- `supabase/migrations/001_init.sql`: tabelas, RLS e gatilhos.

### Configurar o projeto Supabase (uma vez)
1. **Rodar o SQL:** no painel do Supabase, abra **SQL Editor → New query**, cole todo o [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) e clique em **Run**. Pode rodar de novo sem problema (o script é idempotente). Ele cria `profiles` e `saves`, as políticas RLS, o gatilho que cria o perfil no cadastro e o perfil das contas que já existirem.
2. **URLs de redirecionamento:** em **Authentication → URL Configuration**:
   - em **Site URL**, coloque `https://hugodev30.github.io/greenwar/`;
   - em **Redirect URLs**, adicione `https://hugodev30.github.io/greenwar/` (e, para testes locais, `http://localhost:8000/`).

   Os links de confirmação, o link mágico e a recuperação de senha voltam para esse endereço.
3. **Opcional, para testar mais rápido:** em **Authentication → Sign In / Providers → Email**, desligue **Confirm email**. Assim a conta entra direto, sem o e-mail de confirmação. Religue antes de divulgar o jogo.
4. **Opcional, Google:** ative o provedor em **Authentication → Sign In / Providers → Google** (precisa de um Client ID/Secret do Google Cloud) e mude `googleLogin: true` em `js/nuvem/config.js`.

**Qual chave vai no `js/nuvem/config.js`?** A **Publishable key** (`sb_publishable_…`), em **Project Settings → API Keys**. A antiga chave "anon public" também funciona. **Nunca** use a *secret key* (`sb_secret_…`), a `service_role` nem a senha do banco no front-end.

O e-mail padrão do Supabase tem limite baixo de envios por hora. Para muitos jogadores, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

Para testar localmente com contas, sirva a pasta por HTTP (`python3 -m http.server 8000`) em vez de abrir o arquivo direto.

## Validação e simulação (Node.js 18 ou mais novo)
```bash
node tests/check.js          # valida história, mapa, campanha e árvore de decisões, e roda a simulação (150 partidas por IA)
node tests/navegacao-tela.js # teste opcional de navegador: menu, cenário 2002 bloqueado e início de campanha
node tests/check.js 300      # igual, com 300 partidas por IA
node tests/sim.js 300        # só a simulação de campanhas, com distribuição de finais por IA
node tests/sim.js 300 brasil2022   # só um cenário
node tests/sim.js 40 brasil1964    # cenário bloqueado: só roda se pedido pelo id
node tests/sim.js 300 brasil2022 --dif=facil      # dificuldade Fácil (também: --dif=dificil)
node tests/sim.js 300 brasil2022 --conselheira    # acrescenta as IAs "iniciante" e "conselheira" (que só segue as dicas)
node tests/sim.js 300 brasil2022 --golpe [--dif=dificil]  # acrescenta a IA "golpista_conselheira" e a linha "golpe:" (sucesso do golpe)
node tests/sim.js 300 --notas                     # mostra a distribuição da nota final e das conquistas por IA (automático com --dif)
```
Com `--dif` o sim imprime também a linha **resultado** (vitória / intermediário / derrota, pelo campo `outcome` dos finais) e, no Fácil, roda a IA **iniciante** (aleatória que lê os avisos de derrota do modo simples). O `tests/check.js` roda esses modos com 80 partidas e falha se o Fácil não vencer bem mais que o Difícil.
A simulação imprime uma linha **economia** por IA (AP médio, Recursos médio, pico, turnos com 60+, saldo final, ações de facção, conversões) e falha se os Recursos passarem do teto.
O `tests/check.js` também valida os dados do 1964 (bloqueado) e roda um teste curto de integridade dele (40 partidas por IA), para o cenário não quebrar enquanto o motor muda. Esse teste não entra no balanceamento.
`tests/check.js` termina com código 1 se houver qualquer problema. **Rode depois de qualquer mudança na história, nos eventos ou na árvore.** Os testes `tests/navegacao-tela.js` e `tests/traducao-tela.js` são opcionais e precisam de `playwright` (ou `playwright-core`) e de um Chromium; se o pacote não estiver instalado, serão pulados.

`tools/build-map.js` gera a geometria simplificada dos estados (`tools/brazil-map.json`, copiada para `js/data/mapa-brasil.js`) a partir de um GeoJSON do IBGE. O GeoJSON tem 3,3 MB e não está no repositório. Para regerar o mapa, baixe `brazil-states.geojson` do projeto codeforamerica/click_that_hood, salve como `tools/brazil-states.geojson.json` e rode `node tools/build-map.js`.

## Hospedar de graça
O jogo é um site estático, então qualquer hospedagem estática serve:
- **GitHub Pages:** no repositório, abra *Settings → Pages → Deploy from a branch*, escolha `main` e a pasta `/ (root)`. O endereço fica `https://hugodev30.github.io/greenwar/`.
- **Netlify:** use *Add new site → Import from Git*, escolha este repositório e deixe o comando de build vazio, com a pasta de publicação `.`. Também dá para arrastar a pasta em app.netlify.com/drop.
- **Cloudflare Pages:** use *Create → Pages → Connect to Git*, sem framework, sem comando de build, com a pasta de saída `/`.

## Estrutura do projeto
Site estático, **sem etapa de build**: o GitHub Pages publica os arquivos como estão. O `index.html` só tem a marcação e carrega os estilos e os scripts em ordem. Os scripts são clássicos e dividem o mesmo escopo global, então a ordem das tags importa.

```
index.html              marcação + lista de <link>/<script> (a ordem importa)
css/                    estilos por área: base, menu, mapa, campanha, mapa-guerra, batalha, paineis,
                        decisoes, tutorial, ajuda, grandes-eventos, faccoes, acessibilidade, sul, exercitos,
                        frentes, mapa-frentes (visual do mapa de guerra, fase 9)…
js/
  data/                 DADOS PUROS (o que mais se edita)
    ajudantes.js          act() e ev(), atalhos para escrever ações e eventos
    2022/                 historia.js · acoes.js · eventos.js · campanha.js (facções, atores, fases, Sul) · focos.js · retratos.js (rostos, fase 5) · golpe.js (linha do golpe da conselheira, fase 6)
    1964/                 historia.js · campanha.js (cenário BLOQUEADO, não editar)
    cenarios.js           lista do menu (SCENARIOS)
    estados.js            fronteiras (ADJ) e terreno das UFs
    mapa-brasil.js        geometria dos 27 estados (gerada por tools/build-map.js)
    modos.js · conquistas.js  dificuldades e conquistas/nota final (fase 5)
  core/                 REGRAS do jogo, sem tela: estado, efeitos, história, eventos, ações, economia,
                        facções, diplomacia, focos, turno, sul, exércitos, combate, inimigo, ordens, saves,
                        modos, golpe (prontidão e dicas da linha do golpe), conselheiro, conquistas (nota e conquistas do final)
  ui/                   TELA: menu, jogo, abas (aba-*.js), mapa, exércitos, batalha, resolução, tutorial,
                        grandes-eventos, ajuda, economia, janelas, configurações, acessibilidade, modos, conselheiro, mapa-frentes (placar e visual das frentes, fase 9),
                        conquistas, final (tela de final), retratos (rostos/ícones/silhuetas), iniciar.js (último)
  i18n/                 traducao.js (camada PT→EN/ZH/RU), en.js, zh.js, ru.js (dicionários; termos em GLOSSARIO.md)
  audio/                audio.js (trilha e efeitos gerados no navegador)
  nuvem/                cloud.js e config.js (contas e saves na nuvem, opcional)
tests/                  check.js (validação), sim.js (simulação), carregar.js (carrega o jogo no Node),
                        textos-diplomacia.js (textos da aba Diplomacia p/ o check), navegacao-tela.js e traducao-tela.js (testes opcionais no navegador)
assets/retratos/        rostos dos personagens fictícios (webp)
supabase/  tools/       SQL do banco · gerador do mapa
```
Cada arquivo começa com um comentário curto dizendo o que faz. Os testes leem a lista de `<script>` do `index.html`, então um arquivo novo entra no jogo e nos testes no mesmo lugar.

## Como atualizar o jogo (guia rápido)
Depois de qualquer mudança: `node tests/check.js` (tem que terminar com "OK" e "Simulação OK"). O check acusa ids repetidos, referências quebradas, arquivos fora do `index.html`, nomes globais repetidos e qualquer texto do cenário 2022 (e do cartão do 1964) sem inglês, chinês ou russo. Também renderiza a aba Diplomacia (todas as fases, atores, pedidos, ofertas e mensagens) e falha se algum texto ficar em português em EN/ZH/RU. Para varrer todas as telas no navegador: `node tests/traducao-tela.js` (precisa de playwright; sem ele, é pulado).

**Novo evento** em `js/data/2022/eventos.js`, dentro da lista `EVENTOS_2022`:
```js
ev("e_greve_caminhoes", "Greve dos caminhoneiros", "Rodovias bloqueadas em vários estados.", [
  { text: "Negociar o preço do diesel.", fx: { money: -5, s: { apoio: 2 }, fac: { agro: 4 } } },
  { text: "Mandar a PRF liberar as estradas.", fx: { s: { apoio: -3, militar: 2 }, unrestAll: 5 } } ],
  { if: { phase: "oposicao" }, weight: 1, once: true }),
```
`if` usa as mesmas condições do resto do jogo (`phase`, `min`, `max`, `flags`, `fac`…). `once: true` faz o evento sair uma vez só, e `cooldown: 6` faz ele esperar 6 meses para voltar.

**Nova ação** em `js/data/2022/acoes.js` (a categoria escolhe o grupo na aba Ações: `dip`, `eco`, `mil`, `pol`, `sul`):
```js
act("e_feira_agro", "eco", "Visitar a feira do agro", "Fotos com produtores; mercado gosta.", { ap: 1, cost: 2, fx: { fac: { agro: 6 }, money: 3 } }),
```

**Novo foco** (árvore de Decisões) em `js/data/2022/focos.js`, dentro de `nodes` (para uma oportunidade, acrescente `oport: { if: {...}, text: "...", dura: 2, cooldown: 6, repeat: true }` e coloque no ramo `opor`):
```js
{ id: "s_feira", name: "Circuito das feiras", branch: "soc", x: 17, y: 4, months: 2, req: ["s_igrejas"],
  desc: "Agenda pelo interior.", fx: { s: { apoio: 3 }, fac: { agro: 5 } } },
```
`x`/`y` são a posição na árvore, `req` são os pré-requisitos e `excl` os focos exclusivos. Ao concluir, o foco liga a flag `fo_<id>`, que pode liberar ações ou eventos (`show: { flags: ["fo_s_feira"] }`).

**Nova versão no quadro 🆕 Novidades** (tela inicial): a cada atualização publicada, acrescente um item **no começo** da lista `NOVIDADES` em `js/data/novidades.js` (o mais novo primeiro), com textos curtos para quem joga:
```js
{ v: "1.17", data: "2026-11-15", titulo: "Nome curto da versão", itens: [
  "O que mudou, em uma frase.",
  "Outra mudança." ] },
```
Traduza o título e os itens em `js/i18n/en.js`, `zh.js` e `ru.js` (seção `"exact"`). O selo "novo" volta a aparecer sozinho para todos porque a versão mudou. O check confere o formato e a ordem.

**Nova facção** em `js/data/2022/campanha.js`, em `factions`:
```js
{ id: "policias", name: "Polícias estaduais", short: "Polícias", desc: "Pesam na ordem pública.", loyalty: 50, influence: 40, links: { militar: 0.5 } },
```
Toda facção precisa de um **evento de crise** (sai quando a lealdade dela despenca). Ponha em `eventos.js`:
```js
ev("cr_policias", "Motim nas polícias", "Batalhões cruzam os braços.", [
  { text: "Dar o reajuste.", fx: { money: -6, fac: { policias: 10 } } },
  { text: "Endurecer.", fx: { s: { apoio: -2 }, fac: { policias: -5 } } } ], { crisisOf: "policias" }),
```
Depois disso ela já pode aparecer nos efeitos (`fac: { policias: 5 }`). O check avisa se faltar o evento de crise ou se algum efeito citar uma facção que não existe.

**Texto traduzido** em `js/i18n/en.js`: acrescente `"Texto em português": "English text",` dentro de `"exact"`. Para frases com números, use `"tpl"` com `{0}`, `{1}`: `"Faltam {0} meses": "{0} months left"`. Faça o mesmo em `js/i18n/zh.js` (chinês simplificado) e `js/i18n/ru.js` (russo), seguindo `GLOSSARIO.md` — o check falha se um texto do 2022 ficar sem tradução em algum idioma. No jogo, o que faltar no idioma escolhido cai no inglês e depois no português.

**Mudou o formato do save?** Suba `SAVE_VERSION` em `js/core/base.js` e escreva a migração em `js/core/saves.js`, para os saves antigos (locais e da nuvem) continuarem abrindo.

**Guerra por frentes (2022)** em `js/data/2022/frentes.js`: os números dos exércitos (`tropas`: passos, guarnição, flanco, cerco, ímpeto, táticas de Recife), o recrutamento (`recruta`), os traços e os generais (só fictícios, com retrato já existente em `retratos.js`), as frentes (`tropas`, `porEstado`, `reforco`, `ataca`, `reduto`) e a ofensiva especial (do jogador e `inimiga`). Todos os textos ficam em `falas`; ao mudar um texto, ponha a tradução em `js/i18n/en.js` (o check falha se faltar). Depois rode `node tests/sim.js 300 brasil2022` e `--dif=facil` para ver as vitórias. O 1964 continua com exércitos (`js/core/ordens.js`).

**Ajustar a dificuldade** em `js/data/modos.js` (`DIFICULDADES`): `inimigo` e `sul` são multiplicadores, `dinheiro`/`renda` somam Recursos, `status` soma pontos nos atributos iniciais, `folga` afrouxa (ou aperta) os testes da história, `simples` liga o modo simples. `ia` escolhe a IA do inimigo na guerra (0, 1 ou 2; `js/core/ia-inimiga.js`). Depois, rode `node tests/sim.js 300 brasil2022 --dif=facil` para ver as taxas de vitória.

**Arquivo novo** (por exemplo `js/ui/aba-nova.js` ou `css/nova.css`): crie o arquivo com um comentário de topo e acrescente a tag no `index.html`, no grupo certo. Dados entram antes do núcleo, e o núcleo antes da tela.

## Para quem vai desenvolver
Leia o [`CONTEXTO.md`](CONTEXTO.md): arquitetura, regras de conteúdo, a camada de nuvem e os próximos passos.
