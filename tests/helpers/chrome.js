// Finds a Chrome/Chromium binary on Windows, macOS or Linux (CI). CHROME_PATH wins when set.
const { execFileSync } = require('child_process');
const fs = require('fs');

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const found = CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (found) return found;
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [name], { encoding: 'utf8' }).trim();
    } catch {
      // Try the next name.
    }
  }
  throw new Error('Chrome não encontrado. Instale o Google Chrome ou defina CHROME_PATH.');
}

module.exports = { findChrome };
