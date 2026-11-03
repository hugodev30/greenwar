# CONTEXTO — guia de design e arquitetura (para assistentes de IA e devs)

Documentação de design e arquitetura do projeto. **Leia até o fim antes de alterar história, árvore ou saves.**

## 1. O que é
"Greenwar / Crônicas da Separação": jogo de estratégia narrativa sobre o Brasil, em **português**, inspirado em Hearts of Iron (HoI4). Hoje só o cenário de **2022** é jogável; 1964 está bloqueado e 2002 é apenas um marcador de cenário futuro no menu. O jogador toma decisões na história e administra uma campanha mês a mês, com um mapa dos 27 estados mostrando quem controla cada um.

É um site estático em HTML + CSS + JS puro, **sem dependências e sem build**: o `index.html` carrega arquivos de `css/` e `js/` (veja a seção 4). Funciona offline e salva no `localStorage`.

## 2. Cenários
| id | Ano | Título | Personagem / premissa | Fases da campanha |
|---|---|---|---|---|
| `brasil1964` | 1964 | Os Anos Decisivos — **BLOQUEADO** (`locked: true`) | A crise de 1964 e suas alternativas | governo, crise, guerra civil |
| `brasil2022` | 2022 | A Faixa Presidencial | Bolsonaro depois de perder a eleição: aceitar, contestar ou tentar uma ruptura | `governo` (out–dez/2022), `oposicao` (após a posse), `regime` (após um golpe bem-sucedido, com guerra civil) |
| `brasil2002` | 2002 | Brasil 2002 — **PLANEJADO** (`soon: true`) | Marcador no menu; história e campanha ainda não foram implementadas | — |

**O foco atual do desenvolvimento é o cenário de 2022, o único jogável.** O marcador de 2002 é apenas informativo e não pode ser iniciado.

- **1924 ("Aurora do Sul", id `itavera`) foi removido** (dados, história, campanha, ganchos exclusivos do motor como `C.home`/`homeBonus`, `enemyQuality`, `low/highShare`, `army.enemyStart`). Está no histórico do git (antes do commit que o removeu). Saves antigos dele (`aurora_do_sul_*`) ficam intocados no localStorage e são simplesmente ignorados; linhas da nuvem com `scenario_id = 'itavera'` também são ignoradas (nada é apagado no banco).
- **1964 está bloqueado:** a entrada em `SCENARIOS` tem `locked: true`. `playable(sc)` (fora do CORE) exige `!soon && !locked && story && campaign`; `setScenario` recusa ids não jogáveis (devolve `false`), o menu mostra o card cinza "🔒 Em breve" sem clique nem "Continuar" e sem ler o save local, e `GWGame.scenarios()` só lista os jogáveis (então a nuvem não baixa, envia nem conta 1964). Não há parâmetros de URL, e `jogo_br_ultimo_cenario` não é reaberto sozinho. **Para liberar 1964 basta tirar `locked: true`** (e rodar `node sim.js 300 brasil1964` para rebalancear).
- `check.js` continua validando os dados do 1964 e roda 40 partidas por IA dele como teste de integridade (só falhas/exceções contam); `sim.js` pula cenários `locked` a menos que o id seja pedido.

Detalhes de 2022:
- Ritmo: 1 mês por turno até 2023-03, depois 3 meses por turno.
- A "Liga do Sul" (facção de mapa `separatista`, RS e SC) surge no nó `racha_militar` se houver ruptura.
- O golpe só dá certo com Apoio Militar alto (60/70) no nó `decreto`. Na maioria das vezes ele fracassa, e isso é intencional.
- Finais: retorno (eleição de 2026), herdeiro, oposição, ostracismo, exílio, golpe fracassado, restauração, divisão, regime.

## 3. Sistemas
- **Turnos e Pontos de Ação (PA):** cada turno tem PA (3 em 2022). Ações gastam PA e "Recursos". O botão "Encerrar mês" roda a economia, os eventos, o mapa, a árvore e a história agendada, e gera o **relatório do mês**.
- **Atributos** (`stats`) de 0 a 100. Em 2022: apoio, militar, internacional, base etc.
- **Facções internas** com lealdade (em 2022: militares, centrão, agro, igrejas/evangélicos, movimentos, STF/judiciário…). Cada facção tem rivais, links com atributos e um evento de crise quando a lealdade cai.
- **Diplomacia:** atores estrangeiros (EUA, China, Rússia, UE, Argentina, vizinhos, ONU) com opinião, interesses e o que podem dar.
  - Você monta um acordo (pedidos × ofertas) e `dealScore` calcula a aceitação.
  - Cada fase pode ter as próprias ofertas e pedidos (`phase.diplo`).
- **Eventos aleatórios:** os da campanha (`C.events`) e os genéricos (`GENERIC_EVENTS`), com condições (`if`), peso e escolhas.
  - `ev(id, título, texto|[textos], escolhas, { if, weight, once, cooldown, crisisOf, chained })`. Em 2022: 69 eventos (56 sorteáveis, 4 desdobramentos, 9 crises de facção). Os 46 de out/2026 têm id `n_*`.
  - **Desdobramentos (encadeados):** uma escolha com `fx.chain: { id, in: meses }` (ou uma lista) grava `{ id, due }` em `g.chains`. O evento alvo tem `chained: true`, nunca é sorteado (`pickRandomEvent` o ignora) e aparece com o rótulo "Desdobramento" quando `due` chega e o `if` dele vale. Se não couber em 6 meses depois do prazo, ele se perde.
  - **Prioridade no Encerrar mês:** história > crise de facção > dependência > desdobramento vencido > sorteio. No máximo 1 evento sorteado/desdobramento por turno.
  - **Chance de sorteio:** `C.eventChance` (padrão 0,45; 2022 usa 0,5). Com `C.eventPaceBoost` (só 2022), turnos de 3 meses usam `1 − (1 − chance)²` (0,75), para a fase de oposição não ficar sem eventos.
  - **Chaves de efeito de evento:** `EVENT_FX_KEYS` = `FOCUS_FX_KEYS` + `front` (avança/recua o progresso das UFs em disputa, ±), `org` (moral dos seus exércitos), `enemyLoss` (tira força dos maiores exércitos inimigos), `chain`. O `fxSummary` mostra "Frentes", "Moral dos seus exércitos", "Força inimiga" e "Pode ter desdobramentos".
- **Mapa interativo:** controle por UF e agitação (`unrest`), ações por estado e estados disputados. Os modos de visualização são controle e agitação. Camadas militares: frentes, setas, contadores de exército e pulsos de batalha.
- **Exércitos (sistema militar, desde a v3 do save):** veja a seção 3.1. A guerra **não usa PA**.
- **Árvore de decisões nacionais** (só 2022, estilo foco nacional do HoI4): veja a seção 5.
- **Finais:** por nós `ending` da história ou por `C.checks`, que são condições do estado da campanha.

### 3.1 Sistema militar (exércitos, ordens, batalhas)
> **Desde a fase 7 (save v8), o 2022 não usa mais exércitos:** a guerra é por **frentes** (estilo Victoria 3, simplificado) — veja a seção 7i. Tudo abaixo vale para o **1964** (bloqueado) e para o código que o 2022 desvia quando `frontMode(g)` é verdadeiro (`sideStr`, `addPlayerStrength`, `recruitArmy`, `syncMilitary`, `planEnemy`, `militaryMonth`…).
Fica no fim do CORE (procure `const ADJ`). Compartilhado pelos cenários (2022 e o 1964 bloqueado); os dados de cada um ficam em `CAMPAIGN_X.army` (nomes e generais fictícios por lado, exércitos iniciais, `recruitCost`, `reinforceCost`). Uma fase com `noArmies: true` (2022 `oposicao`) não dá comando de tropas.
- **Dados:** `g.armies = [{ id, side: "player"|"enemy", fac, uf, name, gen, str, org, xp, order }]`; `g.enemyPlans` (intenções do mês, planejadas por `planEnemy` antes do jogador agir); `g.mil` (registro do último mês: `control0`, `start`, `orders`, `moves`, `battles`, `flips` — usado pela animação); `g.armsAid` (bônus temporário de armas estrangeiras).
- **Geografia:** `ADJ` (adjacência das 27 UFs, simétrica, validada contra a geometria do mapa em `check.js`) e `TERRAIN`/`TERRAIN_TYPES` (selva, metrópole, serras, sertão… dão bônus de defesa).
- **Escala:** `STR_UNIT = 10` (1 "unidade" antiga = 10 de força), `ARMY_MAX = 60`, `ARMY_CAP` 8 por lado. A antiga `reserve`/`u.force` não existe mais; o efeito `reserve: n` em `applyFx` vira `addPlayerStrength(g, n*10)` (reforça exércitos ou cria um novo).
- **Recrutamento:** `recruitState(g, uf)` diz se dá para recrutar e por quê (texto em PT); `recruitArmy(g, uf)` cria um exército de `RECRUIT_STR = 20` (moral até 55, xp 5) por `recruitCost` (8), até `RECRUIT_PER_MONTH = 2` por mês (`g.used._recruit` é um contador; `recruitsLeft(g)`). `reinforceCost` = 3. Manutenção `C.army.upkeep` = 0,3 por 10 de força.
- **Alistamento:** `mobilization(g)` = 3 + 0,35 × estados seus + (apoio − 50)/10, entre 2 e 12. `playerMobilize(g, R)` (no `endTurn`, depois de `enemyReinforce`) dá até +6 a cada exército seu parado em território seu, com força < 45 e que não lutou no mês; o resto vai para `g.mobPool` (máx. 30), que ao chegar a 15 vira um exército novo na capital.
- **Relatório de batalha:** `fight()` guarda `rec.pow` (poder inicial), `rec.powEnd`, `rec.luck` (multiplicador médio de dano por sorte) e `rec.broke`. `battleReport(rec)` (puro, CORE) devolve `{pi, won, forecast, rows, summary, how, tips, loss, power}`; funciona para previsões e para recs antigos. `logBattles` guarda as últimas 30 batalhas em `g.battleLog`. UI: `battleReportHTML` (seção `.brep` em `openBattle`), `resolBtn` (lista da resolução), `battleRowsHTML` (aba História e painel do mapa), `recruitBoxHTML` (caixa "Recrutar tropas" em `overviewPanel`/`ufPanel`).
- **Ordens do jogador:** `setOrder(g, id, type, to)`, `armyTargets(g, a)`, `recruitArmy(g, uf)`, `commandLimit(g)` (1–5, pelo atributo militar e lealdade da facção militar), `ordersUsed(g)`. Atacar/mover/recuar contam no limite; defender e reforçar não.
- **Milícias:** cada estado tem uma força local implícita (`militia`): polícia/milícias leais nos seus estados, voluntários nos disputados (dependem do apoio popular e da simpatia), guarnição inimiga (`u.enemy * 5`).
- **Combate:** `fight()` faz até 5 rodadas; o poder é força × moral × experiência × modificadores (`milMods`: terreno, posições preparadas, apoio local, comando/lealdade, suprimentos, armas estrangeiras, qualidade/mobilização inimiga, sanções). Quem perde a moral (< 20) recua. O registro (`rec`) guarda as rodadas para a tela de batalha.
- **Mês militar (`militaryMonth`):** movimentos → ataques (alternando lados, por peso econômico) → frentes dos estados em disputa (`resolveFront`) → recuperação de moral e limpeza. Ataques do jogador contra estado inimigo podem conquistá-lo com vitória ampla; senão o estado entra em disputa. **O inimigo só abre frentes** (não toma estados seus direto); a frente vai de −100 a +100.
- **IA inimiga (`planEnemy`):** ataca estados fracos ou em disputa (razão de forças ≥ 1,15–1,35), defende capitais ameaçadas e se reforça (`enemyReinforce`); trégua impede ataques.
- **Integrações:** acordos de armas dão +20 de força e `armsAid`; lealdade militar afeta moral máxima e limite de comando; focos com `reserve` dão força; viradas de mapa da história passam por `syncMilitary` (exércitos em território que deixou de ser permitido são realocados).
- **UI (fora do CORE):** `militaryLayers`/`mapSVG` (frentes via `sharedBorder`, setas `arrowSVG`, contadores `counterSVG`), `tabMapa` (fluxo selecionar exército → alvo, painéis `armyPanel`/`overviewPanel`/`ufPanel`), `openBattle`/`openForecast` (tela de batalha), `playResolution` (animação pulável do Encerrar mês). Tudo em CSS/SVG, com `prefers-reduced-motion`.

