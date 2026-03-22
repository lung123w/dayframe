import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api', () => ({
  habitService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteByDate: vi.fn(() => Promise.resolve()),
  },
}));

import { habitService, habitEntryService } from '../api';
import PlannerHabitsPanel from '../components/PlannerHabitsPanel';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('PlannerHabitsPanel', () => {
  const onDataChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    habitService.getAll.mockResolvedValue([]);
  });

  it('renders empty state when no habits exist', async () => {
    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByText(/no habits for today/i)).toBeInTheDocument();
    });
  });

  it('renders active habits and done button state', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', isArchived: false },
      { id: 2, name: 'Old Habit', isArchived: true },
    ]);
    habitEntryService.getByHabit.mockImplementation((id) => {
      if (id === 1) return Promise.resolve([{ id: 10, date: today }]);
      return Promise.resolve([]);
    });

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.queryByText('Old Habit')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });
  });

  it('creates today entry when marking a habit done', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, timeSpentSeconds: 0 });
      expect(onDataChange).toHaveBeenCalled();
    });
  });

  it('deletes today entry when toggling done off', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Exercise', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([{ id: 33, date: today }]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    await waitFor(() => {
      expect(habitEntryService.deleteByDate).toHaveBeenCalledWith(1, today);
      expect(onDataChange).toHaveBeenCalled();
    });
  });
});
