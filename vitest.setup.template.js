import { vi } from 'vitest';

// ============================================
// UNIVERSAL: Mock localStorage (reusable)
// ============================================
// This works for any project that uses localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0
};

global.localStorage = localStorageMock;

// ============================================
// PROJECT-SPECIFIC: Create DOM elements
// ============================================
// CUSTOMIZE THIS: Add only the elements your project needs
// Check your code for document.querySelector() calls and add those elements here
if (typeof document !== 'undefined') {
  document.body.innerHTML = `
    <!-- Add your project's DOM elements here -->
    <!-- Example: <button class="my-button"></button> -->
  `;
}

// ============================================
// OPTIONAL: Mock other browser APIs if needed
// ============================================
// Uncomment and customize as needed:

// Mock window.matchMedia (for responsive design tests)
// global.matchMedia = vi.fn((query) => ({
//   matches: false,
//   media: query,
//   onchange: null,
//   addListener: vi.fn(),
//   removeListener: vi.fn(),
//   addEventListener: vi.fn(),
//   removeEventListener: vi.fn(),
//   dispatchEvent: vi.fn(),
// }));

// Mock IntersectionObserver (for scroll/lazy-loading tests)
// global.IntersectionObserver = vi.fn(() => ({
//   observe: vi.fn(),
//   disconnect: vi.fn(),
//   unobserve: vi.fn(),
// }));

// Mock fetch (if you want to control API responses in tests)
// global.fetch = vi.fn();

