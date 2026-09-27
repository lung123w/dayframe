/**
 * The Today view no longer mounts the Timeline panel (ADR-017, owner request
 * 2026-09-27): `TodayView.jsx` still prints each row's own time in
 * `.tv-task-time`, and `DailyTimeline.jsx` / `DailyTimeline.css` stay in the
 * repo on purpose — re-rendering them from `TodayView.jsx` is the way back.
 *
 * Scope note: this file does not cover the modal's own `startTime`/`endTime`
 * editing. That path is unchanged because `TaskModal.jsx` is untouched, and the
 * tester exercises it in a browser (open a timed row, save). The Week view's
 * time badge is already covered by `DayColumn.test.jsx:356-400`; there is no
 * `startTime` case in `TaskModal.test.jsx`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { render, screen, fireEvent } from '@testing-library/react';

// Radix needs a ResizeObserver, which jsdom does not implement.
globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };

vi.mock('../api', () => ({
  taskService: { update: vi.fn(() => Promise.resolve()) },
  habitService: { getAll: vi.fn(() => Promise.resolve([])) },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve()),
    deleteByDate: vi.fn(() => Promise.resolve()),
  },
  workflowStepService: { getAll: vi.fn(() => Promise.resolve([])) },
  workflowCompletionService: { getForDate: vi.fn(() => Promise.resolve([])) },
}));

import TodayView from '../components/TodayView';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeTask(overrides = {}) {
  return {
    id: 1,
    title: 'Task A',
    status: 'pending',
    dueDate: todayStr(),
    priority: 'medium',
    projectId: null,
    description: '',
    ...overrides,
  };
}

function renderTodayView(tasks) {
  const callbacks = {
    onTodayOrderChange: vi.fn(),
    onTaskClick: vi.fn(),
    onNewTask: vi.fn(),
    onStatusUpdate: vi.fn(),
    onDataChange: vi.fn(),
  };
  const utils = render(
    <TodayView tasks={tasks} projects={[]} todayOrder={[]} {...callbacks} />
  );
  return { ...callbacks, ...utils };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TodayView without the Timeline panel', () => {
  it('T1 — renders none of the panel’s markup', () => {
    // Both tasks are present so the assertions are not vacuous: with this
    // fixture the pre-change panel rendered `.tl-container`, a "Timeline"
    // heading and a "No time set:" list for the untimed task.
    const { container } = renderTodayView([
      makeTask({ id: 1, title: 'Timed task', startTime: '09:00', endTime: '10:30' }),
      makeTask({ id: 2, title: 'Untimed task' }),
    ]);

    expect(container.querySelector('.tl-container')).toBeNull();
    expect(container.querySelector('.tl-header-title')).toBeNull();
    expect(screen.queryByText(/^Timeline$/)).toBeNull();
    expect(screen.queryByText(/No time set/i)).toBeNull();
  });

  it('T2 — a timed task is still reachable and editable from Today', () => {
    const timed = makeTask({ id: 1, title: 'Timed task', startTime: '09:00', endTime: '10:30' });
    const untimed = makeTask({ id: 2, title: 'Untimed task' });
    const { onTaskClick } = renderTodayView([timed, untimed]);

    const row = screen.getByText('Timed task').closest('.tv-task');
    expect(row).not.toBeNull();

    // The row carries the time the panel used to draw — same `formatTime`.
    const meta = row.querySelector('.tv-task-meta');
    expect(meta).not.toBeNull();
    expect(meta.textContent).toBe('9am – 10:30am');

    // Clicking the row is the path into TaskModal, where the times are edited.
    fireEvent.click(row);
    expect(onTaskClick).toHaveBeenCalledWith(timed);

    // An untimed task renders as well, with an empty metadata block.
    const untimedRow = screen.getByText('Untimed task').closest('.tv-task');
    expect(untimedRow).not.toBeNull();
    expect(untimedRow.querySelector('.tv-task-meta').textContent).toBe('');
  });

  it('T3 — the hidden component is kept and TodayView no longer names it', () => {
    // The reversible-hide guard: a later dead-code pass must not sweep the
    // retained component or its stylesheet.
    expect(existsSync('src/components/DailyTimeline.jsx')).toBe(true);
    expect(existsSync('src/components/DailyTimeline.css')).toBe(true);

    const todaySource = readFileSync('src/components/TodayView.jsx', 'utf8');
    expect(todaySource).not.toContain('DailyTimeline');
  });
});
