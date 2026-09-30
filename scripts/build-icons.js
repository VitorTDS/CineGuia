// Renders the app icons and the default link-preview image with headless Chrome.
// Usage: npm run icons   (set CHROME_PATH if Chrome is not found)
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findChrome } = require('../tests/helpers/chrome');

const OUT = path.join(__dirname, '..', 'public', 'icons');
const RED = '#e50914';
const DARK = '#0d0f14';

// The CineGuia mark: a red "C" ring around a play symbol, same drawing as public/favicon.svg.
// Maskable icons are full-bleed and shrink the mark, because Android crops their edges.
const MARK = `<path d="M362 150A150 150 0 1 0 362 362" fill="none" stroke="${RED}" stroke-width="56" stroke-linecap="round"/>
  <path d="M222 190L322 256L222 322Z" fill="#fff"/>`;
const iconSvg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#14161f"/>
  <g transform="${maskable ? 'translate(256 256) scale(0.7) translate(-256 -256)' : ''}">${MARK}</g>
</svg>`;

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; width: 1200px; height: 630px; display: grid; place-items: center; background: ${DARK};
    font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #f1f3f8; }
  .box { display: grid; justify-items: center; gap: 28px; text-align: center; }
  .logo { display: flex; align-items: center; gap: 28px; font-size: 104px; font-weight: 800; letter-spacing: -2px; }
  .mark { width: 136px; height: 136px; }
  p { margin: 0; font-size: 40px; color: #9aa3b5; }
</style></head><body><div class="box"><div class="logo"><svg class="mark" viewBox="0 0 512 512">${MARK}</svg>CineGuia</div>
<p>Sinopse, trailer e onde assistir filmes e séries</p></div></body></html>`;

function render(chrome, source, output, width, height) {
  const tmp = path.join(os.tmpdir(), `cineguia-icon-${Date.now()}-${path.basename(output)}${source.startsWith('<svg') ? '.svg' : '.html'}`);
  fs.writeFileSync(tmp, source);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cineguia-chrome-'));
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', `--user-data-dir=${profile}`,
    '--default-background-color=00000000', `--window-size=${width},${height}`, `--screenshot=${output}`,
    `file:///${tmp.replace(/\\/g, '/')}`
  ], { stdio: 'ignore' });
  fs.rmSync(tmp, { force: true });
  fs.rmSync(profile, { recursive: true, force: true });
  console.log(`gerado ${path.relative(process.cwd(), output)} (${width}x${height})`);
}

const chrome = findChrome();
fs.mkdirSync(OUT, { recursive: true });
render(chrome, iconSvg(false), path.join(OUT, 'icon-192.png'), 192, 192);
render(chrome, iconSvg(false), path.join(OUT, 'icon-512.png'), 512, 512);
render(chrome, iconSvg(false), path.join(OUT, 'apple-touch-icon.png'), 180, 180);
render(chrome, iconSvg(true), path.join(OUT, 'maskable-512.png'), 512, 512);
render(chrome, ogHtml, path.join(__dirname, '..', 'public', 'og-image.png'), 1200, 630);
