import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { startOfWeek, endOfWeek, subDays, format } from 'date-fns';

const {
  mockReviewGetByWeek,
  mockReviewUpsert,
  mockObjectiveGetByWeek,
  mockObjectiveUpsert,
  mockHabitGetAll,
  mockHabitEntryGetAll,
} = vi.hoisted(() => ({
  mockReviewGetByWeek: vi.fn(),
  mockReviewUpsert: vi.fn(),
  mockObjectiveGetByWeek: vi.fn(),
  mockObjectiveUpsert: vi.fn(),
  mockHabitGetAll: vi.fn(),
  mockHabitEntryGetAll: vi.fn(),
}));

vi.mock('../api', () => ({
  weeklyReviewService: {
    getByWeek: mockReviewGetByWeek,
    upsert: mockReviewUpsert,
  },
  weeklyObjectiveService: {
    getByWeek: mockObjectiveGetByWeek,
    upsert: mockObjectiveUpsert,
  },
  habitService: { getAll: mockHabitGetAll },
  habitEntryService: { getAll: mockHabitEntryGetAll },
}));

import WeeklyReview from '../components/WeeklyReview';

const emptyDoc = (weekStart) => ({
  weekStart,
  cleanupTasks: [],
  gratitudeEntries: [],
  reflectionAnswers: {},
  weeklyGoals: [],
  syncFlags: {},
});

const defaultProps = {
  keyEvents: [],
  onAddKeyEvent: vi.fn().mockResolvedValue(undefined),
  onUpdateKeyEvent: vi.fn().mockResolvedValue(undefined),
  onDeleteKeyEvent: vi.fn().mockResolvedValue(undefined),
  onDataChange: vi.fn().mockResolvedValue(undefined),
};

function thisWeekStart() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