## 4. Arquitetura (arquivos)
O `index.html` tem só a marcação e a lista de `<link>`/`<script>`. **Os scripts são clássicos (não são módulos) e dividem o mesmo escopo global**, como se fossem um só arquivo. Por isso **a ordem das tags no `index.html` importa**: dados → núcleo → idioma/som → tela → `js/ui/iniciar.js` (sempre por último). O único módulo é `js/nuvem/cloud.js`, que importa `./config.js`.

| Pasta | Conteúdo |
|---|---|
| `css/` | Estilos por área. A ordem dos `<link>` preserva a cascata original; o mobile fica junto de cada área (`@media max-width:700/860px`) |
| `js/data/` | **Só dados.** `ajudantes.js` (`act`, `ev`), `2022/` (`historia.js` = `STORY_2022`, `acoes.js` = `ACOES_2022`, `eventos.js` = `EVENTOS_2022`, `campanha.js` = `CAMPAIGN_2022`, `focos.js` = `CAMPAIGN_2022.focus`), `1964/` (bloqueado), `cenarios.js` (`SCENARIOS`), `estados.js` (`ADJ`, `TERRAIN`, `TERRAIN_TYPES`), `mapa-brasil.js` (`MAP_DATA`, gerado por `tools/build-map.js`) |
| `js/core/` | **Lógica pura, sem DOM** (roda no Node): `base` (`SAVE_VERSION`, `rnd`, chaves de efeito), `estado` (`newCampaign`), `efeitos` (`cond`, `applyFx`), `historia`, `eventos`, `acoes`, `economia`, `faccoes`, `diplomacia` (`dealScore`), `focos`, `turno` (`endTurn`), `sul`, `ordens-automaticas`, `exercitos`, `combate`, `inimigo`, `ordens`, `saves` (`migrateSave` e afins) |
| `js/i18n/` | `traducao.js` (camada PT→EN que traduz o DOM) e `en.js` (`I18N_EN`, com `exact` e `tpl`) |
| `js/audio/` | `audio.js` (trilha e efeitos sintetizados) |
| `js/ui/` | Tela: `base` (`UI`, `esc`), `saves` (`save`, `loadInfo`, ponte `cloud()`), `menu`, `jogo` (HUD e abas), `aba-*.js` (uma por aba), `mapa`, `exercitos`, `batalha`, `resolucao`, `final`, `tutorial`, `grandes-eventos`, `ajuda`, `janelas`, `economia`, `configuracoes`, `acessibilidade`, `sul`, `iniciar` (liga tudo e expõe `window.GWGame`) |
| `js/nuvem/` | `cloud.js` e `config.js` (Supabase, opcional) |
| `tests/` | `carregar.js` lê as tags `<script>` do `index.html` e junta `js/data/` + `js/core/` para o Node; `check.js` e `sim.js` usam isso |

**Regras da organização:**
- Cada arquivo começa com um comentário curto em português dizendo o que faz.
- Arquivo novo: crie com comentário de topo e acrescente a tag no `index.html`, no grupo certo. O `tests/check.js` falha se um arquivo de `js/`/`css/` estiver fora do `index.html` (ou listado duas vezes), sem comentário de topo, ou se dois scripts declararem o mesmo nome global.
- `js/core/` não pode usar `document`/`window`: ele roda nos testes do Node.
- Os nomes de funções e campos ficaram em inglês, como antes, porque saves e nuvem dependem deles. Os nomes de arquivos e pastas são em português.
- Passo a passo para adicionar evento, ação, foco, facção, tradução ou arquivo: veja "Como atualizar o jogo" no README.

### Objetos principais
- **`SCENARIOS[i]`:** `{ id, year, date, title, tag, character, description, saveKey, endingsKey, intro, story: STORY_X, campaign: CAMPAIGN_X }`.
- **`STORY_X`:**
  - `stats` (atributos com `initial`), `factions` (as facções **do mapa**, com cor), `initialMap`, `defaultFaction`, `start`;
  - `nodes`: `{ chapter, title, text[], onEnter{map,resolve}, choices[{ text, effects, req, flag, map, next }] }`. `next` pode ser uma string ou uma lista `[{if, to}]`;
  - os finais têm `ending: true` e `endingName`.
- **`CAMPAIGN_X`:**
  - `start`, `ap`, `money`, `pace`, `storyAt` (data mínima de um nó) e `storyDelay` (meses após a escolha);
  - `phases` (com `player`/`enemy`/`war`/`diplo`), `checks`, `actors`, `factions`, `actions`, `events`, `enterFx`, `choiceFx`, `offerFac`;
  - em 2022 também `focus`.
- **Condições (`cond`):** `min`, `max`, `flags`, `noFlags`, `visited`, `visitedAny`, `notVisited`, `from`, `until`, `money`, `fac`, `actor`, `control`, `anyControl`, `recognized`, `phase`, `notPhase`, `war`, `sideCount`.
- **Efeitos (`applyFx`):** `s` (atributos), `money`, `reserve` (+10 de força militar por ponto), `fac`, `infl`, `unrest`, `unrestAll`, `unrestUF`, `act`, `actAll`, `enemy`, `flag`, `map`, `ap`, `ceasefire`, `malus {v, months}`.

### Saves e localStorage
- **Versão atual: `SAVE_VERSION = 15`** (`js/core/base.js`). As migrações v2→v15 ficam em `js/core/saves.js` e são executadas ao carregar saves em `js/ui/saves.js`. Cada versão histórica e seus campos estão documentados no comentário de `SAVE_VERSION`; entre as mudanças recentes estão exércitos estaduais distintos e a remoção da partida rápida. Saves v2–v14 são migrados em sequência; saves desconhecidos ou formatos antigos são arquivados em `<saveKey>_legacy`, e o jogador vê um aviso.
- Saves v2 também convertem `reserve` e `u.force` em exércitos (10 de força por unidade), preservam a força inimiga como guarnições/milícias e marcam `milMigrated`. Saves v3/v4 recebem os registros de batalha, reserva de mobilização e encadeamentos que faltavam.
- Saves de 2022 sem `g.focus` (anteriores à árvore) são **migrados** em `loadInfo`: `focusInit` aplica as concessões da história já vividas e marca `focusMigrated`, e aparece um aviso no menu.
- **Se mudar o formato do save, aumente a versão ou escreva uma migração em `loadInfo`.**
- Chaves do localStorage:
  - `jogo_br_save_brasil1964` e `jogo_br_endings_brasil1964` (1964 bloqueado: mantidas, nunca lidas enquanto `locked`);
  - `aurora_do_sul_save_v1` e `aurora_do_sul_endings_v1` (1924 removido: chaves antigas ignoradas, não são apagadas);
  - `jogo_br_save_brasil2022` e `jogo_br_endings_brasil2022`;
  - `jogo_br_ultimo_cenario`;
  - `gw_settings_v1`: configurações (idioma, acessibilidade, som);
  - `gw_tut_v3`: progresso do tutorial contextual `{ off, seen: { hud, historia, mapa, exercitos, decisoes, faccoes, diplomacia, acoes } }` (a antiga `jogo_br_tutorial_v2` não é mais lida).
  - `gw_conquistas_v1`: conquistas e melhor nota por cenário `{ v: 1, got, best }` (fase 5; também na nuvem).
- Cada `save()` grava `G.savedAt = Date.now()`, usado para dizer qual save é mais recente na mesclagem com a nuvem.

### Camada de nuvem (Supabase): `js/nuvem/config.js`, `js/nuvem/cloud.js` e `supabase/migrations/001_init.sql`
- **Opcional e isolada.** `index.html` carrega `<script type="module" src="js/nuvem/cloud.js">` no fim. Se o módulo ou a biblioteca não carregarem (offline, `file://`, CDN bloqueada), nada quebra e os saves seguem no `localStorage`.
- **Biblioteca:** `cloud.js` importa `@supabase/supabase-js@2` (versão fixa) do jsDelivr, com o esm.sh como alternativa.
- **`config.js`:** `SUPABASE_URL`, `SUPABASE_KEY` (a *publishable key*, pública por design) e `FEATURES.googleLogin` (o botão do Google fica escondido até o provedor ser ativado). Nunca coloque ali a secret key ou a service_role.
- **Ponte jogo → nuvem:** em `js/ui/saves.js`, `cloud("syncSave", id)`, `cloud("syncEndings", id)`, `cloud("campaignStarted", id)` e `cloud("deleteSave", id)` chamam `window.GWCloud.*` se ele existir e não fazem nada se não existir. Os pontos de chamada:
  - `startNew` dispara `campaignStarted` e `syncSave`;
  - "Encerrar mês" e `renderEnding` disparam `syncSave`;
  - `addEnding`, quando o final é novo, dispara `syncEndings`;
  - "Recomeçar" dispara `deleteSave`.
