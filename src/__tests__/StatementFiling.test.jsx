import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// The step talks to the server through exactly three functions of
// `statementFilingService`. Everything here is mocked, so no test in this file can
// reach `/api/statement-filing/*` — the assertion in "never touches the network"
// proves it. Tests use the shape frozen in design.md D8.
const {
  mockPreview,
  mockRun,
  mockLastRun,
  mockGetCurrent,
  mockGetByMonth,
} = vi.hoisted(() => ({
  mockPreview: vi.fn(),
  mockRun: vi.fn(),
  mockLastRun: vi.fn(),
  mockGetCurrent: vi.fn(),
  mockGetByMonth: vi.fn(),
}));

vi.mock('../api', () => ({
  statementFilingService: {
    preview: mockPreview,
    run: mockRun,
    lastRun: mockLastRun,
  },
  monthlyReviewService: {
    getCurrent: mockGetCurrent,
    getByMonth: mockGetByMonth,
  },
}));

import StatementFiling from '../components/StatementFiling';
import MonthlyReview from '../components/MonthlyReview';

const BOX = 'C:\\Users\\user\\OneDrive\\0. Box';
const FINANCE_ROOT = 'C:\\Users\\user\\OneDrive\\2. Area\\A-Finance\\statement';
const AE_ROOT = 'C:\\Users\\user\\OneDrive\\2. Area\\A-A & E Family\\Statement';

function buildPlan(overrides = {}) {
  return {
    generatedAt: '2026-09-27T10:00:00.000Z',
    box: BOX,
    destinations: [
      { id: 'finance', root: FINANCE_ROOT },
      { id: 'ae', root: AE_ROOT },
    ],
    actions: [
      {
        sourceName: 'Sep.pdf',
        sourcePath: `${BOX}\\Sep.pdf`,
        sourceBytes: 303956,
        sourceMd5: '36d00b0675cb6dca1963b4a8f282af73',
        kind: 'rename_and_file',
        seriesId: 'boc_cc',
        statementMonth: '2026-09',
        identifiedBy: 'content',
        destinationId: 'finance',
        destinationPath: `${FINANCE_ROOT}\\2026`,
        targetName: 'boc_cc_sep26.pdf',
      },
      {
        sourceName: 'fam_clp_aug26.pdf',
        sourcePath: `${BOX}\\fam_clp_aug26.pdf`,
        sourceBytes: 120000,
        sourceMd5: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        kind: 'duplicate_cleanup',
        seriesId: 'fam_clp',
        statementMonth: '2026-08',
        identifiedBy: 'filename',
        destinationId: 'ae',
        destinationPath: `${AE_ROOT}\\2026`,
        targetName: 'fam_clp_aug26.pdf',
      },
      {
        sourceName: 'hsb_cc_sep26.pdf',
        sourcePath: `${BOX}\\hsb_cc_sep26.pdf`,
        sourceBytes: 210000,
        sourceMd5: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        kind: 'file',
        seriesId: 'hsb_cc',
        statementMonth: '2026-09',
        identifiedBy: 'filename',
        destinationId: 'finance',
        destinationPath: `${FINANCE_ROOT}\\2026`,
        targetName: 'hsb_cc_sep26.pdf',
      },
    ],
    skipped: [
      { name: 'UpNote Setup.exe', reason: 'not_pdf' },
      { name: 'Anthropic財務SKILL操作手冊.pdf', reason: 'unclassified', note: 'no_series_match' },
      { name: 'hsbc_cc_may26.pdf', reason: 'name_conflict', note: 'destination copy differs' },
      { name: 'hsb_ia_aug30.pdf', reason: 'needs_text_tool', note: 'pdftotext unavailable' },
    ],
    reported: {
      misfiled: [
        { folder: 'finance', name: 'fam_hsb_m_power_jan26.pdf', seriesId: 'fam_hsb_m_power', expectedFolder: 'ae' },
      ],
      nameVariants: [
        { folder: 'ae', name: 'fam_hsb_m_power_jul_26.pdf', expectedName: 'fam_hsb_m_power_jul26.pdf' },
      ],
      unknownNames: [
        { folder: 'finance', name: 'hsb_ia_22mar26.pdf' },
      ],
    },
    coverage: {
      year: 2026,
      series: [
        {
          seriesId: 'boc_cc',
          destinationId: 'finance',
          monthsPresent: ['2026-01', '2026-09'],
          monthsMissing: [
            '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
            '2026-08', '2026-10', '2026-11', '2026-12',
          ],
        },
      ],
    },
    counts: { planned: 3, skipped: 4, misfiled: 1, nameVariants: 1, unknownNames: 1 },
    ...overrides,
  };
}

