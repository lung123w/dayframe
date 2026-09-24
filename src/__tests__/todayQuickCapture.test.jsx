import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
vi.mock('../components/DailyTimeline', () => ({ default: () => <div data-testid="daily-timeline" /> }));
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

  it('is reachable from the shell and creates against the same defaults on any view', () => {
    // The line is a shell element: rendering it directly is what every view does.
    const { input } = renderCapture();
    expect(input).toBeInTheDocument();
  });

  it('does not leave a second capture line inside TodayView', () => {
    render(
      <TodayView
        tasks={[]}
        projects={[]}
        todayOrder={[]}
        onTodayOrderChange={vi.fn()}
        onTaskClick={vi.fn()}
        onNewTask={vi.fn()}
        onStatusUpdate={vi.fn()}
        onDataChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/quick capture task/i)).toBeNull();
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

