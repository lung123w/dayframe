import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BacklogSidebar from '../components/BacklogSidebar';

describe('BacklogSidebar Component', () => {
  const mockProjects = [
    { id: 1, name: 'Project Alpha', color: '#3788d8' },
    { id: 2, name: 'Project Beta', color: '#28a745' },
  ];

  const mockTasks = [
    { id: 1, title: 'Unscheduled Task A', projectId: 1, priority: 'high' },
    { id: 2, title: 'Unscheduled Task B', projectId: 2, priority: 'low' },
    { id: 3, title: 'Unscheduled Task C', projectId: 1, priority: 'medium' },
    { id: 4, title: 'Scheduled Task', projectId: 1, priority: 'high', dueDate: '2026-03-15T10:00:00.000Z' },
    { id: 5, title: 'Another Scheduled', projectId: 2, priority: 'low', dueDate: '2026-04-01T09:00:00.000Z' },
  ];

  let onTaskClick;
  let onAssignDate;
  let onDeleteTask;

  beforeEach(() => {
    onTaskClick = vi.fn();
    onAssignDate = vi.fn();
    onDeleteTask = vi.fn();
  });

  function renderSidebar(props = {}) {
    return render(
      <BacklogSidebar
        tasks={props.tasks ?? mockTasks}
        projects={props.projects ?? mockProjects}
        onTaskClick={props.onTaskClick ?? onTaskClick}
        onAssignDate={props.onAssignDate ?? onAssignDate}
        onDeleteTask={props.onDeleteTask ?? onDeleteTask}
      />
    );
  }

  describe('renders only unscheduled tasks', () => {
    it('should display tasks without a dueDate', () => {
      renderSidebar();

      expect(screen.getByText('Unscheduled Task A')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task B')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task C')).toBeInTheDocument();
    });

    it('should not display tasks that have a dueDate', () => {
      renderSidebar();

      expect(screen.queryByText('Scheduled Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Scheduled')).not.toBeInTheDocument();
    });

    it('should show the correct unscheduled count in the header', () => {
      renderSidebar();

      // 3 unscheduled tasks
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('groups tasks by project', () => {
    it('should render project group headers', () => {
      renderSidebar();

      const body = document.querySelector('.backlog-body');
      const groupBody = within(body);

      expect(groupBody.getByText('Project Alpha')).toBeInTheDocument();
      expect(groupBody.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should show per-group task counts', () => {
      renderSidebar();

      const groups = document.querySelectorAll('.backlog-group');
      expect(groups).toHaveLength(2);

      // Project Alpha group: 2 unscheduled tasks
      const alphaHeader = groups[0].querySelector('.backlog-group-header');
      expect(alphaHeader.querySelector('.backlog-group-name').textContent).toBe('Project Alpha');
      expect(alphaHeader.querySelector('.backlog-group-count').textContent).toBe('2');

      // Project Beta group: 1 unscheduled task
      const betaHeader = groups[1].querySelector('.backlog-group-header');
      expect(betaHeader.querySelector('.backlog-group-name').textContent).toBe('Project Beta');
      expect(betaHeader.querySelector('.backlog-group-count').textContent).toBe('1');
    });

    it('should display "No Project" for tasks without a projectId', () => {
      const tasksWithNoProject = [
        { id: 10, title: 'Orphan Task', priority: 'low' },
      ];
      renderSidebar({ tasks: tasksWithNoProject });

      expect(screen.getByText('No Project')).toBeInTheDocument();
      expect(screen.getByText('Orphan Task')).toBeInTheDocument();
    });
  });

  describe('filters by project dropdown', () => {
    it('should show all unscheduled tasks when "All Projects" is selected', () => {
      renderSidebar();

      expect(screen.getByText('Unscheduled Task A')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task B')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task C')).toBeInTheDocument();
    });

    it('should filter to only the selected project', () => {
      renderSidebar();

      const select = screen.getByDisplayValue('All Projects');
      fireEvent.change(select, { target: { value: '2' } });

      expect(screen.getByText('Unscheduled Task B')).toBeInTheDocument();
      expect(screen.queryByText('Unscheduled Task A')).not.toBeInTheDocument();
      expect(screen.queryByText('Unscheduled Task C')).not.toBeInTheDocument();
    });

    it('should update the count when filtering by project', () => {
      renderSidebar();

      const select = screen.getByDisplayValue('All Projects');
      fireEvent.change(select, { target: { value: '1' } });

      // Project Alpha has 2 unscheduled tasks — verify via header count element
      const headerCount = document.querySelector('.backlog-count');
      expect(headerCount.textContent).toBe('2');
    });

    it('should show clear button when a project filter is active', () => {
      renderSidebar();

      // No clear button initially
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      const select = screen.getByDisplayValue('All Projects');
      fireEvent.change(select, { target: { value: '1' } });

      // Clear button should appear
      const clearButton = screen.getByRole('button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should reset filter when clear button is clicked', () => {
      renderSidebar();

      const select = screen.getByDisplayValue('All Projects');
      fireEvent.change(select, { target: { value: '2' } });

      expect(screen.queryByText('Unscheduled Task A')).not.toBeInTheDocument();

      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      expect(screen.getByText('Unscheduled Task A')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task B')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task C')).toBeInTheDocument();
    });
  });

  describe('search filters by title', () => {
    it('should filter tasks by search query (case-insensitive)', () => {
      renderSidebar();

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'task a' } });

      expect(screen.getByText('Unscheduled Task A')).toBeInTheDocument();
      expect(screen.queryByText('Unscheduled Task B')).not.toBeInTheDocument();
      expect(screen.queryByText('Unscheduled Task C')).not.toBeInTheDocument();
    });

    it('should show "No tasks match filters" when search yields no results', () => {
      renderSidebar();

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No tasks match filters')).toBeInTheDocument();
    });

    it('should show clear button when search query is active', () => {
      renderSidebar();

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'task' } });

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      renderSidebar();

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'task a' } });

      expect(screen.queryByText('Unscheduled Task B')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Unscheduled Task A')).toBeInTheDocument();
      expect(screen.getByText('Unscheduled Task B')).toBeInTheDocument();
    });

    it('should combine search and project filter', () => {
      renderSidebar();

      const select = screen.getByDisplayValue('All Projects');
      fireEvent.change(select, { target: { value: '1' } });

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'task c' } });

      expect(screen.getByText('Unscheduled Task C')).toBeInTheDocument();
      expect(screen.queryByText('Unscheduled Task A')).not.toBeInTheDocument();
      expect(screen.queryByText('Unscheduled Task B')).not.toBeInTheDocument();
    });
  });

  describe('empty state when all tasks are scheduled', () => {
    it('should show "All tasks scheduled!" when every task has a dueDate', () => {
      const allScheduled = [
        { id: 1, title: 'Task 1', projectId: 1, priority: 'high', dueDate: '2026-03-15' },
        { id: 2, title: 'Task 2', projectId: 2, priority: 'low', dueDate: '2026-04-01' },
      ];
      renderSidebar({ tasks: allScheduled });

      expect(screen.getByText('All tasks scheduled!')).toBeInTheDocument();
    });

    it('should show "All tasks scheduled!" when tasks array is empty', () => {
      renderSidebar({ tasks: [] });

      expect(screen.getByText('All tasks scheduled!')).toBeInTheDocument();
    });

    it('should show count of 0 when all tasks are scheduled', () => {
      const allScheduled = [
        { id: 1, title: 'Task 1', projectId: 1, priority: 'high', dueDate: '2026-03-15' },
      ];
      renderSidebar({ tasks: allScheduled });

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('task interactions', () => {
    it('should call onTaskClick when a task title is clicked', () => {
      renderSidebar();

      fireEvent.click(screen.getByText('Unscheduled Task A'));

      expect(onTaskClick).toHaveBeenCalledTimes(1);
      expect(onTaskClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, title: 'Unscheduled Task A' })
      );
    });

    it('should set drag data on drag start', () => {
      renderSidebar();

      const taskEl = screen.getByText('Unscheduled Task A').closest('.backlog-task');
      const setData = vi.fn();
      fireEvent.dragStart(taskEl, {
        dataTransfer: { setData, effectAllowed: '' },
      });

      expect(setData).toHaveBeenCalledWith(
        'application/json',
        JSON.stringify({ taskId: 1 })
      );
    });
  });
});
