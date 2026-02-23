import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskModal from '../components/TaskModal';

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

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should render edit task modal with existing data', () => {
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
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
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
});
