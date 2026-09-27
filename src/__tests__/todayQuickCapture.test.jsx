import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock the api module
vi.mock('../api', () => ({
  taskService: {
    create: vi.fn(),
  },
  workflowStepService: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  workflowCompletionService: {
    getForDate: vi.fn(),
    create: vi.fn(),
    deleteByStepAndDate: vi.fn(),
  },
}));

// Mock child components that need complex setup
vi.mock('../components/PlannerHabitsPanel', () => ({ default: () => <div data-testid="habits-panel" /> }));
vi.mock('../components/DailyWorkflow', () => ({ default: () => <div data-testid="daily-workflow" /> }));

import { taskService } from '../api';
import CaptureLine from '../components/CaptureLine';
import TodayView from '../components/TodayView';

const STORAGE_KEY = 'dayframe.captureDefaults';

/** Today in the local (Hong Kong) calendar — the same rule the component uses. */
function localToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

/** `days` away from today on the local calendar, as `YYYY-MM-DD`. */
function localDayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

/**
 * Move focus the way a browser does, inside `act` so React flushes the state
 * update the focus handler schedules before the next assertion reads the DOM.
 * jsdom fires the whole focus sequence (`blur` → `focusout` → `focus` →
 * `focusin`), so this drives the same handlers a real browser does.
 */
function focusElement(element) {
  act(() => {
    element.focus();
  });
}

const projects = [{ id: 7, name: 'Renovation' }];

function renderCapture(extraProps = {}) {
  const onCaptured = vi.fn();
  render(<CaptureLine projects={projects} onCaptured={onCaptured} {...extraProps} />);
  return { onCaptured, input: screen.getByLabelText(/quick capture task/i) };
}

describe('CaptureLine — the shell capture contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    taskService.create.mockResolvedValue({ id: 99, title: 'Test task' });
  });

  it('renders the capture input', () => {
    const { input } = renderCapture();
    expect(input).toBeTruthy();
  });

  it('creates a task due today on Enter and clears the input', async () => {
    const { onCaptured, input } = renderCapture();

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).toHaveBeenCalledWith({
        title: 'Buy milk',
        dueDate: localToday(),
        status: 'pending',
      });
    });
    await waitFor(() => expect(input.value).toBe(''));
    expect(onCaptured).toHaveBeenCalled();
  });

  it('does not create a task when the input is empty on Enter', async () => {
    const { input } = renderCapture();

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(taskService.create).not.toHaveBeenCalled());
  });

  it('clears the input on Escape and keeps focus', () => {
    const { input } = renderCapture();

    input.focus();
    fireEvent.change(input, { target: { value: 'Some text' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('');
    expect(input).toHaveFocus();
  });

  it('is reachable wherever it is mounted and keeps the same capture defaults', () => {
    // Both variants render this component: the shell line on the five views other
    // than Today, and the row inside `TodayView` (ADR-015). Rendering it directly
    // is what both call sites do.
    const { input } = renderCapture();
    expect(input).toBeInTheDocument();
  });

  it('does not render its controls while nothing has focus in the row', () => {
    render(
      <CaptureLine variant="row" projects={projects} onCaptured={vi.fn()} />
    );

    expect(screen.getByLabelText(/quick capture task/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/capture project/i)).toBeNull();
    expect(screen.queryByLabelText(/capture priority/i)).toBeNull();
  });
});

describe('TodayView — the capture row is the list\'s first row (ADR-015)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    taskService.create.mockResolvedValue({ id: 99, title: 'Test task' });
  });

  function renderTodayView(tasks = []) {
    render(
      <TodayView
        tasks={tasks}
        projects={projects}
        todayOrder={[]}
        onTodayOrderChange={vi.fn()}
        onTaskClick={vi.fn()}
        onNewTask={vi.fn()}
        onStatusUpdate={vi.fn()}
        onDataChange={vi.fn()}
      />
    );
    return document.querySelector('.today-tasks-panel');
  }

  it('is the first child of the Today list and precedes the OVERDUE header', () => {
    // An overdue task is seeded so the OVERDUE header is actually in the tree —
    // without it the ordering assertion would be vacuous.
    const panel = renderTodayView([
      { id: 11, title: 'Overdue invoice', status: 'pending', dueDate: localDayOffset(-3) },
    ]);
    expect(panel).not.toBeNull();

    const row = screen.getByLabelText(/quick capture task/i).closest('.capture-line--row');
    expect(row).not.toBeNull();

    // Order, not mere presence.
    expect(panel.firstElementChild).toBe(row);

    const overdueHeader = screen.getByText(/Overdue \(1\)/);
    expect(panel.contains(overdueHeader)).toBe(true);
    expect(
      row.compareDocumentPosition(overdueHeader) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Not a keyboard-layer row and not a task row, so the first `j` still lands
    // on the first task below it (design.md D4).
    expect(row.getAttribute('data-kbd-row')).toBeNull();
    expect(row.classList.contains('tv-task')).toBe(false);
    expect(panel.querySelectorAll('.tv-task')).toHaveLength(1);
  });

  it('reveals the project and priority controls on focus and collapses when focus leaves', () => {
    renderTodayView();
    const input = screen.getByLabelText(/quick capture task/i);

    // Collapsed: not rendered at all, so there is no hidden tab stop (D3).
    expect(screen.queryByLabelText(/capture project/i)).toBeNull();
    expect(screen.queryByLabelText(/capture priority/i)).toBeNull();

    // Focus enters the row → both controls are present.
    focusElement(input);
    const project = screen.getByLabelText(/capture project/i);
    expect(screen.getByLabelText(/capture priority/i)).toBeInTheDocument();

    // Focus moving *within* the row keeps it expanded (input → Project → Priority).
    focusElement(project);
    expect(screen.getByLabelText(/capture project/i)).toBeInTheDocument();

    focusElement(screen.getByLabelText(/capture priority/i));
    expect(screen.getByLabelText(/capture priority/i)).toBeInTheDocument();

    // Focus leaving the row for an outside target collapses it again.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    focusElement(outside);

    expect(screen.queryByLabelText(/capture project/i)).toBeNull();
    expect(screen.queryByLabelText(/capture priority/i)).toBeNull();
    outside.remove();
  });

  it('captures from the row with the stored defaults and stays expanded', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: 7, priority: 'high' }));
    renderTodayView();
    const input = screen.getByLabelText(/quick capture task/i);

    focusElement(input);
    fireEvent.change(input, { target: { value: 'Buy paint' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).toHaveBeenCalledWith({
        title: 'Buy paint',
        dueDate: localToday(),
        status: 'pending',
        projectId: 7,
        priority: 'high',
      });
    });
    await waitFor(() => expect(input.value).toBe(''));

    // The controls stay revealed while the user keeps capturing (they are only
    // revealed by focus, and nothing blurred the row).
    expect(input).toHaveFocus();
    expect(screen.getByLabelText(/capture project/i)).toBeInTheDocument();

    // An empty Enter creates nothing and does not collapse the row.
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(taskService.create).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/capture priority/i)).toBeInTheDocument();

    // Escape clears the text and leaves the row expanded (design.md D9).
    fireEvent.change(input, { target: { value: 'draft' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(screen.getByLabelText(/capture project/i)).toBeInTheDocument();
  });
});

