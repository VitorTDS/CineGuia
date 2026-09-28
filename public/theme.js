// Runs before the stylesheet so a saved theme applies without a flash of the wrong colors.
(function () {
  try {
    const saved = localStorage.getItem('cineguia-theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {
    // Storage blocked: follow the system preference.
  }
}());
