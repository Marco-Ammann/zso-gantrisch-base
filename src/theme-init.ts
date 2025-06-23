// src/theme-init.ts
// Runs before Angular bootstraps to ensure the correct color scheme is applied ASAP.
(() => {
  const docEl = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = (dark: boolean) => {
    dark ? docEl.classList.add('dark') : docEl.classList.remove('dark');
  };

  // initial
  apply(mq.matches);
  // listen for changes
  mq.addEventListener('change', e => apply(e.matches));
})();
