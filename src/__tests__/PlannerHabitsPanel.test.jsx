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

  it('opens time popover when clicking Mark Done and does not create immediately', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));

    expect(screen.getByText(/time spent \(minutes\)/i)).toBeInTheDocument();
    expect(habitEntryService.create).not.toHaveBeenCalled();
    expect(onDataChange).not.toHaveBeenCalled();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('creates today entry with selected time from popover', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, timeSpentSeconds: 900 });
      expect(onDataChange).toHaveBeenCalled();
    });
  });

  it('closes popover when Escape is pressed', async () => {
    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Meditate', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
    expect(screen.getByText(/time spent \(minutes\)/i)).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText(/time spent \(minutes\)/i)).not.toBeInTheDocument();
    });
  });

  it('prevents duplicate save clicks from creating duplicate entries', async () => {
    const today = todayStr();
    let resolveCreate;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);
    habitEntryService.create.mockReturnValue(createPromise);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(habitEntryService.create).toHaveBeenCalledTimes(1);
    expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, timeSpentSeconds: 600 });

    resolveCreate({ id: 1 });

    await waitFor(() => {
      expect(onDataChange).toHaveBeenCalled();
    });
  });

  it('does not call onDataChange if save resolves after unmount', async () => {
    let resolveCreate;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);
    habitEntryService.create.mockReturnValue(createPromise);

    const { unmount } = render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(habitEntryService.create).toHaveBeenCalledTimes(1);

    unmount();
    resolveCreate({ id: 1 });

    await Promise.resolve();
    await Promise.resolve();

    expect(onDataChange).not.toHaveBeenCalled();
  });

  it('ignores stale in-flight loadData responses that resolve out of order', async () => {
    const today = todayStr();
    let resolveFirstEntries;
    const firstEntriesPromise = new Promise((resolve) => {
      resolveFirstEntries = resolve;
    });

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit
      .mockImplementationOnce(() => firstEntriesPromise)
      .mockResolvedValue([{ id: 77, date: today, timeSpentSeconds: 300 }]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    resolveFirstEntries([]);

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
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
