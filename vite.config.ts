import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  test: {
    globals: true,
    environment: 'jsdom',
  },
  build: {
    emptyOutDir: true,
    target: 'chrome118',
  },
})
