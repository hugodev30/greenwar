// Teste do bug: save mais novo na nuvem não pode ser sobrescrito por página antiga.
// Uso: node tests/nuvem.js  (Supabase falso, sem rede)
const fs = require("fs");
let src = fs.readFileSync(process.argv[2] || require("path").join(__dirname, "../js/nuvem/cloud.js"), "utf8").replace(/^import .*$/m, "");
src += "\nreturn { st, mergeOnLogin, uploadSave };";

const store = {};
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const el = () => ({ style: {}, appendChild() {}, set textContent(v) {}, querySelector: () => null, querySelectorAll: () => [] });
const document = { createElement: el, head: el(), body: el(), getElementById: () => null, addEventListener() {} };
const SAVE_VERSION = 17;
const Game = { scenarios: () => [{ id: "brasil2022", year: 2022, title: "x", saveKey: "save22", endingsKey: "end22", endings: [] }],
  saveVersion: SAVE_VERSION, minSaveVersion: 2, refresh() {}, monthLabel: m => String(m) };
const window = { GWGame: Game };

// Supabase falso: uma tabela "saves"
function makeSb(rows) {
  const ups = [];
  const from = table => {
    const q = { filters: {}, op: "select" };
    const run = () => {
      if (q.op === "upsert") { ups.push(q.row); const i = rows.findIndex(r => r.scenario_id === q.row.scenario_id && r.slot === q.row.slot); if (i >= 0) rows[i] = { ...q.row }; else rows.push({ ...q.row }); return { error: null }; }
      const res = rows.filter(r => Object.entries(q.filters).every(([k, v]) => r[k] === v));
      return { data: q.single ? (res[0] || null) : res, error: null };
    };
    Object.assign(q, {
      select() { return q; }, eq(k, v) { q.filters[k] = v; return q; },
      maybeSingle() { q.single = true; return Promise.resolve(run()); },
      upsert(row) { q.op = "upsert"; q.row = row; return Promise.resolve(run()); },
      then(a, b) { return Promise.resolve(run()).then(a, b); },
    });
    return q;
  };
  return { from, ups };
}

const mod = new Function("window", "document", "localStorage", "location", "history", src)(window, document, localStorage, { origin: "", pathname: "/", hash: "" }, {});
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fails++; };

(async () => {
  const user = { id: "u1" };
  const local = { v: 17, scen: "brasil2022", month: 5, turn: 3, savedAt: 100 };

  // 1) login: nuvem v18 (outro aparelho atualizado), local v17 → não envia
  {
    const rows = [{ user_id: "u1", scenario_id: "brasil2022", slot: 0, data: { v: 18, scen: "brasil2022", savedAt: 999 }, save_version: 18 }];
    const sb = makeSb(rows); Object.assign(mod.st, { sb, user, dbReady: true, profile: null });
    store.save22 = JSON.stringify(local);
    const r = await mod.mergeOnLogin({ interactive: true });
    ok(sb.ups.length === 0, "login não envia o save local por cima do v18");
    ok(rows[0].save_version === 18, "save v18 da nuvem continua intacto");
    ok(r.newer === 1 && /versão mais nova/.test(mod.st.lastError || ""), "avisa que há save mais novo na nuvem");
    ok(JSON.parse(store.save22).v === 17, "save local não é trocado");
  }
  // 2) autosave durante o jogo com nuvem v18 → recusa
  {
    const rows = [{ user_id: "u1", scenario_id: "brasil2022", slot: 0, data: { v: 18 }, save_version: 18 }];
    const sb = makeSb(rows); Object.assign(mod.st, { sb, user, dbReady: true });
    let err = null; try { await mod.uploadSave("brasil2022"); } catch (e) { err = e; }
    ok(err && err.newer && sb.ups.length === 0, "uploadSave recusa sobrescrever v18");
  }
  // 3) caso normal: nuvem v16, local v17 → conflito resolvido enviando; nuvem vazia → envia
  {
    const rows = [];
    const sb = makeSb(rows); Object.assign(mod.st, { sb, user, dbReady: true, lastError: null });
    await mod.uploadSave("brasil2022");
    ok(sb.ups.length === 1 && rows[0].save_version === 17, "sem save na nuvem: envia normalmente");
    rows[0].save_version = 16;
    await mod.uploadSave("brasil2022");
    ok(sb.ups.length === 2 && rows[0].save_version === 17, "nuvem com versão menor: envia normalmente");
    const r = await mod.mergeOnLogin({ interactive: true });
    ok(r.newer === 0 && mod.st.lastError === null, "sem save mais novo: nenhum aviso");
  }
  console.log(fails ? `${fails} falha(s)` : "Tudo certo.");
  process.exit(fails ? 1 : 0);
})();
