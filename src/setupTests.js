import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};
