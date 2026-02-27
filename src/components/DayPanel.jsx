import React, { useMemo } from 'react';
import { FaPlus, FaCircle, FaCheckCircle, FaSpinner, FaTrash, FaEdit } from 'react-icons/fa';
import './DayPanel.css';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: 'H', medium: 'M', low: 'L' };

function toLocalDateStr(date) {
  // Accepts a Date object or YYYY-MM-DD string, always returns YYYY-MM-DD in local time
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatHeading(dateStr) {
  const today = toLocalDateStr(new Date());
  const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000));
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));
  if (dateStr === today)     return { label: 'Today', sub: fmtFull(dateStr) };
  if (dateStr === tomorrow)  return { label: 'Tomorrow', sub: fmtFull(dateStr) };
  if (dateStr === yesterday) return { label: 'Yesterday', sub: fmtFull(dateStr) };
  return { label: fmtWeekday(dateStr), sub: fmtFull(dateStr) };
}

function fmtWeekday(dateStr) {
  // Parse without timezone shift: treat YYYY-MM-DD as local
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}

function fmtFull(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric'
  });
}

const STATUS_CYCLE = { todo: 'in-progress', 'in-progress': 'completed', completed: 'todo' };
const STATUS_ICON = {
  'todo':        <FaCircle className="day-status-icon day-status-icon--todo" />,
  'in-progress': <FaSpinner className="day-status-icon day-status-icon--progress" />,
  'completed':   <FaCheckCircle className="day-status-icon day-status-icon--done" />,
};
const STATUS_LABEL = { todo: 'To Do', 'in-progress': 'In Progress', completed: 'Done' };

export default function DayPanel({ date, tasks, projects, teamMembers, onTaskClick, onStatusUpdate, onNewTask, onDeleteTask }) {
  const dayTasks = useMemo(() => {
    if (!date) return [];
    return tasks
      .filter(t => t.dueDate && toLocalDateStr(t.dueDate) === date)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  }, [tasks, date]);

  const getProject = id => projects.find(p => p.id === id);
  const getAssigneeNames = assignedTo => {
    const ids = Array.isArray(assignedTo) ? assignedTo : (assignedTo != null ? [assignedTo] : []);
    return ids.map(id => teamMembers.find(m => m.id === id)?.name).filter(Boolean).join(', ');
  };

  const { label, sub } = date ? formatHeading(date) : { label: '—', sub: '' };

  const todo       = dayTasks.filter(t => t.status === 'todo');
  const inProgress = dayTasks.filter(t => t.status === 'in-progress');
  const completed  = dayTasks.filter(t => t.status === 'completed');

  const renderTask = (task) => {
    const project   = getProject(task.projectId);
    const assignees = getAssigneeNames(task.assignedTo);
    const isCompleted = task.status === 'completed';

    return (
      <div
        key={task.id}
        className={`day-task-row${isCompleted ? ' day-task-row--done' : ''}`}
        style={{ borderLeftColor: project?.color || '#E2E8F0' }}
      >
        {/* Status toggle button */}
        <button
          className="day-status-btn"
          title={`Mark as ${STATUS_LABEL[STATUS_CYCLE[task.status]]}`}
          onClick={() => onStatusUpdate(task, STATUS_CYCLE[task.status])}
        >
          {STATUS_ICON[task.status]}
        </button>

        {/* Content */}
        <div className="day-task-content">
          <span className={`day-task-title${isCompleted ? ' day-task-title--done' : ''}`}>
            {task.title}
          </span>
          <div className="day-task-meta">
            {project && (
              <span className="day-meta-chip" style={{ color: project.color, borderColor: project.color + '50' }}>
                <span className="day-meta-dot" style={{ background: project.color }} />
                {project.name}
              </span>
            )}
            <span className={`day-priority-badge day-priority-badge--${task.priority || 'low'}`}>
              {PRIORITY_LABEL[task.priority] || 'L'}
            </span>
            {assignees && (
              <span className="day-meta-chip day-meta-chip--assignee">{assignees}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="day-task-actions">
          <button className="day-action-btn day-action-btn--edit" title="Edit task" onClick={() => onTaskClick(task)}>
            <FaEdit />
          </button>
          {onDeleteTask && (
            <button className="day-action-btn day-action-btn--delete" title="Delete task" onClick={() => onDeleteTask(task.id)}>
              <FaTrash />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (title, items, emptyMsg) => (
    <div className="day-section">
      <div className="day-section-header">
        <span className="day-section-title">{title}</span>
        <span className="day-section-count">{items.length}</span>
      </div>
      {items.length === 0
        ? <div className="day-section-empty">{emptyMsg}</div>
        : items.map(renderTask)
      }
    </div>
  );

  return (
    <div className="day-panel">
      {/* Header */}
      <div className="day-panel-header">
        <div className="day-panel-heading">
          <span className="day-panel-label">{label}</span>
          <span className="day-panel-sub">{sub}</span>
        </div>
        <button
          className="day-panel-new-btn"
          onClick={() => onNewTask(date)}
          title="New task for this day"
        >
          <FaPlus /> New Task
        </button>
      </div>

      {/* Summary bar */}
      <div className="day-panel-summary">
        <span className="day-summary-chip day-summary-chip--total">
          {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
        </span>
        {inProgress.length > 0 && (
          <span className="day-summary-chip day-summary-chip--progress">{inProgress.length} active</span>
        )}
        {completed.length > 0 && (
          <span className="day-summary-chip day-summary-chip--done">{completed.length} done</span>
        )}
      </div>

      {/* Task sections */}
      <div className="day-panel-body">
        {dayTasks.length === 0 ? (
          <div className="day-panel-empty">
            <span className="day-panel-empty-icon">📋</span>
            <span>No tasks for this day.</span>
            <button className="day-panel-add-first" onClick={() => onNewTask(date)}>
              <FaPlus /> Add a task
            </button>
          </div>
        ) : (
          <>
            {renderSection('To Do', todo, 'Nothing left to do!')}
            {renderSection('In Progress', inProgress, 'Nothing in progress.')}
            {renderSection('Completed', completed, 'Nothing completed yet.')}
          </>
        )}
      </div>
    </div>
  );
}
