// =====================================================================
// cloud.js — contas, perfis e saves na nuvem (Supabase), módulo OPCIONAL.
// O jogo (index.html) funciona sozinho: offline, sem login ou aberto como
// arquivo local este módulo não carrega e tudo continua no localStorage.
// Ponte com o jogo: window.GWGame (leitura) e window.GWCloud (ganchos que o
// jogo chama via cloud("syncSave", id) etc.).
// =====================================================================
import { SUPABASE_URL, SUPABASE_KEY, FEATURES } from "./config.js";

const CDN = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm",
  "https://esm.sh/@supabase/supabase-js@2.118.0",
];
const SLOT = 0;
const AVATARS = {
  aguia: "🦅", onca: "🐆", arara: "🦜", ipe: "🌼", sol: "☀️", estrela: "⭐", escudo: "🛡️",
  espadas: "⚔️", pena: "🪶", pergaminho: "📜", ancora: "⚓", mapa: "🗺️", fogo: "🔥",
  pomba: "🕊️", cacto: "🌵", coroa: "👑", punho: "✊", livro: "📖", cafe: "☕", bandeira: "🚩",
};
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const DB_MISSING_MSG = "O servidor de contas ainda não foi configurado (falta rodar o SQL no Supabase). " +
  "Seu login funciona, mas perfis e saves na nuvem ficam indisponíveis — seus saves continuam neste aparelho.";
const NEWER_MSG = "Seu save na nuvem é de uma versão mais nova do jogo. Recarregue a página (Ctrl+F5) para atualizar; " +
  "até lá, este aparelho não envia esse save para não apagar o mais novo.";

const Game = window.GWGame;
const btn = document.getElementById("btnAcct");
const st = {
  sb: null, session: null, user: null, profile: null,
  dbReady: null,          // true | false (tabelas não existem) | null (desconhecido / sem rede)
  mergedFor: null,        // id do usuário já mesclado nesta página
  syncing: 0, lastSync: null, lastError: null,
};

// ---------- utilidades ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const scenarios = () => (Game ? Game.scenarios() : []);
const scenById = id => scenarios().find(s => s.id === id);
const fmtDate = t => t ? new Date(t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "data desconhecida";
const redirectUrl = () => location.origin + location.pathname;
const isMissingTable = err => !!err && (err.code === "PGRST205" || err.code === "42P01" || err.code === "PGRST202" ||
  /schema cache|does not exist/i.test(err.message || ""));

function ptError(err) {
  const m = (err && (err.message || err.error_description || String(err))) || "";
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).";
  if (/already registered|already been registered|User already exists/i.test(m)) return "Já existe uma conta com este e-mail. Tente entrar ou use \"Esqueci a senha\".";
  if (/rate limit|too many|429/i.test(m) || (err && err.status === 429)) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  if (/Password should be at least|password.*(short|length)/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/weak|pwned/i.test(m)) return "Senha fraca demais; escolha outra.";
  if (/same.*password|different from the old/i.test(m)) return "A nova senha precisa ser diferente da antiga.";
  if (/invalid.*email|Unable to validate email/i.test(m)) return "E-mail inválido.";
  if (/Signups not allowed|signup.*disabled/i.test(m)) return "Novos cadastros estão desativados no momento.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Sem conexão com o servidor. Verifique sua internet.";
  if (/duplicate key.*username|profiles_username_key/i.test(m)) return "Esse nome de usuário já está em uso.";
  if (/profiles_username_format/i.test(m)) return "Nome de usuário: 3 a 20 caracteres, só letras minúsculas, números e _.";
  if (isMissingTable(err)) return DB_MISSING_MSG;
  return m || "Erro desconhecido.";
}

