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

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalled();
    });
  });
});
