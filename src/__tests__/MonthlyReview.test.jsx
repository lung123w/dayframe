import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const {
  mockGetCurrent,
  mockGetByMonth,
  mockCreateForMonth,
  mockToggleChecklistItem,
  mockUpdateCardEntry,
  mockUpdateNotes,
  mockUpdateImages,
  mockComplete,
  mockReopen,
} = vi.hoisted(() => ({
  mockGetCurrent: vi.fn(),
  mockGetByMonth: vi.fn(),
  mockCreateForMonth: vi.fn(),
  mockToggleChecklistItem: vi.fn(),
  mockUpdateCardEntry: vi.fn(),
  mockUpdateNotes: vi.fn(),
  mockUpdateImages: vi.fn(),
  mockComplete: vi.fn(),
  mockReopen: vi.fn(),
}));

vi.mock('../api', () => ({
  monthlyReviewService: {
    getCurrent: mockGetCurrent,
    getByMonth: mockGetByMonth,
    createForMonth: mockCreateForMonth,
    toggleChecklistItem: mockToggleChecklistItem,
    updateCardEntry: mockUpdateCardEntry,
    updateNotes: mockUpdateNotes,
    updateImages: mockUpdateImages,
    complete: mockComplete,
    reopen: mockReopen,
  },
}));

import MonthlyReview from '../components/MonthlyReview';

const DEFAULT_FINANCIAL_CARDS = [
  { id: 1, name: 'Hang Seng CC', institution: 'Hang Seng Bank', cardType: 'credit', accountNumber: '1234 5678 9012 3456', displayOrder: 0, active: 1 },
];

function buildReview(overrides = {}) {
  return {
    id: 1,
    monthKey: '2026-08',
    year: 2026,
    month: 8,
    reviewDate: new Date(2026, 7, 29).toISOString(),
    status: 'pending',
    checklist: [
      { id: 'item-1', text: 'Download bank statements', section: 'Personal Finance', order: 0, completed: false, completedAt: null },
      { id: 'item-2', text: 'Pay credit card', section: 'Personal Finance', order: 1, completed: true, completedAt: '2026-08-15T10:00:00Z' },
      { id: 'item-3', text: 'Check credit rating', section: 'Credit Rating', order: 0, completed: false, completedAt: null },
    ],
    cardEntries: [
      {
        cardId: 1,
        cardName: 'Hang Seng CC',
        cardInstitution: 'Hang Seng Bank',
        accountNumber: '1234 5678 9012 3456',
        statementSaved: false,
        amount: '',
        dueDate: '',
        moneyProVerified: false,
        ppsSetUp: false,
        moneyProRecorded: false,
        notes: '',
      },
    ],
    completedAt: null,
    notes: '',
    ...overrides,
  };
}

function makeImageFile(name = 'receipt.png', type = 'image/png') {
  return new File(['fake-image-bytes'], name, { type });
}

function makePasteEvent(files) {
  return {
    clipboardData: {
      items: files.map((file) => ({ type: file.type, getAsFile: () => file })),
    },
  };
}

