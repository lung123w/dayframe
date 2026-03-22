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
});
