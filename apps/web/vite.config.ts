import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // Reachable from other devices on the LAN; Vite allows IP-literal hosts but
    // would reject the mDNS name without this allowlist.
    host: true,
    allowedHosts: ['macmini.local']
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite']
  }
});
