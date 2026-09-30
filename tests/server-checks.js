// Checks that talk to the server directly (no browser): link previews, headers, service worker, API.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function collector() {
  const results = [];
  const check = (name, ok, extra) => results.push(`${ok ? 'PASS ' : 'FAIL '}${name}${extra !== undefined ? ` [${extra}]` : ''}`);
  return { results, check };
}

const metaContent = (html, key) => {
  const match = html.match(new RegExp(`<meta (?:property|name)="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="([^"]*)">`));
  return match ? match[1] : null;
};

module.exports = [
  {
    name: 'Prévia de links',
    async run({ base }) {
      const { results, check } = collector();
      const page = async (pathname) => (await fetch(`${base}${pathname}`)).text();

      const home = await page('/');
      check('Página inicial tem prévia padrão com imagem absoluta', metaContent(home, 'og:title') === 'CineGuia · Onde assistir filmes e séries' && metaContent(home, 'og:image') === `${base}/og-image.png`, metaContent(home, 'og:image'));

      const movie = await page('/filme/7');
      check('Filme: título, descrição e imagem na prévia', metaContent(movie, 'og:title') === 'A Origem (2010)' && metaContent(movie, 'og:image') === 'https://image.tmdb.org/t/p/w780/backdrop7.jpg' && metaContent(movie, 'og:type') === 'video.movie', metaContent(movie, 'og:title'));
      check('Filme: título da aba e endereço da prévia', movie.includes('<title>A Origem (2010) · CineGuia</title>') && metaContent(movie, 'og:url') === `${base}/filme/7`);
      check('Filme sem sinopse usa texto padrão', metaContent(movie, 'og:description') === 'Veja sinopse, trailer e onde assistir no CineGuia.', metaContent(movie, 'og:description'));

      const xss = await page('/filme/666');
      check('Título com HTML malicioso é escapado na prévia', !xss.includes('<script>alert') && !xss.includes('<img src=x') && xss.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

      const saga = await page('/saga/marvel');
      check('Saga completa tem prévia', metaContent(saga, 'og:title') === 'Universo Cinematográfico Marvel · linha do tempo', metaContent(saga, 'og:title'));
      const collection = await page('/saga/1241');
      check('Coleção do TMDB tem prévia', metaContent(collection, 'og:title') === 'Harry Potter: Coleção · linha do tempo');

      const classic = await page('/dominio/nosferatu_teste');
      check('Clássico em domínio público tem prévia', metaContent(classic, 'og:title') === 'Nosferatu · assista grátis' && metaContent(classic, 'og:image') === 'https://archive.org/services/img/nosferatu_teste');
      const blocked = await page('/dominio/bloqueado');
      check('Item bloqueado cai na prévia padrão', metaContent(blocked, 'og:title') === 'CineGuia · Onde assistir filmes e séries');
      const invalid = await fetch(`${base}/filme/abc`);
      check('Endereço de título inválido ainda abre a página', invalid.status === 200 && metaContent(await invalid.text(), 'og:title') === 'CineGuia · Onde assistir filmes e séries');
      return results;
    }
  },
  {
    name: 'Servidor',
    async run({ base }) {
      const { results, check } = collector();
      const manifest = await fetch(`${base}/manifest.webmanifest`);
      const manifestJson = await manifest.clone().json();
      check('Manifesto do app com tipo e ícones certos', manifest.headers.get('content-type').startsWith('application/manifest+json') && manifestJson.icons.length === 3 && manifestJson.display === 'standalone');
      for (const icon of manifestJson.icons) {
        const response = await fetch(`${base}${icon.src}`);
        check(`Ícone ${icon.src} existe`, response.status === 200 && response.headers.get('content-type') === 'image/png');
      }

      const sw = await fetch(`${base}/sw.js`);
      const swText = await sw.text();
      check('Service worker nunca fica em cache no navegador', sw.headers.get('cache-control') === 'no-cache');
      const shell = [...swText.matchAll(/'(\/[^']*)'/g)].map((match) => match[1]);
      const modules = fs.readdirSync(path.join(ROOT, 'public', 'js')).filter((name) => name.endsWith('.js')).map((name) => `/js/${name}`);
      const missing = modules.filter((file) => !shell.includes(file));
      check('Lista do service worker inclui todos os módulos', missing.length === 0, missing.join(', ') || 'ok');
      const broken = [];
      for (const file of shell) {
        if ((await fetch(`${base}${file}`)).status !== 200) broken.push(file);
      }
      check('Todos os arquivos da lista do service worker existem', broken.length === 0, broken.join(', ') || `${shell.length} arquivos`);

      const traversal = await fetch(`${base}/..%5cserver.js`);
      check('Tentativa de ler arquivos fora da pasta pública é bloqueada', traversal.status === 403 || traversal.status === 404, traversal.status);
      check('Cabeçalho de segurança (CSP) presente', (await fetch(`${base}/`)).headers.get('content-security-policy').includes("default-src 'self'"));

      const forYou = await (await fetch(`${base}/api/for-you?items=movie:7,movie:555&exclude=movie:7,movie:555`)).json();
      check('Para você: título recomendado pelos dois primeiro, sem os já vistos', forYou.results[0].title === 'Recomendado por todos' && !forYou.results.some((item) => item.id === 7 || item.id === 555), forYou.results.map((item) => item.title).join(', '));
      const empty = await (await fetch(`${base}/api/for-you`)).json();
      check('Para você sem histórico devolve lista vazia', Array.isArray(empty.results) && empty.results.length === 0);
      return results;
    }
  }
];
