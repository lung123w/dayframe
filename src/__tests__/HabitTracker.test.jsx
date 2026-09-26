import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitTracker from '../components/HabitTracker';

// Radix measures popover content with a ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };

vi.mock('../api', () => ({
  habitService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn((data) => Promise.resolve({ id: 1, ...data })),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    deleteByDate: vi.fn(() => Promise.resolve()),
    getAll: vi.fn(() => Promise.resolve([])),
  },
}));

import { habitService, habitEntryService } from '../api';

// The component's date is the Hong Kong (local) date, never the UTC one.
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('HabitTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitService.getAll.mockResolvedValue([]);
    habitEntryService.getByHabit.mockResolvedValue([]);
  });

  it('renders empty state when no habits exist', async () => {
    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText(/no habits yet/i)).toBeInTheDocument();
    });
  });

  it('renders habit list with streak info', async () => {
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Meditate', color: '#10B981', frequency: { type: 'daily' }, isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText('Meditate')).toBeInTheDocument();
    });
  });

  it('shows New Habit button', async () => {
    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText(/new habit/i)).toBeInTheDocument();
    });
  });

  it('opens modal when New Habit is clicked', async () => {
    render(<HabitTracker />);
    await waitFor(() => {
      fireEvent.click(screen.getByText(/new habit/i));
    });
    expect(screen.getByText('New Habit', { selector: 'h2' })).toBeInTheDocument();
  });

  it('writes the day with zero minutes on a single activation (no popover, one POST)', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', color: '#3B82F6', frequency: { type: 'daily' }, isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Read done' }));

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, timeSpentSeconds: 0 });
    });
    expect(habitEntryService.create).toHaveBeenCalledTimes(1);
    // No confirmation popover stands between the click and the write.
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();
    expect(screen.queryByText(/time spent \(minutes\)/i)).not.toBeInTheDocument();
  });

  it('unmarks the day when an already-done row is activated', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', color: '#3B82F6', frequency: { type: 'daily' }, isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([{ id: 55, date: today, timeSpentSeconds: 0 }]);

    render(<HabitTracker />);
    fireEvent.click(await screen.findByRole('button', { name: 'Unmark Read for today' }));

    await waitFor(() => {
      expect(habitEntryService.deleteByDate).toHaveBeenCalledWith(1, today);
    });
    expect(habitEntryService.create).not.toHaveBeenCalled();
  });

  it('keeps each row\u2019s value field independent (F23)', async () => {
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', color: '#3B82F6', frequency: { type: 'daily' }, isArchived: false },
      { id: 2, name: 'Meditate', color: '#10B981', frequency: { type: 'daily' }, isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);

    const readInput = await screen.findByLabelText('Read minutes today');
    const meditateInput = screen.getByLabelText('Meditate minutes today');

    fireEvent.change(readInput, { target: { value: '30' } });

    expect(readInput.value).toBe('30');
    expect(meditateInput.value).toBe('');
  });

  it('logs the row value against that row\u2019s own habit only', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', color: '#3B82F6', frequency: { type: 'daily' }, isArchived: false },
      { id: 2, name: 'Meditate', color: '#10B981', frequency: { type: 'daily' }, isArchived: false },
    ]);
    habitEntryService.getByHabit.mockImplementation((id) => {
      if (id === 1) return Promise.resolve([{ id: 10, date: today, timeSpentSeconds: 0 }]);
      return Promise.resolve([{ id: 20, date: today, timeSpentSeconds: 0 }]);
    });

    render(<HabitTracker />);

    fireEvent.change(await screen.findByLabelText('Read minutes today'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add time to Read' }));

    await waitFor(() => {
      expect(habitEntryService.update).toHaveBeenCalledWith(10, { timeSpentSeconds: 1800 });
    });
    // One write, on the right row, and nothing at all for the other habit.
    expect(habitEntryService.update).toHaveBeenCalledTimes(1);
    expect(habitEntryService.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Meditate minutes today').value).toBe('');
  });

  it('logs a count habit through the same one-click path (the value stays inert per ADR-011)', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Push-ups', color: '#3B82F6', frequency: { type: 'daily' }, trackType: 'count', isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Push-ups done' }));

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, count: 0 });
    });
    expect(habitEntryService.create).toHaveBeenCalledTimes(1);
  });

  it('renders total as reps for a count habit', async () => {
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Push-ups', color: '#3B82F6', frequency: { type: 'daily' }, trackType: 'count', isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([
      { id: 10, date: '2026-01-01', count: 20 },
      { id: 11, date: '2026-01-02', count: 15 },
    ]);

    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
    });

    // Expand the card to see the stat block
    fireEvent.click(screen.getByText('Push-ups'));
    await waitFor(() => {
      expect(screen.getByText('35 reps')).toBeInTheDocument();
    });
  });
});
