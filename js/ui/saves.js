// js/ui/saves.js — Interface: salvar/carregar no navegador (localStorage), finais vistos e ponte com a nuvem (cloud()).
/* ---------- Saves (versão 2, com migração de saves antigos) ---------- */
let saveWarningActive = false;
const SAVE_WARNING = "Não foi possível salvar o progresso neste navegador. Ele pode ser perdido se você fechar ou recarregar a página. Verifique o espaço disponível e as permissões de armazenamento.";
function updateSaveWarning(){
  const el = document.getElementById("saveWarning");
  if (!el) return;
  el.hidden = !saveWarningActive;
  el.textContent = saveWarningActive ? trText(SAVE_WARNING) : "";
}
function save(){
  if (!G) return false;
  G.savedAt = Date.now();
  try{
    localStorage.setItem(SCEN.saveKey, JSON.stringify(G));
    if (saveWarningActive){ saveWarningActive = false; updateSaveWarning(); }
    return true;
  }catch(e){
    if (!saveWarningActive){
      saveWarningActive = true;
      console.error("salvamento local:", e);
      updateSaveWarning();
    }
    return false;
  }
}
// Ponte opcional para a camada de nuvem (cloud.js). Sem login, offline ou aberto como arquivo local, não faz nada.
function cloud(fn, ...args){ try{ if (window.GWCloud && typeof window.GWCloud[fn] === "function") window.GWCloud[fn](...args); }catch(e){ console.warn("nuvem:", e); } }
function loadInfo(sc){
  sc = sc || SCEN;
  let raw = null; try{ raw = localStorage.getItem(sc.saveKey); }catch(e){}
  if (!raw) return { save: null, legacy: false };
  let g = null; try{ g = JSON.parse(raw); }catch(e){}
  if (g && g.v >= 2 && g.v < SAVE_VERSION && g.scen === sc.id && g.stats && g.uf){ try{ if (!migrateSave(g)) g = null; else localStorage.setItem(sc.saveKey, JSON.stringify(g)); }catch(e){ console.warn("migração de save:", e); g = null; } }
  if (g && g.v === SAVE_VERSION && g.scen === sc.id && g.stats && g.uf){ if (sc.campaign && sc.campaign.focus && !g.focus){ focusInit(g); for (const n of Object.keys(sc.campaign.focus.grants || {})) if (g.visited.includes(n)) focusStoryGrant(g, n, null); g.focusMigrated = true; } return { save: g, legacy: false }; }
  // save antigo (só história) ou corrompido: arquiva sem apagar os finais descobertos
  try{ localStorage.setItem(sc.saveKey + "_legacy", raw); localStorage.removeItem(sc.saveKey); }catch(e){}
  return { save: null, legacy: true };
}
function getEndings(sc){ try{ return JSON.parse(localStorage.getItem((sc||SCEN).endingsKey)) || []; }catch(e){ return []; } }
function addEnding(id){ const e = getEndings(); if (!e.includes(id)){ e.push(id); try{ localStorage.setItem(SCEN.endingsKey, JSON.stringify(e)); }catch(_){} cloud("syncEndings", SCEN.id); } }