- **Ponte nuvem → jogo:** `window.GWGame` expõe:
  - `scenarios()` (só os **jogáveis** — hoje 2022 —, com ids, chaves do localStorage e lista de finais);
  - `saveVersion`, `monthLabel`, `current()`;
  - `refresh(ids)`, que volta à tela de título ou ao menu se a nuvem trocou o save do cenário aberto.
- **Tabelas** (rodar o SQL no SQL Editor; o arquivo é idempotente):
  - `profiles(id → auth.users, username único ^[a-z0-9_]{3,20}$, display_name ≤40, avatar (id de emblema ou 'iniciais'), bio ≤280, campaigns_played (desde a fase 12: total de campanhas concluídas), campaigns_by_scenario jsonb (a chave `_fim` = concluídas por cenário; as outras chaves são contagens antigas de campanhas iniciadas, ignoradas), endings jsonb {cenário: [ids]}, endings_count calculado por gatilho, created_at, updated_at)`;
  - `saves(user_id, scenario_id, slot 0–9, data jsonb, save_version, created_at, updated_at, PK(user_id, scenario_id, slot))`. Hoje o jogo usa só o `slot = 0`.
- **RLS:**
  - perfis: leitura pública (`anon` e `authenticated`); insert e update só do dono;
  - saves: leitura e escrita só do dono.
  - O gatilho `on_auth_user_created` (`handle_new_user`, security definer, que nunca bloqueia o cadastro) cria o perfil com o `username` e o `display_name` dos metadados do cadastro.
- **Mesclagem ao entrar** (uma vez por usuário por carregamento):
  - save só na nuvem, com o mesmo `save_version`: é baixado;
  - save só local: é enviado;
  - os dois diferentes: aparece um modal por cenário, com mês, turno, data e o selo "mais recente";
  - finais: união nos dois sentidos.
  - Saves da nuvem com `save_version` entre `GWGame.minSaveVersion` (2) e `SAVE_VERSION` (5) são aceitos; um v2/v3/v4 baixado é migrado pelo jogo ao abrir e reenviado como v5 no próximo save. Versões fora dessa faixa são ignoradas. Se `SAVE_VERSION` mudar, pense também nos saves da nuvem.
- **Cenários removidos/bloqueados na nuvem:** saves e finais de `itavera` (1924) e `brasil1964` continuam no banco (nada é apagado) e são ignorados. O perfil, as estatísticas e o ranking mostram totais **só dos cenários jogáveis** (`playTotals` em `cloud.js`, calculado de `endings`/`campaigns_by_scenario`); os campos `endings_count`/`campaigns_played` do banco ainda somam tudo, então o ranking busca os 300 primeiros por `endings_count` e reordena no cliente.
- **Sem tabelas:** se o SQL ainda não foi rodado, a API devolve `PGRST205`. Nesse caso `cloud.js` mantém o login, avisa no perfil que o servidor não foi configurado e não tenta sincronizar.

## 5. Árvore de decisões nacionais (2022)
Dados em `CAMPAIGN_2022.focus = { ap, cell, grants, branches, nodes }`. São 58 focos em 8 ramos (49 normais + 9 oportunidades no ramo `opor`), com 12 pares exclusivos. Duração 1 ou 2 meses (fase 8).

- **Campos de um nó:** `id`, `name`, `branch`, `x`, `y` (posição na grade), `months`, `cost` (Recursos), `req` (todos), `reqAny` (pelo menos um), `excl` (mutuamente exclusivos, sempre simétricos), `avail` (condição para iniciar) e `availText`, `lockIf` (condição de história que bloqueia), `desc`, `fx`, `risk {p, msg, fx}`, `dipBonus`, `dipOff`, `dipReq`, `unlocks` e, nas oportunidades, `oport { if, text, dura, cooldown, chance?, repeat? }` (sem `req`/`excl`).
- **Regras:**
  - Um foco ativo por vez, iniciado com 1 PA. O progresso avança em "Encerrar mês".
  - Ao concluir, aplica `fx` e a flag `fo_<id>`, e escreve no relatório.
  - As ações e eventos liberados usam `show: { flags: ["fo_<id>"] }` ou `if`.
  - Um foco ativo é interrompido só se ficar bloqueado, excluído ou perder a fase exigida.
- **Ramos:**
  - **Tronco:** `t_balanco` leva a uma escolha excludente entre `a_regras`, `b_contestar` e `c_ruptura`.
  - `democ`: liderança, partido, Centrão ⊘ oposição pura, herdeiro ⊘ candidato, campanha 2026.
  - `jurid`: auditoria, defesa, reforma ⊘ pacto, anistia.
  - `ruptura`:
    - antes do golpe: quartéis e minuta, com risco de dar errado;
    - no regime: exceção, interventores ⊘ eleições, comando, carta, mobilização, Nordeste, economia de guerra, Liga (esmagar ⊘ pacto), reconhecimento.
  - `econ`: agro, privatizações, commodities, China ⊘ EUA.
  - `diplo`: Ocidente ⊘ BRICS, Mercosul, rede regional.
  - `soc`: igrejas, segurança, redes ⊘ imprensa, costumes.
- **Travas:** o caminho democrático trava a ruptura e vice-versa, via `excl` e `lockIf`. `grants: { golpe_inicial: ["c_ruptura"] }` conclui a ruptura à força se a história der o golpe.

## 6. Validação (rode sempre)
- **`node tests/check.js [N]`:** valida links e nós alcançáveis da história, as referências de mapa, facções, atores, ações e eventos, e a árvore:
  - ids únicos e referências existentes;
  - `excl` simétrico, sem ciclos, raiz única;
  - todo foco alcançável por algum caminho;
  - chaves de efeito válidas e flags `fo_*` válidas;
  - sistema militar: `ADJ` simétrico, 27 UFs, conexo e conferido com a geometria do mapa; terreno completo; `C.army` de cada cenário; ações de recrutamento com `ap: 0`; migração de 50 saves v2, 30 saves v3 e 15 saves v4 sintéticos e um teste de `fight()` + `battleReport()`.
  - eventos: textos não vazios, escolhas sem repetição e ao menos uma sem requisito, chaves em `EVENT_FX_KEYS`, valores numéricos, flags exigidas que algum foco/história/efeito produz, `from ≤ until`, todo `chain` aponta para um evento `chained` e todo `chained` é disparado por alguém; teste de que `n_acampamentos` → `n_acampamentos_radical` aparece de fato (≥ 8/10 campanhas).
  - organização: todo arquivo de `js/` e `css/` listado uma vez no `index.html`, com comentário de topo, sem nomes globais repetidos entre scripts;
  - aviso (não falha) para nomes de ações/focos sem tradução em `js/i18n/en.js`;
  - Depois roda o `sim.js`.
- **`node tests/sim.js [N] [cenário]`:** partidas automáticas com as IAs aleatória, gulosa e radical, e a "golpista" (roteiro só de cobertura, em 2022). As IAs também dão ordens aos exércitos (`giveOrders`: aleatória ao acaso; gulosa recruta, reforça e ataca em grupo com razão de forças ≥ 1,2) e o sim confere invariantes do exército (ordens limpas, território permitido, limites). Mostra a distribuição de finais, os focos concluídos por partida e quais focos nunca são concluídos. Falha se algum final ou foco ficar inalcançável ou se o relatório de alguma batalha sair inválido (NaN, sem resumo/dica). Imprime `eventos/partida` (frequência e maior intervalo sem evento) e a cobertura de eventos; **falha se algum evento nunca aparecer**, exceto crises de facção e eventos presos a focos raros (`fo_*`), que só geram aviso. Nas partidas com guerra imprime a linha `guerra:` (meses, % de batalhas vencidas, % dos seus ataques vencidos, força máxima média, estados no início → fim da guerra, % de partidas em que ganhou território, finais).
- **Referência atual (300 partidas por IA, 2022, depois dos 46 eventos novos):**
  - aleatória: ostracismo 30%, oposição 22%, retorno 20%, exílio 9%, golpe fracassado 7%…; 6,6 eventos/partida (1 a cada 3,2 meses, maior intervalo 12);
  - gulosa: retorno 83%; 10,9 eventos/partida (1 a cada 3,8 meses, maior intervalo 18);
  - radical: golpe fracassado 55%; 5,0 eventos/partida (1 a cada 3,6 meses);
  - golpista: divisão 80%, restauração 12%, regime 7% (~35 batalhas por partida); guerra: 67% das batalhas vencidas (ataques 93%), força máx. média 252, estados 11,1 → 11,9, ganhou território em 56% das partidas; 5,2 eventos/partida (1 a cada 2,1 meses, maior intervalo 9).
  - Antes dos eventos novos: 1 evento a cada 4,0 (aleatória) / 5,5 (gulosa) / 5,1 (radical) / 2,3 (golpista) meses, com intervalos de até 21/38/27/9 meses; golpista divisão 82%, restauração 9%, regime 9%, batalhas vencidas 66%.
  - Antes do recrutamento facilitado (out/2026): golpista divisão 82%, restauração 13%, regime 5%; batalhas vencidas 62% (ataques 90%), força máx. 185, estados 11,1 → 10,4, ganhou território em 28%. Aleatória (14 partidas com guerra): batalhas vencidas 25% → 29%, estados no fim 4,5 → 7,8.

## 7. Regras de design (obrigatórias)
1. **UI e textos em português do Brasil.**
2. **Aviso de ficção** visível (menu e introdução). Não remova.
3. **Pessoas reais tratadas de forma neutra,** sem caricatura nem juízo editorial. **Nunca inventar citações** atribuídas a pessoas reais.
4. **Caminhos autoritários ou golpistas têm consequências sóbrias e pesadas** (isolamento, violência, colapso econômico, chance de fracasso), sem glorificação. O jogo não deve parecer um manual nem uma propaganda.
5. Mudou história, eventos ou árvore? **Rode `node tests/check.js`** e confira a distribuição de finais.
6. Não quebre saves: aumente `SAVE_VERSION` e migre em `js/core/saves.js`.
7. Mantenha `js/core/` testável em Node (sem `document`/`window`).
8. Mobile importa: teste em largura de ~400 px.

