import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Notification API
globalThis.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};

// Restore the jsdom `localStorage` global on Node >= 22 (this box: Node 26).
// Node >= 22 defines its own `globalThis.localStorage` accessor (undefined
// unless `--localstorage-file` is passed), and vitest's jsdom environment only
// installs jsdom's globals where the key is absent — so localStorage never
// lands and every test that touches it throws. Rebuild a jsdom-shaped surface
// when it is missing; the guard keeps this inert where a real one exists.
if (typeof globalThis.localStorage === 'undefined') {
  const memory = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, enumerable: false,
    value: {
      getItem: (key) => (memory.has(String(key)) ? memory.get(String(key)) : null),
      setItem: (key, value) => { memory.set(String(key), String(value)); },
      removeItem: (key) => { memory.delete(String(key)); },
      clear: () => { memory.clear(); },
      key: (index) => Array.from(memory.keys())[index] ?? null,
      get length() { return memory.size; },
    },
  });
}