function initials(name) {
  const p = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function hue(s) { let h = 0; for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
function avatarHTML(p, size = 28) {
  const style = `width:${size}px;height:${size}px;font-size:${Math.round(size * (AVATARS[p && p.avatar] ? .62 : .42))}px`;
  if (p && AVATARS[p.avatar]) return `<span class="gwc-av" style="${style}">${AVATARS[p.avatar]}</span>`;
  return `<span class="gwc-av gwc-ini" style="${style};background:hsl(${hue(p && p.id)} 35% 32%)">${esc(initials(p && (p.display_name || p.username)))}</span>`;
}
const displayName = p => (p && (p.display_name || p.username)) || "Jogador";

// ---------- estilos ----------
const css = document.createElement("style");
css.textContent = `
.acct-btn{display:inline-flex;align-items:center;gap:6px;max-width:190px}
.acct-btn .gwc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acct-btn .gwc-dot{width:7px;height:7px;border-radius:50%;background:var(--muted);flex:none}
.acct-btn .gwc-dot.ok{background:var(--green)} .acct-btn .gwc-dot.busy{background:var(--gold)} .acct-btn .gwc-dot.err{background:var(--red)}
.gwc-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--panel);border:1px solid var(--line);flex:none;line-height:1}
.gwc-ini{color:#fff;font-weight:bold;letter-spacing:.5px}
#gwc-modal .modal-card{width:min(560px,100%);position:relative}
.gwc-x{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--muted);font-size:1.3rem;cursor:pointer}
.gwc-x:hover{color:var(--ink)}
.gwc-tabs{display:flex;gap:4px;margin:0 0 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.gwc-tabs button{background:none;border:0;border-bottom:2px solid transparent;color:var(--muted);padding:6px 10px;cursor:pointer;font:inherit}
.gwc-tabs button.on{color:var(--gold);border-color:var(--gold)}
.gwc-form{display:flex;flex-direction:column;gap:10px}
.gwc-form label{display:flex;flex-direction:column;gap:4px;font-size:.85rem;color:var(--muted)}
.gwc-form input,.gwc-form textarea{background:var(--panel);border:1px solid var(--line);color:var(--ink);border-radius:4px;padding:8px 10px;font:inherit}
.gwc-form input:focus,.gwc-form textarea:focus{outline:none;border-color:var(--gold)}
.gwc-form textarea{min-height:70px;resize:vertical}
.gwc-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.gwc-primary{background:var(--gold);color:#1a140c;border:0;border-radius:4px;padding:9px 16px;cursor:pointer;font:inherit;font-weight:bold}
.gwc-primary:disabled{opacity:.6;cursor:wait}
.gwc-link{background:none;border:0;color:var(--gold);cursor:pointer;font:inherit;font-size:.85rem;padding:0;text-decoration:underline}
.gwc-msg{font-size:.88rem;padding:8px 10px;border-radius:4px;display:none}
.gwc-msg.show{display:block} .gwc-msg.err{background:#5a1e1a55;border:1px solid var(--red)} .gwc-msg.ok{background:#1e4a2a55;border:1px solid var(--green)} .gwc-msg.info{background:#00000033;border:1px solid var(--line)}
.gwc-muted{color:var(--muted);font-size:.85rem}
.gwc-avgrid{display:flex;flex-wrap:wrap;gap:6px}
.gwc-avgrid button{background:var(--panel);border:1px solid var(--line);border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:1.25rem;padding:0;display:flex;align-items:center;justify-content:center;color:var(--ink)}
.gwc-avgrid button.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold)}
.gwc-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.gwc-head h2{margin:0!important}
.gwc-table{width:100%;border-collapse:collapse;font-size:.9rem}
.gwc-table td,.gwc-table th{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left}
.gwc-table tr.click{cursor:pointer} .gwc-table tr.click:hover{background:#ffffff0d}
.gwc-bar{height:6px;background:var(--panel);border-radius:3px;overflow:hidden;margin-top:3px}
.gwc-bar i{display:block;height:100%;background:var(--gold)}
.gwc-conf{border:1px solid var(--line);border-radius:6px;padding:10px;margin:8px 0}
.gwc-conf .gwc-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
.gwc-conf .gwc-opt{border:1px solid var(--line);border-radius:4px;padding:8px;cursor:pointer;background:var(--panel)}
.gwc-conf .gwc-opt.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.gwc-new{color:var(--green);font-size:.78rem;font-weight:bold}
.gwc-google{background:#fff;color:#222;border:1px solid #ccc;border-radius:4px;padding:8px 12px;cursor:pointer;font:inherit}
@media (max-width:640px){.acct-btn .gwc-name{display:none}.gwc-conf .gwc-opts{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

// ---------- modal ----------
let modalEl = null;
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
function openModal(html, { closable = true } = {}) {
  closeModal();
  modalEl = document.createElement("div");
  modalEl.className = "modal"; modalEl.id = "gwc-modal";
  modalEl.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${closable ? '<button class="gwc-x" title="Fechar" aria-label="Fechar">✕</button>' : ""}${html}</div>`;
  if (closable) {
    modalEl.addEventListener("click", e => { if (e.target === modalEl) closeModal(); });
    modalEl.querySelector(".gwc-x").onclick = closeModal;
  }
  document.body.appendChild(modalEl);
  const first = modalEl.querySelector("input,textarea");
  if (first) setTimeout(() => first.focus(), 30);
  return modalEl;
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && modalEl && modalEl.querySelector(".gwc-x")) closeModal(); });
function msg(root, text, kind = "err") {
  const m = root.querySelector(".gwc-msg"); if (!m) return;
  m.className = "gwc-msg show " + kind; m.textContent = text;
}
async function busy(button, fn) {
  const old = button.textContent; button.disabled = true; button.textContent = "Aguarde…";
  try { return await fn(); } finally { button.disabled = false; button.textContent = old; }
}

// ---------- botão da conta ----------
// title é atributo: o observador de tradução só vê texto novo, então traduz aqui.
const tt = s => (typeof window.trText === "function" ? window.trText(s) : s);
function renderChip() {
  if (!btn) return;
  btn.hidden = false;
  if (!st.sb) { btn.innerHTML = "👤 Conta"; btn.title = tt("Contas na nuvem indisponíveis (sem internet?)"); return; }
  if (!st.user) { btn.innerHTML = "👤 Entrar"; btn.title = tt("Entrar para salvar na nuvem (opcional)"); return; }
  const dot = st.syncing ? "busy" : st.lastError ? "err" : st.dbReady === false ? "" : "ok";
  const p = st.profile || { id: st.user.id, display_name: (st.user.email || "").split("@")[0] };
  btn.innerHTML = `${avatarHTML(p, 20)}<span class="gwc-name">${esc(displayName(p))}</span><span class="gwc-dot ${dot}"></span>`;
  btn.title = st.dbReady === false ? tt("Conectado — saves na nuvem indisponíveis (banco não configurado)")
    : st.lastError ? tt("Erro ao sincronizar:") + " " + st.lastError
    : st.syncing ? tt("Sincronizando…")
    : st.lastSync ? tt("Saves sincronizados às") + " " + new Date(st.lastSync).toLocaleTimeString("pt-BR", { timeStyle: "short" }) : tt("Conectado");
}
if (btn) btn.onclick = () => {
  if (!st.sb) return openModal(`<h2>Conta</h2><p>Não foi possível carregar o sistema de contas (sem internet ou bloqueado pelo navegador).</p>
    <p class="gwc-muted">Tudo bem: o jogo funciona normalmente e seus saves ficam guardados neste aparelho.</p>`);
  if (st.user) openProfile(); else openAuth("login");
};

