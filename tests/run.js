// Test suite: fake TMDB/Internet Archive + the real server + headless Chrome.
// Usage: npm test   (needs Google Chrome; set CHROME_PATH if it is not found)
const { spawn } = require('child_process');
const path = require('path');
const { createMockApi } = require('./helpers/mock-api');
const { launchBrowser, freePort } = require('./helpers/browser');
const serverChecks = require('./server-checks');
const scenarios = require('./scenarios');

const ROOT = path.join(__dirname, '..');
const SERVER_START_TIMEOUT_MS = 15000;
const STEP_TIMEOUT_MS = 90000;

// Helpers available inside every in-page test function.
const PAGE_HELPERS = `
  const $ = (id) => document.getElementById(id);
  const grid = () => [...document.querySelectorAll('#grid > .card')];
  const titles = () => grid().map((card) => card.querySelector('.card-title').textContent);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (condition, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      try { if (condition()) return true; } catch { /* element not there yet */ }
      await sleep(50);
    }
    return false;
  };
  const search = (query) => { $('searchInput').value = query; $('searchForm').requestSubmit(); };
  const tab = (category) => document.querySelector('[data-category="' + category + '"]').click();
  const select = (id, value) => { $(id).value = value; $(id).dispatchEvent(new Event('change')); };
`;

async function runInPage(page, fn, args) {
  const expression = `(async () => {
    ${PAGE_HELPERS}
    const results = [];
    const check = (name, ok, extra) => results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' [' + extra + ']' : ''));
    try {
      await (${fn.toString()})({ $, grid, titles, sleep, waitFor, search, tab, select, check }, ${JSON.stringify(args || {})});
    } catch (error) {
      results.push('FAIL erro no cenário [' + ((error && error.stack) || error) + ']');
    }
    return results;
  })()`;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve([`FAIL cenário não terminou em ${STEP_TIMEOUT_MS / 1000}s`]), STEP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([page.evaluate(expression), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function startServer(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => reject(new Error(`O servidor não iniciou:\n${output}`)), SERVER_START_TIMEOUT_MS);
    const onData = (chunk) => {
      output += chunk;
      if (output.includes('Servidor rodando')) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => reject(new Error(`O servidor encerrou (código ${code}):\n${output}`)));
  });
}

async function main() {
  const started = Date.now();
  const mock = createMockApi();
  const mockPort = await mock.listen();
  const appPort = await freePort();
  const server = await startServer({
    TMDB_API_KEY: mock.key,
    TMDB_API_BASE: `http://127.0.0.1:${mockPort}`,
    ARCHIVE_API_BASE: `http://127.0.0.1:${mockPort}/archive`,
    PORT: String(appPort),
    CACHE_TTL_MS: '1'
  });
  const base = `http://127.0.0.1:${appPort}`;
  const lines = [];
  const browser = await launchBrowser();

  try {
    for (const check of serverChecks) {
      for (const result of await check.run({ base, mock })) lines.push(`${result.slice(0, 5)}[${check.name}] ${result.slice(5)}`);
    }

    for (const scenario of scenarios) {
      for (const step of scenario.steps) {
        if (step.before) await step.before({ mock });
        await browser.page.emulate(step.device || { width: 1300, height: 900 });
        if (step.fresh) await browser.page.clearStorage(base);
        await browser.page.goto(`${base}${step.path || '/'}`);
        const results = await runInPage(browser.page, step.run, step.args);
        for (const result of results) lines.push(`${result.slice(0, 5)}[${scenario.name}] ${result.slice(5)}`);
      }
    }
  } finally {
    server.kill();
    await mock.close();
    await browser.close();
  }

  const failed = lines.filter((line) => line.startsWith('FAIL'));
  if (process.env.VERBOSE || failed.length) console.log(lines.join('\n'));
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`\n${lines.length - failed.length} passaram, ${failed.length} falharam (${seconds}s).`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
