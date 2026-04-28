import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the api module
vi.mock('../api', () => ({
  taskService: {
    create: vi.fn(),
  },
  workflowStepService: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  workflowCompletionService: {
    getForDate: vi.fn(),
    create: vi.fn(),
    deleteByStepAndDate: vi.fn(),
  },
}));

// Mock child components that need complex setup
vi.mock('../components/DailyTimeline', () => ({ default: () => <div data-testid="daily-timeline" /> }));
vi.mock('../components/PlannerHabitsPanel', () => ({ default: () => <div data-testid="habits-panel" /> }));
vi.mock('../components/DailyWorkflow', () => ({ default: () => <div data-testid="daily-workflow" /> }));

import { taskService } from '../api';
import TodayView from '../components/TodayView';

// Minimal props for TodayView
const baseProps = {
  tasks: [],
  projects: [],
  todayOrder: [],
  onTodayOrderChange: vi.fn(),
  onTaskClick: vi.fn(),
  onNewTask: vi.fn(),
  onStatusUpdate: vi.fn(),
  onDataChange: vi.fn(),
};

describe('TodayView quick capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskService.create.mockResolvedValue({ id: 99, title: 'Test task' });
  });

  it('renders quick capture input', () => {
    render(<TodayView {...baseProps} />);
    expect(screen.getByPlaceholderText(/capture a task/i)).toBeTruthy();
  });

  it('creates a task on Enter and clears the input', async () => {
    render(<TodayView {...baseProps} />);
    const input = screen.getByPlaceholderText(/capture a task/i);

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Buy milk', status: 'pending' })
      );
    });
    await waitFor(() => {
      expect(input.value).toBe('');
    });
    expect(baseProps.onDataChange).toHaveBeenCalled();
  });

  it('does not create a task when input is empty on Enter', async () => {
    render(<TodayView {...baseProps} />);
    const input = screen.getByPlaceholderText(/capture a task/i);

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).not.toHaveBeenCalled();
    });
  });

  it('clears input on Escape', () => {
    render(<TodayView {...baseProps} />);
    const input = screen.getByPlaceholderText(/capture a task/i);

    fireEvent.change(input, { target: { value: 'Some text' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('');
  });
});
