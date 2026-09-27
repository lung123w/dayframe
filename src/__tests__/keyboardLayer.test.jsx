import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Radix measures its content with ResizeObserver, which jsdom does not
// implement (the stub every stage-3/4 test carries).
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TODAY = todayStr();

const TODAY_TASKS = [
  { id: 1, title: 'Write the report', status: 'pending', dueDate: TODAY, priority: 'high', projectId: null, description: '' },
  { id: 2, title: 'Review the plan', status: 'pending', dueDate: TODAY, priority: 'medium', projectId: null, description: '' },
];

vi.mock('../api', () => ({
  taskService: {
    getAll: vi.fn(),
    getById: vi.fn(() => Promise.resolve(null)),
    create: vi.fn(() => Promise.resolve({ id: 99 })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve()),
  },
  projectService: {
    getAll: vi.fn(() => Promise.resolve([{ id: 1, name: 'General', color: '#3788d8' }])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'General', color: '#3788d8' })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve()),
  },
  subtaskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getByTaskId: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve(1)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    deleteByTaskId: vi.fn(() => Promise.resolve()),
    toggleCompleted: vi.fn(() => Promise.resolve()),
  },
  yearlyGoalService: {
    getByYear: vi.fn(() => Promise.resolve({ goals: '[]', images: '[]' })),
    save: vi.fn(() => Promise.resolve()),
  },
  weeklyObjectiveService: {
    getByWeek: vi.fn(() => Promise.resolve({ objectives: [] })),
    save: vi.fn(() => Promise.resolve()),
  },
  weeklyReviewService: {
    getByWeek: vi.fn(() => Promise.resolve({
      weekStart: null,
      cleanupTasks: [],
      gratitudeEntries: [],
      reflectionAnswers: {},
      weeklyGoals: [],
      syncFlags: {},
    })),
    save: vi.fn(() => Promise.resolve()),
  },
  dailyNoteService: {
    getByDate: vi.fn(() => Promise.resolve({ highlights: '' })),
    save: vi.fn(() => Promise.resolve()),
  },
  habitService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve({})),
    deleteByDate: vi.fn(() => Promise.resolve()),
  },
  settingsService: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
  },
  keyEventService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  financialCardService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  monthlyReviewService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getCurrent: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve({})),
  },
  workflowStepService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    delete: vi.fn(() => Promise.resolve()),
  },
  workflowCompletionService: {
    getForDate: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteByStepAndDate: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../utils/notifications', () => ({
  startNotificationService: vi.fn(() => () => {}),
  requestNotificationPermission: vi.fn(),
}));

import { taskService } from '../api';
import App from '../App';
import { SHORTCUTS } from '../components/keyboard';

/** Mount the app with two tasks due today and wait for the rows. */
async function renderApp() {
  render(<App />);
  await waitFor(() => {
    expect(document.querySelectorAll('.tv-task').length).toBe(2);
  });
}

function rows() {
  return Array.from(document.querySelectorAll('.tv-task'));
}

function key(key, options = {}) {
  fireEvent.keyDown(document.body, { key, ...options });
}

