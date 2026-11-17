// tests/versao.js — carimba a versão do jogo (a mais nova de js/data/novidades.js) em todos os <script src> e
// <link href> locais do index.html, como "?v=1.23". Assim, a cada versão nova o navegador baixa os arquivos novos
// em vez de usar os do cache (cache velho no GitHub Pages podia misturar versões e até apagar saves na nuvem).
// Uso: node tests/versao.js   (rode ao lançar uma versão; o tests/check.js falha se o index.html ficar desatualizado)
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const versaoAtual = () => {
  const src = fs.readFileSync(path.join(RAIZ, "js/data/novidades.js"), "utf8");
  return new Function(src + "; return NOVIDADES;")()[0].v;
};
const carimbar = (html, v) => html.replace(/(<(?:script[^>]*\ssrc|link[^>]*\shref)=")((?:js|css)\/[^"?]+)(?:\?v=[^"]*)?"/g, `$1$2?v=${v}"`);
module.exports = { versaoAtual, carimbar };
if (require.main === module){
  const f = path.join(RAIZ, "index.html"), v = versaoAtual(), antes = fs.readFileSync(f, "utf8"), depois = carimbar(antes, v);
  if (antes === depois) console.log(`index.html já está na versão ${v}.`);
  else { fs.writeFileSync(f, depois); console.log(`index.html carimbado com ?v=${v}.`); }
}
