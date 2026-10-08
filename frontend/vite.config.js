import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Catalyst serves the web client under /app/, so use relative asset paths
  base: './',
  server: {
    // During local dev, send /server/... calls to `catalyst serve` (port 3000).
    // So the browser sees the same origin → no CORS problem.
    proxy: {
      '/server': 'http://localhost:3000'
    }
  },
  build: {
    // Build output goes into the Catalyst web client folder
    outDir: '../client',
    emptyOutDir: true
  }
})
