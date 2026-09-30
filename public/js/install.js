import { els, showToast } from './dom.js';

let installPrompt = null;

// Registers the service worker and shows "Instalar app" when the browser offers installation.
// iPhone does not fire beforeinstallprompt; there it is installed from Safari's share menu ("Adicionar à Tela de Início").
export function setupInstall() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    els.installButton.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    els.installButton.classList.add('hidden');
    showToast('CineGuia instalado! Ele agora aparece junto com os seus apps.');
  });

  els.installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    els.installButton.classList.add('hidden');
  });
}
