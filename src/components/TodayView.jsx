import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FaCalendarDay, FaPlus, FaCircle, FaCheckCircle, FaExclamationCircle, FaArrowUp, FaArrowDown, FaPen } from 'react-icons/fa';
import DailyTimeline from './DailyTimeline';
import PlannerHabitsPanel from './PlannerHabitsPanel';
import DeferPopover from './DeferPopover';
import TooltipButton from './TooltipButton';
import UndoToast from './UndoToast';
import { generateRecurringTasks } from '../utils/recurrence';
import { mergeOrder } from '../utils/todayOrder';
import { handleRowKeyDown, tomorrowDateStr } from './keyboard';
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
  const undoSeq = useRef(0);
  const [todayDropActive, setTodayDropActive] = useState(false);
  const [undo, setUndo] = useState(null);

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

  // ── Undo (design.md §7 D11 — one action, 5 seconds, one mechanism) ──
  const offerUndo = (message, undoFn) => {
    undoSeq.current += 1;
    setUndo({ id: undoSeq.current, message, undo: undoFn });
  };

  const handleUndo = () => {
    const action = undo;
    setUndo(null);
    if (action) action.undo();
  };

  // ── Reorder helpers ──
  const reorderAndSave = (newList, previousKeys) => {
    const newOrder = newList.map(getTaskKey);
    if (onTodayOrderChange) onTodayOrderChange(newOrder);
    if (previousKeys) {
      offerUndo('Order updated', () => {
        if (onTodayOrderChange) onTodayOrderChange(previousKeys);
      });
    }
  };

  const moveTask = (idx, direction) => {
    const newList = [...pendingToday];
    const previousKeys = pendingToday.map(getTaskKey);
    const target = idx + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[idx], newList[target]] = [newList[target], newList[idx]];
    reorderAndSave(newList, previousKeys);
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
  const handleDropOnToday = async (e) => {
    e.preventDefault();
    setTodayDropActive(false);
    if (!dragSrcIsOverdue.current) return;
    const key = dragSrcKey.current;
    dragSrcKey.current = null;
    dragSrcIsOverdue.current = false;
    const task = overdueTasks.find(t => getTaskKey(t) === key);
    if (!task) return;
    const previousDueDate = task.dueDate;
    await taskService.update(task.id, { dueDate: today });
    if (onDataChange) onDataChange();
    offerUndo('Task moved to today', () => {
      taskService.update(task.id, { dueDate: previousDueDate }).then(() => onDataChange && onDataChange());
    });
  };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (dragSrcIsOverdue.current) return; // handled by section drop
    if (dragSrcKey.current === targetKey) return;
    const newList = [...pendingToday];
    const previousKeys = pendingToday.map(getTaskKey);
    const srcIdx = newList.findIndex(t => getTaskKey(t) === dragSrcKey.current);
    const tgtIdx = newList.findIndex(t => getTaskKey(t) === targetKey);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [removed] = newList.splice(srcIdx, 1);
    newList.splice(tgtIdx, 0, removed);
    dragSrcKey.current = null;
    reorderAndSave(newList, previousKeys);
  };

  const handleDefer = async (task, newDate) => {
    const previousDueDate = task.dueDate ?? null;
    await taskService.update(task.id, { dueDate: newDate });
    if (onDataChange) onDataChange();
    offerUndo('Task deferred', () => {
      taskService.update(task.id, { dueDate: previousDueDate }).then(() => onDataChange && onDataChange());
    });
  };

  const handleToggleStatus = (task) => {
    const previousStatus = task.status;
    const nextStatus = previousStatus === 'completed' ? 'pending' : 'completed';
    if (onStatusUpdate) onStatusUpdate(task, nextStatus);
    offerUndo(
      nextStatus === 'completed' ? 'Task completed' : 'Task reopened',
      () => { if (onStatusUpdate) onStatusUpdate(task, previousStatus); }
    );
  };

  const renderTaskRow = (task, isOverdue = false, idx = -1, listLen = 0) => {
    const project = getProject(task.projectId);
    const isCompleted = task.status === 'completed';
    const key = getTaskKey(task);
    const isDraggable = !isCompleted; // overdue tasks are now draggable to today
    const canReorder = isDraggable && idx >= 0;

    return (
      <div
        key={key}
        className={`tv-task${isCompleted ? ' tv-task--done' : ''}${isOverdue ? ' tv-task--overdue tv-task--draggable' : ''}`}
        tabIndex={0}
        data-kbd-row="true"
        onKeyDown={(event) => handleRowKeyDown(event, {
          onToggle: () => handleToggleStatus(task),
          onDefer: isCompleted ? undefined : () => handleDefer(task, tomorrowDateStr()),
        })}
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
            handleToggleStatus(task);
          }}
          aria-label={isCompleted ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
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
          </div>
          {task.description && (
            <div className="tv-task-description" dangerouslySetInnerHTML={{ __html: task.description }} />
          )}
        </div>

        <div className="tv-task-meta">
          {task.startTime && (
            <span className="tv-task-time">
              {formatTime(task.startTime)}
              {task.endTime && ` – ${formatTime(task.endTime)}`}
            </span>
          )}
          {project && (
            <span className="tv-task-project">
              <span className="tv-task-dot" style={{ background: project.color }} />
              {project.name}
            </span>
          )}
          {task.priority === 'high' && <span className="tv-priority tv-priority--high">High</span>}
        </div>

        {/* Row actions: revealed on hover OR focus, always visible where the
            viewport has no hover capability (F10 — nothing here depends on
            `:hover` alone). */}
        <div className="tv-row-actions" draggable={false} onMouseDown={e => e.preventDefault()} onClick={e => e.stopPropagation()}>
          {canReorder && (
            <>
              <TooltipButton
                label="Move task up"
                className="tv-move-btn"
                disabled={idx === 0}
                draggable={false}
                onClick={() => moveTask(idx, -1)}
              >
                <FaArrowUp />
              </TooltipButton>
              <TooltipButton
                label="Move task down"
                className="tv-move-btn"
                disabled={idx === listLen - 1}
                draggable={false}
                onClick={() => moveTask(idx, 1)}
              >
                <FaArrowDown />
              </TooltipButton>
            </>
          )}
          {!isCompleted && (
            <DeferPopover
              task={task}
              onDefer={handleDefer}
              trigger={
                <button className="tv-row-action" draggable={false} type="button">Defer</button>
              }
            />
          )}
          <TooltipButton
            label="Edit task"
            className="tv-row-action tv-row-action--icon"
            draggable={false}
            onClick={e => { e.stopPropagation(); if (onTaskClick) onTaskClick(task); }}
          >
            <FaPen />
          </TooltipButton>
        </div>
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

        <div className="today-tasks-panel" data-kbd-list="today">
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
              {overdueTasks.map(t => renderTaskRow(t, true))}
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
              pendingToday.map((t, idx) => renderTaskRow(t, false, idx, pendingToday.length))
            )}
          </div>

          {/* Completed today */}
          {completedToday.length > 0 && (
            <div className="tv-section">
              <div className="tv-section-header tv-section-header--done">
                <span>Completed ({completedToday.length})</span>
              </div>
              {completedToday.map(t => renderTaskRow(t))}
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

      {undo && (
        <UndoToast
          key={undo.id}
          message={undo.message}
          onUndo={handleUndo}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  );
}
