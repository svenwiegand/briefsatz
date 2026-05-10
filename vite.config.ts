import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Production deployment lives at briefsatz.de/app/. Dev/test mode keeps the
  // app at the root so localhost:5173/ and Playwright's page.goto('/') work
  // without ceremony.
  base: mode === 'production' ? '/app/' : '/',
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
  },
}))