function buildRun(overrides = {}) {
  return {
    ranAt: '2026-09-27T10:20:05.000Z',
    durationMs: 2411,
    filed: [
      { sourceName: 'Sep.pdf', targetName: 'boc_cc_sep26.pdf', destinationId: 'finance', md5: '36d0', status: 'filed' },
    ],
    cleaned: [
      { sourceName: 'fam_clp_aug26.pdf', matchedName: 'fam_clp_aug26.pdf', destinationId: 'ae', md5: 'aaaa', status: 'already_filed' },
    ],
    pendingRemoval: [
      { sourceName: 'hsb_cc_sep26.pdf', destinationId: 'finance', md5: 'bbbb', reason: 'onedrive_locked', attempts: 2 },
    ],
    skipped: [
      { name: 'UpNote Setup.exe', reason: 'not_pdf' },
      { name: 'Anthropic財務SKILL操作手冊.pdf', reason: 'unclassified', note: 'no_series_match' },
      { name: 'hsbc_cc_may26.pdf', reason: 'name_conflict', note: 'destination copy differs' },
    ],
    counts: { filed: 1, cleaned: 1, pendingRemoval: 1, skipped: 3 },
    note: '',
    ...overrides,
  };
}

function buildReview(overrides = {}) {
  return {
    id: 1,
    monthKey: '2026-09',
    year: 2026,
    month: 9,
    status: 'pending',
    checklist: [
      { id: 'item-1', text: 'Download bank statements', section: 'Personal Finance', order: 0, completed: false, completedAt: null },
    ],
    cardEntries: [],
    notes: '',
    images: [],
    ...overrides,
  };
}

