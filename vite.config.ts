import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(() => {
  return {
    // GitHub Pages serves this project at /gms/, so assets must be prefixed.
    // For full-stack hosting (Render) it stays at the domain root.
    base: process.env.GITHUB_PAGES === 'true' ? '/gms/' : '/',
    plugins: [react(), tailwindcss(), viteSingleFile()],
    // NOTE: GEMINI_API_KEY is intentionally NOT exposed to the client bundle.
    // The Gemini key is used only server-side (server.ts); the frontend calls
    // the /api/* routes. Baking the key into the bundle would leak it publicly.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
