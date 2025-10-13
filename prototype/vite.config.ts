import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
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
})