## 7b. Camada de UI da fase 1 (out/2026) — tudo fora do CORE
- **Tutorial contextual:** `tutSteps(ctx)` define os balões por contexto (`hud`, `historia`, `mapa`, `exercitos`, `decisoes`, `faccoes`, `diplomacia`, `acoes`); `tutAfterRender()` (chamado no fim de `renderGame`) abre o primeiro contexto ainda não visto e espera enquanto houver overlay aberto. `coachRun` posiciona anel + balão via `getBoundingClientRect`; Esc/←/→ funcionam. `tutSkipAll` e `tutReset` (botão em `openHelp`). Ao criar uma aba/recurso novo, **acrescente um contexto em `tutSteps`**.
- **Grandes eventos:** `MAJOR_NODES.brasil2022` (nós de história com manchete), `majorSnap()` antes da ação e `majorCheck(snap)` depois montam a lista de consequências por diferença de estado (fase, exércitos, guerra, renda, mapa, atributos). `showMajor` exibe a tela cheia. Usado em `#btnEnd` e nas escolhas da História. Não mexe no CORE nem no `sim.js`.
- **Decisões:** zoom em `UI.fz` (0,3–1,6), tela cheia em `UI.ffull`; arrastar com limiar de 5px (`dataset.dragged` evita clique acidental).
- **Agitação:** `unrestColor` usa a escala VIRIDIS; `unrestLabel(v)`; limiares exibidos 30/62/88 (62 = média que derruba apoio; 88 = revolta).

## 7c. Fase 2 (out/2026): economia e mapa de guerra
- **CORE (CAMPAIGN_2022):** `money.cap: 80`, `apScale: { stat: "apoio", tiers: [[60,1],[75,2]] }`, `facMoney: { agradar: 8, pressionar: 6 }`, `convert: { cost: 12, ap: 1 }`. Funções `apFor(g)` → `{ total, parts }` (base, apoio, fase), `apNextTier`, `moneyCap`, `applyMoneyCap`, `convertMoney` (usa `g.used.convert`, 1×/turno), `facCost(g, F, kind)`. `newCampaign` e `endTurn` gravam `g.ap` e `g.apParts` (a origem das ações no início do turno; saves antigos sem `apParts` usam `apFor` na hora). `endTurn` aplica o teto e registra no relatório. Sem mudança de formato que exija migração.
- **sim.js:** métricas `g.simEco` + linha "economia"; invariante "Recursos ≤ teto"; as IAs gastam em facções/conversão (guerra e golpista guardam 35 de reserva e só socorrem facções < 22).
- **UI:** `apSrcLine`, células `.ecocell` no topo, `ecoStrip` na aba Ações, `openEco(focus)` (modal `#ecoModal`). Facções mostram o custo em Recursos (`facCostTxt`).
- **Mapa de guerra:** `counterInner(side, str, n)` desenha a ficha (também nos fantasmas da resolução e na legenda `.milleg`); `CNT_K()` é a escala (1,2 no celular). Frentes = `path.frontcase` + `path.front`. Fluxo de ordem: `UI.pend = { army, to, type }` (validado a cada render), `orderForecast(a, to, type)` calcula a previsão com `battleOdds`/`milMods`, `forecastCardHTML` vira painel lateral (desktop) ou bloco sob o mapa (≤ 900px), `openAttackForecast` abre a tela de batalha em modo previsão com os atacantes. `UI.mapBig` = mapa ampliado. Esc cancela a prévia/seleção.

## 7d. Fase 3 (out/2026): configurações, acessibilidade, idioma e som (tudo na UI, sem mudar o CORE nem os saves)
- **Configurações:** `SET` no localStorage `gw_settings_v1` `{ lang:"pt"|"en", cb, hc, fs:100|115|130, motion, music:0–1, sfx:0–1, muted }`; `applySet()` aplica as classes `body.cb`/`body.hc`/`body.rm` e o tamanho da letra; `openSettings()` abre `#setModal` (botões `#btnSet`, `#btnSnd`).
- **Daltônico:** `CB_PATS` (padrões SVG) e `facFill(f)` devolvem `url(#pat-…)` quando `SET.cb` está ligado.
- **Acessibilidade:** `#srlive` (aria-live) + `announce(msg)`; `<main id="app">` com link de salto `.skip`; estados e fichas do mapa com `tabindex`/`role=button`/`aria-label`; Enter/Espaço viram clique (`UI.kbFocus` + `restoreKbFocus()` devolvem o foco depois do render); setas nas abas; `mapDescriptionHTML(G, modo)` (`UI.mapDesc`).
- **Áudio:** IIFE `AUDIO` (Web Audio procedural): `AUDIO.theme("calm"|"tense"|"war")`, `AUDIO.sfx("click"|"order"|"turn"|"boom"|"win"|"lose"|"sting"|"alert")`, `AUDIO.unlock()` no primeiro gesto.
- **Idioma (EN):** camada de tradução no DOM. O jogo continua escrito em PT. `I18N_EN = { exact, tpl }` (dicionário embutido), `trCore` (busca exata → modelo com números `{0}` → meses → divide em " · ", "; ", " — ", ". ", ": ", ", " → regras `I18N_RULES`), `trText` (só traduz se `SET.lang==="en"`), `i18nNode` (textos + `title`/`aria-label`/`placeholder`/`alt`, original guardado em `__pt`/`__pta`), um `MutationObserver` em `body` e `i18nSwitch()`. **Texto novo na UI precisa de entrada no `I18N_EN`**, senão aparece em português no modo English.

## 7e. Fase 4 (out/2026): Tensão no Sul e exércitos mais simples (save v6)
- **CORE:** `CAMPAIGN_2022.south` (`ufs` RS/SC/PR, `rebel`, `start`, `base`, limiares de cúpula/alerta/revolta) e `g.south = { t, state: "calmo"|"revolta"|"armisticio"|"aliado"|"esmagada", stage, since, warned, summit, trend }`. Funções `southCfg/southOn/southInit/southAdd/southFactors/southRate/southEta/southLevel/southOnStory/southRaise/southTick`. Ações com categoria `sul` e `req.south` (min/max/state); evento `e_sul_cupula` (encadeado por `C.south.summit`); focos `c_liga_pacto` (aliado) e `c_liga_esmagar`; chaves de efeito `south`/`southAlly` em `FOCUS_FX_KEYS`.
- **Revolta escalonada:** em 100 só RS vira separatista (exército 15). SC adere se `t > 85` por 2 meses. `t ≤ 45` em revolta → armistício. Flags `sul_revolta`, `sul_armisticio`, `sul_aliado`, `sul_esmagado` aparecem no overlay `MAJOR_FLAGS`.
- **Ordens automáticas:** `autoOrders(g, mode, silent)` (`defender`/`auto`) e `g.autoOrders` (repetir todo mês).
- **UI:** `southBarHTML()`/`openSouth()` (modal genérico `openModal`/`closeModal`), `armyCardHTML`, `armyBtnsHTML` (`data-q` = atk/mov/def/ref), `ordSumHTML`, `autoBoxHTML`, `atkWithHTML(uf)`, `attackChoices(a)`, `UI.ordMode` (filtra os destinos destacados). Tutorial: contextos `exercitos2` e `sul`.
- **Save v6:** migração v5→v6 cria `g.south` (em revolta se a Liga já controla estados).
- **sim.js:** IA `pacificador` (evita a rebelião). 300 partidas: golpista (ignora o Sul) rebelião 98%, vitória 26%; pacificador rebelião 0%, Sul aliado 94%, vitória 68%, tensão máx. média 19. IA aleatória: rebelião nas partidas com guerra caiu de 100% para ~50%.

## 7f. Organização do código (out/2026)
- O `index.html` único (~3.900 linhas) foi dividido em 17 CSS e 56 scripts (seção 4), sem mudar regras, textos nem visual.
- Prova: `tests/sim.js 300` com números idênticos antes e depois; `tests/check.js` sem falhas; capturas de tela (PT e EN, desktop e celular) idênticas pixel a pixel; saves v5 e v6 antigos abrem igual.
- Foram removidas 4 regras de CSS sem uso (`.tutskip`, `.ordbtns`, `.fdetail.empty`, `.sans`).
- Os marcadores `/*CORE_START*/` e afins não existem mais: os testes carregam os arquivos pela lista do `index.html`.

## 7g. Fase 5 (out/2026): dificuldade, partida rápida (save v7)
- **Dados:** `DIFICULDADES` e `DIF_ORDEM` em `js/data/modos.js`; `CAMPAIGN_2022.rapida` (`pace`, `storyDelay`, `eventChance`, `checks`); campo `outcome` ("vitoria"/"parcial"/"derrota") nos finais da história de 2022.
- **CORE (`js/core/modos.js`):** `scVariant(sc, diff, quick)` devolve uma cópia "leve" do cenário (`Object.create`) com só os números trocados (`enemyPower`, `enemyBase`, `money.initial`, `income` das fases, `south.base`/`jolt`, e o bloco `rapida`). `scOf(g)` devolve o cenário ORIGINAL quando `g.diff` é normal e `g.quick` é falso — por isso o Normal é idêntico ao jogo anterior (prova: `tests/sim.js 300` sem flags com saída idêntica). `diffSlack(g)` é a folga usada por `resolveNextG` (via `cond(g, c, slack)`, só nos testes de rumo da história). `choicePreview(g, idx)` diz se uma escolha da história encerra a campanha e com que resultado. `newCampaign(sc, seed, { diff, quick })` grava `g.diff`, `g.quick`, `g.simple`, liga `g.autoOrders = "auto"` no Fácil e soma `status` aos atributos.
- **UI (`js/ui/modos.js`, `css/modos.css`):** `openNewCampaign()` (janela de dificuldade/duração; última escolha em `gw_newcamp_v1`), `diffBadgeHTML(g)` (selo no HUD), `settingsCampaignHTML()` (Configurações → Campanha atual), `simpleArmiesHTML()` (aba Mapa no modo simples; `UI.manual` abre o comando completo), `UI.moreTabs` (botão Mais ▾), `endTagHTML(i)` (aviso de final nas escolhas).
- **sim.js:** `--dif=facil|normal|dificil` e `--rapida`; IA `iniciante` (só no Fácil); linha `resultado:` por IA.
- **Conselheira:** `ADVISOR`, `advisorTips(g, { tab, manual })` (no máximo 2 dicas `{ id, pri, head, text, sub, act }`, ordenadas por prioridade, sem ação repetida) e `advisorDo(g, tip)` em `js/core/conselheiro.js`; cartão `advisorHTML()`/`bindAdvisor()` e `SET.advisor` ("auto"/"on"/"off") em `js/ui/conselheiro.js` + `css/conselheiro.css`. `act.k`: `tab`, `action`, `fac`, `focus`, `auto`, `recruit`, `end` (e `posture`, `ofensiva`, `split` na guerra por frentes, 7i). sim: `--conselheira` (automático no Fácil) acrescenta as IAs `iniciante` e `conselheira` (história como a iniciante; no resto só aperta "Fazer isso"). 300 partidas: Normal 36% → 55% de vitória (iniciante → conselheira), Difícil 25% → 50%, Rápida 28% → 49%, Fácil 61% → 62%.

