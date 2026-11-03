// tests/saves.js — testa o autosave quando o localStorage falha e quando volta a funcionar.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "js", "ui", "saves.js"), "utf8");
let failWrites = false, logCount = 0;
const stored = new Map(), warning = { hidden: true, textContent: "" };
const storage = {
  setItem(key, value){
    if (failWrites) throw new Error("quota exceeded");
    stored.set(key, value);
  }
};
const document = { getElementById: id => id === "saveWarning" ? warning : null };
const api = new Function("localStorage", "document", "trText", "console", `
  let G = null, SCEN = null;
  ${source}
  return { save, setState(g, sc){ G = g; SCEN = sc; } };
`)(storage, document, text => text, { error(){ logCount++; } });

api.setState({ turn: 1 }, { saveKey: "campaign" });
assert.strictEqual(api.save(), true, "successful local save should return true");
assert.strictEqual(warning.hidden, true, "successful save should not show a warning");
assert.strictEqual(JSON.parse(stored.get("campaign")).turn, 1, "successful save should store the campaign");

failWrites = true;
assert.strictEqual(api.save(), false, "failed local save should return false");
assert.strictEqual(warning.hidden, false, "failed save should show a persistent warning");
assert.match(warning.textContent, /Não foi possível salvar o progresso/);
assert.strictEqual(logCount, 1, "first failure should be logged");
api.save();
assert.strictEqual(logCount, 1, "repeated failures should not flood the console");

failWrites = false;
assert.strictEqual(api.save(), true, "save should recover when storage becomes available");
assert.strictEqual(warning.hidden, true, "successful retry should clear the warning");
assert.strictEqual(warning.textContent, "");

console.log("Autosave: falha visível e registrada; aviso limpo quando o armazenamento se recupera.");
