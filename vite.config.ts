import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' makes the production build openable directly from the file system
// (double-click dist/index.html) — important for a manager-facing demo artifact.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5180, open: false, allowedHosts: true },
  preview: { port: 4173, allowedHosts: true },
  build: { outDir: 'dist', emptyOutDir: true },
})