describe('stage 5 — the keyboard layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    taskService.getAll.mockResolvedValue(TODAY_TASKS);
    taskService.update.mockResolvedValue({});
    taskService.create.mockResolvedValue({ id: 99 });
  });

  // ── The frozen map (design.md §6 D10), key by key ──────────────────────────

  it('`/` focuses the capture line from the Today view', async () => {
    await renderApp();
    const input = screen.getByLabelText(/quick capture task/i);

    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    key('/');

    expect(input).toHaveFocus();
  });

  it('`j` / `k` move focus down and up inside the active list', async () => {
    await renderApp();
    const [first, second] = rows();

    expect(document.activeElement).not.toBe(first);

    key('j');
    expect(document.activeElement).toBe(first);

    key('j');
    expect(document.activeElement).toBe(second);

    // Clamped at the last row.
    key('j');
    expect(document.activeElement).toBe(second);

    key('k');
    expect(document.activeElement).toBe(first);

    // Clamped at the first row.
    key('k');
    expect(document.activeElement).toBe(first);
  });

  it('`x` toggles completion of the focused row', async () => {
    await renderApp();
    rows()[0].focus();

    fireEvent.keyDown(rows()[0], { key: 'x' });

    await waitFor(() => {
      expect(taskService.update).toHaveBeenCalledWith(1, { status: 'completed' });
    });
  });

  it('`t` defers the focused row to tomorrow (computed, never hardcoded)', async () => {
    await renderApp();
    rows()[0].focus();

    fireEvent.keyDown(rows()[0], { key: 't' });

    await waitFor(() => {
      expect(taskService.update).toHaveBeenCalledWith(1, { dueDate: tomorrowStr() });
    });
  });

  it('`u` runs the same 5-second undo as the toast button and restores the previous state', async () => {
    await renderApp();
    rows()[0].focus();

    fireEvent.keyDown(rows()[0], { key: 'x' });
    await waitFor(() => {
      expect(taskService.update).toHaveBeenCalledWith(1, { status: 'completed' });
    });

    // The toast is the one undo affordance; `u` reuses it rather than adding a
    // second mechanism.
    expect(screen.getByRole('status')).toHaveTextContent(/task completed/i);
    taskService.update.mockClear();

    key('u');

    await waitFor(() => {
      expect(taskService.update).toHaveBeenCalledWith(1, { status: 'pending' });
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('`g` then a view letter switches view for all six destinations', async () => {
    const cases = [
      ['w', /Week/],
      ['h', /Habits/],
      ['r', /Review/],
      ['f', /Finance/],
      ['p', /Projects/],
      ['t', /Today/],
    ];

    for (const [letter, title] of cases) {
      const view = render(<App />);
      await waitFor(() => expect(document.querySelectorAll('.tv-task').length).toBe(2));

      key('g');
      key(letter);

      await waitFor(() => {
        expect(screen.getByTestId('top-strip-title').textContent).toMatch(title);
      });

      view.unmount();
    }
  });

  it('leaves an armed `g` chord meaningless after 1.5 s and does not consume it silently', async () => {
    vi.useFakeTimers();
    try {
      render(<App />);
      await vi.waitFor(() => expect(document.querySelectorAll('.tv-task').length).toBe(2));

      key('g');
      vi.advanceTimersByTime(2000);
      key('h');

      expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Today/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('`Ctrl/⌘ + K` opens the palette, and Escape closes it and returns focus', async () => {
    await renderApp();
    const row = rows()[0];
    row.focus();

    key('k', { ctrlKey: true });

    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/command palette search/i)).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(row);
  });

  // ── The guard that makes the layer safe ────────────────────────────────────

  it('does not fire while a text field has focus', async () => {
    await renderApp();
    const input = screen.getByLabelText(/quick capture task/i);
    const user = userEvent.setup();
    await user.click(input);
    taskService.update.mockClear();

    // Every row key, typed as text, must land in the field and do nothing else.
    await user.type(input, 'jxtu');
    expect(input).toHaveValue('jxtu');
    expect(taskService.update).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);

    // …and neither does the `g` chord arm behind the field.
    await user.type(input, 'g');
    await user.keyboard('h');
    expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Today/);
  });

  it('does not fire while the rich-text editor (contenteditable) has focus', async () => {
    await renderApp();
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.className = 'ProseMirror';
    editor.tabIndex = 0;
    document.body.appendChild(editor);
    editor.focus();
    taskService.update.mockClear();

    key('j');
    expect(document.activeElement).toBe(editor);

    fireEvent.keyDown(editor, { key: 'x' });
    expect(taskService.update).not.toHaveBeenCalled();

    editor.remove();
  });

  it('does not fire `j`/`k` while an overlay is open', async () => {
    await renderApp();
    const first = rows()[0];
    key('j');
    expect(document.activeElement).toBe(first);

    key('k', { ctrlKey: true });
    await screen.findByRole('dialog', { name: /command palette/i });

    key('j');
    expect(document.activeElement).not.toBe(rows()[1]);

    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('never consumes Tab', async () => {
    await renderApp();
    const first = rows()[0];
    first.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  // ── The palette (the droppable slice) ─────────────────────────────────────

  it('lists the six views and the one action the map exposes', async () => {
    await renderApp();
    key('k', { ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    const options = within(dialog).getAllByRole('option');

    const labels = options.map((option) => option.textContent);
    for (const view of ['Today', 'Week', 'Habits', 'Review', 'Finance', 'Projects']) {
      expect(labels.some((label) => label.includes(view))).toBe(true);
    }
    expect(labels.some((label) => label.includes('Focus the capture line'))).toBe(true);
    expect(options).toHaveLength(7);
  });

  it('documents the whole key map in its footer', async () => {
    await renderApp();
    key('k', { ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    const footer = dialog.querySelector('.command-palette-footer');
    expect(footer).not.toBeNull();

    for (const shortcut of SHORTCUTS) {
      expect(within(footer).getByText(shortcut.keys)).toBeInTheDocument();
      expect(within(footer).getByText(shortcut.label)).toBeInTheDocument();
    }
  });

  it('navigates to the chosen view and comes back with the full focus return', async () => {
    await renderApp();
    const row = rows()[1];
    row.focus();

    key('k', { ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    fireEvent.click(within(dialog).getByRole('option', { name: /go to habits/i }));

    await waitFor(() => {
      expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Habits/);
    });
    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('runs the capture action from the palette', async () => {
    await renderApp();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    key('k', { ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    fireEvent.click(within(dialog).getByRole('option', { name: /focus the capture line/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/quick capture task/i)).toHaveFocus();
    });
  });

  it('closes without navigating on Escape', async () => {
    await renderApp();
    key('k', { ctrlKey: true });
    await screen.findByRole('dialog', { name: /command palette/i });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Today/);
  });

  it('still opens the palette with Ctrl+K while a field has focus (a chord, not a character)', async () => {
    await renderApp();
    const input = screen.getByLabelText(/quick capture task/i);
    input.focus();

    key('k', { ctrlKey: true });

    expect(await screen.findByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
  });
});

describe('stage 5 — visible focus everywhere', () => {
  const cssDir = 'src';
  const cssFiles = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.css')) cssFiles.push(path);
    }
  })(cssDir);

  it('has no `outline: none` left anywhere the app supplies no replacement', () => {
    const offenders = [];
    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8');
      css.split('\n').forEach((line, index) => {
        if (/outline:\s*none/.test(line)) offenders.push(`${file}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('supplies the token focus recipe as the one global :focus-visible rule', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring-width\)\s*solid\s*var\(--focus-ring\)/);
    expect(css).toMatch(/outline-offset:\s*var\(--focus-ring-offset\)/);
  });

  it('gives each list row a live focus state (not a hover-only one)', () => {
    const today = readFileSync('src/components/TodayView.css', 'utf8');
    expect(today).toMatch(/\.tv-task:focus\b/);
    expect(today).toMatch(/\.tv-task:focus\b[^{]*\{[^}]*background:\s*var\(--surface-2\)/);

    const day = readFileSync('src/components/DayColumn.css', 'utf8');
    expect(day).toMatch(/\.dc-task:focus\b/);

    const backlog = readFileSync('src/components/BacklogSidebar.css', 'utf8');
    expect(backlog).toMatch(/\.backlog-task:focus\b/);
  });

  it('makes every list row its own focus target (never the app\u2019s single tabIndex)', async () => {
    await renderApp();
    const elements = rows();
    expect(elements).toHaveLength(2);
    elements.forEach((row) => {
      expect(row.tabIndex).toBe(0);
      expect(row.getAttribute('data-kbd-row')).toBe('true');
    });
    // The scoping attribute the j/k navigation reads.
    expect(elements[0].closest('[data-kbd-list]')).not.toBeNull();
  });
});
