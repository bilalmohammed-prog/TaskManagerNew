import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.js'],
    environment: 'jsdom', // This provides DOM APIs like document
  },
});

