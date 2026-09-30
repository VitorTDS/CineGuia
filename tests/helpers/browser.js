// Minimal Chrome DevTools Protocol client: opens headless Chrome and drives a single page.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { findChrome } = require('./chrome');

const PAGE_LOAD_TIMEOUT_MS = 20000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function launchBrowser() {
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cineguia-test-'));
  const args = ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'];
  // CI containers usually cannot use Chrome's sandbox.
  if (process.env.CI) args.unshift('--no-sandbox');
  const chrome = spawn(findChrome(), args, { stdio: 'ignore' });

  let target;
  for (let attempt = 0; attempt < 100 && !target; attempt++) {
    try {
      target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    } catch {
      await sleep(100);
    }
  }
  if (!target) throw new Error('O Chrome não respondeu.');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method) for (const listener of listeners) listener(message);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (message) => (message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');

  const page = {
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) {
        const detail = result.exceptionDetails.exception ? result.exceptionDetails.exception.description : result.exceptionDetails.text;
        throw new Error(detail);
      }
      return result.result.value;
    },
    async goto(url) {
      let listener;
      const loaded = new Promise((resolve, reject) => {
        // A page that never finishes loading must fail the step, not hang the whole suite.
        const timer = setTimeout(() => reject(new Error(`A página não carregou em ${PAGE_LOAD_TIMEOUT_MS / 1000}s: ${url}`)), PAGE_LOAD_TIMEOUT_MS);
        listener = (message) => {
          if (message.method === 'Page.loadEventFired') {
            clearTimeout(timer);
            resolve();
          }
        };
        listeners.add(listener);
      });
      try {
        const { loaderId } = await send('Page.navigate', { url });
        // Only the #hash changed: Chrome stays on the same document and fires no load event, so reload it.
        if (!loaderId) await send('Page.reload');
        await loaded;
      } finally {
        listeners.delete(listener);
      }
    },
    async emulate({ width, height, dpr = 1, mobile = false }) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
      await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    },
    async clearStorage(origin) {
      await send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
    },
    async screenshot(file) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
    }
  };

  async function close() {
    socket.close();
    const exited = chrome.exitCode !== null ? Promise.resolve() : new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([exited, sleep(3000)]);
    try {
      // On Windows Chrome's helper processes can hold the profile a little longer; retry, then give up quietly.
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      // A leftover temp folder is harmless.
    }
  }

  return { page, close };
}

module.exports = { launchBrowser, freePort };
