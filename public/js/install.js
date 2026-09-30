import { els, showToast } from './dom.js';

let installPrompt = null;

// Steps shown when the browser does not offer its own install prompt (iPhone, in-app browsers, Firefox...).
function manualSteps() {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isInApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (isInApp) {
    return {
      intro: 'Você abriu o site dentro de outro aplicativo, e ele não permite instalar.',
      steps: [
        'Toque no menu (⋮ ou ···) no canto da tela.',
        isIos ? 'Escolha “Abrir no Safari”.' : 'Escolha “Abrir no navegador” ou “Abrir no Chrome”.',
        'Lá, toque em “Instalar app” de novo.'
      ]
    };
  }
  if (isIos) {
    return {
      intro: 'No iPhone e no iPad a instalação é feita pelo menu de compartilhar.',
      steps: [
        'Toque no botão Compartilhar (o quadrado com uma seta para cima).',
        'Role a lista e toque em “Adicionar à Tela de Início”.',
        'Toque em “Adicionar”. O CineGuia vai aparecer junto com os seus apps.'
      ]
    };
  }
  if (isAndroid) {
    return {
      intro: 'Instale pelo menu do navegador:',
      steps: [
        'Toque no menu (⋮) no canto de cima da tela.',
        'Toque em “Instalar app” ou “Adicionar à tela inicial”.',
        'Confirme. O CineGuia vai aparecer junto com os seus apps.'
      ]
    };
  }
  return {
    intro: 'No computador, use o Chrome ou o Edge:',
    steps: [
      'Clique no ícone de instalar no fim da barra de endereço (um monitor com uma seta).',
      'Ou abra o menu (⋮ ou ···) e procure “Instalar CineGuia” ou “Instalar página como app”.',
      'No Firefox e no Safari do computador não dá para instalar; o site funciona normalmente pelo navegador.'
    ]
  };
}

function showManualSteps() {
  const { intro, steps } = manualSteps();
  els.installHelpIntro.textContent = intro;
  els.installHelpSteps.replaceChildren(...steps.map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  els.installHelp.showModal();
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

// Registers the service worker and shows "Instalar app" unless the site is already running as an app.
// When the browser offers its own prompt it is used; otherwise the button explains how to install by hand.
export function setupInstall() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  if (!isInstalled()) els.installButton.classList.remove('hidden');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    els.installButton.classList.add('hidden');
    showToast('CineGuia instalado! Ele agora aparece junto com os seus apps.');
  });

  els.installButton.addEventListener('click', async () => {
    if (!installPrompt) {
      showManualSteps();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
  });
}
