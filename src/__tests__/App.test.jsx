import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the database
vi.mock('../api', () => ({
  taskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  projectService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'General', color: '#3788d8' }))
  },
  subtaskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getByTaskId: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve(1)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    deleteByTaskId: vi.fn(() => Promise.resolve()),
    toggleCompleted: vi.fn(() => Promise.resolve())
  },
  yearlyGoalService: {
    getByYear: vi.fn(() => Promise.resolve({ goals: [] })),
    save: vi.fn(() => Promise.resolve())
  },
  weeklyObjectiveService: {
    getByWeek: vi.fn(() => Promise.resolve({ objectives: [] })),
    save: vi.fn(() => Promise.resolve())
  },
  dailyNoteService: {
    getByDate: vi.fn(() => Promise.resolve({ highlights: '', wins: '', improvements: '', tomorrowFocus: '' })),
    save: vi.fn(() => Promise.resolve())
  }
}));

// Mock notifications
vi.mock('../utils/notifications', () => ({
  startNotificationService: vi.fn(() => () => {}),
  requestNotificationPermission: vi.fn()
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the app with header', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/dayframe/i)).toBeInTheDocument();
    });
  });

  it('should render calendar view by default', async () => {
    render(<App />);
    
    await waitFor(() => {
      // Both the header button and DayPanel have "New Task" — expect at least one
      expect(screen.getAllByText(/new task/i).length).toBeGreaterThan(0);
      // Stat cards now show "Total", "Done", "Active" labels
      expect(screen.getByText(/^total$/i)).toBeInTheDocument();
    });
  });
});