- **Tela de final:** dados em `js/data/conquistas.js` (`CONQUISTAS` com `teste(g, x)`, `NOTA_FAIXAS`, `NOTA_BASE`, `NOTA_TETO`, `NOTA_PAZ`, `NOTA_SUL`, `NOTA_DIF`, `GRADE_RANK`); CORE em `js/core/conquistas.js` (`endingGrade(g)` → `{ letter, score, outcome, parts }`, `earnedAchievements(g, { achados, total })`, `endingMoments(g, n)`, `achMerge(a, b)`, `betterGrade`); UI em `js/ui/conquistas.js` (`achRecord()` grava uma vez por final e marca `G.ended.achDone/achNew/grade`; `shareText`, `shareEnding`) e `js/ui/final.js` (`renderEnding`), CSS em `css/final.css`. Os finais têm `dica` (texto do botão "Tentar outro final"). `advisorDo` conta `g.stat.adv` (dicas seguidas). localStorage `gw_conquistas_v1` = `{ v: 1, got: { id: { at, sc, diff } }, best: { cenário: nota } }`.
- **Conquistas na nuvem:** linha de `saves` com `scenario_id = "_conquistas"`, `slot = 0`, `save_version = 1` (cabe nas regras da tabela; o RLS já limita ao dono). `mergeAchievements()` em `cloud.js` roda no login (dentro de `mergeOnLogin`, com as linhas já lidas) e no gancho `GWCloud.syncAchievements`; a união é `GWGame.mergeAchievements` (= `achMerge`). Não usa `profiles.endings` para não mexer na contagem de finais do ranking.
- **sim.js:** `--notas` imprime `nota:` (S/A/B/C por IA e por tipo de final) e `conquistas:`; automático fora do Normal. `check.js` testa a nota, as conquistas, as dicas dos finais e o `achMerge`.
- **Linha do golpe (fase 6):** dados `GOLPE_2022` em `js/data/2022/golpe.js` (ligado por `golpe:` em `cenarios.js`; `aceitou`/`conspira`/`fim`, limiares `militar` 60 / `militarEspera` 70 menos `diffSlack`, `ganhos`, `focos`, `faccoes`, `pesos`, `riscos`, índices das escolhas em `nos` e todas as `falas`). CORE `js/core/golpe.js`: `coupState(g)` → `null`/`"porta"` (governo antes da posse)/`"plano"` (conspiração)/`"dia"` (golpe_inicial na fila); `coupReadiness(g)` → `{ pct, troops, forecast, reqs, missing, hora, risks }`; `coupStoryTip(g, st)` (dica pri 95 com `act { k: "choose", i }`; detalhe por dificuldade via `coupDetail`: Fácil 3, Normal 2, Difícil 1 = sem números); `coupTips(g, st)` (focos, facções, Apoio Militar, Sul, internacional, caixa). `advisorTips` usa essas dicas quando `coupState` não é nulo; `advisorDo` aceita `choose`. UI: `coupBoxHTML` em `js/ui/conselheiro.js`. sim: `--golpe` (IA `golpista_conselheira` + linha `golpe:`); Difícil: golpista 59% de golpe consumado × golpista_conselheira 100%. check.js testa a linha (porta, aceitar, seguir a conselheira, Difícil vago, traduções EN das falas).
- **Retratos:** `RETRATOS_2022` em `js/data/2022/retratos.js` (`pessoas[chave] = { nome, cargo, img | icone | silhueta }`, e mapas `faccoes`, `atores`, `generais` (por nome), `historia` (nós), `eventos` (ids) → chave); ligado ao cenário por `retratos:` em `cenarios.js` (as variantes de `scOf` herdam). UI: `portraitOf(kind, id)`, `portraitImg(p, size)`, `whoHTML(p, size)` em `js/ui/retratos.js` + `css/retratos.css`; usados em aba-historia (cartões), aba-faccoes (porta-voz), aba-diplomacia (atores) e exercitos (general). **Regra: pessoas reais nunca têm rosto** — só ícone de instituição ou silhueta; `check.js` falha se um evento sobre pessoa real tiver `img`, se faltar arquivo, se um webp passar de 60 KB ou ficar sem uso. Sem efeito nas regras (sim Normal idêntica).

## 7i. Fase 7 (out/2026): guerra por frentes no 2022 (save v8)
- **Ideia:** sem exércitos para mover. Uma **linha de frente** por inimigo anda de −100 a +100 por mês; em +100 um estado passa para você (o mais perto do reduto inimigo), em −100 você perde um (o mais perto da sua capital). A única ordem é a **postura** de cada frente: `avancar` / `segurar` / `recuar` (recuar e reorganizar).
- **Dados:** `FRENTES_2022` em `js/data/2022/frentes.js` (ligado por `frentes:` em `cenarios.js`; `scOf(g).frentes` → `frontCfg(g)`): `k` (quanto a linha anda pela razão de forças, em log), `bonusAvanco`, `ruido` (sorte), `defesaSegurar` 1,3, `reduto` 1,3 (PE, RS e a capital DF), `recuo`, `recruta` (+20 por 10 Recursos, 2×/mês), `posturas` (moral/suprimento/perdas por mês), `tracos` (agressivo, defensivo, logístico), `generais` (3 fictícios, com os retratos que já existiam), `frentes` (`resistencia` → reduto PE, `vitoria: "fim_regime"`; `separatista` → reduto RS), `ofensiva` (especial do jogador: custo, +50%, `intervalo`, `falhaMoral`/`falhaPerdas`; `inimiga`: chance, multiplicador, intervalo) e todas as `falas` (nomes, posturas, fatores, "por que a linha andou", dicas, eventos). **Pessoas reais nunca têm rosto.**
- **Força:** `frontForce(g, f, postura)` = tropas × moral × suprimento × general × postura × modificadores (comando/lealdade militar, apoio popular, armas estrangeiras, cofres vazios); `enemyForce` = tropas inimigas × moral × postura × dificuldade (`enemyPower / poderBase`: Fácil 0,6, Normal 1, Difícil 1,3) × apoio estrangeiro/sanções × ofensiva especial inimiga. Terreno e reduto valem para quem defende.
- **Estado (`g.war`):** `{ reserve, fronts: [{ id, troops, posture, morale, supply, enemy, emorale, eposture, progress, special, eSpecial, n, last }], gens: { general: frente }, offAt, log, lostAt }`. `g.armies` fica vazio. `migrateFronts` (v7 → v8) soma os exércitos do jogador no total de tropas e os inimigos nas frentes.
- **Mês (`frontWarMonth`, chamado por `militaryMonth`):** `syncFronts` (abre/fecha frentes conforme o mapa: a Frente Sul abre quando a Liga se rebela; o Pacto Federativo evita isso) → comando automático (`frontAuto`) → `frontPlan` (postura inimiga, ofensiva especial inimiga) → `frontClash` por frente (relatório `rec` em `f.last` e `g.war.log`) → reforços e alistamento. `frontSplitPct`/`setFrontSplit`/`frontAutoSplit` dividem as tropas entre 2 frentes; `setFrontGeneral` troca o general; `launchOffensive`/`cancelOffensive`.
- **Vitória/derrota pela linha:** tomar PE encerra com `fim_regime` (vitória); perder DF encerra com a derrota da guerra; tomar RS derrota a Liga e fecha a Frente Sul. `g.war.lostAt` (estado perdido ou recuo de 20+ na linha) alimenta a condição `recentLoss` (evento `n_panico`).
- **Relatório:** `frontReport(g, rec)` → `{ summary, top, rows: [{ k, label, p, e, fav, w }], tips, power, won, d }` (puro, sem DOM). UI em `js/ui/frentes.js` + `css/frentes.css`: `frontsPanel` (cartão `.fcard2` com a linha, barras de força, tropas/moral/suprimento, intenção inimiga, posturas com o selo "sugerido", general, ofensiva especial), `frontSplitHTML` (controle deslizante), `openFrontReport` (janela "por que a linha andou"), `playFrontResolution` (animação do Encerrar mês), `frontArrows` (setas no mapa). Aba História mostra "Frentes do mês" e "Meses anteriores nas frentes".
- **Conselheira:** `advisorFrontTips` (postura sugerida por `frontAdvice`, ofensiva especial, divisão das tropas, recrutar); `act.k` novos: `posture`, `ofensiva`, `split`. Tutorial: contexto `frentes` (aba Mapa em guerra). Modo simples (Fácil): `simpleFrontsHTML` — os generais escolhem as posturas; você só recruta.
- **sim.js:** as IAs dão posturas (`frontOrders`: aleatórias, ou as sugeridas pelas gulosas, que também recrutam, dividem as tropas e lançam ofensivas com razão ≥ 1,3). 300 partidas: Normal golpista 35% / pacificador 62% de vitória; Fácil iniciante 60%, conselheira 70%; Difícil golpista 4% / pacificador 12%; Rápida golpista 49% / pacificador 74%. `check.js` testa a migração v7→v8, o relatório sem NaN, a abertura da Frente Sul, a dica de postura e as traduções EN das falas.

