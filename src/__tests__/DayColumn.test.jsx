import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DayColumn from '../components/DayColumn';

// Mock the recurrence utility so we control recurring task expansion
vi.mock('../utils/recurrence', () => ({
  generateRecurringTasks: vi.fn(() => []),
}));

import { generateRecurringTasks } from '../utils/recurrence';

// ---------- shared fixtures ----------

const DATE_STR = '2026-03-09';

const mockProjects = [
  { id: 1, name: 'Project Alpha', color: '#3788d8' },
  { id: 2, name: 'Project Beta', color: '#28a745' },
];

const mockTeamMembers = [
  { id: 10, name: 'Alice', email: 'alice@test.com' },
  { id: 20, name: 'Bob', email: 'bob@test.com' },
];

function makeTask(overrides = {}) {
  return {
    id: 1,
    title: 'Write tests',
    dueDate: DATE_STR,
    status: 'todo',
    priority: 'medium',
    projectId: 1,
    assignedTo: null,
    isRecurring: false,
    estimatedMinutes: null,
    ...overrides,
  };
}

const defaultCallbacks = {
  onTaskClick: vi.fn(),
  onStatusUpdate: vi.fn(),
  onNewTask: vi.fn(),
  onDeleteTask: vi.fn(),
  onSubtaskToggle: vi.fn(),
  onEstimateChange: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
};

function renderColumn(props = {}) {
  const merged = {
    dateStr: DATE_STR,
    tasks: [],
    projects: mockProjects,
    teamMembers: mockTeamMembers,
    subtasks: [],
    expanded: false,
    ...defaultCallbacks,
    ...props,
  };
  return render(<DayColumn {...merged} />);
}

// ---------- tests ----------