// ---------- autenticação ----------
function openAuth(view = "login", prefill = {}) {
  const tabs = `<div class="gwc-tabs">
    <button data-v="login" class="${view === "login" ? "on" : ""}">Entrar</button>
    <button data-v="signup" class="${view === "signup" ? "on" : ""}">Criar conta</button>
    <button data-v="magic" class="${view === "magic" ? "on" : ""}">Link mágico</button></div>`;
  const google = FEATURES && FEATURES.googleLogin
    ? `<div class="gwc-row" style="margin-top:12px"><button type="button" class="gwc-google" data-act="google">Entrar com Google</button></div>` : "";
  const email = esc(prefill.email || "");
  let body = "";
  if (view === "login") body = `<form class="gwc-form" data-f="login">
      <label>E-mail<input type="email" name="email" autocomplete="email" required value="${email}"></label>
      <label>Senha<input type="password" name="password" autocomplete="current-password" required minlength="6"></label>
      <div class="gwc-msg"></div>
      <div class="gwc-row"><button class="gwc-primary">Entrar</button><button type="button" class="gwc-link" data-act="forgot">Esqueci a senha</button></div></form>`;
  else if (view === "signup") body = `<form class="gwc-form" data-f="signup">
      <label>Nome de usuário <span class="gwc-muted">(3–20: a–z, 0–9, _)</span><input name="username" required pattern="[a-z0-9_]{3,20}" autocomplete="username" maxlength="20"></label>
      <label>Nome de exibição<input name="display_name" maxlength="40" placeholder="Como os outros jogadores verão você"></label>
      <label>E-mail<input type="email" name="email" autocomplete="email" required value="${email}"></label>
      <label>Senha <span class="gwc-muted">(mínimo 6 caracteres)</span><input type="password" name="password" autocomplete="new-password" required minlength="6"></label>
      <div class="gwc-msg"></div>
      <div class="gwc-row"><button class="gwc-primary">Criar conta</button></div>
      <p class="gwc-muted" style="margin:0">Pode ser preciso confirmar o e-mail pelo link que enviaremos.</p></form>`;
  else if (view === "magic") body = `<form class="gwc-form" data-f="magic">
      <p class="gwc-muted" style="margin:0">Receba um link por e-mail e entre sem senha.</p>
      <label>E-mail<input type="email" name="email" autocomplete="email" required value="${email}"></label>
      <div class="gwc-msg"></div>
      <div class="gwc-row"><button class="gwc-primary">Enviar link</button></div></form>`;
  else if (view === "forgot") body = `<form class="gwc-form" data-f="forgot">
      <p class="gwc-muted" style="margin:0">Enviaremos um link para você criar uma nova senha.</p>
      <label>E-mail<input type="email" name="email" autocomplete="email" required value="${email}"></label>
      <div class="gwc-msg"></div>
      <div class="gwc-row"><button class="gwc-primary">Enviar link de recuperação</button><button type="button" class="gwc-link" data-act="back">Voltar</button></div></form>`;
  const root = openModal(`<h2>${view === "forgot" ? "Esqueci a senha" : "Conta"}</h2>
    ${view === "forgot" ? "" : tabs}${body}${view === "forgot" ? "" : google}
    <p class="gwc-muted" style="margin:14px 0 0">A conta é opcional: sem ela você joga normalmente e os saves ficam neste aparelho.</p>`);
  root.querySelectorAll(".gwc-tabs button").forEach(b => b.onclick = () => openAuth(b.dataset.v, { email: valueOf(root, "email") }));
  const act = (a, fn) => { const el = root.querySelector(`[data-act="${a}"]`); if (el) el.onclick = fn; };
  act("forgot", () => openAuth("forgot", { email: valueOf(root, "email") }));
  act("back", () => openAuth("login", { email: valueOf(root, "email") }));
  act("google", async () => {
    const { error } = await st.sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl() } });
    if (error) msg(root, ptError(error));
  });
  const form = root.querySelector("form");
  form.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form).entries());
    const submit = form.querySelector(".gwc-primary");
    await busy(submit, async () => {
      try {
        if (form.dataset.f === "login") {
          const { error } = await st.sb.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
          if (error) throw error;
          closeModal();
        } else if (form.dataset.f === "signup") {
          const username = f.username.trim().toLowerCase();
          if (!USERNAME_RE.test(username)) return msg(root, "Nome de usuário: 3 a 20 caracteres, só letras minúsculas, números e _.");
          if (st.dbReady && await usernameTaken(username)) return msg(root, "Esse nome de usuário já está em uso.");
          const { data, error } = await st.sb.auth.signUp({ email: f.email.trim(), password: f.password,
            options: { emailRedirectTo: redirectUrl(), data: { username, display_name: (f.display_name || "").trim().slice(0, 40) || username } } });
          if (error) throw error;
          if (data.session) closeModal();
          else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
            msg(root, "Já existe uma conta com este e-mail. Tente entrar ou use \"Esqueci a senha\".");
          else msg(root, `Conta criada! Enviamos um e-mail de confirmação para ${f.email.trim()}. Abra o link para ativar e entrar.`, "ok");
        } else if (form.dataset.f === "magic") {
          const { error } = await st.sb.auth.signInWithOtp({ email: f.email.trim(), options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true } });
          if (error) throw error;
          msg(root, `Link enviado para ${f.email.trim()}. Abra o e-mail neste aparelho para entrar.`, "ok");
        } else if (form.dataset.f === "forgot") {
          const { error } = await st.sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: redirectUrl() });
          if (error) throw error;
          msg(root, `Se houver uma conta com ${f.email.trim()}, um link de recuperação foi enviado.`, "ok");
        }
      } catch (err) { msg(root, ptError(err)); }
    });
  };
}
function valueOf(root, name) { const el = root.querySelector(`[name="${name}"]`); return el ? el.value : ""; }

