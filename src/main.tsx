import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import './styles/app.css';
import App, { localStorageGet, THEME_KEY } from './App';

// Thema meteen zetten, zodat het venster niet eerst in de verkeerde kleur opflitst.
const saved = localStorageGet(THEME_KEY);
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
document.documentElement.dataset.theme = saved === 'licht' || (saved === 'systeem' && prefersLight) ? 'licht' : 'donker';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
