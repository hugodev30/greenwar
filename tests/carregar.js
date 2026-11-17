// tests/carregar.js — carrega o código do jogo no Node (sem navegador) para o check.js e o sim.js.
// A ordem dos arquivos vem das tags <script src> do index.html (fonte única): assim um arquivo novo
// listado no index.html entra nos testes automaticamente. Só dados (js/data) e núcleo (js/core) rodam aqui.
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?v=[^"]*)?"><\/script>/g)].map(m => m[1]);
const ler = f => fs.readFileSync(path.join(RAIZ, f), "utf8");
const de = pasta => scripts.filter(f => f.startsWith(pasta)).map(ler).join("\n");
module.exports = {
  RAIZ, scripts,
  dados: de("js/data/"),        // cenários, eventos, focos, mapa, estados
  nucleo: de("js/core/"),       // regras do jogo (sem DOM)
  // código de dados + núcleo, pronto para new Function(codigo + "; return {...}")
  get codigo(){ return this.dados + "\n" + this.nucleo; },
};
