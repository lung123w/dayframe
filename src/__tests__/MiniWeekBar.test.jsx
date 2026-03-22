import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MiniWeekBar from '../components/MiniWeekBar';

describe('MiniWeekBar Component', () => {
  const mockOnSelectDate = vi.fn();
  const mockOnPrevWeek = vi.fn();
  const mockOnNextWeek = vi.fn();

  const defaultProps = {
    selectedDate: '2026-03-09', // Monday
    onSelectDate: mockOnSelectDate,
    onPrevWeek: mockOnPrevWeek,
    onNextWeek: mockOnNextWeek,
    tasks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render 7 day buttons (Mon-Sun)', () => {
    render(<MiniWeekBar {...defaultProps} />);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });

    // 7 day buttons + 2 arrow buttons = 9 total buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(9);
  });

  it('should display the week label with correct date range', () => {
    render(<MiniWeekBar {...defaultProps} />);

    // Week of 2026-03-09 (Mon) to 2026-03-15 (Sun)
    expect(screen.getByText('Mar 9 - Mar 15, 2026')).toBeInTheDocument();
  });

  it('should highlight today', () => {
    // Set fake time to Wednesday 2026-03-11
    vi.setSystemTime(new Date(2026, 2, 11, 12, 0, 0));

    render(<MiniWeekBar {...defaultProps} />);

    // Find the Wed button — it should have the today class
    const wedButton = screen.getByText('Wed').closest('button');
    expect(wedButton).toHaveClass('mini-week-day--today');

    // Mon (selected) should NOT have today class
    const monButton = screen.getByText('Mon').closest('button');
    expect(monButton).not.toHaveClass('mini-week-day--today');
  });

  it('should highlight the selected date', () => {
    render(<MiniWeekBar {...defaultProps} />);

    // selectedDate is 2026-03-09 which is Monday
    const monButton = screen.getByText('Mon').closest('button');
    expect(monButton).toHaveClass('mini-week-day--selected');

    // Other days should not be selected
    const tueButton = screen.getByText('Tue').closest('button');
    expect(tueButton).not.toHaveClass('mini-week-day--selected');
  });

  it('should highlight both today and selected when they are the same day', () => {
    vi.setSystemTime(new Date(2026, 2, 9, 12, 0, 0));

    render(<MiniWeekBar {...defaultProps} />);

    const monButton = screen.getByText('Mon').closest('button');
    expect(monButton).toHaveClass('mini-week-day--today');
    expect(monButton).toHaveClass('mini-week-day--selected');
  });

  it('should call onSelectDate with date string when clicking a day', () => {
    render(<MiniWeekBar {...defaultProps} />);

    // Click Wednesday (2026-03-11)
    const wedButton = screen.getByText('Wed').closest('button');
    fireEvent.click(wedButton);

    expect(mockOnSelectDate).toHaveBeenCalledTimes(1);
    expect(mockOnSelectDate).toHaveBeenCalledWith('2026-03-11');
  });

  it('should call onPrevWeek when clicking the left arrow', () => {
    const { container } = render(<MiniWeekBar {...defaultProps} />);

    const arrows = container.querySelectorAll('.mini-week-arrow');
    // First arrow is the left (prev) arrow
    fireEvent.click(arrows[0]);

    expect(mockOnPrevWeek).toHaveBeenCalledTimes(1);
  });

  it('should call onNextWeek when clicking the right arrow', () => {
    const { container } = render(<MiniWeekBar {...defaultProps} />);

    const arrows = container.querySelectorAll('.mini-week-arrow');
    // Second arrow is the right (next) arrow
    fireEvent.click(arrows[1]);

    expect(mockOnNextWeek).toHaveBeenCalledTimes(1);
  });

  it('should display task count dots for days with tasks', () => {
    const tasks = [
      { id: 1, dueDate: '2026-03-09', title: 'Task 1' },
      { id: 2, dueDate: '2026-03-09', title: 'Task 2' },
      { id: 3, dueDate: '2026-03-11', title: 'Task 3' },
    ];

    render(<MiniWeekBar {...defaultProps} tasks={tasks} />);

    // Monday should show 2 tasks
    expect(screen.getByText('2')).toBeInTheDocument();
    // Wednesday should show 1 task
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should not display task count dots for days with zero tasks', () => {
    render(<MiniWeekBar {...defaultProps} />);

    // With no tasks, no dot spans should be rendered
    const dots = document.querySelectorAll('.mini-week-day-dots');
    expect(dots).toHaveLength(0);
  });

  it('should handle tasks with non-string dueDate formats', () => {
    const tasks = [
      { id: 1, dueDate: new Date(2026, 2, 10).toISOString(), title: 'ISO Task' },
    ];

    render(<MiniWeekBar {...defaultProps} tasks={tasks} />);

    // Tuesday (Mar 10) should show 1 task
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should calculate the correct week when selectedDate is mid-week', () => {
    render(<MiniWeekBar {...defaultProps} selectedDate="2026-03-12" />);

    // Thursday Mar 12 is still in the Mon Mar 9 - Sun Mar 15 week
    expect(screen.getByText('Mar 9 - Mar 15, 2026')).toBeInTheDocument();

    // Thursday should be selected
    const thuButton = screen.getByText('Thu').closest('button');
    expect(thuButton).toHaveClass('mini-week-day--selected');
  });

  it('anchors displayed week to current week regardless of selectedDate', () => {
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0)); // Tue Mar 10, 2026

    render(<MiniWeekBar {...defaultProps} selectedDate="2026-04-20" />);

    expect(screen.getByText('Mar 9 - Mar 15, 2026')).toBeInTheDocument();
  });

  it('should render day numbers for each day of the week', () => {
    render(<MiniWeekBar {...defaultProps} />);

    // March 9-15, 2026
    for (let d = 9; d <= 15; d++) {
      expect(screen.getByText(String(d))).toBeInTheDocument();
    }
  });
});
