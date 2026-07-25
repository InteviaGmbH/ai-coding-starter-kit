import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // `tests/` holds Playwright E2E specs (see playwright.config.ts) — exclude
    // it here so Vitest doesn't try to execute them as unit tests.
    exclude: ['**/node_modules/**', '**/tests/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