describe('MonthlyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetCurrent.mockResolvedValue(buildReview());
    mockGetByMonth.mockImplementation(async (monthKey) => buildReview({ monthKey, status: 'completed', completedAt: '2026-07-29T10:00:00Z' }));
    mockToggleChecklistItem.mockImplementation(async (id, itemId) => {
      const review = buildReview();
      const item = review.checklist.find(i => i.id === itemId);
      item.completed = !item.completed;
      item.completedAt = item.completed ? new Date().toISOString() : null;
      return review;
    });
    mockUpdateCardEntry.mockImplementation(async () => buildReview());
    mockUpdateNotes.mockImplementation(async (id, notes) => buildReview({ notes }));
    mockUpdateImages.mockImplementation(async (id, images) => buildReview({ images }));
    mockCreateForMonth.mockImplementation(async (monthKey) => buildReview({ monthKey }));
    mockComplete.mockImplementation(async () => buildReview({ status: 'completed', completedAt: new Date().toISOString() }));
    mockReopen.mockImplementation(async () => buildReview({ status: 'in_progress', completedAt: null }));
  });

  it('loads and renders the current month review', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await waitFor(() => {
      expect(mockGetCurrent).toHaveBeenCalled();
    });
    expect(await screen.findByText('Monthly Financial Review')).toBeInTheDocument();
    expect(screen.getByText('Download bank statements')).toBeInTheDocument();
    expect(screen.getByText('Check credit rating')).toBeInTheDocument();
  });

  it('shows past months in read-only mode with a banner', async () => {
    const pastReview = buildReview({
      monthKey: '2020-01',
      year: 2020,
      month: 1,
      reviewDate: new Date(2020, 0, 25).toISOString(),
      status: 'completed',
      completedAt: '2020-01-25T10:00:00Z',
    });
    render(
      <MonthlyReview
        reviews={[pastReview]}
        financialCards={DEFAULT_FINANCIAL_CARDS}
        onDataChange={vi.fn()}
      />
    );
    // Click the past-month entry in the side list
    const pastItem = await screen.findByText('January 2020');
    fireEvent.click(pastItem);
    await waitFor(() => {
      expect(screen.getByText(/Read-only: this review is for a past month/)).toBeInTheDocument();
    });
  });

  it('hides the Mark complete button on past months and shows Reopen when status is completed', async () => {
    const pastReview = buildReview({
      monthKey: '2020-01',
      status: 'completed',
      completedAt: '2020-01-25T10:00:00Z',
    });
    render(<MonthlyReview reviews={[pastReview]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const pastItem = await screen.findByText('January 2020');
    fireEvent.click(pastItem);
    await waitFor(() => {
      expect(screen.queryByText(/Mark complete/)).not.toBeInTheDocument();
    });
    // Reopen only shows for current month; on a past month it is not shown (we don't allow editing past)
    expect(screen.queryByText(/Reopen/)).not.toBeInTheDocument();
  });

  it('shows the full account number in the card table by default', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Hang Seng CC');
    expect(screen.getByText('1234 5678 9012 3456')).toBeInTheDocument();
    // The masked form should NOT be present initially
    expect(screen.queryByText('****3456')).not.toBeInTheDocument();
  });

  it('masks the account number when the user clicks the hide toggle', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Hang Seng CC');
    const hideBtn = screen.getByLabelText('Hide account number');
    fireEvent.click(hideBtn);
    await waitFor(() => {
      expect(screen.getByText('****3456')).toBeInTheDocument();
    });
    expect(screen.queryByText('1234 5678 9012 3456')).not.toBeInTheDocument();
  });

  it('unmasks the account number when the user clicks the show toggle after hiding', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Hang Seng CC');
    // First hide
    fireEvent.click(screen.getByLabelText('Hide account number'));
    await waitFor(() => {
      expect(screen.getByText('****3456')).toBeInTheDocument();
    });
    // Then show again
    fireEvent.click(screen.getByLabelText('Show account number'));
    await waitFor(() => {
      expect(screen.getByText('1234 5678 9012 3456')).toBeInTheDocument();
    });
    expect(screen.queryByText('****3456')).not.toBeInTheDocument();
  });

  it('hides cards independently ??masking one card does not affect others', async () => {
    const review = buildReview();
    review.cardEntries = [
      { ...review.cardEntries[0], cardId: 1, cardName: 'Card One', accountNumber: '1111 1111 1111 1111' },
      { ...review.cardEntries[0], cardId: 2, cardName: 'Card Two', accountNumber: '2222 2222 2222 2222' },
    ];
    mockGetCurrent.mockResolvedValue(review);
    const twoCards = [
      { id: 1, name: 'Card One', active: 1 },
      { id: 2, name: 'Card Two', active: 1 },
    ];
    render(<MonthlyReview reviews={[]} financialCards={twoCards} onDataChange={vi.fn()} />);
    await screen.findByText('Card One');
    // Both numbers visible initially
    expect(screen.getByText('1111 1111 1111 1111')).toBeInTheDocument();
    expect(screen.getByText('2222 2222 2222 2222')).toBeInTheDocument();
    // Hide the first card only
    const hideButtons = screen.getAllByLabelText('Hide account number');
    fireEvent.click(hideButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('****1111')).toBeInTheDocument();
    });
    // The second card is still visible
    expect(screen.getByText('2222 2222 2222 2222')).toBeInTheDocument();
  });

  it('renders the payment tracking table with all 7 columns', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Hang Seng CC');
    expect(screen.getByText('Stmt')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('MoneyPro')).toBeInTheDocument();
    expect(screen.getByText('PPS')).toBeInTheDocument();
    expect(screen.getByText('Recorded')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('calls toggleChecklistItem when a checklist checkbox is clicked', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Download bank statements');
    const checkbox = screen.getByLabelText('Download bank statements');
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(mockToggleChecklistItem).toHaveBeenCalledWith(1, 'item-1');
    });
  });

  it('calls complete when Mark complete is clicked', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const btn = await screen.findByText(/Mark complete/);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(1);
    });
  });

  it('calls reopen when Reopen is clicked on a completed current-month review', async () => {
    mockGetCurrent.mockResolvedValue(buildReview({ status: 'completed', completedAt: new Date().toISOString() }));
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const btn = await screen.findByText(/Reopen/);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockReopen).toHaveBeenCalledWith(1);
    });
  });

  it('calls updateCardEntry when the statement-saved checkbox toggles', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Hang Seng CC');
    const stmt = screen.getByLabelText('Statement saved');
    fireEvent.click(stmt);
    await waitFor(() => {
      expect(mockUpdateCardEntry).toHaveBeenCalledWith(1, 1, { statementSaved: true });
    });
  });

  it('filters out inactive cards from the card table', async () => {
    const review = buildReview();
    review.cardEntries = [
      { ...review.cardEntries[0], cardId: 1, cardName: 'Active Card', accountNumber: '1111' },
      { ...review.cardEntries[0], cardId: 2, cardName: 'Inactive Card', accountNumber: '2222' },
    ];
    mockGetCurrent.mockResolvedValue(review);
    const financialCards = [
      { id: 1, name: 'Active Card', active: 1 },
      { id: 2, name: 'Inactive Card', active: 0 },
    ];
    render(<MonthlyReview reviews={[]} financialCards={financialCards} onDataChange={vi.fn()} />);
    await screen.findByText('Active Card');
    // The active card is visible
    expect(screen.getByText('1111')).toBeInTheDocument();
    // The inactive card is hidden
    expect(screen.queryByText('Inactive Card')).not.toBeInTheDocument();
    expect(screen.queryByText('2222')).not.toBeInTheDocument();
    // A small "(1 of 2 shown ??1 inactive hidden)" note is shown
    expect(screen.getByText(/1 of 2 shown/)).toBeInTheDocument();
  });

  it('shows the Other To-Do / Notes textarea on the current month', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const textarea = await screen.findByLabelText('Monthly notes');
    expect(textarea).toBeInTheDocument();
  });

  it('saves notes to the server on textarea blur', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const textarea = await screen.findByLabelText('Monthly notes');
    fireEvent.change(textarea, { target: { value: 'Call accountant about Q2' } });
    fireEvent.blur(textarea);
    await waitFor(() => {
      expect(mockUpdateNotes).toHaveBeenCalledWith(1, 'Call accountant about Q2');
    });
  });

  it('renders past-month notes as read-only pre-formatted text', async () => {
    mockGetByMonth.mockResolvedValue(buildReview({
      monthKey: '2020-01',
      status: 'completed',
      notes: 'Q1 wrap-up notes\nNext: review insurance',
    }));
    const pastReview = buildReview({ monthKey: '2020-01', status: 'completed', notes: 'Q1 wrap-up notes' });
    render(<MonthlyReview reviews={[pastReview]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const pastItem = await screen.findByText('January 2020');
    fireEvent.click(pastItem);
    await waitFor(() => {
      expect(screen.getByText('Q1 wrap-up notes')).toBeInTheDocument();
    });
    // Textarea should NOT appear in read-only mode
    expect(screen.queryByLabelText('Monthly notes')).not.toBeInTheDocument();
  });

  it('shows "No notes for this month." for past months with empty notes', async () => {
    const pastReview = buildReview({ monthKey: '2020-01', status: 'completed', notes: '' });
    render(<MonthlyReview reviews={[pastReview]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const pastItem = await screen.findByText('January 2020');
    fireEvent.click(pastItem);
    await waitFor(() => {
      expect(screen.getByText(/No notes for this month/)).toBeInTheDocument();
    });
  });

  it('renders a Reference section with the tithe link and abbreviation tables', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Monthly Financial Review');
    expect(screen.getByText('Reference')).toBeInTheDocument();
    // Tithe link
    const titheLink = screen.getByRole('link', { name: /Yan Fook Church offering/i });
    expect(titheLink).toBeInTheDocument();
    expect(titheLink).toHaveAttribute('href', 'https://www.yanfook.org.hk/offering');
    expect(titheLink).toHaveAttribute('target', '_blank');
    expect(titheLink).toHaveAttribute('rel', 'noopener noreferrer');
    // Abbreviation tables: both group headings present
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText("Emily & Anderson's New Family Account")).toBeInTheDocument();
    // Spot-check a few well-known entries
    expect(screen.getByText('Hang Seng Bank Credit Card')).toBeInTheDocument();
    expect(screen.getByText('HSBC One Account')).toBeInTheDocument();
    expect(screen.getByText('hsb_cc_jan19')).toBeInTheDocument();
    expect(screen.getByText('hkbn_jan19')).toBeInTheDocument();
  });

  it('renders the tithe checklist item with a link to the church offering page', async () => {
    const review = buildReview();
    review.checklist = [
      ...review.checklist,
      {
        id: 'item-tithe',
        key: 'pf-7c',
        text: 'Upload the tithe receipt to the church website',
        link: 'https://www.yanfook.org.hk/offering',
        section: 'Personal Finance',
        order: 5,
        completed: false,
        completedAt: null,
      },
    ];
    mockGetCurrent.mockResolvedValue(review);
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Upload the tithe receipt to the church website');
    // The inline link next to the tithe item points to /offering.
    // The page also has a "Yan Fook Church offering" link in the Reference
    // section that points to the same URL. Use getAllByRole and assert
    // at least one matching link is present next to the item.
    const links = screen.getAllByRole('link', { name: /Open/ });
    const offeringLinks = links.filter((a) => a.getAttribute('href') === 'https://www.yanfook.org.hk/offering');
    expect(offeringLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Add Month form in the history sidebar', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Monthly Financial Review');
    expect(screen.getByLabelText('Year for new month')).toBeInTheDocument();
    expect(screen.getByLabelText('Month for new month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/ })).toBeInTheDocument();
  });

  it('calls createForMonth with the selected year-month and switches to it', async () => {
    const onDataChange = vi.fn();
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={onDataChange} />);
    await screen.findByText('Monthly Financial Review');
    // Select a far-future month so it definitely does not exist
    const yearSelect = screen.getByLabelText('Year for new month');
    fireEvent.change(yearSelect, { target: { value: '2027' } });
    const monthSelect = screen.getByLabelText('Month for new month');
    fireEvent.change(monthSelect, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    await waitFor(() => {
      expect(mockCreateForMonth).toHaveBeenCalledWith('2027-03');
    });
    await waitFor(() => {
      expect(onDataChange).toHaveBeenCalled();
    });
  });

  it('disables the Add button when the selected month already has a review', async () => {
    // 'July 2026' (2026-07) is in the past but the test setup only has current-month review.
    // The mock side-bar list has only the current month; a custom month in the past that's
    // in the loaded reviews list will trigger the disabled state.
    const existingPastReview = buildReview({ monthKey: '2026-04', year: 2026, month: 4 });
    render(
      <MonthlyReview
        reviews={[existingPastReview]}
        financialCards={DEFAULT_FINANCIAL_CARDS}
        onDataChange={vi.fn()}
      />
    );
    await screen.findByText('Monthly Financial Review');
    const yearSelect = screen.getByLabelText('Year for new month');
    fireEvent.change(yearSelect, { target: { value: '2026' } });
    const monthSelect = screen.getByLabelText('Month for new month');
    fireEvent.change(monthSelect, { target: { value: '4' } });
    const addBtn = screen.getByRole('button', { name: /Add/ });
    expect(addBtn).toBeDisabled();
  });

  it('shows an error message when the server returns a duplicate-review error', async () => {
    mockCreateForMonth.mockRejectedValueOnce(new Error('Review for this month already exists'));
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Monthly Financial Review');
    const yearSelect = screen.getByLabelText('Year for new month');
    fireEvent.change(yearSelect, { target: { value: '2027' } });
    const monthSelect = screen.getByLabelText('Month for new month');
    fireEvent.change(monthSelect, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to create review for the selected month|Review for this month already exists/)).toBeInTheDocument();
    });
  });

  it('defaults the Add Month form to next month (so the Add button is enabled by default)', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    await screen.findByText('Monthly Financial Review');
    // Find the Add button — it should be enabled because the default is next month
    const addBtn = screen.getByRole('button', { name: /Add/ });
    expect(addBtn).not.toBeDisabled();
    // The Year select should be set to the next year if December, otherwise current year
    const yearSelect = screen.getByLabelText('Year for new month');
    const monthSelect = screen.getByLabelText('Month for new month');
    const now = new Date();
    const expectedNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    expect(yearSelect.value).toBe(String(expectedNext.getFullYear()));
    expect(monthSelect.value).toBe(String(expectedNext.getMonth() + 1));
  });
  // --- Photos (finance-review-photo-paste) ---

  it('adds a pasted image to the gallery and persists it via updateImages', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const zone = await screen.findByLabelText('Paste a photo (Ctrl+V)');
    fireEvent.paste(zone, makePasteEvent([makeImageFile('receipt.png')]));
    await waitFor(() => {
      expect(mockUpdateImages).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateImages.mock.calls[0][0]).toBe(1);
    const sentImages = mockUpdateImages.mock.calls[0][1];
    expect(sentImages).toHaveLength(1);
    expect(sentImages[0]).toMatch(/^data:image\/png;base64,/);
    expect(await screen.findByAltText('Review photo 1')).toBeInTheDocument();
  });

  it('removes a stored photo and persists the remaining array', async () => {
    mockGetCurrent.mockResolvedValue(buildReview({ images: ['data:image/png;base64,AAA'] }));
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const thumb = await screen.findByAltText('Review photo 1');
    expect(thumb).toHaveAttribute('src', 'data:image/png;base64,AAA');
    fireEvent.click(screen.getByLabelText('Remove photo 1'));
    await waitFor(() => {
      expect(mockUpdateImages).toHaveBeenCalledWith(1, []);
    });
  });

  it('rejects an oversized pasted image with a visible message and adds no thumbnail', async () => {
    render(<MonthlyReview reviews={[]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    const zone = await screen.findByLabelText('Paste a photo (Ctrl+V)');
    const huge = makeImageFile('huge.png');
    Object.defineProperty(huge, 'size', { value: 9 * 1024 * 1024 });
    fireEvent.paste(zone, makePasteEvent([huge]));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(mockUpdateImages).not.toHaveBeenCalled();
    expect(screen.queryByAltText('Review photo 1')).not.toBeInTheDocument();
  });

  it('renders past-month photos read-only with a working lightbox and no editing controls', async () => {
    mockGetByMonth.mockResolvedValue(buildReview({
      monthKey: '2020-01',
      status: 'completed',
      completedAt: '2020-01-25T10:00:00Z',
      images: ['data:image/png;base64,BBB'],
    }));
    const pastReview = buildReview({ monthKey: '2020-01', status: 'completed', completedAt: '2020-01-25T10:00:00Z' });
    render(<MonthlyReview reviews={[pastReview]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    fireEvent.click(await screen.findByText('January 2020'));
    const thumb = await screen.findByAltText('Review photo 1');
    expect(thumb).toHaveAttribute('src', 'data:image/png;base64,BBB');
    expect(screen.queryByLabelText('Paste a photo (Ctrl+V)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove photo 1')).not.toBeInTheDocument();
    fireEvent.click(thumb);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows the photo empty state for a read-only month without photos', async () => {
    const pastReview = buildReview({ monthKey: '2020-01', status: 'completed', completedAt: '2020-01-25T10:00:00Z' });
    render(<MonthlyReview reviews={[pastReview]} financialCards={DEFAULT_FINANCIAL_CARDS} onDataChange={vi.fn()} />);
    fireEvent.click(await screen.findByText('January 2020'));
    expect(await screen.findByText('No photos for this month.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Paste a photo (Ctrl+V)')).not.toBeInTheDocument();
  });

});

