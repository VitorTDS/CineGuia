import { els } from './dom.js';

// The free Render plan puts the server to sleep after a while without visits; waking it takes up to a minute.
// A request that is still pending after this long shows a notice explaining the wait.
const SLOW_REQUEST_MS = 4000;
let slowRequests = 0;

// As a popover the notice sits above the details dialog too; older browsers just get the fixed banner.
function showWakeNotice(visible) {
  const notice = els.wakeNotice;
  notice.classList.toggle('hidden', !visible);
  if (typeof notice.showPopover !== 'function') return;
  try {
    // Hiding first puts it back on top of a dialog opened after it.
    if (notice.matches(':popover-open')) notice.hidePopover();
    if (visible) notice.showPopover();
  } catch {
    // Popover not supported the usual way; the class alone still shows it.
  }
}

export async function fetchJson(url) {
  let slow = false;
  const timer = window.setTimeout(() => {
    slow = true;
    slowRequests += 1;
    showWakeNotice(true);
  }, SLOW_REQUEST_MS);

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  } finally {
    window.clearTimeout(timer);
    if (slow) {
      slowRequests -= 1;
      if (!slowRequests) showWakeNotice(false);
    }
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erro ${response.status}`);
  return body;
}