function openNewPassword() {
  const root = openModal(`<h2>Nova senha</h2><form class="gwc-form">
    <label>Nova senha<input type="password" name="p1" autocomplete="new-password" required minlength="6"></label>
    <label>Repita a nova senha<input type="password" name="p2" autocomplete="new-password" required minlength="6"></label>
    <div class="gwc-msg"></div><div class="gwc-row"><button class="gwc-primary">Salvar senha</button></div></form>`);
  const form = root.querySelector("form");
  form.onsubmit = async e => {
    e.preventDefault();
    const p1 = valueOf(root, "p1"), p2 = valueOf(root, "p2");
    if (p1 !== p2) return msg(root, "As senhas não coincidem.");
    await busy(form.querySelector(".gwc-primary"), async () => {
      const { error } = await st.sb.auth.updateUser({ password: p1 });
      if (error) return msg(root, ptError(error));
      msg(root, "Senha alterada! Você já está conectado.", "ok");
      setTimeout(closeModal, 1500);
    });
  };
}

async function usernameTaken(username, exceptId = null) {
  let q = st.sb.from("profiles").select("id").eq("username", username).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  return !error && data && data.length > 0;
}

// ---------- banco ----------
async function checkDb() {
  const { error } = await st.sb.from("profiles").select("id").limit(1);
  if (!error) st.dbReady = true;
  else if (isMissingTable(error)) st.dbReady = false;
  else st.dbReady = null;
  return st.dbReady;
}

