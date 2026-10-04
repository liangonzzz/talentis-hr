import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';

// Agrega la PWA (manifest + service worker) a todas las páginas HTML al compilar.
// Se salta los fragmentos (sidebar y topnav), que se cargan dentro del shell con fetch().
function pwaPlugin(): Plugin {
  return {
    name: 'talentis-pwa',
    apply: 'build', // solo en producción, no afecta el modo desarrollo
    transformIndexHtml(_html, ctx) {
      const ruta = (ctx.filename || '').replace(/\\/g, '/');
      if (ruta.includes('/ui/shared/')) return [];

      return [
        { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.json' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#414ba8' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/icons/icon-192.png' }, injectTo: 'head' },
        {
          tag: 'script',
          children:
            "if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/ServiceWorker.js'); }); }",
          injectTo: 'body',
        },
      ];
    },
  };
}

const ui = 'src/infrastructure/ui';

export default defineConfig({
  root: '.',
  plugins: [pwaPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),

        // Service Worker (se compila a /ServiceWorker.js en la raíz, sin hash)
        ServiceWorker: resolve(__dirname, 'src/ServiceWorker.ts'),

        // Auth
        login: resolve(__dirname, `${ui}/auth/login-principal/login.html`),
        forgotPassword: resolve(__dirname, `${ui}/auth/forgot-password/forgot-password.html`),
        resetPassword: resolve(__dirname, `${ui}/auth/reset-password/reset-password.html`),

        // Core
        shell: resolve(__dirname, `${ui}/core/shell.html`),

        // Módulos
        hojaVida: resolve(__dirname, `${ui}/modules/admin/hoja-vida/hoja-vida.html`),
        tablero: resolve(__dirname, `${ui}/modules/admin/mi-tablero/tablero.html`),
        tareas: resolve(__dirname, `${ui}/modules/admin/mis-tareas/tareas.html`),
        candidato: resolve(__dirname, `${ui}/modules/candidato/candidato.html`),
        hojaVidaReadonly: resolve(__dirname, `${ui}/modules/candidato/hoja-vida-readonly.html`),
        funcionario: resolve(__dirname, `${ui}/modules/funcionario/funcionario.html`),

        // Fragmentos que el shell carga con fetch()
        sidebar: resolve(__dirname, `${ui}/shared/sidebar/sidebar.html`),
        topnav: resolve(__dirname, `${ui}/shared/topnav/topnav.html`),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'ServiceWorker' ? '[name].js' : 'assets/[name]-[hash].js',
      },
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});