import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // Must match `devUrl` in src-tauri/tauri.conf.json. strictPort makes a
    // clash fail loudly: on the default port Vite silently moved to the next
    // one while Tauri kept loading the old address — which happened to be the
    // web app's dev server, so the desktop window rendered the web app.
    port: 1420,
    strictPort: true,
    fs: {
      // The bundled woff2 files live in packages/ui, outside this app's root.
      allow: ['../..']
    }
  }
});
