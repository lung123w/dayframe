import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import DailyPlanner from '../components/DailyPlanner';

vi.mock('../components/BacklogSidebar', () => ({ default: () => <div>BacklogSidebar</div> }));
vi.mock('../components/PlannerHabitsPanel', () => ({ default: () => <div>PlannerHabitsPanel</div> }));
vi.mock('../components/DayColumn', () => ({ default: () => <div>DayColumn</div> }));
vi.mock('../components/YearlyGoals', () => ({ default: () => <div>YearlyGoals</div> }));
vi.mock('../components/WeeklyObjectives', () => ({ default: () => <div>WeeklyObjectives</div> }));
vi.mock('../components/DailyTimeline', () => ({ default: () => <div>DailyTimeline</div> }));
vi.mock('../components/DailyShutdown', () => ({ default: () => <div>DailyShutdown</div> }));

describe('DailyPlanner week navigation', () => {
  const defaultProps = {
    tasks: [],
    projects: [],
    subtasks: [],
    onTaskClick: vi.fn(),
    onStatusUpdate: vi.fn(),
    onNewTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onSubtaskToggle: vi.fn(),
    onAssignDate: vi.fn(),
    onDataChange: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves the visible week when clicking both arrows', () => {
    const { container, getByText } = render(<DailyPlanner {...defaultProps} />);

    expect(getByText('Mar 16 - Mar 22, 2026')).toBeInTheDocument();

    const arrows = container.querySelectorAll('.mini-week-arrow');
    fireEvent.click(arrows[1]);
    expect(getByText('Mar 23 - Mar 29, 2026')).toBeInTheDocument();

    fireEvent.click(arrows[0]);
    expect(getByText('Mar 16 - Mar 22, 2026')).toBeInTheDocument();
  });
});