describe('StatementFiling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLastRun.mockResolvedValue(null);
    mockPreview.mockResolvedValue(buildPlan());
    mockRun.mockResolvedValue({ run: buildRun(), plan: buildPlan() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── State 1: idle ─────────────────────────────────────────────────────────

  it('opens with the heading, the wording and both destination roots as text', async () => {
    render(<StatementFiling />);
    expect(await screen.findByText('File statements')).toBeInTheDocument();
    expect(screen.getByText(/Files the statement PDFs sitting in the Box/)).toBeInTheDocument();
    expect(screen.getByText(FINANCE_ROOT)).toBeInTheDocument();
    expect(screen.getByText(AE_ROOT)).toBeInTheDocument();
    expect(screen.getByText(BOX)).toBeInTheDocument();
  });

  it('cannot file anything before a preview: "File them now" is disabled and no plan is shown', async () => {
    render(<StatementFiling />);
    await screen.findByText('File statements');
    expect(screen.getByRole('button', { name: 'File them now' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check the box' })).toBeEnabled();
    expect(screen.queryByText('Will be filed')).not.toBeInTheDocument();
    expect(mockPreview).not.toHaveBeenCalled();
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('shows no last-run line and no error when there has never been a run', async () => {
    render(<StatementFiling />);
    await screen.findByText('File statements');
    await waitFor(() => expect(mockLastRun).toHaveBeenCalled());
    expect(screen.queryByText(/Last run:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no last-run line when the stored value is unparseable, and no error', async () => {
    mockLastRun.mockResolvedValue({ ranAt: 'not-a-date' });
    render(<StatementFiling />);
    await screen.findByText('File statements');
    await waitFor(() => expect(mockLastRun).toHaveBeenCalled());
    expect(screen.queryByText(/Last run:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no error when reading the last run fails', async () => {
    mockLastRun.mockRejectedValue(new Error('settings unavailable'));
    render(<StatementFiling />);
    await screen.findByText('File statements');
    await waitFor(() => expect(mockLastRun).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'File them now' })).toBeDisabled();
  });

  // ── State 6: last run ─────────────────────────────────────────────────────

  it('shows the stored last run on mount as local time plus the summary', async () => {
    mockLastRun.mockResolvedValue(buildRun());
    render(<StatementFiling />);
    const line = await screen.findByText(/Last run:/);
    expect(line.textContent).toMatch(/Last run: \d{4}-\d{2}-\d{2} \d{2}:\d{2} — filed 1/);
    expect(line.textContent).toMatch(/already filed 1/);
    expect(line.textContent).toMatch(/still locked in the Box 1/);
  });

  // ── State 3: the plan ─────────────────────────────────────────────────────

  it('renders the three groups plus coverage after Check the box', async () => {
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    await screen.findByText('Will be filed');

    expect(mockPreview).toHaveBeenCalledTimes(1);

    // Will be filed — sourceName → targetName + destination folder.
    expect(screen.getByText('Sep.pdf')).toBeInTheDocument();
    expect(screen.getByText('boc_cc_sep26.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('fam_clp_aug26.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Finance statements/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/A&E statements/).length).toBeGreaterThan(0);
    // The destination folder is spelled out on the row itself.
    expect(document.querySelectorAll('.mfr-filing-row-meta').length).toBeGreaterThan(0);

    // Left in the Box — each file with the rule that kept it.
    expect(screen.getByText('UpNote Setup.exe')).toBeInTheDocument();
    expect(screen.getByText('not a PDF')).toBeInTheDocument();
    expect(screen.getAllByText(/not identified as a statement/).length).toBeGreaterThan(0);
    expect(screen.getByText('destination already has a different file')).toBeInTheDocument();

    // Reported — each entry with the sentence explaining why nothing was done.
    expect(screen.getByText('fam_hsb_m_power_jan26.pdf')).toBeInTheDocument();
    expect(screen.getByText(/belongs in A&E statements, not in Finance statements — reported only, never moved\./)).toBeInTheDocument();
    expect(screen.getByText(/the canonical name is fam_hsb_m_power_jul26\.pdf — reported only, never renamed\./)).toBeInTheDocument();
    expect(screen.getByText(/matches no statement series — reported only, never moved\./)).toBeInTheDocument();

    // Month coverage — 12 cells for the year, present/missing per month.
    const cells = document.querySelectorAll('.mfr-filing-cell');
    expect(cells).toHaveLength(12);
    expect(document.querySelector('[data-month="2026-01"]').dataset.present).toBe('true');
    expect(document.querySelector('[data-month="2026-09"]').dataset.present).toBe('true');
    expect(document.querySelector('[data-month="2026-10"]').dataset.present).toBe('false');
    expect(screen.getByText(/2026 missing: Feb, Mar, Apr, May, Jun, Jul, Aug, Oct, Nov, Dec/)).toBeInTheDocument();
  });

  it('offers Check again once a plan is on screen', async () => {
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    expect(await screen.findByRole('button', { name: 'Check again' })).toBeEnabled();
  });

  // ── States 4 + 5: the run and its result ──────────────────────────────────

  it('runs the plan with no arguments and reports the outcome with the frozen wording', async () => {
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    const fileButton = await screen.findByRole('button', { name: 'File them now' });
    await waitFor(() => expect(fileButton).toBeEnabled());
    fireEvent.click(fileButton);

    const summary = await screen.findByRole('status');
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun).toHaveBeenCalledWith();
    expect(summary.textContent).toBe('filed 1 · already filed 1 · still locked in the Box 1 · left in the Box 3');
    // The wording rule: a verified copy is never a failure.
    expect(summary.textContent).not.toMatch(/failed|error/i);

    // Every row is annotated with what happened to it.
    expect(screen.getByText('filed', { selector: '.mfr-filing-outcome' })).toBeInTheDocument();
    expect(screen.getByText('already filed — Box copy removed')).toBeInTheDocument();
    const pending = screen.getByText(/Box copy still locked by OneDrive/);
    expect(pending.textContent).toBe(
      'filed — Box copy still locked by OneDrive; press File them now again in a minute'
    );
    expect(pending.textContent).not.toMatch(/failed|error/i);
  });

  it('updates the last-run line from the run it just made', async () => {
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    const fileButton = await screen.findByRole('button', { name: 'File them now' });
    await waitFor(() => expect(fileButton).toBeEnabled());
    fireEvent.click(fileButton);
    const line = await screen.findByText(/Last run:/);
    expect(line.textContent).toMatch(/filed 1 · already filed 1/);
  });

  it('annotates a file the run itself skipped with the rule that kept it', async () => {
    mockRun.mockResolvedValue({
      run: buildRun({
        filed: [],
        cleaned: [],
        pendingRemoval: [],
        skipped: [{ name: 'Sep.pdf', reason: 'read_error', note: 'EBUSY' }],
        counts: { filed: 0, cleaned: 0, pendingRemoval: 0, skipped: 1 },
      }),
      plan: buildPlan(),
    });
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    const fileButton = await screen.findByRole('button', { name: 'File them now' });
    await waitFor(() => expect(fileButton).toBeEnabled());
    fireEvent.click(fileButton);
    expect(await screen.findByText('left in the Box — the file could not be read (EBUSY)')).toBeInTheDocument();
  });

  // ── State 7: errors ───────────────────────────────────────────────────────

  it('shows a failed check in a role="alert" and keeps the section usable', async () => {
    mockPreview.mockRejectedValue(new Error('cannot read the Box (ENOENT)'));
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('cannot read the Box (ENOENT)');
    expect(screen.getByRole('button', { name: 'Check the box' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'File them now' })).toBeDisabled();
  });

  it('shows a failed run in a role="alert" and leaves the plan visible', async () => {
    mockRun.mockRejectedValue(new Error('statement filing run failed'));
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    const fileButton = await screen.findByRole('button', { name: 'File them now' });
    await waitFor(() => expect(fileButton).toBeEnabled());
    fireEvent.click(fileButton);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('statement filing run failed');
    expect(screen.getByText('Will be filed')).toBeInTheDocument();
  });

  // ── Accessibility / contract ──────────────────────────────────────────────

  it('uses real keyboard-reachable buttons', async () => {
    render(<StatementFiling />);
    await screen.findByText('File statements');
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('never touches the network itself — every call goes through the service', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<StatementFiling />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check the box' }));
    const fileButton = await screen.findByRole('button', { name: 'File them now' });
    await waitFor(() => expect(fileButton).toBeEnabled());
    fireEvent.click(fileButton);
    await screen.findByRole('status');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('MonthlyReview — where the step lives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLastRun.mockResolvedValue(null);
    mockGetCurrent.mockResolvedValue(buildReview());
    mockGetByMonth.mockResolvedValue(buildReview({ monthKey: '2020-01', status: 'completed' }));
  });

  it('renders the filing step between Photos and Reference on the current month', async () => {
    render(<MonthlyReview reviews={[]} financialCards={[]} onDataChange={vi.fn()} />);
    const heading = await screen.findByText('File statements');
    const photos = screen.getByText('Photos');
    const reference = screen.getByText('Reference');
    expect(photos.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders no filing step at all on a past month', async () => {
    const pastReview = buildReview({ id: 2, monthKey: '2020-01', year: 2020, month: 1, status: 'completed' });
    render(<MonthlyReview reviews={[pastReview]} financialCards={[]} onDataChange={vi.fn()} />);
    // The view opens on the current month, where the step is present.
    expect(await screen.findByText('File statements')).toBeInTheDocument();
    fireEvent.click(await screen.findByText('January 2020'));
    await screen.findByText(/Read-only: this review is for a past month/);
    expect(document.querySelector('.mfr-filing')).toBeNull();
    expect(screen.queryByText('File statements')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check the box' })).not.toBeInTheDocument();
  });
});
