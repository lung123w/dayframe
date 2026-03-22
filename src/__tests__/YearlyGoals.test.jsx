import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { mockGetByYear, mockUpsert, mockRichTextEditor } = vi.hoisted(() => ({
  mockGetByYear: vi.fn(),
  mockUpsert: vi.fn(),
  mockRichTextEditor: vi.fn(),
}));

vi.mock('../api', () => ({
  yearlyGoalService: {
    getByYear: mockGetByYear,
    upsert: mockUpsert,
  },
}));

vi.mock('../components/RichTextEditor', () => ({
  default: (props) => {
    mockRichTextEditor(props);
    return (
      <div>
        <div data-testid="vision-rich-editor">Rich editor mounted</div>
        <input
          aria-label="Vision rich editor input"
          value={props.content || ''}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
        />
      </div>
    );
  },
}));

import YearlyGoals from '../components/YearlyGoals';

describe('YearlyGoals vision rich text integration', () => {
  const sampleImage = 'data:image/png;base64,AAA';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByYear.mockResolvedValue({ vision: '', goals: '[]', images: '[]' });
    mockUpsert.mockResolvedValue({ id: 1 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders rich editor for vision and removes textarea', async () => {
    render(<YearlyGoals />);

    expect(await screen.findByTestId('vision-rich-editor')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/describe your vision for this year/i)).not.toBeInTheDocument();
  });

  it('changing vision saves via upsert with HTML payload', async () => {
    render(<YearlyGoals />);

    const input = await screen.findByLabelText('Vision rich editor input');

    vi.useFakeTimers();
    fireEvent.change(input, { target: { value: '<p>Big yearly vision</p>' } });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      year: new Date().getFullYear(),
      vision: '<p>Big yearly vision</p>',
    }));
  });

  it('blur triggers immediate save with latest editor value', async () => {
    render(<YearlyGoals />);

    await screen.findByTestId('vision-rich-editor');
    const initialProps = mockRichTextEditor.mock.calls.at(-1)[0];

    act(() => {
      initialProps.onChange('<p>Blur latest value</p>');
      initialProps.onBlur();
    });

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
        vision: '<p>Blur latest value</p>',
      }));
    });
  });

  it('upsert payload includes year, vision, goals, and images fields', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '',
      goals: JSON.stringify([{ text: 'Stretch goal', completed: false }]),
      images: JSON.stringify(['data:image/png;base64,AAA']),
    });

    render(<YearlyGoals />);

    const input = await screen.findByLabelText('Vision rich editor input');

    vi.useFakeTimers();
    fireEvent.change(input, { target: { value: '<p>Contract payload</p>' } });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      year: new Date().getFullYear(),
      vision: '<p>Contract payload</p>',
      goals: [{ text: 'Stretch goal', completed: false }],
      images: JSON.stringify(['data:image/png;base64,AAA']),
    }));

    const payload = mockUpsert.mock.calls.at(-1)[0];
    expect(payload).toEqual(expect.objectContaining({
      year: expect.any(Number),
      vision: expect.any(String),
      goals: expect.any(Array),
      images: expect.any(String),
    }));
  });

  it('loads existing HTML vision into rich editor', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '<h2>2026 Vision</h2><p>Ship confidently</p>',
      goals: '[]',
      images: '[]',
    });

    render(<YearlyGoals />);

    await waitFor(() => {
      expect(mockRichTextEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '<h2>2026 Vision</h2><p>Ship confidently</p>',
        })
      );
    });
  });

  it('clicking image thumbnail opens lightbox', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '',
      goals: '[]',
      images: JSON.stringify([sampleImage]),
    });

    render(<YearlyGoals />);

    const thumbnail = await screen.findByAltText('Goal 1');
    fireEvent.click(thumbnail);

    expect(screen.getByRole('dialog', { name: /image preview/i })).toBeInTheDocument();
    expect(screen.getByAltText('Full size')).toBeInTheDocument();
  });

  it('closes lightbox when clicking overlay', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '',
      goals: '[]',
      images: JSON.stringify([sampleImage]),
    });

    render(<YearlyGoals />);

    fireEvent.click(await screen.findByAltText('Goal 1'));
    fireEvent.click(screen.getByRole('dialog', { name: /image preview/i }));

    expect(screen.queryByRole('dialog', { name: /image preview/i })).not.toBeInTheDocument();
  });

  it('closes lightbox when clicking close button', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '',
      goals: '[]',
      images: JSON.stringify([sampleImage]),
    });

    render(<YearlyGoals />);

    fireEvent.click(await screen.findByAltText('Goal 1'));
    fireEvent.click(screen.getByRole('button', { name: /close image preview/i }));

    expect(screen.queryByRole('dialog', { name: /image preview/i })).not.toBeInTheDocument();
  });

  it('keeps lightbox open when clicking full-size image', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '',
      goals: '[]',
      images: JSON.stringify([sampleImage]),
    });

    render(<YearlyGoals />);

    fireEvent.click(await screen.findByAltText('Goal 1'));
    fireEvent.click(screen.getByAltText('Full size'));

    expect(screen.getByRole('dialog', { name: /image preview/i })).toBeInTheDocument();
    expect(screen.getByAltText('Full size')).toBeInTheDocument();
  });

  it('closes lightbox when pressing Escape', async () => {
    mockGetByYear.mockResolvedValue({
      vision: '',
      goals: '[]',
      images: JSON.stringify([sampleImage]),
    });

    render(<YearlyGoals />);

    fireEvent.click(await screen.findByAltText('Goal 1'));
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /image preview/i })).not.toBeInTheDocument();
    });
  });
});