describe('DayColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateRecurringTasks.mockReturnValue([]);
  });

  // ---- 1. Rendering tasks for the given date ----

  describe('rendering tasks', () => {
    it('renders a single task whose dueDate matches the dateStr', () => {
      const task = makeTask({ title: 'Fix bug' });
      renderColumn({ tasks: [task] });

      expect(screen.getByText('Fix bug')).toBeInTheDocument();
    });

    it('does not render tasks with a different dueDate', () => {
      const task = makeTask({ title: 'Other day task', dueDate: '2026-03-10' });
      renderColumn({ tasks: [task] });

      expect(screen.queryByText('Other day task')).not.toBeInTheDocument();
    });

    it('renders multiple tasks sorted by priority (high → medium → low)', () => {
      const tasks = [
        makeTask({ id: 1, title: 'Low task', priority: 'low' }),
        makeTask({ id: 2, title: 'High task', priority: 'high' }),
        makeTask({ id: 3, title: 'Medium task', priority: 'medium' }),
      ];
      renderColumn({ tasks });

      const titles = screen.getAllByText(/task$/i).map(el => el.textContent);
      expect(titles).toEqual(['High task', 'Medium task', 'Low task']);
    });

    it('shows task count in the header', () => {
      const tasks = [
        makeTask({ id: 1, title: 'Task A' }),
        makeTask({ id: 2, title: 'Task B' }),
      ];
      renderColumn({ tasks });

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows the project name as a meta chip', () => {
      renderColumn({ tasks: [makeTask({ projectId: 2 })], expanded: true });

      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('shows assignee names when task has assignedTo', () => {
      renderColumn({ tasks: [makeTask({ assignedTo: [10, 20] })], expanded: true });

      expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
    });

    it('renders recurring tasks via generateRecurringTasks', () => {
      const recurringTask = makeTask({
        id: 5,
        title: 'Daily standup',
        isRecurring: true,
        dueDate: '2026-03-01',
      });

      generateRecurringTasks.mockReturnValue([
        { ...recurringTask, dueDate: DATE_STR, isRecurringInstance: true, recurringSourceId: 5, instanceDate: DATE_STR },
      ]);

      renderColumn({ tasks: [recurringTask] });

      expect(generateRecurringTasks).toHaveBeenCalledWith(recurringTask, expect.any(Date), expect.any(Date));
      expect(screen.getByText('Daily standup')).toBeInTheDocument();
    });
  });

  // ---- 2. Empty state ----

  describe('empty state', () => {
    it('shows "No tasks" text and add button when expanded and no tasks', () => {
      renderColumn({ tasks: [], expanded: true });

      expect(screen.getByText('No tasks')).toBeInTheDocument();
      expect(screen.getByText(/add task/i)).toBeInTheDocument();
    });

    it('shows "--" mini placeholder when not expanded and no tasks', () => {
      renderColumn({ tasks: [], expanded: false });

      expect(screen.getByText('--')).toBeInTheDocument();
      expect(screen.queryByText('No tasks')).not.toBeInTheDocument();
    });

    it('calls onNewTask with dateStr when Add task button is clicked in empty expanded state', () => {
      renderColumn({ tasks: [], expanded: true });

      fireEvent.click(screen.getByText(/add task/i));
      expect(defaultCallbacks.onNewTask).toHaveBeenCalledWith(DATE_STR);
    });
  });

  // ---- 3. Status cycling ----

  describe('status cycling', () => {
    it('calls onStatusUpdate with "in-progress" when a todo task status button is clicked', () => {
      const task = makeTask({ status: 'todo' });
      renderColumn({ tasks: [task], expanded: true });

      fireEvent.click(screen.getByTitle('Cycle status'));
      expect(defaultCallbacks.onStatusUpdate).toHaveBeenCalledWith(task, 'in-progress', undefined);
    });

    it('calls onStatusUpdate with "completed" when an in-progress task status button is clicked', () => {
      const task = makeTask({ status: 'in-progress' });
      renderColumn({ tasks: [task], expanded: true });

      fireEvent.click(screen.getByTitle('Cycle status'));
      expect(defaultCallbacks.onStatusUpdate).toHaveBeenCalledWith(task, 'completed', undefined);
    });

    it('calls onStatusUpdate with "todo" when a completed task status button is clicked', () => {
      const task = makeTask({ status: 'completed' });
      renderColumn({ tasks: [task], expanded: true });

      // Completed tasks show in the "Completed" section — grab the cycle button
      fireEvent.click(screen.getByTitle('Cycle status'));
      expect(defaultCallbacks.onStatusUpdate).toHaveBeenCalledWith(task, 'todo', undefined);
    });

    it('passes "single" scope for recurring instances', () => {
      const task = makeTask({
        status: 'todo',
        isRecurringInstance: true,
        recurringSourceId: 5,
        instanceDate: DATE_STR,
      });
      renderColumn({ tasks: [task], expanded: true });

      fireEvent.click(screen.getByTitle('Cycle status'));
      expect(defaultCallbacks.onStatusUpdate).toHaveBeenCalledWith(task, 'in-progress', 'single');
    });
  });

  // ---- 4. Expanded vs mini mode ----

  describe('expanded vs mini mode', () => {
    it('does not show edit/delete action buttons in mini mode', () => {
      renderColumn({ tasks: [makeTask()], expanded: false });

      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    });

    it('shows edit and delete action buttons in expanded mode', () => {
      renderColumn({ tasks: [makeTask()], expanded: true });

      expect(screen.getByTitle('Edit')).toBeInTheDocument();
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    it('calls onTaskClick when edit button is clicked in expanded mode', () => {
      const task = makeTask();
      renderColumn({ tasks: [task], expanded: true });

      fireEvent.click(screen.getByTitle('Edit'));
      expect(defaultCallbacks.onTaskClick).toHaveBeenCalledWith(task);
    });

    it('calls onDeleteTask with task id when delete button is clicked', () => {
      const task = makeTask({ id: 42 });
      renderColumn({ tasks: [task], expanded: true });

      fireEvent.click(screen.getByTitle('Delete'));
      expect(defaultCallbacks.onDeleteTask).toHaveBeenCalledWith(42);
    });

    it('shows the footer "Add task" button in expanded mode when tasks exist', () => {
      renderColumn({ tasks: [makeTask()], expanded: true });

      // The footer button is a second "Add task" (the first is for empty state)
      const addButtons = screen.getAllByText(/add task/i);
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show footer add button in mini mode', () => {
      renderColumn({ tasks: [makeTask()], expanded: false });

      expect(screen.queryByText(/add task/i)).not.toBeInTheDocument();
    });

    it('shows completed tasks section with divider in expanded mode', () => {
      const tasks = [
        makeTask({ id: 1, title: 'Active task', status: 'todo' }),
        makeTask({ id: 2, title: 'Done task', status: 'completed' }),
      ];
      renderColumn({ tasks, expanded: true });

      expect(screen.getByText('Active task')).toBeInTheDocument();
      expect(screen.getByText('Done task')).toBeInTheDocument();
      expect(screen.getByText(/completed \(1\)/i)).toBeInTheDocument();
    });

    it('shows "X done" summary in mini mode instead of completed section', () => {
      const tasks = [
        makeTask({ id: 1, title: 'Active task', status: 'todo' }),
        makeTask({ id: 2, title: 'Done task', status: 'completed' }),
      ];
      renderColumn({ tasks, expanded: false });

      expect(screen.getByText('1 done')).toBeInTheDocument();
      expect(screen.queryByText(/completed \(/i)).not.toBeInTheDocument();
    });

    it('renders subtask checkboxes only in expanded mode', () => {
      const task = makeTask({ id: 7 });
      const subtasks = [
        { id: 100, parentTaskId: 7, title: 'Sub A', completed: false, sortOrder: 0 },
        { id: 101, parentTaskId: 7, title: 'Sub B', completed: true, sortOrder: 1 },
      ];

      // Mini mode — no subtask list
      const { unmount } = renderColumn({ tasks: [task], subtasks, expanded: false });
      expect(screen.queryByText('Sub A')).not.toBeInTheDocument();
      unmount();

      // Expanded mode — subtasks visible
      renderColumn({ tasks: [task], subtasks, expanded: true });
      expect(screen.getByText('Sub A')).toBeInTheDocument();
      expect(screen.getByText('Sub B')).toBeInTheDocument();
      expect(screen.getByText('[1/2]')).toBeInTheDocument();
    });

    it('calls onSubtaskToggle when a subtask checkbox is clicked', () => {
      const task = makeTask({ id: 7 });
      const subtasks = [
        { id: 100, parentTaskId: 7, title: 'Sub A', completed: false, sortOrder: 0 },
      ];
      renderColumn({ tasks: [task], subtasks, expanded: true });

      fireEvent.click(screen.getByRole('checkbox'));
      expect(defaultCallbacks.onSubtaskToggle).toHaveBeenCalledWith(100);
    });
  });

  // ---- 5. Header / date formatting ----

  describe('header display', () => {
    it('renders the formatted date in the header', () => {
      renderColumn();
      // March 9 → 'Mar 9'
      expect(screen.getByText('Mar 9')).toBeInTheDocument();
    });

    it('shows total estimated time when tasks have estimates', () => {
      const tasks = [
        makeTask({ id: 1, estimatedMinutes: 30 }),
        makeTask({ id: 2, estimatedMinutes: 90 }),
      ];
      renderColumn({ tasks });

      // 30 + 90 = 120 min = 2h
      expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('does not show estimated time when no tasks have estimates', () => {
      renderColumn({ tasks: [makeTask({ estimatedMinutes: null })] });

      // No time display should be rendered — just the count
      expect(screen.queryByText(/\dh/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\dm/)).not.toBeInTheDocument();
    });
  });

  // ---- 6. Drag and drop ----

  describe('drag and drop', () => {
    it('attaches data-date attribute to the column', () => {
      const { container } = renderColumn();
      const column = container.querySelector('[data-date]');
      expect(column).toHaveAttribute('data-date', DATE_STR);
    });

    it('calls onDragOver when dragging over the column', () => {
      const { container } = renderColumn();
      const column = container.querySelector('[data-date]');

      fireEvent.dragOver(column);
      expect(defaultCallbacks.onDragOver).toHaveBeenCalled();
    });

    it('calls onDrop when dropping on the column', () => {
      const { container } = renderColumn();
      const column = container.querySelector('[data-date]');

      fireEvent.drop(column);
      expect(defaultCallbacks.onDrop).toHaveBeenCalled();
    });
  });

  // ---- 7. Time badge ----

  describe('time badge', () => {
    it('shows time badge with startTime on expanded task card', () => {
      const task = makeTask({ startTime: '09:00' });
      renderColumn({ tasks: [task], expanded: true });

      expect(screen.getByText('9a')).toBeInTheDocument();
    });

    it('shows time range when both startTime and endTime are set', () => {
      const task = makeTask({ startTime: '09:00', endTime: '10:30' });
      renderColumn({ tasks: [task], expanded: true });

      expect(screen.getByText('9a - 10:30a')).toBeInTheDocument();
    });

    it('does not show time badge when startTime is not set', () => {
      const task = makeTask();
      renderColumn({ tasks: [task], expanded: true });

      expect(screen.queryByText(/\da\b|\dp\b/)).not.toBeInTheDocument();
    });

    it('does not show time badge in mini mode', () => {
      const task = makeTask({ startTime: '09:00' });
      renderColumn({ tasks: [task], expanded: false });

      expect(screen.queryByText('9a')).not.toBeInTheDocument();
    });

    it('formats PM times correctly', () => {
      const task = makeTask({ startTime: '14:00', endTime: '15:45' });
      renderColumn({ tasks: [task], expanded: true });

      expect(screen.getByText('2p - 3:45p')).toBeInTheDocument();
    });

    it('formats 12:00 as 12p (noon)', () => {
      const task = makeTask({ startTime: '12:00' });
      renderColumn({ tasks: [task], expanded: true });

      expect(screen.getByText('12p')).toBeInTheDocument();
    });

    it('formats 00:00 as 12a (midnight)', () => {
      const task = makeTask({ startTime: '00:00' });
      renderColumn({ tasks: [task], expanded: true });

      expect(screen.getByText('12a')).toBeInTheDocument();
    });
  });

  // ---- 8. Estimate editing ----

  describe('estimate editing', () => {
    it('shows estimate input when clock button is clicked', () => {
      renderColumn({ tasks: [makeTask()], expanded: true });

      fireEvent.click(screen.getByTitle('Set time estimate'));
      expect(screen.getByPlaceholderText('min')).toBeInTheDocument();
    });

    it('calls onEstimateChange when estimate is saved', () => {
      renderColumn({ tasks: [makeTask()], expanded: true });

      fireEvent.click(screen.getByTitle('Set time estimate'));
      const input = screen.getByPlaceholderText('min');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.click(screen.getByText('OK'));

      expect(defaultCallbacks.onEstimateChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        45
      );
    });
  });
});