## 7j. Fase 8 (out/2026): decisões dinâmicas e campanha sem prazo (save v9)
- **Focos:** durações cortadas pela metade (mín. 1 mês). Novos focos com `avail` dinâmico: `a_renovar` ⊘ `a_radicalizar` (`visitedAny: ["inelegivel","derrota_urnas"]`), `c_canal_secreto` (`warMonths: {min: 10}`), `s_comicios` (Apoio 55+), `d_governadores_sul` (Sul 55+ e calmo). `cond` ganhou `quick`, `warMonths {min}` e `diff: [...]`.
- **Oportunidades (`F.oport`):** estado em `g.focus.opps {id: mêsLimite}`, `cool {id: mês}`, `rep {id: n}`, `fresh []`, `known []` (`focusInit` garante). `focusEndTick(g, R)` (passo 7 do `endTurn`, antes do `planEnemy`) expira as não usadas (cooldown/2), abre as que cumprem `oport.if` (+ `chance` com `rnd(g)`) via `focusOpenOpp`, e detecta focos normais recém-disponíveis comparando com `known` (relatório "✨ Novo foco disponível" + `fresh`). `completeFocus` numa oportunidade fecha a janela, aplica `cooldown` e conta `rep` (repetíveis não entram em `done`). Efeito de evento `opp: "id"` abre uma oportunidade (`n_municipais`, `n_voluntarios`).
- **UI:** `.fopps` (faixa com as abertas + contagem e "✨ Novos focos"; clicar centraliza via `UI.fcenter`), nós `.opp`/`.fresh` com fita NOVO/NOVA, ⚡ e "⚡ N meses", badge `✨N` na aba (some ao abrir: `UI.freshSeen`). Marta: dica `opp` (pri 64). Tutorial: passo `.fopps` no contexto `decisoes`; Ajuda: Oportunidades, Sem prazo, Cansaço da guerra.
- **Sem prazo (campanha completa):** novos nós `eleicao_herdeiro` (2026-08), `derrota_urnas` → `nova_eleicao` (48 meses depois, laço até ganhar ou aceitar a oposição; "Recomeçar" pede Base 25+; Difícil: só uma revanche) e `impasse` (substitui a ofensiva final do nó `guerra` fora da rápida; repete a cada 8 meses). `collapse` aceita lista de ramos (`collapseTo`): no regime, Apoio 0 → `fim_restauracao`. Partida rápida usa `textRapida` e os ramos `quick: true` (finais antigos com prazo).
- **Cansaço da guerra (`frontWeary`):** a partir de 12 meses de combate (`g.war.months`, tréguas não contam), `frontClash` multiplica o deslocamento da linha por 1 + até 1,5 e o Apoio cai 1 a cada 3 meses. Aviso em `js/ui/frentes.js`.
- **Difícil:** `desgaste: 65` em `DIFICULDADES` (Apoio/Base acima de 65 perdem 1/mês, passo 1a do turno).
- **sim.js:** teto de segurança `SIM_CAP = 600` turnos só no simulador (falha se >1% bater), linha `resultado:` por IA com vitória/intermediário/derrota, duração média/mediana/máx. e % no teto; oportunidades aproveitadas por partida. Números (300 partidas): Normal aleatória 39% (28,0 meses em média, máx. 95), gulosa 89% (42,6), golpista 59% (22,3, máx. 135), pacificador 82% (20,0); Fácil iniciante 62% (30,4 meses), aleatória 48%; Difícil aleatória 31% (26,6), golpista 18% (26,7, máx. 211), pacificador 28%; Rápida aleatória 22% (19,5), golpista 39% e pacificador 73% (8 meses). Teto do simulador: 0% em todos.

## 7k. Fase 9 (out/2026): mapa de guerra visual (só UI, sem mudar CORE nem saves)
- **Arquivos novos:** `js/ui/mapa-frentes.js` (carregado logo depois de `js/ui/mapa.js`) e `css/mapa-frentes.css` (depois de `css/frentes.css`). `mapSVG` chama `frontMapLayers(g, control, w)` quando há guerra no modo frentes e põe as camadas `defs`, `funder` (faixas/listras), `over` (setas de avanço, estrela, alvos) e os placares.
- **Placar na linha (`frontBadgeSVG`):** um por frente, no ponto da linha mais perto do centro dela (`frontGeom`). Pílula azul (você, símbolo ▭ com ✕) × vermelha (inimigo, ◆) com `frontForce(...).total` e `enemyForce(...).total` (os mesmos números do card), barra de cabo de guerra −100..+100 com marcador ◀/▶ do último mês (`f.last.d`, |d| ≥ 3) ou ●, ícone da postura (💥 na ofensiva especial) e retrato do general. É `role=button`, `tabindex=0`, com `aria-label` com os números; clique/Enter chama `opts.onFront(id)` (aba Mapa rola até o card `[data-fcard]` e pisca `.flash`).
- **Visual estilo Victoria:** linha mais grossa, faixas listradas dos dois lados (clipPath por frente: azul do seu lado, vermelho do inimigo), estados em disputa listrados na cor do inimigo da frente, setas animadas (chevrons) na direção do último mês, ★ na capital (DF) e alvo nos redutos (PE/RS), fundo de papel e bordas mais suaves. Modo daltônico usa azul #0072B2 × laranja #D55E00 e símbolos (▭/◆, ◀/▶); `prefers-reduced-motion` e `body.rm` param as animações.
- **Texto/idioma:** legenda nova (`frontLegendHTML`), dica da aba e descrição do mapa (`mapDescriptionHTML`) com força × inimigo, movimento do último mês, capital e redutos; inglês em `js/i18n/en.js`.

## 7l. Fase 10 (out/2026): chinês e russo (só UI/i18n, sem mudar CORE nem saves)
- **Idiomas:** `I18N_LANGS` em `js/i18n/traducao.js` lista pt/en/zh/ru (nome nativo, `html lang`, título da aba). Configurações monta os botões a partir dessa lista; `applySet`/`i18nSwitch` põem `<html lang>` (pt-BR, en, zh-CN, ru). Textos com `translate="no"` (nomes dos idiomas) não são traduzidos.
- **Dicionários:** `js/i18n/zh.js` (`I18N_ZH`) e `js/i18n/ru.js` (`I18N_RU`), mesmo formato do `en.js` (`exact` + `tpl` com `{n}`), carregados depois do `en.js`. Ordem de busca: idioma escolhido → inglês → português. Terminologia em `GLOSSARIO.md`.
- **Regras:** cada regra de `I18N_PRE`/`I18N_RULES` tem `[padrão, en, zh?, ru?]`; sem função própria usa a do inglês. Uma regra só vale se alguma parte variável foi de fato traduzida (evita "traduzir" só a pontuação). Meses: `i18nMonth` (zh `2023年1月`, ru `Январь 2023`); separadores do chinês em largura total (`i18nSep`).
- **Fontes/layout:** `css/idiomas.css` — chinês: pilha 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei' depois de Georgia/system-ui, títulos em serifa com 'Noto Serif SC'/'Songti SC' antes do genérico, sem itálico/caixa-alta espaçada; russo: quebra de palavras longas em botões e abas menores no celular.
- **Check:** `tests/check.js` percorre todos os textos do cenário 2022 e do cartão do 1964 e falha se faltar tradução em EN, ZH ou RU (cada idioma testado sem cair no inglês).
- **Compartilhar final:** texto em chinês e russo em `shareText` (`js/ui/conquistas.js`).

## 7m. Fase 11 (out/2026): guerra por regiões (save v10)
- **Geometria:** `js/data/mapa-regioes.js` (`REG_DATA`: 133 regiões intermediárias do IBGE com UF, caminho SVG, centro, vizinhança e região da capital de cada UF; `sb` = fronteiras finas). Gerado por `tools/build-regioes.js` (os JSON brutos do IBGE ficam fora do git).
- **Regras:** `js/core/regioes.js` guarda `g.reg` (região → lado) e decide o dono de cada estado pela maioria (empate: região da capital). `frontClash` em `js/core/frentes.js`: `progress += d × regioes.escala`; cada 100 vira uma região (até `maxMes`, + `extraOfensiva` com ofensiva especial), escolhida por suprimento/foco/coesão/sorte. Os alvos finais (região do DF; Recife ou Porto Alegre) só caem com o cerco (`g.war.siege`, 400 pontos = 4 meses tomando terreno ao lado); o cerco cai 100 quando o defensor vence o mês. Config em `js/data/2022/frentes.js` → `regioes`.
- **Sem "em disputa" no 2022:** a revolta do Sul passa metade das regiões do estado; a migração v9→v10 converte disputa em um lado; `tests/check.js` falha se "disputa" aparecer nos dados de controle do 2022. O 1964 continua igual.
- **Tela:** `js/ui/mapa-regioes.js` + `css/mapa-regioes.css` (camada de regiões, linha de frente por região, regiões que mudaram no mês piscando, setas, placar, gráfico); `frontGeom` usa regiões; o relatório e a descrição acessível listam as regiões que mudaram.
- **Check:** novos testes de regiões (vizinhança, maioria, migração, regiões mudando de lado) e de sintaxe de todos os scripts do `index.html`.

## 7n. Fase 12 (out/2026): Recife, combate contíguo, rompimento, zoom do mapa e estatísticas (save v11)
- **Combate contíguo (correção do "Bahia → Alagoas"):** a escolha de região (`regPick` em `js/core/regioes.js`) pesava a distância até Recife pela frente inteira, então o avanço "escorria" pela costa (Vitória da Conquista → Salvador → Aracaju → Maceió); além disso, regiões que só se tocavam num ponto contavam como vizinhas. Agora: vizinhança exige fronteira mínima (`MIN_BORDA` em `tools/build-regioes.js`), a captura fica perto do eixo do último avanço (`f.axis`), há coesão de faixa e penalidade de "dedo", e fora de rompimento só se toma região vizinha do território que o atacante tinha **no início do mês**. O inimigo usa a mesma regra.
- **Recife, capital da Resistência:** ao abrir a frente, a flag `recife_capital` dispara o grande evento (`MAJOR_FLAGS` em `js/ui/grandes-eventos.js`, com `any`/`over`). Estrela vermelha grande + rótulo "Recife — capital da Resistência" (e "Porto Alegre — capital da Liga do Sul"); vitória = tomar a região de Recife, derrota = perder a do DF. O cartão da frente mostra "Faltam N regiões até Recife" (`regPath`/`regFaltam`: BFS só por regiões inimigas) e o mapa desenha o caminho mais curto (linha tracejada).
- **Rompimento:** com força ≥ `regioes.rompe` (1,5×) e o mês ganho, a linha rompe: `+rompeBonus` de progresso e até `rompeN` capturas extras seguindo o caminho (`regPick` modo "rota"), sempre contíguas. Mensagem e animação "Rompimento! A linha inimiga desabou em …"; quem **segura** logo depois estabiliza a frente (sem rompimento seguido). O cerco só começa vizinho à capital.
- **Zoom do mapa (todas as fases):** `js/ui/mapa-zoom.js` + `css/mapa-zoom.css`, só no mapa principal (`opts.zoom`). Roda do mouse (rumo ao cursor), pinça e arraste no celular, arrastar no computador, botões + / − / ⟲ e "Ir para Recife", teclas + − 0 e setas. O estado (`MAPZ`, por cenário) sobrevive às re-renderizações; clicar no placar aproxima a frente; rótulos/placares são contra-escalados e os nomes das regiões aparecem com zoom ≥ 2,4×; arraste não vira clique; respeita "reduzir movimento".
- **Estatísticas só de campanhas concluídas:** começar campanha não conta mais (`campaignStarted` removido). `finRecord` (`js/ui/conquistas.js`) conta uma vez no final (vitória ou derrota, marcador `achDone`) em `localStorage "gw_concluidas_v1"`; com login, `pushFinished` (`js/nuvem/cloud.js`) soma em `profiles.campaigns_by_scenario._fim` (coluna jsonb que já existia — **sem mudança no banco**) e grava `campaigns_played` = total concluído. Perfil, perfil público, tabela e ranking leem só `_fim` ("Campanhas concluídas"). Os números antigos (campanhas iniciadas) ficam intactos no banco, mas não são exibidos. Saves em andamento continuam carregáveis.
- **Save v11:** `migrateV11` zera eixos/rompimentos antigos, limita o cerco ao novo máximo e cria a flag da capital da frente aberta.
- **Check:** capturas contíguas na hora da captura e com o território do início do mês (fora de rompimento), caminho válido até a capital, Arapiraca–Aracaju não vizinhas, Recife anunciada em toda guerra, migração v10→v11, estatísticas só no final.

