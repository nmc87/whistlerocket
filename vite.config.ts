import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri verwacht een vaste poort en mag de terminal niet leegmaken.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    // WebView2 op Windows is Chromium; de webversie draait in moderne browsers.
    target: 'es2022',
    sourcemap: false,
  },
});
