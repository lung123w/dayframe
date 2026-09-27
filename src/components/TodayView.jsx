import React, { useMemo, useRef, useState, useCallback } from 'react';
import { FaCalendarDay, FaPlus, FaCircle, FaCheckCircle, FaExclamationCircle, FaArrowUp, FaArrowDown, FaPen, FaCalendarAlt } from 'react-icons/fa';
import DailyTimeline from './DailyTimeline';
import PlannerHabitsPanel from './PlannerHabitsPanel';
import DeferPopover from './DeferPopover';
import { generateRecurringTasks } from '../utils/recurrence';
import { mergeOrder } from '../utils/todayOrder';
import { taskService } from '../api';
import './TodayView.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

function getTaskKey(task) {
  return task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : String(task.id);
}

export default function TodayView({ tasks, projects, todayOrder, onTodayOrderChange, onTaskClick, onNewTask, onStatusUpdate, onDataChange }) {
  const today = useMemo(() => toLocalDateStr(new Date()), []);
  const dragSrcKey = useRef(null);
  const dragSrcIsOverdue = useRef(false);
  const deferBtnRef = useRef(null);
  const [todayDropActive, setTodayDropActive] = useState(false);
  const [deferTaskId, setDeferTaskId] = useState(null);

  const todayDate = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }, [today]);

  // Tasks due today (including recurring)
  const rawTodayTasks = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);
    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        result.push(...generateRecurringTasks(task, dayStart, dayEnd));
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === today) {
        result.push(task);
      }
    }
    return result;
  }, [tasks, today]);

  // Overdue tasks (pending, due before today, not today)
  const overdueTasks = useMemo(() => {
    return tasks.filter(t =>
      t.status === 'pending' &&
      t.dueDate &&
      toLocalDateStr(t.dueDate) < today &&
      !t.isRecurring
    ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks, today]);

  const handlePullToToday = useCallback(async () => {
    if (!overdueTasks.length) return;
    await Promise.all(overdueTasks.map(t => taskService.update(t.id, { dueDate: today })));
    if (onDataChange) onDataChange();
  }, [overdueTasks, today, onDataChange]);

  // Apply stored order to today's pending tasks
  const pendingToday = useMemo(() => {
    const pending = rawTodayTasks.filter(t => t.status !== 'completed');
    return mergeOrder(todayOrder, pending);
  }, [rawTodayTasks, todayOrder]);

  const completedToday = useMemo(() => rawTodayTasks.filter(t => t.status === 'completed'), [rawTodayTasks]);

  const completedCount = completedToday.length;
  const totalCount = rawTodayTasks.length + overdueTasks.length;

  const getProject = id => projects.find(p => p.id === id);

  // ── Reorder helpers ──
  const reorderAndSave = (newList) => {
    const newOrder = newList.map(getTaskKey);
    if (onTodayOrderChange) onTodayOrderChange(newOrder);
  };

  const moveTask = (idx, direction) => {
    const newList = [...pendingToday];
    const target = idx + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[idx], newList[target]] = [newList[target], newList[idx]];
    reorderAndSave(newList);
  };

  // ── Drag handlers ──
  const handleDragStart = (e, key, isOverdue = false) => {
    dragSrcKey.current = key;
    dragSrcIsOverdue.current = isOverdue;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Drop onto today section: reschedule overdue task to today
  const handleDropOnToday = useCallback(async (e) => {
    e.preventDefault();
    setTodayDropActive(false);
    if (!dragSrcIsOverdue.current) return;
    const key = dragSrcKey.current;
    dragSrcKey.current = null;
    dragSrcIsOverdue.current = false;
    const task = overdueTasks.find(t => getTaskKey(t) === key);
    if (!task) return;
    await taskService.update(task.id, { dueDate: today });
    if (onDataChange) onDataChange();
  }, [overdueTasks, today, onDataChange]);

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (dragSrcIsOverdue.current) return; // handled by section drop
    if (dragSrcKey.current === targetKey) return;
    const newList = [...pendingToday];
    const srcIdx = newList.findIndex(t => getTaskKey(t) === dragSrcKey.current);
    const tgtIdx = newList.findIndex(t => getTaskKey(t) === targetKey);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [removed] = newList.splice(srcIdx, 1);
    newList.splice(tgtIdx, 0, removed);
    reorderAndSave(newList);
    dragSrcKey.current = null;
  };

  const handleDefer = useCallback(async (task, newDate) => {
    await taskService.update(task.id, { dueDate: newDate });
    if (onDataChange) onDataChange();
    setDeferTaskId(null);
  }, [onDataChange]);

  const renderTaskCard = (task, isOverdue = false, idx = -1, listLen = 0) => {
    const project = getProject(task.projectId);
    const isCompleted = task.status === 'completed';
    const key = getTaskKey(task);
    const isDraggable = !isCompleted; // overdue tasks are now draggable to today

    return (
      <div
        key={key}
        className={`tv-task${isCompleted ? ' tv-task--done' : ''}${isOverdue ? ' tv-task--overdue tv-task--draggable' : ''}`}
        style={{ borderLeftColor: project?.color || '#E2E8F0' }}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => handleDragStart(e, key, isOverdue) : undefined}
        onDragOver={isDraggable ? handleDragOver : undefined}
        onDrop={isDraggable ? (e) => handleDrop(e, key) : undefined}
        onClick={() => onTaskClick && onTaskClick(task)}
      >
        <button
          className="tv-status-btn"
          draggable={false}
          onMouseDown={e => e.preventDefault()}
          onClick={e => {
            e.stopPropagation();
            if (onStatusUpdate) onStatusUpdate(task, isCompleted ? 'pending' : 'completed');
          }}
          title="Toggle status"
        >
          {isOverdue
            ? <FaExclamationCircle className="tv-status-icon tv-status-icon--overdue" />
            : isCompleted
              ? <FaCheckCircle className="tv-status-icon tv-status-icon--done" />
              : <FaCircle className="tv-status-icon tv-status-icon--todo" />
          }
        </button>

        <div className="tv-task-content">
          <div className="tv-task-title-row">
            <span className={`tv-task-title${isCompleted ? ' tv-task-title--done' : ''}`}>
              {task.title}
            </span>
            {isOverdue && (
              <span className="tv-overdue-badge">Overdue</span>
            )}
            {task.startTime && (
              <span className="tv-time-badge">
                {formatTime(task.startTime)}
                {task.endTime && ` – ${formatTime(task.endTime)}`}
              </span>
            )}
          </div>
          {task.description && (
            <div className="tv-task-description" dangerouslySetInnerHTML={{ __html: task.description }} />
          )}
          <div className="tv-task-meta">
            {project && <span className="tv-task-project" style={{ color: project.color }}>{project.name}</span>}
            {task.priority === 'high' && <span className="tv-priority tv-priority--high">High</span>}
          </div>
        </div>

        {/* Touch-friendly up/down reorder controls */}
        {isDraggable && (
          <div className="tv-reorder-btns" draggable={false} onMouseDown={e => e.preventDefault()} onClick={e => e.stopPropagation()}>
            <button
              className="tv-reorder-btn"
              draggable={false}
              disabled={idx === 0}
              onClick={() => moveTask(idx, -1)}
              title="Move up"
              aria-label="Move task up"
            >
              <FaArrowUp />
            </button>
            <button
              className="tv-reorder-btn"
              draggable={false}
              disabled={idx === listLen - 1}
              onClick={() => moveTask(idx, 1)}
              title="Move down"
              aria-label="Move task down"
            >
              <FaArrowDown />
            </button>
          </div>
        )}

        {/* Edit button */}
        <button
          className="tv-edit-btn"
          draggable={false}
          title="Edit task"
          aria-label="Edit task"
          onMouseDown={e => e.preventDefault()}
          onClick={e => { e.stopPropagation(); if (onTaskClick) onTaskClick(task); }}
        >
          <FaPen />
        </button>

        {/* Defer button - only for pending tasks */}
        {!isCompleted && (
          <button
            ref={deferTaskId === key ? deferBtnRef : null}
            className="tv-defer-btn"
            draggable={false}
            title="Defer to another date"
            aria-label="Defer task"
            onMouseDown={e => e.preventDefault()}
            onClick={e => {
              e.stopPropagation();
              setDeferTaskId(deferTaskId === key ? null : key);
            }}
          >
            <FaCalendarAlt />
          </button>
        )}

        {/* Defer popover */}
        {deferTaskId === key && !isCompleted && (
          <DeferPopover
            task={task}
            onDefer={handleDefer}
            onClose={() => setDeferTaskId(null)}
            anchorRef={deferBtnRef}
          />
        )}
      </div>
    );
  };

  return (
    <div className="today-view">
      <div className="today-header">
        <div className="today-header-left">
          <FaCalendarDay className="today-header-icon" />
          <div className="today-header-text">
            <h1 className="today-title">Today</h1>
            <p className="today-date">{todayDate}</p>
          </div>
        </div>
        <div className="today-header-right">
          {totalCount > 0 && (
            <span className="today-stats-text">
              {completedCount} of {totalCount} done
            </span>
          )}
          <button className="tv-new-task-btn" onClick={() => onNewTask && onNewTask(today)}>
            <FaPlus /> New Task
          </button>
        </div>
      </div>

      <div className="today-content">
        <div className="today-left-column">
          <PlannerHabitsPanel onDataChange={onDataChange} />
        </div>

        <div className="today-tasks-panel">
          {/* Overdue section */}
          {overdueTasks.length > 0 && (
            <div className="tv-section">
              <div className="tv-section-header tv-section-header--overdue">
                <FaExclamationCircle />
                <span>Overdue ({overdueTasks.length})</span>
                <button className="tv-pull-to-today-btn" onClick={handlePullToToday} title="Reschedule all overdue tasks to today">
                  Pull to today
                </button>
              </div>
              {overdueTasks.map(t => renderTaskCard(t, true))}
            </div>
          )}

          {/* Today's pending tasks */}
          <div
            className={`tv-section tv-section--today-drop${todayDropActive ? ' tv-section--drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={() => dragSrcIsOverdue.current && setTodayDropActive(true)}
            onDragLeave={() => setTodayDropActive(false)}
            onDrop={handleDropOnToday}
          >
            <div className="tv-section-header">
              <span>Today — {pendingToday.length} remaining</span>
            </div>

            {pendingToday.length === 0 ? (
              <div className="tv-empty">
                {overdueTasks.length === 0 ? 'No tasks for today — add one!' : 'All done for today!'}
              </div>
            ) : (
              pendingToday.map((t, idx) => renderTaskCard(t, false, idx, pendingToday.length))
            )}
          </div>

          {/* Completed today */}
          {completedToday.length > 0 && (
            <div className="tv-section">
              <div className="tv-section-header tv-section-header--done">
                <span>Completed ({completedToday.length})</span>
              </div>
              {completedToday.map(t => renderTaskCard(t))}
            </div>
          )}
        </div>

        <div className="today-timeline-panel">
          <DailyTimeline
            dateStr={today}
            tasks={tasks}
            projects={projects}
          />
        </div>
      </div>
    </div>
  );
}
