// js/core/base.js — Núcleo (sem DOM): versão do save, constantes, utilidades e o sorteio com semente (rnd).
/* =====================================================================
   NÚCLEO DA CAMPANHA (sem DOM) — usado pela interface e pelo check.js
   Estado da partida "g": datas em meses absolutos (ano*12 + mês-1).
   ===================================================================== */
const SAVE_VERSION = 17;  // 17: diplomacia v1.22 com 6 atores (EUA, China, Rússia, UE, Argentina, Israel; os outros saem do save); 16: diplomacia v1.20 (PD, demandas/favores, isolamento, atores novos; sem deal builder); 15: só campanha completa (g.quick some), exércitos distintos (a.kind/a.zona/a.nome/a.xp, até 3 por estado, sem fusão automática), plano do inimigo (g.war.eplan) e soldo atrasado (g.unpaid); 14: abertura em quinzenas (g.half, g.halfDone, g.notice) e contestação das urnas (g.urna); 13: guerra de 2022 com exércitos nos ESTADOS (a.uf), ímpeto (g.war.mom), cerco (a.cut) e tática de Recife; sem regiões do IBGE (g.reg some); 12: guerra de 2022 com exércitos nas regiões (g.war.armies, g.war.epool; sem posturas nem cerco); 11: eixo da batalha (f.axis), rompimento (f.rompe), cerco mais curto e Recife capital da Resistência (flag recife_capital); 10: guerra por regiões do IBGE (g.reg, g.war.hist) e sem "em disputa" no 2022; 9: oportunidades e focos novos (g.focus.opps/cool/rep/fresh/known), cansaço da guerra (g.war.months), campanha sem prazo; 8: guerra por frentes no 2022 (g.war; exércitos viram tropas das frentes); 7: dificuldade (g.diff), partida rápida (g.quick) e interface simples (g.simple); 6: Tensão no Sul (g.south) e ordens automáticas (g.autoOrders); 5: eventos encadeados (g.chains); 4: relatórios de batalha (g.battleLog) e alistamento (g.mobPool)
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
// Peso econômico/demográfico aproximado de cada UF (1–10), usado em receita e vitórias territoriais
const UF_WEIGHT = { SP:10, RJ:6, MG:6, RS:5, PR:5, SC:4, BA:4, DF:3, GO:3, PE:3, CE:3, PA:3, ES:2, MT:2, MS:2, AM:2, MA:2,
  PB:1, RN:1, AL:1, PI:1, SE:1, TO:1, RO:1, AC:1, AP:1, RR:1 };
const REQ_TYPES = ["dinheiro","armas","reconhecimento","sancoes","mediacao"];
const OFF_TYPES = ["commodities","bases","onu","concessoes","alinhamento"];
const REQ_LABEL = { dinheiro:"Dinheiro / empréstimo", armas:"Armas e equipamento", reconhecimento:"Reconhecimento diplomático", sancoes:"Sanções contra o inimigo", mediacao:"Mediação" };
const OFF_LABEL = { commodities:"Commodities", bases:"Bases / acesso militar", onu:"Apoio em fóruns internacionais", concessoes:"Concessões econômicas", alinhamento:"Alinhamento político" };
const DEMAND_LABEL = { gesto:"Gesto público", alinhamento:"Alinhamento político", comercio:"Acordo comercial", amazonia:"Compromisso ambiental", seguranca:"Parceria de segurança", votos:"Apoio em fóruns", fe:"Agenda de valores", mercosul:"Gesto ao Mercosul", credito:"Linha de crédito simbólica" };
const FAVOR_LABEL = { dinheiro:"Empréstimo / recursos", armas:"Armas e equipamento", reconhecimento:"Reconhecimento diplomático", sancoes:"Sanções ao inimigo", mediacao:"Mediação / trégua", lobby:"Lobby político", tech:"Cooperação tecnológica" };
const REQ_BASE = { dinheiro:30, armas:35, reconhecimento:40, sancoes:45, mediacao:15 };
const OFF_BASE = { commodities:22, bases:34, onu:16, concessoes:24, alinhamento:30 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function parseYM(s){ const [y, m] = String(s).split("-").map(Number); return y*12 + (m-1); }
function monthLabel(abs){ return MONTHS[((abs%12)+12)%12] + " de " + Math.floor(abs/12); }
function scOf(g){ const sc = SCENARIOS.find(s => s.id === g.scen); return sc && g.diff && g.diff !== "normal" ? scVariant(sc, g.diff) : sc; } // dificuldade: js/core/modos.js
function rnd(g){ // mulberry32 com semente salva na partida (reprodutível)
  let t = g.seed = (g.seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (g, a, b) => a + Math.floor(rnd(g) * (b - a + 1));
