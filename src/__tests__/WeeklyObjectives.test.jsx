import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockGetByWeek, mockUpsert } = vi.hoisted(() => ({
  mockGetByWeek: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock('../api', () => ({
  weeklyObjectiveService: {
    getByWeek: mockGetByWeek,
    upsert: mockUpsert,
  },
}));

import WeeklyObjectives from '../components/WeeklyObjectives';

const TODAY = '2026-06-02'; // Monday

const defaultProps = {
  selectedDate: TODAY,
  keyEvents: [],
  onAddKeyEvent: vi.fn().mockResolvedValue(undefined),
  onUpdateKeyEvent: vi.fn().mockResolvedValue(undefined),
  onDeleteKeyEvent: vi.fn().mockResolvedValue(undefined),
};

describe('WeeklyObjectives — unified panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByWeek.mockResolvedValue({ objectives: [] });
    mockUpsert.mockResolvedValue({});
  });

  it('renders the "Weekly Goals & Key Events" header', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    expect(await screen.findByText(/Weekly Goals & Key Events/i)).toBeInTheDocument();
  });

  it('shows both sub-section labels when expanded', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    expect(await screen.findByText('Weekly Goals')).toBeInTheDocument();
    expect(screen.getByText('Key Events This Week')).toBeInTheDocument();
  });

  it('hides content when collapsed', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Weekly Goals');
    // Click the toggle button to collapse
    fireEvent.click(screen.getByRole('button', { name: /Weekly Goals & Key Events/i }));
    expect(screen.queryByText('Weekly Goals')).not.toBeInTheDocument();
    expect(screen.queryByText('Key Events This Week')).not.toBeInTheDocument();
  });

  // ── Goals section ──────────────────────────────────────────────────────────

  it('loads and shows existing goals from service', async () => {
    mockGetByWeek.mockResolvedValue({ objectives: [{ text: 'Ship feature X', completed: false }] });
    render(<WeeklyObjectives {...defaultProps} />);
    expect(await screen.findByText('Ship feature X')).toBeInTheDocument();
  });

  it('adds a new goal on Enter', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Weekly Goals');
    const input = screen.getByPlaceholderText('Add a goal...');
    fireEvent.change(input, { target: { value: 'New goal' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'New goal' })])
    ));
  });

  it('removes a goal when clicking the remove button', async () => {
    mockGetByWeek.mockResolvedValue({ objectives: [{ text: 'Remove me', completed: false }] });
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Remove me');
    fireEvent.click(screen.getByTitle('Remove'));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalledWith(expect.any(String), []));
  });

  // ── Key Events section ─────────────────────────────────────────────────────

  it('renders 7 day columns for the week', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Key Events This Week');
    // 7 "Add" buttons — one per day
    const addBtns = screen.getAllByTitle('Add key event');
    expect(addBtns).toHaveLength(7);
  });

  it('shows key events filtered to the current week', async () => {
    const props = {
      ...defaultProps,
      keyEvents: [
        { id: 1, title: 'Kickoff', date: '2026-06-02', description: '', category: '' },
        { id: 2, title: 'Old event', date: '2026-05-20', description: '', category: '' },
      ],
    };
    render(<WeeklyObjectives {...props} />);
    await screen.findByText('Key Events This Week');
    expect(screen.getByText('Kickoff')).toBeInTheDocument();
    expect(screen.queryByText('Old event')).not.toBeInTheDocument();
  });

  it('reveals add form when clicking add button', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Key Events This Week');
    const addBtns = screen.getAllByTitle('Add key event');
    fireEvent.click(addBtns[0]);
    expect(screen.getByPlaceholderText('Event title *')).toBeInTheDocument();
  });

  it('blocks add with empty title and shows error', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Key Events This Week');
    fireEvent.click(screen.getAllByTitle('Add key event')[0]);
    fireEvent.click(screen.getByTitle('Add'));
    await waitFor(() => expect(screen.getByText('Title is required')).toBeInTheDocument());
    expect(defaultProps.onAddKeyEvent).not.toHaveBeenCalled();
  });

  it('calls onAddKeyEvent when form is submitted with a title', async () => {
    render(<WeeklyObjectives {...defaultProps} />);
    await screen.findByText('Key Events This Week');
    fireEvent.click(screen.getAllByTitle('Add key event')[0]);
    fireEvent.change(screen.getByPlaceholderText('Event title *'), { target: { value: 'Planning session' } });
    fireEvent.click(screen.getByTitle('Add'));
    await waitFor(() => expect(defaultProps.onAddKeyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Planning session' })
    ));
  });

  it('shows edit form when edit button clicked on an event', async () => {
    const props = {
      ...defaultProps,
      keyEvents: [{ id: 1, title: 'Team sync', date: '2026-06-02', description: '', category: '' }],
    };
    render(<WeeklyObjectives {...props} />);
    await screen.findByText('Team sync');
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByDisplayValue('Team sync')).toBeInTheDocument();
  });

  it('calls onUpdateKeyEvent when edit is saved', async () => {
    const props = {
      ...defaultProps,
      keyEvents: [{ id: 1, title: 'Team sync', date: '2026-06-02', description: '', category: '' }],
    };
    render(<WeeklyObjectives {...props} />);
    await screen.findByText('Team sync');
    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.change(screen.getByDisplayValue('Team sync'), { target: { value: 'Updated sync' } });
    fireEvent.click(screen.getByTitle('Save'));
    await waitFor(() => expect(defaultProps.onUpdateKeyEvent).toHaveBeenCalledWith(
      1, expect.objectContaining({ title: 'Updated sync' })
    ));
  });

  it('shows confirm delete controls after first delete click', async () => {
    const props = {
      ...defaultProps,
      keyEvents: [{ id: 1, title: 'Team sync', date: '2026-06-02', description: '', category: '' }],
    };
    render(<WeeklyObjectives {...props} />);
    await screen.findByText('Team sync');
    fireEvent.click(screen.getByTitle('Delete'));
    expect(screen.getByTitle('Confirm delete')).toBeInTheDocument();
  });

  it('calls onDeleteKeyEvent after confirm delete', async () => {
    const props = {
      ...defaultProps,
      keyEvents: [{ id: 1, title: 'Team sync', date: '2026-06-02', description: '', category: '' }],
    };
    render(<WeeklyObjectives {...props} />);
    await screen.findByText('Team sync');
    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByTitle('Confirm delete'));
    await waitFor(() => expect(defaultProps.onDeleteKeyEvent).toHaveBeenCalledWith(1));
  });
});
