import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the database
vi.mock('../db', () => ({
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
      expect(screen.getByText(/project management tool/i)).toBeInTheDocument();
    });
  });

  it('should render calendar view by default', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/new task/i)).toBeInTheDocument();
      expect(screen.getByText(/total tasks/i)).toBeInTheDocument();
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
    const { taskService } = await import('../db');
    
    taskService.getAll.mockResolvedValue([
      { id: 1, title: 'Task 1', status: 'todo' },
      { id: 2, title: 'Task 2', status: 'completed' },
      { id: 3, title: 'Task 3', status: 'in-progress' }
    ]);

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/total tasks:/i)).toBeInTheDocument();
      // Find the stats section and check within it
      const stats = screen.getByText(/total tasks:/i).closest('.task-stats');
      expect(stats).toBeInTheDocument();
    });
  });
});
