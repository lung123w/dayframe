import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BacklogSidebar from '../components/BacklogSidebar';

describe('BacklogSidebar', () => {
  const projects = [
    { id: 1, name: 'Project Alpha', color: '#3788d8' },
    { id: 2, name: 'Project Beta', color: '#28a745' },
  ];

  const onTaskClick = vi.fn();

  const baseTasks = [
    { id: 1, title: 'Unscheduled A', projectId: 1, priority: 'high', status: 'pending' },
    { id: 2, title: 'Unscheduled B', projectId: 2, priority: 'low', status: 'pending' },
    { id: 3, title: 'Future scheduled', projectId: 1, priority: 'medium', status: 'pending', dueDate: '2026-03-15T10:00:00.000Z' },
    { id: 4, title: 'Overdue scheduled', projectId: 2, priority: 'high', status: 'pending', dueDate: '2026-03-09T10:00:00.000Z' },
    { id: 5, title: 'Done task', projectId: 1, priority: 'low', status: 'completed', dueDate: '2026-03-08T10:00:00.000Z' },
  ];

  function renderSidebar(tasks = baseTasks) {
    return render(
      <BacklogSidebar
        tasks={tasks}
        projects={projects}
        onTaskClick={onTaskClick}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows pending tasks in all-pending mode including overdue scheduled tasks', () => {
    renderSidebar();

    // Switch to all-pending mode (default is now unscheduled)
    fireEvent.click(screen.getByRole('button', { name: 'All Pending' }));

    expect(screen.getByText('Unscheduled A')).toBeInTheDocument();
    expect(screen.getByText('Unscheduled B')).toBeInTheDocument();
    expect(screen.getByText('Future scheduled')).toBeInTheDocument();
    expect(screen.getByText('Overdue scheduled')).toBeInTheDocument();
    expect(screen.queryByText('Done task')).not.toBeInTheDocument();
  });

  it('shows overdue badge for overdue pending scheduled tasks', () => {
    renderSidebar();

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('unscheduled mode includes unscheduled and overdue pending tasks', () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));

    expect(screen.getByText('Unscheduled A')).toBeInTheDocument();
    expect(screen.getByText('Unscheduled B')).toBeInTheDocument();
    expect(screen.getByText('Overdue scheduled')).toBeInTheDocument();
    expect(screen.queryByText('Future scheduled')).not.toBeInTheDocument();
  });

  it('filters by project and search query', () => {
    renderSidebar();

    fireEvent.change(screen.getByDisplayValue('All Projects'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'overdue' } });

    expect(screen.getByText('Overdue scheduled')).toBeInTheDocument();
    expect(screen.queryByText('Unscheduled B')).not.toBeInTheDocument();
  });

  it('calls onTaskClick when task title clicked', () => {
    renderSidebar();

    fireEvent.click(screen.getByText('Unscheduled A'));
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1, title: 'Unscheduled A' }));
  });

  it('sets drag transfer data on drag start', () => {
    renderSidebar();

    const taskEl = screen.getByText('Unscheduled A').closest('.backlog-task');
    const setData = vi.fn();
    fireEvent.dragStart(taskEl, {
      dataTransfer: { setData, effectAllowed: '' },
    });

    expect(setData).toHaveBeenCalledWith('application/json', JSON.stringify({ taskId: 1 }));
  });

  describe('recurring task filtering', () => {
    function makeRecurring(overrides = {}) {
      return {
        id: 100,
        title: 'Daily Recurring',
        projectId: 1,
        priority: 'medium',
        status: 'pending',
        isRecurring: true,
        recurrencePattern: { type: 'daily', interval: 1 },
        createdAt: '2026-03-01T00:00:00.000Z',
        ...overrides,
      };
    }

    it('hides a daily recurring source whose second occurrence is today', () => {
      // system time is 2026-03-10; dueDate=2026-03-09 -> second occurrence = 2026-03-10 (today)
      renderSidebar([makeRecurring({ id: 11, title: 'Daily Fresh', dueDate: '2026-03-09T10:00:00.000Z' })]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      expect(screen.queryByText('Daily Fresh')).not.toBeInTheDocument();
    });

    it('shows a daily recurring source whose second occurrence is strictly before today', () => {
      // dueDate=2026-03-08 -> second occurrence = 2026-03-09 (yesterday) -> overdue
      renderSidebar([makeRecurring({ id: 12, title: 'Daily Overdue', dueDate: '2026-03-08T10:00:00.000Z' })]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      expect(screen.getByText('Daily Overdue')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('hides a weekly recurring source whose next occurrence is in the future', () => {
      // dueDate=2026-03-06 (Friday), pattern weekly on Wednesday [3] -> next = 2026-03-11
      renderSidebar([
        makeRecurring({
          id: 13,
          title: 'Weekly Future',
          dueDate: '2026-03-06T10:00:00.000Z',
          recurrencePattern: { type: 'weekly', interval: 1, daysOfWeek: [3] },
        }),
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      expect(screen.queryByText('Weekly Future')).not.toBeInTheDocument();
    });

    it('hides a recurring source whose pattern endDate is in the past', () => {
      renderSidebar([
        makeRecurring({
          id: 14,
          title: 'Ended Recurring',
          dueDate: '2026-01-01T10:00:00.000Z',
          recurrencePattern: {
            type: 'daily',
            interval: 1,
            endDate: '2026-02-01T00:00:00.000Z',
          },
        }),
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      expect(screen.queryByText('Ended Recurring')).not.toBeInTheDocument();
    });

    it('shows recurring sources in All Pending mode regardless of next occurrence', () => {
      renderSidebar([
        makeRecurring({ id: 15, title: 'Daily Fresh', dueDate: '2026-03-09T10:00:00.000Z' }),
        makeRecurring({ id: 16, title: 'Weekly Future', dueDate: '2026-03-06T10:00:00.000Z', recurrencePattern: { type: 'weekly', interval: 1, daysOfWeek: [3] } }),
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'All Pending' }));
      expect(screen.getByText('Daily Fresh')).toBeInTheDocument();
      expect(screen.getByText('Weekly Future')).toBeInTheDocument();
    });

    it('search within Unscheduled view skips recurring sources with future next occurrences', () => {
      renderSidebar([
        makeRecurring({ id: 17, title: 'Daily Fresh Searchable', dueDate: '2026-03-09T10:00:00.000Z' }),
        makeRecurring({ id: 18, title: 'Daily Overdue Searchable', dueDate: '2026-03-08T10:00:00.000Z' }),
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'searchable' } });
      expect(screen.queryByText('Daily Fresh Searchable')).not.toBeInTheDocument();
      expect(screen.getByText('Daily Overdue Searchable')).toBeInTheDocument();
    });

    it('keeps non-recurring overdue tasks visible in Unscheduled mode', () => {
      renderSidebar([
        { id: 19, title: 'Plain Overdue', projectId: 1, priority: 'medium', status: 'pending', dueDate: '2026-03-09T10:00:00.000Z' },
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      expect(screen.getByText('Plain Overdue')).toBeInTheDocument();
    });

    it('hides non-recurring future tasks in Unscheduled mode', () => {
      renderSidebar([
        { id: 20, title: 'Plain Future', projectId: 1, priority: 'medium', status: 'pending', dueDate: '2026-03-15T10:00:00.000Z' },
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Unscheduled' }));
      expect(screen.queryByText('Plain Future')).not.toBeInTheDocument();
    });
  });
});
