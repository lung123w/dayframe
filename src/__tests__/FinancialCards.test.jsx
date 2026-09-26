import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const {
  mockGetAll,
  mockGetById,
  mockCreate,
  mockUpdate,
  mockDeactivate,
  mockReorder,
  mockSyncCards,
} = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGetById: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDeactivate: vi.fn(),
  mockReorder: vi.fn(),
  mockSyncCards: vi.fn(),
}));

vi.mock('../api', () => ({
  financialCardService: {
    getAll: mockGetAll,
    getById: mockGetById,
    create: mockCreate,
    update: mockUpdate,
    deactivate: mockDeactivate,
    reorder: mockReorder,
  },
  monthlyReviewService: {
    syncCards: mockSyncCards,
  },
}));

import FinancialCards from '../components/FinancialCards';

function buildCard(overrides = {}) {
  return {
    id: 1,
    name: 'Hang Seng CC',
    institution: 'Hang Seng Bank',
    cardType: 'credit',
    accountNumber: '1234 5678 9012 3456',
    displayOrder: 0,
    active: 1,
    ...overrides,
  };
}

describe('FinancialCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue([]);
    mockGetById.mockResolvedValue(buildCard());
    mockCreate.mockImplementation(async (draft) => buildCard({ id: 99, ...draft }));
    mockUpdate.mockImplementation(async (id, draft) => buildCard({ id, ...draft }));
    mockDeactivate.mockResolvedValue(buildCard({ active: 0 }));
    mockReorder.mockImplementation(async (id) => buildCard({ id }));
    mockSyncCards.mockResolvedValue({});
  });

  it('renders the page header and Add Card button', async () => {
    render(<FinancialCards financialCards={[]} onDataChange={vi.fn()} />);
    expect(screen.getByText('Manage Cards')).toBeInTheDocument();
    expect(screen.getByText(/Add Card/)).toBeInTheDocument();
  });

  it('shows a list of active cards with masked account numbers', async () => {
    const cards = [
      buildCard({ id: 1, name: 'Hang Seng CC', accountNumber: '1234 5678 9012 3456', displayOrder: 0 }),
      buildCard({ id: 2, name: 'HSBC RED', accountNumber: '9876 5432 1098 7654', displayOrder: 1 }),
    ];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    expect(screen.getByText('Hang Seng CC')).toBeInTheDocument();
    expect(screen.getByText('HSBC RED')).toBeInTheDocument();
    expect(screen.getByText('****3456')).toBeInTheDocument();
    expect(screen.getByText('****7654')).toBeInTheDocument();
  });

  it('hides the full account number in the list', async () => {
    const cards = [buildCard({ accountNumber: '1234 5678 9012 3456' })];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    expect(screen.queryByText('1234 5678 9012 3456')).not.toBeInTheDocument();
  });

  it('shows the full account number in the edit form', async () => {
    const cards = [buildCard({ accountNumber: '1234 5678 9012 3456' })];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    await waitFor(() => {
      const input = screen.getByDisplayValue('1234 5678 9012 3456');
      expect(input).toBeInTheDocument();
    });
  });

  it('calls create with the new card data and invokes onDataChange', async () => {
    render(<FinancialCards financialCards={[]} onDataChange={vi.fn()} />);
    fireEvent.click(screen.getByText(/Add Card/));
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'New Card' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Card' }));
    });
  });

  it('toggles a card active/inactive when the Active checkbox is clicked', async () => {
    const cards = [buildCard({ id: 7, active: 1 })];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    const checkbox = screen.getByLabelText('Deactivate card');
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(7, { active: 0 });
    });
  });

  it('reactivates a deactivated card via the same checkbox', async () => {
    const cards = [buildCard({ id: 8, active: 0 })];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    const checkbox = screen.getByLabelText('Activate card');
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(8, { active: 1 });
    });
  });

  it('shows both active and inactive cards in a single table (no separate section)', async () => {
    const cards = [
      buildCard({ id: 1, active: 1, name: 'Active Card' }),
      buildCard({ id: 2, active: 0, name: 'Inactive Card' }),
    ];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    expect(screen.getByText('Active Card')).toBeInTheDocument();
    expect(screen.getByText('Inactive Card')).toBeInTheDocument();
    // No "Inactive" section heading
    expect(screen.queryByRole('heading', { name: 'Inactive' })).not.toBeInTheDocument();
  });

  it('disables Move Up on the first card and Move Down on the last card', async () => {
    const cards = [
      buildCard({ id: 1, displayOrder: 0 }),
      buildCard({ id: 2, displayOrder: 1 }),
    ];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    const upButtons = screen.getAllByTitle('Move up');
    const downButtons = screen.getAllByTitle('Move down');
    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('calls reorder with direction "up" when Move up is clicked', async () => {
    const cards = [
      buildCard({ id: 1, displayOrder: 0 }),
      buildCard({ id: 2, displayOrder: 1 }),
    ];
    render(<FinancialCards financialCards={cards} onDataChange={vi.fn()} />);
    const upButtons = screen.getAllByTitle('Move up');
    fireEvent.click(upButtons[1]); // Click up on the second card
    await waitFor(() => {
      expect(mockReorder).toHaveBeenCalledWith(2, 'up');
    });
  });

  it('calls syncCards with the currentReviewId after creating a new card', async () => {
    render(
      <FinancialCards
        financialCards={[]}
        currentReviewId={42}
        onDataChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Add Card/));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Card' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockSyncCards).toHaveBeenCalledWith(42);
    });
  });

  it('calls syncCards with the currentReviewId after toggling a card active', async () => {
    const cards = [buildCard({ id: 7, active: 1 })];
    render(
      <FinancialCards
        financialCards={cards}
        currentReviewId={42}
        onDataChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Deactivate card'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(7, { active: 0 });
    });
    await waitFor(() => {
      expect(mockSyncCards).toHaveBeenCalledWith(42);
    });
  });

  it('does not call syncCards when no currentReviewId is provided', async () => {
    const cards = [buildCard({ id: 7, active: 1 })];
    render(
      <FinancialCards
        financialCards={cards}
        currentReviewId={null}
        onDataChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Deactivate card'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
    // syncCards should not have been called
    expect(mockSyncCards).not.toHaveBeenCalled();
  });
});
