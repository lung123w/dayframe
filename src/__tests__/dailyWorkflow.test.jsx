import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock only the api module — not DailyWorkflow itself
vi.mock('../api', () => ({
  taskService: { create: vi.fn() },
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

import { workflowStepService, workflowCompletionService } from '../api';
import DailyWorkflow from '../components/DailyWorkflow';

const today = '2026-04-28';

describe('DailyWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workflowStepService.getAll.mockResolvedValue([]);
    workflowCompletionService.getForDate.mockResolvedValue([]);
    workflowStepService.create.mockResolvedValue({ id: 1, text: 'Check email', sortOrder: 0 });
    workflowStepService.delete.mockResolvedValue(null);
    workflowCompletionService.create.mockResolvedValue({ id: 1, stepId: 1, date: today });
    workflowCompletionService.deleteByStepAndDate.mockResolvedValue(null);
  });

  it('renders the Daily Workflow section header', async () => {
    render(<DailyWorkflow today={today} />);
    await waitFor(() => {
      expect(screen.getByText('Daily Workflow')).toBeTruthy();
    });
  });

  it('adds a step on Enter', async () => {
    workflowStepService.getAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, text: 'Check email', sortOrder: 0 }]);

    render(<DailyWorkflow today={today} />);
    await waitFor(() => screen.getByPlaceholderText(/add a step/i));

    const input = screen.getByPlaceholderText(/add a step/i);
    fireEvent.change(input, { target: { value: 'Check email' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(workflowStepService.create).toHaveBeenCalledWith({ text: 'Check email' });
    });
  });

  it('does not add a step when input is empty', async () => {
    render(<DailyWorkflow today={today} />);
    await waitFor(() => screen.getByPlaceholderText(/add a step/i));

    fireEvent.keyDown(screen.getByPlaceholderText(/add a step/i), { key: 'Enter' });
    expect(workflowStepService.create).not.toHaveBeenCalled();
  });

  it('completions only shown for today — prior dates appear unchecked', async () => {
    const step = { id: 5, text: 'Morning review', sortOrder: 0 };
    workflowStepService.getAll.mockResolvedValue([step]);
    // getForDate called with today returns nothing (yesterday's data not returned)
    workflowCompletionService.getForDate.mockResolvedValue([]);

    render(<DailyWorkflow today={today} />);
    await waitFor(() => screen.getByText('Morning review'));

    const checkbox = screen.getByRole('checkbox', { name: /morning review/i });
    expect(checkbox.checked).toBe(false);
  });

  it('checks a step and calls completion service', async () => {
    const step = { id: 3, text: 'Standup', sortOrder: 0 };
    workflowStepService.getAll.mockResolvedValue([step]);
    workflowCompletionService.getForDate.mockResolvedValue([]);

    render(<DailyWorkflow today={today} />);
    await waitFor(() => screen.getByText('Standup'));

    const checkbox = screen.getByRole('checkbox', { name: /standup/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(workflowCompletionService.create).toHaveBeenCalledWith({ stepId: 3, date: today });
    });
  });

  it('unchecks a step and removes completion', async () => {
    const step = { id: 3, text: 'Standup', sortOrder: 0 };
    workflowStepService.getAll.mockResolvedValue([step]);
    workflowCompletionService.getForDate.mockResolvedValue([{ id: 10, stepId: 3, date: today }]);

    render(<DailyWorkflow today={today} />);
    await waitFor(() => screen.getByText('Standup'));

    const checkbox = screen.getByRole('checkbox', { name: /standup/i });
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(workflowCompletionService.deleteByStepAndDate).toHaveBeenCalledWith(3, today);
    });
  });
});