- **Balanceamento (Fase 12):** `poderBase` 1,05, `k` 105, `reduto` 1,6, `regioes.maxMes` 5, `suprimento` 5, `rompe` 1,5, `rompeN` 1, `rompeBonus` 100. `sim.js 300`: golpista Normal 45% (guerra média 20,9 meses), pacificador 79%; tuning Fácil iniciante ~63%, Difícil golpista ~3%.

## 7o. Fase 13 (out/2026): exércitos nas regiões do IBGE (save v12)
- **Ideia:** misto de estado e região. Os exércitos ficam e se movem nas 133 regiões intermediárias; política e agitação continuam por UF; o dono da UF é a maioria das regiões (empate: região da capital), sem "em disputa". O avanço automático da linha (progresso/rompimento da fase 12) não decide mais o território: só as batalhas dos exércitos.
- **Núcleo novo:** `js/core/tropas.js` (sem DOM, carregado antes de `js/core/frentes.js`). `g.war.armies[]` = `{ id, n, side, fac, reg, str, morale, gen, order: { type: atacar|mover, to, path }, special, moved }`. API: `tpArmies/tpById/tpAt`, `tpTargets(g,a)` (mover 1–2 regiões pelo próprio território, atacar região inimiga vizinha), `tpChance(g,a,to)`, `tpOrder(g,id,to)` (sem AP), `tpAI` (IA inimiga: defende o reduto, empurra rumo a Brasília, contra-ataca; só vizinhas), `tpEnemyPlan`, `tpResolve(g,ev)` (movimentos → junções → batalhas → `tpFix`), `tpBattle` → rec com `pow`, `rows`, `why` para `frontReport`.
- **Combate:** chance = `A^k/(A^k+D^k)`, `k = tropas.expoente` (2,4). `D = (defensores × cavar 1,2 se não se moveram + guarnição) × terreno × reduto`. Guarnição: `guarnicao` 8, capital de estado 12, capital da facção 20. Perdas e moral em `tropas.perdas` / `tropas.moral`. Região inimiga vazia é ocupada; o perdedor recua para região própria vizinha (ou é destruído).
- **Dados (`FRENTES_2022.tropas`):** `inicio` 4 exércitos, `porExercito` 22, `max` 8, `passos` 2, `novo` 20; textos em `falas.tropas` (nomes "{0}º Exército", "{0}ª Brigada da Resistência/Liga").
- **Recrutar:** `frontRecruit(g, reg)` numa região própria escolhida (`frontRecruitRegs`); junta com o exército que já estiver lá. **Ofensiva especial:** `offensiveState`/`launchOffensive(g, id)`/`cancelOffensive` — um exército com ordem de ataque ganha ×mult neste mês.
- **Automático:** `frontAuto(g, mode)` / `setAutoOrders` usa `tpAI` do lado do jogador (Fácil e comando automático). As posturas e `setFrontPosture` foram removidas da UI e da simulação.
- **UI:** `js/ui/frentes.js` (painel: passos, lista de exércitos, placar e tendência, plano do inimigo, recrutar, cartão de confirmação `.tpconf` com barra A×D e fatores, `tpZoomToArmy` aproxima 2× ao selecionar com zoom < 1,5), `js/ui/mapa-frentes.js` (fichas `g.tchip`, alvos `ttg`, rótulos de chance `g.tpct`, setas grandes `g.tarw`, animação da resolução `playFrontResolution`), CSS em `css/mapa-frentes.css` e `css/frentes.css`. Nomes de região são inseridos antes das fichas (`mapa-zoom.js`) para não cobri-las.
- **Save v12:** `migrateV12` (em `js/core/frentes.js`) converte a força de cada frente em exércitos nas regiões da linha e zera `log`.
- **i18n:** os dicionários ganharam a seção `fmt` (chaves com `{n}` viram regex em `i18nFmt`, `js/i18n/traducao.js`), usada para nomes de exércitos, falas e eventos com números. Nomes de região ficam com `translate="no"`.
- **Balanceamento (Fase 13):** Resistência `tropas` 56, `porEstado` 4, `reforco` 9. `sim.js 300` (Normal): golpista 44% (guerra 9,5 meses), pacificador 56%; Fácil iniciante ~62%, conselheira ~69%; Difícil golpista ~11%.

## 7p. Fase 14 (out/2026): de volta aos estados — combate manobrável (save v13)
- **Por quê:** o Hugo achou o combate por regiões complicado ("estilo Victoria" pede economia e outros fatores); o jogo é mais simples, então o combate voltou a ser por estados e ficou mais manobrável e divertido.
- **Removido:** camada de regiões do IBGE (`js/core/regioes.js`, `js/data/mapa-regioes.js`, `js/ui/mapa-regioes.js`, `css/mapa-regioes.css`, `tools/build-regioes.js`), `g.reg`, nomes de região no zoom, placares de frente. Continua: sem "em disputa", Recife/PE capital da Resistência (tomar vence), DF (perder perde), Porto Alegre/RS da Liga, zoom, relatório, chance prevista, comando automático/modo simples, dicas da Marta com "Fazer isso", generais, estatísticas só de campanhas terminadas.
- **Regras (`js/core/tropas.js`):** exército `{ id, n, side, fac, uf, str, morale, gen, order: { type: mover|juntar|atacar, to, path, tatica }, cut }`. `tpTargets` (mover/juntar até `passos` 2 estados pelo próprio território; atacar estado inimigo vizinho; `final` em Recife). `tpOdds(g, atks, uf, tat)` → `{ A, D, flank, origins, cutA, cutD, dig, chance, … }`: flanco = 1 + `flanco` (0,2) × estados de origem extras (até 2); cercado luta ×`cerco.poder`. `tpLinked`/`tpCut` (BFS até a capital do lado; sem capital ninguém fica cercado), `tpSiege` (perda, moral, rendição), `tpMomentum` (−3..+3, `impeto.passo` 0,07). Batalha de Recife: `tpTactics`/`tpBestTactic`/`tpSetTactic`, `recife.ultima` 1,15 e as 3 táticas. Battles guardam `drama` (chave de `falas.drama`).
- **Mês (`frontWarMonth`):** ev = `control0, start (com morale/cut), orders, moves, merges, battles, sieges, flips, mom0, mom`. Flag `recife_portas` (grande evento "Às portas de Recife") quando o jogador encosta em PE.
- **UI:** `js/ui/mapa-frentes.js` reescrito (fichas por estado, fichas dos estados pequenos do NE no mar em duas colunas — o SVG fica mais largo —, alvos `path.ttg`, rótulos `g.tpct`, sub-rótulo de flanco `g.flk`, ficha cercada tracejada, setas grandes por estado). `js/ui/frentes.js`: caminho até Recife, barra de ímpeto, avisos de cerco, cartão com flanco/cerco/táticas, relatório com drama, animação com fases da Batalha de Recife (tremor) e a tela "Recife caiu!" (`showRecifeVictory`). `jogo.js` toca a animação antes do final quando Recife cai.
- **Save v13:** `migrateV13` (em `js/core/frentes.js`) leva exércitos de regiões (v12) para a UF da região (`IBGE_UF`), junta repetidos e limpa `g.reg`; v7–v11 passam pelas migrações antigas e caem no mesmo formato.
- **Check:** contiguidade de movimentos/ataques, caminho até a capital, alvos válidos, flanco, cerco com rendição, táticas de Recife, migrações v7/v9/v10/v11/v12→v13, arquivos de região ausentes, drama nos relatórios.
- **Balanceamento (Fase 14, `bal.js` 300):** Normal golpista 50% (guerra 9,0 meses), pacificador 52% (13,9); Fácil iniciante 63%, conselheira 71%; Difícil (`inimigo` 1,16) golpista 12%, pacificador 15%; Rápida golpista 28%, pacificador 69%.

## 7q. Fase 15 (out/2026): abertura em quinzenas e vitória sem guerra pelas urnas (save v14)
- **Por quê:** o Hugo pediu mais decisões nacionais no começo (turnos de 15 dias e depois mês a mês) e um jeito de vencer sem guerra, só contestando as urnas.
- **Quinzenas (`js/core/quinzenas.js`, dados `QUINZENAS_2022` em `js/data/2022/urnas.js`):** enquanto `halfOn(g)` (até `ate` 2023-03; na partida rápida `ateRapida` 2023-01; acaba antes se a guerra começar), cada mês tem 2 turnos. `halfTurn` (1ª→2ª quinzena) é leve: metade da receita, foco nacional anda 1 quinzena, contestação anda, evento com metade da chance, ações renovadas. O turno 2ª quinzena→mês seguinte é o `endTurn` normal com receita pela metade. `halfSync` avisa uma vez ("Fim das quinzenas…", `g.notice.k = "mensal"`). Rótulos: `dateLabel` ("1ª quinzena de nov/2022"), `turnUnit` (quinzena/mês nos prazos de foco), HUD "Turno N · 15 dias", botão "Encerrar quinzena".
- **Contestação das urnas (`js/core/urnas.js`, `js/data/2022/urnas.js`, `js/ui/urnas.js`):** começa na cena "A Ação no TSE" escolhendo montar a frente legal (flag `contesta_urnas`). Três medidores em `g.urna`: **progresso** (100 = vitória `fim_urnas`), **credibilidade** (0 = `fim_cassado`, derrota; multiplica os ganhos: ×0,6 a ×1,4) e **escalada** (100 = a crise vai para os quartéis, cena `escalada` → caminho da guerra; acima de 60 corrói a credibilidade). Progresso passivo por quinzena (apoio, base, Centrão). Calendário: **julgamento no TSE** em jan/2023 (precisa de 43 + folga da dificuldade; abaixo disso `contestacao_derrotada`) → **posse adiada** → **veredito** em mar/2023 (só vence com 100). Ações da categoria `urna` (auditoria, TSE, Congresso, ruas, redes, observadores, baixar a temperatura), ramo de focos "Contestação institucional" (`u_comissao`, `u_recontagem`) e eventos próprios. Barra no topo com "como vencer?" (modal com calendário e regras), dicas da Marta ("Vencer sem guerra", progresso baixo para o julgamento) e conquista `virada`. Partida rápida: depois das quinzenas os ganhos de ação rendem ×1,5 (`rapida`).
- **Save v14:** `g.half`, `g.halfDone`, `g.notice`, `g.urna`. Saves antigos (v2–v13) migram para v14 com `halfDone = true` (continuam mês a mês) e `g.urna` nova.
- **Simulador:** nova IA `eleitoral` (35% das partidas jogam "ousado") e linhas "sem guerra X%" e "urnas: contestou · julgamento · posse adiada · escalada · virada · inelegível".
- **Balanceamento (Fase 15, `sim.js` 300, IA eleitoral, virada `fim_urnas`):** Normal 59% (vitória total 92%, posse adiada 86%, inelegível 3%, sem guerra 100%); Fácil 100%; Difícil 16% (posse adiada 52%); Rápida 56%. Outras IAs no Normal: aleatória 40%, gulosa 86%, radical 28%, golpista 49%, pacificador 65%.

