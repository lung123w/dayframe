import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitTracker from '../components/HabitTracker';

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

describe('HabitTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitService.getAll.mockResolvedValue([]);
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

  it('toggles today completion when Mark Done is clicked', async () => {
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', color: '#3B82F6', frequency: { type: 'daily' }, isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Done'));

    // Time popover appears — click "Skip" to complete without time
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalled();
    });
  });

  it('opens RepsPopover when Mark Done is clicked on a count habit', async () => {
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Push-ups', color: '#3B82F6', frequency: { type: 'daily' }, trackType: 'count', isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Done'));

    await waitFor(() => {
      expect(screen.getByText('Reps')).toBeInTheDocument();
    });
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();
  });

  it('saves with count when RepsPopover Save is clicked for a count habit', async () => {
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Push-ups', color: '#3B82F6', frequency: { type: 'daily' }, trackType: 'count', isArchived: false },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    render(<HabitTracker />);
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Done'));
    await waitFor(() => {
      expect(screen.getByText('Reps')).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/reps/i, { selector: 'input' });
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    const today = new Date().toISOString().slice(0, 10);
    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, count: 20 });
    });
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