async function loadProfile() {
  if (!st.user || st.dbReady === false) { st.profile = null; return null; }
  const { data, error } = await st.sb.from("profiles").select("*").eq("id", st.user.id).maybeSingle();
  if (error) { if (isMissingTable(error)) st.dbReady = false; st.profile = null; return null; }
  st.dbReady = true;
  if (data) { st.profile = data; return data; }
  // Perfil não criado pelo gatilho (conta antiga ou SQL rodado depois): cria agora.
  const meta = st.user.user_metadata || {};
  let base = String(meta.username || (st.user.email || "").split("@")[0] || "jogador").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16);
  if (base.length < 3) base = "jogador";
  for (let i = 0; i < 6; i++) {
    const username = i === 0 ? base : `${base.slice(0, 14)}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const ins = await st.sb.from("profiles").insert({ id: st.user.id, username, display_name: (meta.display_name || username).slice(0, 40) }).select("*").maybeSingle();
    if (!ins.error) { st.profile = ins.data; return ins.data; }
    if (ins.error.code !== "23505") break;
    const again = await st.sb.from("profiles").select("*").eq("id", st.user.id).maybeSingle();
    if (again.data) { st.profile = again.data; return again.data; }
  }
  return null;
}

async function updateProfile(patch) {
  const { data, error } = await st.sb.from("profiles").update(patch).eq("id", st.user.id).select("*").maybeSingle();
  if (error) throw error;
  if (data) st.profile = data;
  renderChip();
  return data;
}

function track(p) {
  st.syncing++; renderChip();
  return p.then(r => { st.lastSync = Date.now(); st.lastError = null; return r; },
    e => { st.lastError = ptError(e); console.warn("nuvem:", e); })
    .finally(() => { st.syncing--; renderChip(); });
}
const canSync = () => st.sb && st.user && st.dbReady === true;

async function uploadSave(scId) {
  const sc = scenById(scId); if (!sc) return;
  const data = readJSON(sc.saveKey);
  if (!data || data.scen !== scId) return;
  // Nunca sobrescreve um save da nuvem feito por uma versão mais nova do jogo (ex.: outro aparelho já atualizado
  // e este com a página antiga em cache). O save mais novo fica intacto até esta página ser recarregada.
  const cur = await st.sb.from("saves").select("save_version").eq("user_id", st.user.id).eq("scenario_id", scId).eq("slot", SLOT).maybeSingle();
  if (cur.error) { if (isMissingTable(cur.error)) st.dbReady = false; throw cur.error; }
  if (cur.data && cur.data.save_version > Game.saveVersion) throw { message: NEWER_MSG, newer: true };
  const { error } = await st.sb.from("saves").upsert({ user_id: st.user.id, scenario_id: scId, slot: SLOT, data, save_version: data.v || Game.saveVersion },
    { onConflict: "user_id,scenario_id,slot" });
  if (error) { if (isMissingTable(error)) st.dbReady = false; throw error; }
}

// Une finais locais e da nuvem; grava a união nos dois lados.
async function mergeEndings(scIds) {
  if (!st.profile) return [];
  const cloudEnd = Object.assign({}, st.profile.endings || {});
  const changedLocal = []; let changedCloud = false;
  for (const sc of scenarios()) {
    if (scIds && !scIds.includes(sc.id)) continue;
    const valid = new Set(sc.endings.map(e => e.id));
    const local = Array.isArray(readJSON(sc.endingsKey)) ? readJSON(sc.endingsKey) : [];
    const remote = Array.isArray(cloudEnd[sc.id]) ? cloudEnd[sc.id] : [];
    const union = [...new Set([...local, ...remote])].filter(id => valid.has(id));
    if (union.some(id => !local.includes(id))) { writeJSON(sc.endingsKey, union); changedLocal.push(sc.id); }
    if (union.some(id => !remote.includes(id))) { cloudEnd[sc.id] = union; changedCloud = true; }
  }
  if (changedCloud) await updateProfile({ endings: cloudEnd });
  return changedLocal;
}

// Campanhas concluídas (chegaram a um final, vitória ou derrota). Ficam em campaigns_by_scenario._fim = { cenário: n }
// (coluna jsonb que já existe — sem mudar o banco). Os números antigos de campaigns_by_scenario contavam campanhas
// INICIADAS (inclusive abandonadas) e por isso não são mais exibidos; ficam intactos no banco. campaigns_played passa
// a guardar o total de concluídas. Local: { n: {cenário: concluídas}, sent: {cenário: já enviadas} } em Game.finishedKey.
function finishedOf(p, scId) { const f = p && p.campaigns_by_scenario && p.campaigns_by_scenario._fim; return (f && +f[scId]) || 0; }
async function pushFinished() {
  if (!st.profile || !Game.finishedKey) return;
  const loc = readJSON(Game.finishedKey); if (!loc || !loc.n) return;
  const sent = Object.assign({}, loc.sent || {}), by = Object.assign({}, st.profile.campaigns_by_scenario || {}), fim = Object.assign({}, by._fim || {});
  let add = 0;
  for (const id in loc.n) { const d = (loc.n[id] || 0) - (sent[id] || 0); if (d > 0) { fim[id] = (fim[id] || 0) + d; sent[id] = loc.n[id]; add += d; } }
  if (!add) return;
  by._fim = fim;
  const total = Object.values(fim).reduce((s, n) => s + (+n || 0), 0);
  await updateProfile({ campaigns_by_scenario: by, campaigns_played: total });
  writeJSON(Game.finishedKey, Object.assign({}, loc, { sent }));
}

// Conquistas: uma linha extra em saves (scenario_id "_conquistas"); o jogo faz a união (GWGame.mergeAchievements).
const ACH_ROW = "_conquistas";
async function mergeAchievements(rows) {
  if (!Game.achKey || !Game.mergeAchievements) return;
  if (rows === undefined) {
    const { data, error } = await st.sb.from("saves").select("scenario_id,data").eq("user_id", st.user.id).eq("scenario_id", ACH_ROW).eq("slot", SLOT);
    if (error) throw error; rows = data;
  }
  const row = (rows || []).find(r => r.scenario_id === ACH_ROW);
  const local = readJSON(Game.achKey), remote = row && row.data && row.data.got ? row.data : null;
  const merged = Game.mergeAchievements(local, remote);
  if (JSON.stringify(merged) !== JSON.stringify(local)) writeJSON(Game.achKey, merged);
  if (!Object.keys(merged.got).length || (remote && JSON.stringify(merged) === JSON.stringify(remote))) return;
  const { error } = await st.sb.from("saves").upsert({ user_id: st.user.id, scenario_id: ACH_ROW, slot: SLOT, data: merged, save_version: 1 },
    { onConflict: "user_id,scenario_id,slot" });
  if (error) throw error;
}

// ---------- ganchos chamados pelo jogo ----------
const timers = {};
window.GWCloud = {
  syncSave(scId) {
    if (!canSync()) return;
    clearTimeout(timers[scId]);
    timers[scId] = setTimeout(() => track(uploadSave(scId)), 1200);
  },
  syncEndings(scId) {
    if (!canSync() || !st.profile) return;
    track(mergeEndings([scId]));
  },
  syncAchievements() {
    if (!canSync()) return;
    track(mergeAchievements());
  },
  // Fase 12: estatísticas só contam campanhas que chegaram a um final. O jogo conta no aparelho (Game.finishedKey)
  // e aqui enviamos o que ainda não subiu; iniciar uma campanha não conta mais nada.
  campaignFinished() {
    if (!canSync() || !st.profile) return;
    track(pushFinished());
  },
  deleteSave(scId) {
    if (!canSync()) return;
    clearTimeout(timers[scId]);
    track(st.sb.from("saves").delete().match({ user_id: st.user.id, scenario_id: scId, slot: SLOT }).then(({ error }) => { if (error) throw error; }));
  },
  status: () => ({ loggedIn: !!st.user, dbReady: st.dbReady, lastSync: st.lastSync, lastError: st.lastError }),
};

// ---------- mesclagem ao entrar ----------
const saveTime = (data, fallback) => (data && data.savedAt) || (fallback ? Date.parse(fallback) : 0) || 0;
const sameSave = (a, b) => JSON.stringify(a) === JSON.stringify(b) || (a.savedAt && a.savedAt === b.savedAt && a.turn === b.turn);

async function mergeOnLogin({ interactive = false } = {}) {
  if (!canSync()) return;
  st.syncing++; renderChip();
  try {
    const { data: rows, error } = await st.sb.from("saves").select("scenario_id,data,save_version,updated_at").eq("user_id", st.user.id).eq("slot", SLOT);
    if (error) throw error;
    const changed = new Set(), uploads = [], conflicts = [];
    let skipped = 0, newer = 0;
    for (const sc of scenarios()) {
      const row = (rows || []).find(r => r.scenario_id === sc.id);
      // Save da nuvem de uma versão mais nova do jogo: não baixa (esta página não sabe abrir) nem envia o local por cima.
      if (row && row.save_version > Game.saveVersion) { newer++; continue; }
      const local = readJSON(sc.saveKey);
      const hasLocal = local && local.scen === sc.id;
      const cloudOk = row && row.data && row.save_version >= (Game.minSaveVersion || Game.saveVersion) && row.save_version <= Game.saveVersion && row.data.scen === sc.id; // v2 é migrado pelo jogo ao abrir
      if (row && !cloudOk) skipped++;
      if (!hasLocal && !cloudOk) continue;
      if (hasLocal && !cloudOk) { uploads.push(sc.id); continue; }
      if (!hasLocal && cloudOk) { writeJSON(sc.saveKey, row.data); changed.add(sc.id); continue; }
      if (sameSave(local, row.data)) continue;
      conflicts.push({ sc, local, row, tLocal: saveTime(local), tCloud: saveTime(row.data, row.updated_at) });
    }
    for (const id of uploads) await uploadSave(id);
    if (conflicts.length) {
      const choices = await askConflicts(conflicts);
      for (const c of conflicts) {
        if (choices[c.sc.id] === "cloud") { writeJSON(c.sc.saveKey, c.row.data); changed.add(c.sc.id); }
        else await uploadSave(c.sc.id);
      }
    }
    for (const id of await mergeEndings()) changed.add(id);
    await mergeAchievements(rows || []);
    await pushFinished();
    st.lastSync = Date.now(); st.lastError = newer ? NEWER_MSG : null;
    if (changed.size) Game.refresh([...changed]);
    if (interactive) return { uploads: uploads.length, downloaded: changed.size, conflicts: conflicts.length, skipped, newer };
  } catch (e) {
    st.lastError = ptError(e); console.warn("nuvem (mesclagem):", e);
    if (interactive) throw e;
  } finally { st.syncing--; renderChip(); }
}

function askConflicts(conflicts) {
  return new Promise(resolve => {
    const choices = {};
    const card = (c) => {
      const newer = c.tCloud > c.tLocal ? "cloud" : "local";
      choices[c.sc.id] = newer;
      const opt = (side, title, data, t) => `<div class="gwc-opt ${newer === side ? "on" : ""}" data-sc="${esc(c.sc.id)}" data-side="${side}">
        <b>${title}</b> ${newer === side ? '<span class="gwc-new">● mais recente</span>' : ""}<br>
        <span class="gwc-muted">${esc(Game.monthLabel(data.month))} · turno ${esc(data.turn ?? "?")}<br>salvo em ${esc(fmtDate(t))}</span></div>`;
      return `<div class="gwc-conf"><b>${esc(c.sc.year)} — ${esc(c.sc.title)}</b>
        <div class="gwc-opts">${opt("cloud", "☁️ Usar da nuvem", c.row.data, c.tCloud)}${opt("local", "💾 Manter deste aparelho", c.local, c.tLocal)}</div></div>`;
    };
    const root = openModal(`<h2>Saves diferentes encontrados</h2>
      <p class="gwc-muted">Há um save neste aparelho e outro na sua conta para o mesmo cenário. Escolha qual manter — o outro será substituído.</p>
      ${conflicts.map(card).join("")}
      <div class="gwc-row" style="margin-top:12px"><button class="gwc-primary">Confirmar</button></div>`, { closable: false });
    root.querySelectorAll(".gwc-opt").forEach(o => o.onclick = () => {
      choices[o.dataset.sc] = o.dataset.side;
      root.querySelectorAll(`.gwc-opt[data-sc="${o.dataset.sc}"]`).forEach(x => x.classList.toggle("on", x === o));
    });
    root.querySelector(".gwc-primary").onclick = () => { closeModal(); resolve(choices); };
  });
}

// ---------- perfil ----------
function endingsStats(p) {
  return scenarios().map(sc => {
    const got = new Set(((p && p.endings) || {})[sc.id] || []);
    return { sc, got: sc.endings.filter(e => got.has(e.id)), total: sc.endings.length, played: finishedOf(p, sc.id) };
  });
}
// Totais só dos cenários jogáveis (hoje: 2022). O endings_count/campaigns_played do banco somam todos os cenários
// (inclusive 1924, removido, e 1964, bloqueado) — os dados ficam intactos no banco, só não entram na exibição.
function playTotals(p) {
  const s = endingsStats(p);
  return { endings: s.reduce((n, x) => n + x.got.length, 0), played: s.reduce((n, x) => n + x.played, 0) };
}
function statsHTML(p, showNames) {
  return `<table class="gwc-table"><tr><th>Cenário</th><th>Campanhas concluídas</th><th>Finais</th></tr>${endingsStats(p).map(s => `
    <tr><td>${esc(s.sc.year)} — ${esc(s.sc.title)}${showNames && s.got.length ? `<div class="gwc-muted">${s.got.map(e => esc(e.name || e.id)).join(" · ")}</div>` : ""}</td>
    <td>${s.played}</td><td>${s.got.length}/${s.total}<div class="gwc-bar"><i style="width:${s.total ? Math.round(100 * s.got.length / s.total) : 0}%"></i></div></td></tr>`).join("")}</table>`;
}

function openProfile(tab = "perfil") {
  const p = st.profile;
  const tabs = `<div class="gwc-tabs">${[["perfil", "Perfil"], ["stats", "Estatísticas"], ["jogadores", "Jogadores"]].map(([v, l]) =>
    `<button data-v="${v}" class="${tab === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const head = `<div class="gwc-head">${avatarHTML(p || { id: st.user.id, display_name: st.user.email }, 48)}<div><h2>${esc(displayName(p) || st.user.email)}</h2>
    <div class="gwc-muted">${p ? "@" + esc(p.username) + " · " : ""}${esc(st.user.email || "")}</div></div></div>`;
  const footer = `<div class="gwc-row" style="margin-top:16px;justify-content:space-between">
    <span class="gwc-muted" id="gwc-syncinfo">${st.dbReady === true ? (st.lastSync ? "Última sincronização: " + esc(fmtDate(st.lastSync)) : "") : ""}</span>
    <span class="gwc-row">${st.dbReady === true ? '<button class="btn-sm" data-act="sync">☁️ Sincronizar agora</button>' : ""}<button class="btn-sm" data-act="logout">Sair</button></span></div>`;
  let body;
  if (st.dbReady !== true || !p) {
    body = `<div class="gwc-msg show info">${st.dbReady === false ? esc(DB_MISSING_MSG) : "Não foi possível carregar seu perfil agora (sem conexão?). Seus saves continuam neste aparelho."}</div>`;
  } else if (tab === "perfil") {
    body = `<form class="gwc-form">
      <label>Nome de exibição<input name="display_name" maxlength="40" value="${esc(p.display_name || "")}"></label>
      <label>Nome de usuário <span class="gwc-muted">(3–20: a–z, 0–9, _)</span><input name="username" maxlength="20" pattern="[a-z0-9_]{3,20}" required value="${esc(p.username)}"></label>
      <label>Emblema</label><div class="gwc-avgrid">
        <button type="button" data-av="iniciais" class="${!AVATARS[p.avatar] ? "on" : ""}" title="Iniciais">${avatarHTML({ ...p, avatar: "iniciais" }, 38)}</button>
        ${Object.entries(AVATARS).map(([k, e]) => `<button type="button" data-av="${k}" class="${p.avatar === k ? "on" : ""}" title="${k}">${e}</button>`).join("")}</div>
      <label>Bio <span class="gwc-muted">(até 280 caracteres)</span><textarea name="bio" maxlength="280">${esc(p.bio || "")}</textarea></label>
      <div class="gwc-msg"></div>
      <div class="gwc-row"><button class="gwc-primary">Salvar perfil</button></div></form>`;
  } else if (tab === "stats") {
    const t = playTotals(p);
    body = `<p>Campanhas concluídas: <b>${t.played}</b> · Finais desbloqueados: <b>${t.endings}</b></p>${statsHTML(p, true)}
      <p class="gwc-muted">Membro desde ${esc(fmtDate(p.created_at))}.</p>`;
  } else {
    body = `<div id="gwc-rank" class="gwc-muted">Carregando ranking…</div>`;
  }
  const root = openModal(head + tabs + body + footer);
  root.querySelectorAll(".gwc-tabs button").forEach(b => b.onclick = () => openProfile(b.dataset.v));
  const actBtn = a => root.querySelector(`[data-act="${a}"]`);
  actBtn("logout").onclick = async () => { await st.sb.auth.signOut(); closeModal(); };
  if (actBtn("sync")) actBtn("sync").onclick = e => busy(e.target, async () => {
    try {
      st.dbReady === true && await loadProfile();
      const r = await mergeOnLogin({ interactive: true });
      openProfile(tab);
      const info = document.getElementById("gwc-syncinfo");
      if (info && r) info.textContent = `Sincronizado: ${r.uploads} enviado(s), ${r.downloaded} atualizado(s) neste aparelho${r.conflicts ? `, ${r.conflicts} conflito(s) resolvido(s)` : ""}${r.skipped ? `, ${r.skipped} save(s) de versão antiga ignorado(s)` : ""}.${r.newer ? " " + NEWER_MSG : ""}`;
    } catch (err) { const info = document.getElementById("gwc-syncinfo"); if (info) info.textContent = ptError(err); }
  });
  if (st.dbReady !== true || !p) return;
  if (tab === "perfil") {
    let avatar = p.avatar;
    root.querySelectorAll("[data-av]").forEach(b => b.onclick = () => {
      avatar = b.dataset.av; root.querySelectorAll("[data-av]").forEach(x => x.classList.toggle("on", x === b));
    });
    const form = root.querySelector("form");
    form.onsubmit = async e => {
      e.preventDefault();
      const username = valueOf(root, "username").trim().toLowerCase();
      if (!USERNAME_RE.test(username)) return msg(root, "Nome de usuário: 3 a 20 caracteres, só letras minúsculas, números e _.");
      await busy(form.querySelector(".gwc-primary"), async () => {
        try {
          if (username !== p.username && await usernameTaken(username, p.id)) return msg(root, "Esse nome de usuário já está em uso.");
          await updateProfile({ username, display_name: valueOf(root, "display_name").trim().slice(0, 40) || null,
            bio: valueOf(root, "bio").trim().slice(0, 280) || null, avatar });
          openProfile("perfil");
          msg(modalEl, "Perfil salvo!", "ok");
        } catch (err) { msg(root, ptError(err)); }
      });
    };
  } else if (tab === "jogadores") loadRanking(root);
}

async function loadRanking(root) {
  const box = root.querySelector("#gwc-rank");
  // busca os mais bem colocados pelo total do banco e reordena pelo total só dos cenários jogáveis
  const { data: raw, error } = await st.sb.from("profiles").select("id,username,display_name,avatar,endings,campaigns_by_scenario,endings_count,campaigns_played,created_at")
    .order("endings_count", { ascending: false }).order("created_at", { ascending: true }).limit(300);
  if (!box.isConnected) return;
  if (error) { box.textContent = ptError(error); return; }
  const data = (raw || []).map(u => { const t = playTotals(u); return { ...u, endings_count: t.endings, campaigns_played: t.played }; })
    .sort((a, b) => b.endings_count - a.endings_count || String(a.created_at).localeCompare(String(b.created_at))).slice(0, 50);
  if (!data.length) { box.textContent = "Nenhum jogador ainda."; return; }
  box.className = "";
  box.innerHTML = `<p class="gwc-muted" style="margin-top:0">Ranking por finais desbloqueados em ${esc(scenarios().map(sc => sc.year).join(", "))} (top 50). Clique para ver o perfil.</p>
    <table class="gwc-table"><tr><th>#</th><th>Jogador</th><th>Finais</th><th>Campanhas concluídas</th></tr>${data.map((u, i) => `
    <tr class="click" data-id="${esc(u.id)}"><td>${i + 1}</td><td><span class="gwc-row" style="gap:6px">${avatarHTML(u, 24)}<span>${esc(displayName(u))} <span class="gwc-muted">@${esc(u.username)}</span></span></span></td>
    <td>${u.endings_count}</td><td>${u.campaigns_played}</td></tr>`).join("")}</table>`;
  box.querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => openPublicProfile(tr.dataset.id));
}

async function openPublicProfile(id) {
  const root = openModal(`<div class="gwc-muted">Carregando perfil…</div>`);
  const { data: p, error } = await st.sb.from("profiles").select("id,username,display_name,avatar,bio,campaigns_played,campaigns_by_scenario,endings,endings_count,created_at").eq("id", id).maybeSingle();
  if (root !== modalEl) return;
  if (error || !p) { root.querySelector(".modal-card").insertAdjacentHTML("beforeend", `<p>${esc(error ? ptError(error) : "Perfil não encontrado.")}</p>`); return; }
  const r = openModal(`<div class="gwc-head">${avatarHTML(p, 56)}<div><h2>${esc(displayName(p))}</h2><div class="gwc-muted">@${esc(p.username)} · desde ${esc(fmtDate(p.created_at).split(" ")[0])}</div></div></div>
    ${p.bio ? `<p style="white-space:pre-wrap">${esc(p.bio)}</p>` : ""}
    <p>Campanhas concluídas: <b>${playTotals(p).played}</b> · Finais desbloqueados: <b>${playTotals(p).endings}</b></p>
    ${statsHTML(p, false)}
    <div class="gwc-row" style="margin-top:14px"><button class="btn-sm" data-act="back">← Jogadores</button></div>`);
  r.querySelector('[data-act="back"]').onclick = () => st.user ? openProfile("jogadores") : closeModal();
}

// ---------- inicialização ----------
async function loadLib() {
  for (const url of CDN) {
    try { return await import(url); } catch (e) { console.warn("Não carregou", url, e); }
  }
  return null;
}

async function onAuth(event, session) {
  st.session = session; st.user = session ? session.user : null;
  if (event === "SIGNED_OUT" || !st.user) { st.profile = null; st.mergedFor = null; st.lastError = null; renderChip(); return; }
  if (event === "TOKEN_REFRESHED") return;
  if (st.dbReady !== true) await checkDb();
  await loadProfile();
  renderChip();
  if (event === "PASSWORD_RECOVERY") { openNewPassword(); return; }
  if (st.mergedFor !== st.user.id && st.dbReady === true) {
    st.mergedFor = st.user.id;
    if (event === "SIGNED_IN" && modalEl) closeModal();
    await mergeOnLogin();
  }
}

(async function init() {
  if (!Game || !btn) return;
  renderChip();
  const lib = await loadLib();
  if (!lib || !lib.createClient) { renderChip(); return; }
  try {
    st.sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (e) { console.warn("Supabase:", e); st.sb = null; renderChip(); return; }
  renderChip();
  checkDb().then(renderChip);
  // Não usar await de chamadas Supabase dentro do callback (pode travar): adia com setTimeout.
  st.sb.auth.onAuthStateChange((event, session) => { setTimeout(() => onAuth(event, session).catch(e => console.warn("nuvem:", e)), 0); });
  // Links de e-mail com erro (ex.: link expirado) chegam no hash da URL
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("error_description")) {
    openModal(`<h2>Link de e-mail</h2><p>${esc(h.get("error_description").replace(/\+/g, " "))}</p><p class="gwc-muted">O link pode ter expirado ou já ter sido usado. Peça um novo.</p>`);
    history.replaceState(null, "", location.pathname + location.search);
  }
})();
