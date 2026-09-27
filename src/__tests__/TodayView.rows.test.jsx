import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

import { taskService } from '../api';
import TodayView from '../components/TodayView';

const CSS_PATH = 'src/components/TodayView.css';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
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

function renderTodayView(props = {}) {
  const callbacks = {
    onTodayOrderChange: vi.fn(),
    onTaskClick: vi.fn(),
    onNewTask: vi.fn(),
    onStatusUpdate: vi.fn(),
    onDataChange: vi.fn(),
  };
  render(
    <TodayView
      tasks={props.tasks || []}
      projects={props.projects || []}
      todayOrder={props.todayOrder || []}
      {...callbacks}
      {...props}
    />
  );
  return callbacks;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TodayView rows', () => {
  it('renders one hairline row per task instead of a card', () => {
    renderTodayView({ tasks: [makeTask(), makeTask({ id: 2, title: 'Task B' })] });

    const rows = document.querySelectorAll('.tv-task');
    expect(rows).toHaveLength(2);
    rows.forEach(row => {
      // No card fill, no left colour stripe, no shadow: nothing inline, the
      // stylesheet carries a hairline border only.
      expect(row.getAttribute('style')).toBeNull();
      expect(row.className).not.toMatch(/card/);
    });

    const css = readFileSync(CSS_PATH, 'utf8');
    const rowRule = css.match(/\.tv-task\s*\{[^}]*\}/)[0];
    expect(rowRule).toMatch(/border-bottom:\s*var\(--border\)/);
    expect(rowRule).toMatch(/background:\s*transparent/);
    expect(rowRule).not.toMatch(/border-left/);
    expect(rowRule).not.toMatch(/box-shadow/);
  });

  it('keeps every row action in the DOM and reachable without a pointer hover', async () => {
    const task = makeTask();
    renderTodayView({ tasks: [task] });

    const row = document.querySelector('.tv-task');
    // The row itself takes keyboard focus, so its actions are reachable by Tab.
    expect(row.tabIndex).toBe(0);
    row.focus();
    expect(document.activeElement).toBe(row);

    // The actions are rendered (not hover-conditional), and one of them works
    // from the focused row with no pointer involved at all.
    const deferAction = screen.getByRole('button', { name: /^defer$/i });
    expect(deferAction).toBeInTheDocument();
    fireEvent.click(deferAction);
    fireEvent.click(await screen.findByRole('button', { name: /tomorrow/i }));

    await waitFor(() => {
      expect(taskService.update).toHaveBeenCalledWith(task.id, { dueDate: tomorrowStr() });
    });
  });

  it('has no :hover-only rule for its row actions (static check)', () => {
    const css = readFileSync(CSS_PATH, 'utf8');
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim());

    const rowActionClasses = ['.tv-row-actions', '.tv-move-btn', '.tv-row-action'];
    const hoverGates = selectors.filter(sel =>
      sel.includes(':hover') && rowActionClasses.some(cls => sel.includes(cls))
    );
    expect(hoverGates.length).toBeGreaterThan(0);

    rowActionClasses.forEach(cls => {
      const nonHoverRule = selectors.some(sel => sel.includes(cls) && !sel.includes(':hover'));
      expect(nonHoverRule).toBe(true);
    });

    // Revealed on hover, on focus, and with no hover capability at all.
    expect(css).toMatch(/\.tv-task:hover \.tv-row-actions/);
    expect(css).toMatch(/\.tv-task:focus(?:-within)? \.tv-row-actions/);
    expect(css).toMatch(/@media \(hover: none\)\s*\{\s*\.tv-row-actions/);
  });

  it('marks the arrows as the touch reorder controls, at label size', () => {
    renderTodayView({ tasks: [makeTask(), makeTask({ id: 2, title: 'Task B' })] });

    const ups = screen.getAllByRole('button', { name: 'Move task up' });
    const downs = screen.getAllByRole('button', { name: 'Move task down' });
    expect(ups[0]).toBeDisabled();
    expect(ups[1]).toBeEnabled();
    expect(downs[0]).toBeEnabled();
    expect(downs[1]).toBeDisabled();

    const css = readFileSync(CSS_PATH, 'utf8');
    const moveRule = css.match(/\.tv-move-btn\s*\{[^}]*\}/)[0];
    expect(moveRule).toMatch(/font-size:\s*var\(--font-label\)/);
  });
});

describe('TodayView row actions', () => {
  it('offers a single undo after completing a row and restores the previous status', async () => {
    const task = makeTask();
    const { onStatusUpdate } = renderTodayView({ tasks: [task] });

    fireEvent.click(screen.getByLabelText('Complete "Task A"'));
    expect(onStatusUpdate).toHaveBeenCalledWith(task, 'completed');

    const undo = await screen.findByRole('button', { name: /undo/i });
    expect(screen.getByText(/task completed/i)).toBeInTheDocument();

    fireEvent.click(undo);
    expect(onStatusUpdate).toHaveBeenLastCalledWith(task, 'pending');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
    });
  });

  it('undoes a reorder back to the previous order', async () => {
    const { onTodayOrderChange } = renderTodayView({
      tasks: [makeTask(), makeTask({ id: 2, title: 'Task B' })],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Move task down' })[0]);
    expect(onTodayOrderChange).toHaveBeenCalledWith(['2', '1']);

    fireEvent.click(await screen.findByRole('button', { name: /undo/i }));
    expect(onTodayOrderChange).toHaveBeenLastCalledWith(['1', '2']);
  });

  it('undoes a defer back to the previous due date', async () => {
    const task = makeTask({ dueDate: todayStr() });
    renderTodayView({ tasks: [task] });

    fireEvent.click(screen.getByRole('button', { name: /^defer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /tomorrow/i }));

    await waitFor(() => {
      expect(taskService.update).toHaveBeenCalledWith(task.id, { dueDate: tomorrowStr() });
    });

    fireEvent.click(await screen.findByRole('button', { name: /undo/i }));

    await waitFor(() => {
      expect(taskService.update).toHaveBeenLastCalledWith(task.id, { dueDate: task.dueDate });
    });
  });
});