## 7r. Fase 16 (out/2026): cenas dos finais, exércitos distintos, HUD de mover, IA do inimigo, só campanha completa e Novidades (save v15)
- **Por quê:** o Hugo pediu uma animação de vitória/derrota para cada final (motim por falta de soldo, perder o DF, tomar Recife…), HUD de ações e de mover melhores, exércitos separados (sem fusão automática), IA do inimigo mais esperta, o fim da escolha partida rápida/longa (só o modo padrão, com Fácil/Normal/Difícil) e um quadro "Novidades" na tela inicial.
- **Cenas dos finais (`js/ui/finais-animados.js`, `css/finais-animados.css`):** `FA_CENAS` tem uma cena SVG+CSS por final/causa (recife, df, motim, urnas, cassado, retorno, divisão, restauração, regime…; `endingSceneKey(g)` escolhe por `g.ended.cause` (`FA_POR_CAUSA`) ou pelo nó `fim_*` (`FA_POR_FINAL`); `g.ended.anim` evita repetir ao reabrir). Pulável (botão, toque, Esc/Enter), some sozinha em ~5 s, sem animação com `prefers-reduced-motion`/modo de acessibilidade. Carimbos (`stamp`) como "INELEGÍVEL" e "SEM SOLDO" são traduzidos. "Rever cena" na tela do final.
- **Soldo (`frontPay` em `js/core/frentes.js`, `soldo` em `js/data/2022/frentes.js`):** com a guerra aberta e Recursos abaixo de `limite` (−35) no fim do mês, `g.unpaid` sobe e a moral cai `moral` (4); `meses` (5) seguidos → `fim_restauracao` com causa `motim`. Voltar a pagar zera `g.unpaid`. Dica da Marta "Soldo das tropas" perto do limite.
- **Exércitos distintos (`js/core/tropas.js`):** nada se funde sozinho; cada exército tem nome (`tpName`: "1º Exército", divisões regionais, nome do jogador em `a.nome`), força, general, moral e experiência (`a.xp`, `tpXpLevel` 0–2, bônus até +15% via `tropas.xp`). Até `porEstado` (3) por lado em cada estado (`tpRoom`). Juntar/Dividir em dois/Renomear só por escolha (`tpJoin`, `tpSplit` com `dividirMin`, `tpRename` limpa o texto). Recrutar cria exército novo ou reforça um existente. Painel "Meus exércitos" em `js/ui/exercitos.js`; exércitos inimigos também aparecem separados.
- **HUD de mover (`js/ui/mapa-frentes.js`, `js/ui/frentes.js`):** selecionar exército → alvos com chance % e caminho → confirmar. Ordens pendentes aparecem como setas e podem ser canceladas ("Ordens do mês"); botão "Próximo exército" (próximo sem ordem). Funciona com toque e com o zoom.
- **HUD de ações (`js/ui/aba-acoes.js`):** abas por categoria (`ACT_CATS`), custo e efeito resumidos (`fxParts`) e o motivo de uma ação estar bloqueada; "Sugestão da Marta" destacada.
- **IA do inimigo (`js/core/ia-inimiga.js`):** `iaLevel` vem de `diffOf(g).ia` (Fácil 0, Normal 1, Difícil 2). Plano por facção (`g.war.eplan`, refeito a cada `IA_REPLANO` meses): alvo (perto de Brasília, valioso, fraco ou que cerca), base vizinha, ataca concentrada; recua exércitos ameaçados e contra-ataca pontos fracos (`iaWeakSpots`). No Fácil continua o comportamento antigo. Nas urnas (`urnaTick`), perto da virada a defesa do governo eleito reage no TSE: −1 de progresso por mês (Normal a partir de 85, Difícil a partir de 70; Fácil não reage).
- **Só campanha completa (`js/data/modos.js`, `js/ui/modos.js`, `js/ui/menu.js`):** a escolha rápida/longa saiu; `g.quick` não existe mais (nem `ateRapida`, finais por prazo, `sim --rapida`). Fácil/Normal/Difícil continuam.
- **Novidades (`js/data/novidades.js`, `js/ui/novidades.js`, `css/novidades.css`):** `NOVIDADES` (mais nova primeiro: `{ v, data, titulo, itens }`, preenchida desde a fase 1) mostra a última versão na tela inicial e "Ver todas" abre a lista completa. Marca "novo" até o jogador ver (`localStorage gw_novidades_v1`). Textos traduzidos (EN/ZH/RU). Como acrescentar uma versão: README, "Como atualizar o jogo".
- **Save v15:** `migrateV15` (`js/core/saves.js`): `g.quick` some, exércitos ganham `kind`/`xp`, `g.unpaid` começa em 0; `g.war.eplan` nasce sozinho; v2–v14 migram.
- **Check:** "Fase 16: 25 testes" (limite por estado, ids únicos, recrutar novo/reforço, dividir/juntar/renomear, 4º exército bloqueado, plano do inimigo, soldo→motim, migração v14→v15, `fxParts`, cena para todo `fim_*` e causa, menu sem rápida, formato das Novidades). Simulador: IAs da guerra levam o soldo em conta (`soldoRisk`) e a linha "guerra:" mostra as causas.
- **Balanceamento (Fase 16, `sim.js` 200–300):** Normal golpista 33%, pacificador 37% (Fase 15: 49%/65%), eleitoral (virada) 58%; derrotas na guerra por estados 44%, DF 7%, motim 4–11%. Difícil golpista 3%, pacificador 9% (10%/20%), eleitoral 9% (16%). Fácil golpista 100%, pacificador 97%, iniciante 72%, conselheira 76%, eleitoral 100%. Outras no Normal: aleatória 41%, gulosa 86%, radical 29%. A guerra ficou mais difícil principalmente pelo soldo e pelos exércitos separados; a IA do inimigo pesa pouco (sem soldo: 43%/48%).
- **Limitações:** a guerra no Normal está mais dura que na Fase 15; as IAs do simulador não usam as dicas da Marta na guerra; a reação no TSE é simples (−1/mês); motim calibrado só pelo simulador.

## 8. Limitações conhecidas
- Quinzenas e contestação (fase 15): a IA do simulador quase nunca deixa a escalada chegar a 100 (o caminho é testado no `check.js`); no Fácil a virada pelas urnas é muito fácil (100% na IA eleitoral); saves antigos continuam mês a mês; a partida rápida tem só ~2 meses de quinzenas.
- Guerra por estados (fase 14): o inimigo planeja um mês por vez (sem plano de vários meses); só cabe um exército por lado em cada estado; nos estados pequenos do Nordeste as fichas ficam no mar e o mapa fica mais largo. As seções 7m–7o descrevem fases antigas (regiões do IBGE), substituídas pela 7p.
- Idiomas: inglês, chinês e russo cobrem todo o cenário 2022; o cenário 1964 (bloqueado) só tem o cartão do menu traduzido. Frases montadas por partes (registro do turno, dicas com nomes) podem ter ordem de palavras menos natural em chinês/russo; a tradução zh/ru não passou por revisão de falante nativo.
- Mapa de guerra (fase 9): no celular o placar pode cobrir parte dos rótulos de estados vizinhos (MT, RS); a posição do placar é uma heurística (ponto da linha mais perto do centro da frente); as listras são discretas sobre a cor marrom do regime; o mapa animado da resolução do mês não mostra os placares.
- A trilha sonora é sintetizada (Web Audio), não há música gravada.
- Quem conclui `c_ruptura` e depois recua para a transição fica só com os ramos temáticos, porque democ e jurid ficam excluídos.
- Depois de 2023-03 os turnos valem 3 meses, então os focos (1–2 meses) terminam dentro de um turno; as oportunidades ficam abertas pelo menos um turno inteiro (`max(dura, ritmo)`).
- O ramo do regime é curto (cerca de 9 meses até o nó `guerra`). Não dá para fazer todos os focos numa partida.
- As IAs da simulação são heurísticas.
- **Militar:**
  - a IA inimiga é simples (ataques locais por regiões vizinhas, sem planos de vários meses);
  - nomes de regiões não são traduzidos (nomes próprios); no inglês os ordinais viram "Army N";
  - no celular o cartão de confirmação cobre a parte de baixo do mapa;
  - não há linhas de suprimento detalhadas (só "estado próprio ou vizinho");
  - em 2022, nos turnos de 3 meses, os exércitos agem uma vez por turno;
  - as frentes são calculadas pelos vértices compartilhados do mapa simplificado; em litorais recortados podem ficar trechos curtos.
- No desktop o tooltip dos nós é o `title` nativo do navegador.
- **Nuvem:**
  - as estatísticas e os finais do perfil são gravados pelo cliente, então dá para forjá-los (o ranking é "de confiança");
  - campanhas concluídas antes da fase 12 não podem ser reconstruídas: o perfil começa a contar "Campanhas concluídas" a partir da primeira campanha terminada depois da atualização (finais desbloqueados continuam valendo);
  - há um só slot de save por cenário;
  - o conflito de saves é decidido pelo relógio de cada aparelho;
  - sem internet não há login (o jogo funciona, mas não sincroniza);
  - aberto por `file://`, não há parte de nuvem;
  - o SMTP padrão do Supabase limita os e-mails por hora.

## 9. Roadmap (próximos passos)
1. **Modernizar o visual** (tipografia, menu, transições), mantendo o estilo "dossiê histórico".
2. **Hospedar:** GitHub Pages, Netlify ou Cloudflare Pages (site estático; veja o README).
3. ~~Login e perfis de jogador~~ **feito** (Supabase; veja "Camada de nuvem"). Próximas ideias:
   - validar estatísticas e finais no servidor (função RPC ou Edge Function);
   - vários slots de save;
   - login com Google (ligar o provedor e `FEATURES.googleLogin`);
   - SMTP próprio.
4. ~~Separar o arquivo único~~ **feito** (out/2026, sem build: pastas `css/`, `js/data`, `js/core`, `js/ui`… e testes em `tests/`). Um bundler (Vite) ou TypeScript continua opcional para o futuro.
5. Depois: ranking ou compartilhamento de finais, novos cenários, e talvez escolhas votadas por amigos.
