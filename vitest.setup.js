import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0
};

global.localStorage = localStorageMock;

// Create minimal DOM structure for TaskManager
if (typeof document !== 'undefined') {
  document.body.innerHTML = `
    <div class="reason_popup"></div>
    <input class="task" />
    <input class="time" />
    <details class="cobox"></details>
    <div class="popup"></div>
    <button class="endDay"></button>
    <div class="overlay"></div>
    <p class="taskStatus"></p>
    <button class="cancel"></button>
    <button class="confirm"></button>
    <button class="record"></button>
    <div class="record_popup">
      <p class="record_title"></p>
      <button class="record_cancel"></button>
      <div class="record_scroll">
        <p class="record_content"></p>
      </div>
    </div>
  `;
}