describe('WeeklyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockReviewGetByWeek.mockResolvedValue(emptyDoc(thisWeekStart()));
    mockReviewUpsert.mockResolvedValue({});
    mockObjectiveGetByWeek.mockResolvedValue({ objectives: [] });
    mockObjectiveUpsert.mockResolvedValue({});
    mockHabitGetAll.mockResolvedValue([]);
    mockHabitEntryGetAll.mockResolvedValue([]);
  });

  // ── Shell & week navigation ───────────────────────────────────────────────

  it('renders the week navigation and three section headers', async () => {
    render(<WeeklyReview {...defaultProps} />);
    expect(await screen.findByText('Weekly Miscellaneous Cleanup')).toBeInTheDocument();
    expect(screen.getByText('Weekly Gratitude')).toBeInTheDocument();
    expect(screen.getByText('Weekly Goal Setup')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('seeds the default cleanup template for a new week', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Miscellaneous Cleanup');
    expect(screen.getByDisplayValue('Clean up all the items @box')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Wipe the MacBook & iPhone with screen cleaner')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/寫下每週的藍圖/)).toBeInTheDocument();
  });

  // ── Cleanup checklist ─────────────────────────────────────────────────────

  it('toggles a cleanup item and persists', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Miscellaneous Cleanup');
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the first cleanup item
    fireEvent.click(checkboxes[0]);
    await waitFor(() => expect(mockReviewUpsert).toHaveBeenCalled());
    const savedDoc = mockReviewUpsert.mock.calls[0][1];
    expect(savedDoc.cleanupTasks[0].completed).toBe(true);
  });

  it('adds a cleanup item and persists', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Miscellaneous Cleanup');
    const input = screen.getByPlaceholderText('Add a cleanup item…');
    fireEvent.change(input, { target: { value: 'Water the plants' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      expect(lastCall[1].cleanupTasks).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Water the plants' })])
      );
    });
  });

  it('removes a cleanup item and persists', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Miscellaneous Cleanup');
    const removeButtons = screen.getAllByTitle('Remove item');
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      // Default template has 7 items; removing one leaves 6
      expect(lastCall[1].cleanupTasks.length).toBe(6);
    });
  });

  // ── Gratitude ─────────────────────────────────────────────────────────────

  it('adds a gratitude entry and persists', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Gratitude');
    const input = screen.getByPlaceholderText(/grateful for/i);
    fireEvent.change(input, { target: { value: 'A good cup of coffee' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      expect(lastCall[1].gratitudeEntries).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'A good cup of coffee' })])
      );
    });
  });

  it('removes a gratitude entry and persists', async () => {
    const weekStart = thisWeekStart();
    mockReviewGetByWeek.mockResolvedValue({
      ...emptyDoc(weekStart),
      gratitudeEntries: [{ id: 'g1', text: 'Sunshine' }],
    });
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByDisplayValue('Sunshine');
    fireEvent.click(screen.getByTitle('Remove entry'));
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      expect(lastCall[1].gratitudeEntries).toEqual([]);
    });
  });

  // ── Reflection ─────────────────────────────────────────────────────────────

  it('saves a reflection answer and persists', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    const textareas = screen.getAllByPlaceholderText('Write your reflection…');
    fireEvent.change(textareas[0], { target: { value: 'Shipped the feature on time' } });
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      expect(lastCall[1].reflectionAnswers.accomplishments).toBe('Shipped the feature on time');
    });
  });

  it('surfaces the habit completion summary with total time spent', async () => {
    const weekStart = thisWeekStart();
    mockHabitGetAll.mockResolvedValue([{ id: 1, name: 'Reading', color: '#10B981', isArchived: 0 }]);
    mockHabitEntryGetAll.mockResolvedValue([{ habitId: 1, date: weekStart, timeSpentSeconds: 5400 }]);
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    await waitFor(() => expect(screen.getByText(/Reading: 1h 30m/)).toBeInTheDocument());
  });

  it('surfaces the habit completion summary with reps for count habits', async () => {
    const weekStart = thisWeekStart();
    mockHabitGetAll.mockResolvedValue([
      { id: 1, name: 'Push-ups', color: '#10B981', isArchived: 0, trackType: 'count' },
    ]);
    mockHabitEntryGetAll.mockResolvedValue([
      { habitId: 1, date: weekStart, count: 20 },
      { habitId: 1, date: weekStart, count: 30 },
    ]);
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    await waitFor(() => expect(screen.getByText(/Push-ups: 50 reps/)).toBeInTheDocument());
  });

  it('defaults to the week containing yesterday so a late-night review shows the just-finished week', async () => {
    // Regression: the component used to default to startOfWeek(new Date()),
    // so opening the review after midnight on Monday showed a brand-new empty
    // week and every habit chip rendered 0m even though last week had data.
    const expectedDefault = format(startOfWeek(subDays(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const expectedDefaultEnd = format(endOfWeek(subDays(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    mockHabitGetAll.mockResolvedValue([{ id: 1, name: 'Reading', color: '#10B981', isArchived: 0 }]);
    mockHabitEntryGetAll.mockResolvedValue([{ habitId: 1, date: expectedDefault, timeSpentSeconds: 5400 }]);
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    await waitFor(() => {
      expect(mockReviewGetByWeek).toHaveBeenCalledWith(expectedDefault);
      expect(mockHabitEntryGetAll).toHaveBeenCalledWith({ from: expectedDefault, to: expectedDefaultEnd });
      expect(screen.getByText(/Reading: 1h 30m/)).toBeInTheDocument();
    });
  });

  it('labels the habit summary with the actual data range instead of "Last week"', async () => {
    const weekStart = thisWeekStart();
    mockHabitGetAll.mockResolvedValue([{ id: 1, name: 'Reading', color: '#10B981', isArchived: 0 }]);
    mockHabitEntryGetAll.mockResolvedValue([{ habitId: 1, date: weekStart, timeSpentSeconds: 600 }]);
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    // The old hard-coded label hid mismatches between the title and the loaded week
    await waitFor(() => expect(screen.queryByText("Last week's habits:")).not.toBeInTheDocument());
    expect(screen.getByText(/Habits \(/)).toBeInTheDocument();
  });

  // ── Weekly goals with minimum steps ───────────────────────────────────────

  it('adds a weekly goal with a minimum step and persists', async () => {
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    const inputs = screen.getAllByPlaceholderText(/Goal title|Minimum viable step/);
    fireEvent.change(inputs[0], { target: { value: 'Finish report' } });
    fireEvent.change(inputs[1], { target: { value: 'Open the doc' } });
    fireEvent.click(screen.getByTitle('Add goal'));
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      expect(lastCall[1].weeklyGoals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Finish report', minimumStep: 'Open the doc' }),
        ])
      );
    });
  });

  it('removes a weekly goal and persists', async () => {
    const weekStart = thisWeekStart();
    mockReviewGetByWeek.mockResolvedValue({
      ...emptyDoc(weekStart),
      weeklyGoals: [{ id: 'g1', text: 'Old goal', minimumStep: 'step', completed: false }],
    });
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByDisplayValue('Old goal');
    fireEvent.click(screen.getByTitle('Remove goal'));
    await waitFor(() => {
      const lastCall = mockReviewUpsert.mock.calls.at(-1);
      expect(lastCall[1].weeklyGoals).toEqual([]);
    });
  });

  // ── Sync goals bridging action ────────────────────────────────────────────

  it('syncs goals to weekly objectives when no existing objectives', async () => {
    const weekStart = thisWeekStart();
    mockReviewGetByWeek.mockResolvedValue({
      ...emptyDoc(weekStart),
      weeklyGoals: [{ id: 'g1', text: 'Ship it', minimumStep: 'Open PR', completed: false }],
    });
    mockObjectiveGetByWeek.mockResolvedValue({ objectives: [] });
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByDisplayValue('Ship it');
    // The sync checkbox is the one inside the bridging action label
    const syncCheckbox = screen.getByRole('checkbox', { name: /Write weekly goals to DayFrame/i });
    fireEvent.click(syncCheckbox);
    await waitFor(() => expect(mockObjectiveUpsert).toHaveBeenCalled());
    expect(mockObjectiveUpsert.mock.calls[0][1]).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'Ship it' })])
    );
  });

  it('confirms before replacing existing objectives', async () => {
    const weekStart = thisWeekStart();
    mockReviewGetByWeek.mockResolvedValue({
      ...emptyDoc(weekStart),
      weeklyGoals: [{ id: 'g1', text: 'New goal', minimumStep: 's', completed: false }],
    });
    mockObjectiveGetByWeek.mockResolvedValue({ objectives: [{ text: 'old', completed: false }] });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByDisplayValue('New goal');
    fireEvent.click(screen.getByRole('checkbox', { name: /Write weekly goals to DayFrame/i }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(mockObjectiveUpsert).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('prevents sync when there are no goals', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<WeeklyReview {...defaultProps} />);
    await screen.findByText('Weekly Goal Setup');
    fireEvent.click(screen.getByRole('checkbox', { name: /Write weekly goals to DayFrame/i }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(mockObjectiveUpsert).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // ── Key events bridging ───────────────────────────────────────────────────

  it('lists key events for the current week grouped by day', async () => {
    const weekStart = thisWeekStart();
    const props = {
      ...defaultProps,
      keyEvents: [
        { id: 1, title: 'Dentist', date: weekStart, description: '', category: 'Personal' },
        { id: 2, title: 'Old', date: '2020-01-01', description: '', category: '' },
      ],
    };
    render(<WeeklyReview {...props} />);
    await screen.findByText('Weekly Goal Setup');
    expect(screen.getByText('Dentist')).toBeInTheDocument();
    expect(screen.queryByText('Old')).not.toBeInTheDocument();
  });

  it('calls onAddKeyEvent when a key event is added from the review', async () => {
    const weekStart = thisWeekStart();
    const props = {
      ...defaultProps,
      keyEvents: [{ id: 1, title: 'Dentist', date: weekStart, description: '', category: '' }],
    };
    render(<WeeklyReview {...props} />);
    await screen.findByText('Dentist');
    // Click first "Add key event" button in the grid
    fireEvent.click(screen.getAllByTitle('Add key event')[0]);
    fireEvent.change(screen.getByPlaceholderText('Event title *'), { target: { value: 'Launch' } });
    fireEvent.click(screen.getByTitle('Add'));
    await waitFor(() =>
      expect(defaultProps.onAddKeyEvent).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Launch' })
      )
    );
  });
});
