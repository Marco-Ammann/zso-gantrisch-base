// src/theme-init.ts
// Runs before Angular bootstraps to ensure the correct color scheme is applied ASAP.
export const initTheme = () => {
  const docEl = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = (dark: boolean) => {
    dark ? docEl.classList.add('dark') : docEl.classList.remove('dark');
  };

  // Initial apply
  apply(mq.matches);
  
  // Listen for changes
  const changeHandler = (e: MediaQueryListEvent) => apply(e.matches);
  mq.addEventListener('change', changeHandler);

  // Return cleanup function
  return () => {
    mq.removeEventListener('change', changeHandler);
  };
};