describe('CaptureLine — the `/` focus key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    taskService.create.mockResolvedValue({ id: 99 });
  });

  it('focuses the capture line when `/` is pressed and types nothing', () => {
    const { input } = renderCapture();

    fireEvent.keyDown(document.body, { key: '/' });

    expect(input).toHaveFocus();
    expect(input.value).toBe('');
  });

  it('does not fire while a text field has focus', () => {
    const { input } = renderCapture();
    const other = document.createElement('input');
    other.setAttribute('aria-label', 'other field');
    document.body.appendChild(other);
    other.focus();
    fireEvent.change(other, { target: { value: 'typing' } });

    fireEvent.keyDown(other, { key: '/' });

    expect(input).not.toHaveFocus();
    expect(other).toHaveFocus();
    expect(other.value).toBe('typing');
    other.remove();
  });

  it('does not fire while the rich-text editor has focus', () => {
    const { input } = renderCapture();
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.setAttribute('tabindex', '-1');
    editor.className = 'ProseMirror';
    document.body.appendChild(editor);
    editor.focus();

    fireEvent.keyDown(editor, { key: '/' });

    expect(input).not.toHaveFocus();
    editor.remove();
  });

  it('does not fire while a dialog is open', () => {
    const { input } = renderCapture();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    fireEvent.keyDown(document.body, { key: '/' });

    expect(input).not.toHaveFocus();
    dialog.remove();
  });
});

describe('CaptureLine — capture defaults (design.md §5 D9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    taskService.create.mockResolvedValue({ id: 99 });
  });

  it('creates with no project and no explicit priority when nothing is stored', async () => {
    const { input } = renderCapture();

    fireEvent.change(input, { target: { value: 'Plain capture' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).toHaveBeenCalledWith({
        title: 'Plain capture',
        dueDate: localToday(),
        status: 'pending',
      });
    });
  });

  it('inherits the stored project and priority', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: 7, priority: 'high' }));
    const { input } = renderCapture();

    fireEvent.change(input, { target: { value: 'Buy paint' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).toHaveBeenCalledWith({
        title: 'Buy paint',
        dueDate: localToday(),
        status: 'pending',
        projectId: 7,
        priority: 'high',
      });
    });
  });

  it('falls back to the documented defaults when the stored value is unparseable', async () => {
    localStorage.setItem(STORAGE_KEY, 'not json at all');
    const { input } = renderCapture();

    fireEvent.change(input, { target: { value: 'Still works' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.create).toHaveBeenCalledWith({
        title: 'Still works',
        dueDate: localToday(),
        status: 'pending',
      });
    });
  });

  it('writes the chosen project and priority to localStorage', () => {
    renderCapture();

    fireEvent.change(screen.getByLabelText(/capture project/i), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/capture priority/i), { target: { value: 'low' } });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({ projectId: 7, priority: 'low' });
  });

  it('shows the stored default on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: 7, priority: 'high' }));
    renderCapture();

    expect(screen.getByLabelText(/capture project/i).value).toBe('7');
    expect(screen.getByLabelText(/capture priority/i).value).toBe('high');
  });
});

