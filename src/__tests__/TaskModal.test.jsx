import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskModal from '../components/TaskModal';

// Mock the subtaskService used by TaskModal
vi.mock('../db', () => ({
  subtaskService: {
    getByTaskId: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve(1)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    toggleCompleted: vi.fn(() => Promise.resolve()),
    deleteByTaskId: vi.fn(() => Promise.resolve()),
  },
}));

// Re-import after mock so we can reference it in tests
import { subtaskService } from '../db';

describe('TaskModal Component', () => {
  const mockProjects = [
    { id: 1, name: 'Project A', color: '#3788d8' },
    { id: 2, name: 'Project B', color: '#28a745' }
  ];

  const mockTeamMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];

  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSubtaskChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    subtaskService.getByTaskId.mockResolvedValue([]);
  });

  it('should render new task modal', () => {
    render(
      <TaskModal
        task={null}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('should render edit task modal with existing data', async () => {
    const existingTask = {
      id: 1,
      title: 'Test Task',
      description: 'Test Description',
      dueDate: new Date('2026-03-15').toISOString(),
      priority: 'high',
      status: 'in-progress',
      projectId: 1,
      assignedTo: 1
    };

    render(
      <TaskModal
        task={existingTask}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Edit Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    // Description is rendered by TipTap RichTextEditor in a contenteditable div
    // TipTap may render asynchronously, so we use findByText
    await waitFor(() => {
      const editorContainer = document.querySelector('.rich-editor-content');
      expect(editorContainer).toBeTruthy();
    });
  });

  it('should call onSave when form is submitted', async () => {
    render(
      <TaskModal
        task={null}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'New Task' } });

    const submitButton = screen.getByText(/create/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <TaskModal
        task={null}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show recurrence options when recurring is checked', () => {
    render(
      <TaskModal
        task={null}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const recurringCheckbox = screen.getByLabelText(/recurring task/i);
    fireEvent.click(recurringCheckbox);

    expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument();
  });

  it('should display delete button for existing tasks', () => {
    const existingTask = {
      id: 1,
      title: 'Test Task',
      dueDate: new Date('2026-03-15').toISOString()
    };

    render(
      <TaskModal
        task={existingTask}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Delete Task')).toBeInTheDocument();
  });

  // ── Subtask-specific tests ──

  it('shows "save first" message for new tasks (no id)', () => {
    render(
      <TaskModal
        task={null}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onSubtaskChange={mockOnSubtaskChange}
      />
    );

    expect(screen.getByText(/save the task first/i)).toBeInTheDocument();
  });

  it('shows subtask section with add input for existing tasks', async () => {
    const existingTask = {
      id: 42,
      title: 'Task with subtasks',
      dueDate: new Date('2026-03-15').toISOString(),
    };

    render(
      <TaskModal
        task={existingTask}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
        onSubtaskChange={mockOnSubtaskChange}
      />
    );

    // Should show the add subtask input
    expect(screen.getByPlaceholderText(/add a subtask/i)).toBeInTheDocument();
    // Should NOT show save-first message
    expect(screen.queryByText(/save the task first/i)).not.toBeInTheDocument();
  });

  it('displays subtask progress count when subtasks exist', async () => {
    const mockSubtasks = [
      { id: 1, parentTaskId: 42, title: 'Sub A', completed: true, sortOrder: 0 },
      { id: 2, parentTaskId: 42, title: 'Sub B', completed: false, sortOrder: 1 },
      { id: 3, parentTaskId: 42, title: 'Sub C', completed: true, sortOrder: 2 },
    ];
    subtaskService.getByTaskId.mockResolvedValue(mockSubtasks);

    const existingTask = {
      id: 42,
      title: 'Task with subtasks',
      dueDate: new Date('2026-03-15').toISOString(),
    };

    render(
      <TaskModal
        task={existingTask}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
        onSubtaskChange={mockOnSubtaskChange}
      />
    );

    // Wait for subtasks to load and display count
    await waitFor(() => {
      expect(screen.getByText('(2/3)')).toBeInTheDocument();
    });

    // All three subtask titles should be visible
    expect(screen.getByText('Sub A')).toBeInTheDocument();
    expect(screen.getByText('Sub B')).toBeInTheDocument();
    expect(screen.getByText('Sub C')).toBeInTheDocument();
  });

  it('adds a new subtask when typing and pressing Enter', async () => {
    subtaskService.getByTaskId.mockResolvedValue([]);
    subtaskService.create.mockResolvedValue(1);

    const existingTask = {
      id: 42,
      title: 'Task',
      dueDate: new Date('2026-03-15').toISOString(),
    };

    render(
      <TaskModal
        task={existingTask}
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onSubtaskChange={mockOnSubtaskChange}
      />
    );

    const addInput = screen.getByPlaceholderText(/add a subtask/i);
    fireEvent.change(addInput, { target: { value: 'New subtask' } });
    fireEvent.keyDown(addInput, { key: 'Enter' });

    await waitFor(() => {
      expect(subtaskService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentTaskId: 42,
          title: 'New subtask',
        })
      );
    });

    expect(mockOnSubtaskChange).toHaveBeenCalled();
  });
});
