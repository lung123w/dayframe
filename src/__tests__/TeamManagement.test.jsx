import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamManagement from '../components/TeamManagement';

describe('TeamManagement Component', () => {
  const mockTeamMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Designer' }
  ];

  const mockOnAddMember = vi.fn();
  const mockOnUpdateMember = vi.fn();
  const mockOnDeleteMember = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render team members list', () => {
    render(
      <TeamManagement
        teamMembers={mockTeamMembers}
        onAddMember={mockOnAddMember}
        onUpdateMember={mockOnUpdateMember}
        onDeleteMember={mockOnDeleteMember}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('should show empty state when no members', () => {
    render(
      <TeamManagement
        teamMembers={[]}
        onAddMember={mockOnAddMember}
        onUpdateMember={mockOnUpdateMember}
        onDeleteMember={mockOnDeleteMember}
      />
    );

    expect(screen.getByText(/no team members yet/i)).toBeInTheDocument();
  });

  it('should show form when add member button is clicked', () => {
    render(
      <TeamManagement
        teamMembers={mockTeamMembers}
        onAddMember={mockOnAddMember}
        onUpdateMember={mockOnUpdateMember}
        onDeleteMember={mockOnDeleteMember}
      />
    );

    const addButton = screen.getByText(/add member/i);
    fireEvent.click(addButton);

    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('should call onAddMember when form is submitted', async () => {
    render(
      <TeamManagement
        teamMembers={[]}
        onAddMember={mockOnAddMember}
        onUpdateMember={mockOnUpdateMember}
        onDeleteMember={mockOnDeleteMember}
      />
    );

    // Open form
    const addButton = screen.getByText(/add member/i);
    fireEvent.click(addButton);

    // Fill form
    const nameInput = screen.getByPlaceholderText(/name/i);
    const emailInput = screen.getByPlaceholderText(/email/i);
    const roleInput = screen.getByPlaceholderText(/role/i);

    fireEvent.change(nameInput, { target: { value: 'Bob Wilson' } });
    fireEvent.change(emailInput, { target: { value: 'bob@example.com' } });
    fireEvent.change(roleInput, { target: { value: 'Manager' } });

    // Submit
    const forms = screen.getAllByRole('button', { name: /add member/i });
    const submitButton = forms[forms.length - 1]; // Get the submit button (last one)
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnAddMember).toHaveBeenCalledWith({
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'Manager'
      });
    });
  });

  it('should call onDeleteMember when delete is confirmed', async () => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    render(
      <TeamManagement
        teamMembers={mockTeamMembers}
        onAddMember={mockOnAddMember}
        onUpdateMember={mockOnUpdateMember}
        onDeleteMember={mockOnDeleteMember}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockOnDeleteMember).toHaveBeenCalledWith(1);
    });
  });
});
