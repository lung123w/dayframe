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
  teamMemberService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  subtaskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getByTaskId: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve(1)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    deleteByTaskId: vi.fn(() => Promise.resolve()),
    toggleCompleted: vi.fn(() => Promise.resolve())
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
      expect(screen.getByText(/projectflow/i)).toBeInTheDocument();
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

  it('should switch to team view when team button is clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      const teamButton = screen.getByRole('button', { name: /team/i });
      teamButton.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /team members/i })).toBeInTheDocument();
    });
  });

  it('should display task statistics', async () => {
    const { taskService } = await import('../api');
    
    taskService.getAll.mockResolvedValue([
      { id: 1, title: 'Task 1', status: 'todo' },
      { id: 2, title: 'Task 2', status: 'completed' },
      { id: 3, title: 'Task 3', status: 'in-progress' }
    ]);

    render(<App />);
    
    await waitFor(() => {
      // Stat cards now show labels "Total", "Done", "Active"
      expect(screen.getByText(/^total$/i)).toBeInTheDocument();
      expect(screen.getByText(/^done$/i)).toBeInTheDocument();
      expect(screen.getByText(/^active$/i)).toBeInTheDocument();
    });
  });
});
