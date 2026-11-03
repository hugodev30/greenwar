// tests/navegacao-tela.js — smoke test opcional no navegador para menu, cenários bloqueados e nova campanha.
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT || "playwright-core")); }
catch (e) {
  try { ({ chromium } = require("playwright")); }
  catch (e2) {
    console.log("navegacao-tela: playwright não instalado — pulado");
    process.exit(0);
  }
}

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };

function serveFile(req, res){
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch (e){ res.writeHead(400); res.end("URL inválida"); return; }
  const file = path.resolve(ROOT, "." + (pathname === "/" ? "/index.html" : pathname));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)){ res.writeHead(403); res.end("Proibido"); return; }
  fs.readFile(file, (err, data) => {
    if (err){ res.writeHead(err.code === "ENOENT" ? 404 : 500); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

async function main(){
  const server = http.createServer(serveFile);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let browser;
  try{
    browser = await chromium.launch({
      executablePath: process.env.CHROME || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined),
      args: process.platform === "win32" ? [] : ["--no-sandbox"]
    });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.route(/supabase|esm\.sh|jsdelivr/, route => route.abort());
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("gw_tut_v3", JSON.stringify({ off: true, seen: {} }));
      localStorage.setItem("gw_settings_v1", JSON.stringify({ lang: "pt", music: 0, sfx: 0, muted: true }));
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('.scen.feat[data-id="brasil2022"]').waitFor();

    const futureCards = page.locator(".scen.soon");
    assert.ok(await futureCards.count() > 0, "menu should show at least one unavailable scenario");
    const card1964 = futureCards.filter({ hasText: "1964" });
    assert.strictEqual(await card1964.count(), 1, "menu should show the 1964 scenario as locked");
    const blockedState = await futureCards.evaluateAll(cards => cards.map(card => ({
      disabled: card.getAttribute("aria-disabled"),
      role: card.getAttribute("role"),
      tabIndex: card.getAttribute("tabindex"),
      hasScenarioId: card.hasAttribute("data-id")
    })));
    assert.ok(blockedState.every(card => card.disabled === "true" && card.role !== "button" && card.tabIndex === null && !card.hasScenarioId),
      "coming-soon scenarios should not be interactive");

    await card1964.click();
    assert.strictEqual(await page.locator("#btnNew").count(), 0, "clicking the 1964 card must not open a playable scenario");
    assert.deepStrictEqual(await page.evaluate(() => window.GWGame.current()), { scenario: null, inGame: false },
      "clicking a coming-soon card must leave the game at the scenario menu");

    await page.locator('.scen.feat[data-id="brasil2022"]').click();
    await page.locator("#btnNew").click();
    await page.locator("#newModal #btnNewGo").click();
    await page.locator("#btnEnd").waitFor();
    await page.waitForFunction(() => {
      const current = window.GWGame && window.GWGame.current();
      return current && current.scenario === "brasil2022" && current.inGame;
    });
    const savedGame = await page.evaluate(() => JSON.parse(localStorage.getItem("jogo_br_save_brasil2022")));
    assert.ok(savedGame && savedGame.scen === "brasil2022", "starting the campaign should create its local save");
    assert.deepStrictEqual(pageErrors, [], "the browser flow should not raise JavaScript errors");
    await context.close();
    console.log("navegacao-tela: menu, cenário 1964 bloqueado e início da campanha 2022 OK");
  }finally{
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

main().catch(error => {
  console.error("navegacao-tela: falhou", error);
  process.exitCode = 1;
});
