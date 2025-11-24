import { defineConfig } from 'vitest/config';

// ============================================
// UNIVERSAL: Basic Vitest config (reusable)
// ============================================
export default defineConfig({
  test: {
    // Path to your setup file
    setupFiles: ['./vitest.setup.js'],
    
    // Use jsdom for DOM APIs (document, window, etc.)
    // Use 'node' if you don't need DOM
    environment: 'jsdom',
    
    // Optional: Add more configuration as needed
    // globals: true,  // Auto-import test, expect, etc.
    // coverage: {      // Code coverage settings
    //   provider: 'v8',
    //   reporter: ['text', 'html'],
    // },
  },
});

