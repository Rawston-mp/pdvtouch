// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '', '')
  const API_ORIGIN = env.VITE_API_ORIGIN || '' // ex.: https://api.suaempresa.com
  const API_PREFIX = env.VITE_API_PREFIX || '/api/' // ex.: /v1/

  // Gera um padrão de cache para API de acordo com env
  const apiPattern: RegExp | ((args: { url: URL }) => boolean) = API_ORIGIN
    ? new RegExp('^' + API_ORIGIN.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + API_PREFIX.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'))
    : ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname.startsWith(API_PREFIX)

  return {
  plugins: [
    react(),
    VitePWA({
      devOptions: {
        enabled: true,
      },
      registerType: 'autoUpdate',
  includeAssets: ['vite.svg', 'favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png', 'apple-touch-icon.png', 'offline.html'],
      manifest: {
        name: 'PDVTouch',
        short_name: 'PDVTouch',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        icons: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-shell' }
          },
           {
            urlPattern: apiPattern,
             handler: 'NetworkFirst',
             options: { cacheName: 'api', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 } }
           },
           {
             urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp)$/i,
             handler: 'StaleWhileRevalidate',
             options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 } }
           },
          {
            urlPattern: ({ url }) => url.protocol === 'http:' || url.protocol === 'https:',
            handler: 'NetworkFirst',
            options: { cacheName: 'runtime' }
          }
        ],
        navigateFallback: '/offline.html'
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify((globalThis as unknown as { process?: { env?: Record<string,string> } })?.process?.env?.npm_package_version || '0.0.0'),
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify((globalThis as unknown as { process?: { env?: Record<string,string> } })?.process?.env?.GIT_COMMIT || (globalThis as unknown as { process?: { env?: Record<string,string> } })?.process?.env?.npm_package_gitHead || ''),
    'import.meta.env.VITE_GIT_TAG': JSON.stringify((globalThis as unknown as { process?: { env?: Record<string,string> } })?.process?.env?.GIT_TAG || ''),
  },
  optimizeDeps: {
    include: ['zod']
  }
}
})