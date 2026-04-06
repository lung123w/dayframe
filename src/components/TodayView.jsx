import React, { useMemo } from 'react';
import { FaCalendarDay, FaPlus, FaCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import DailyTimeline from './DailyTimeline';
import PlannerHabitsPanel from './PlannerHabitsPanel';
import { generateRecurringTasks } from '../utils/recurrence';
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

export default function TodayView({ tasks, projects, onTaskClick, onNewTask, onStatusUpdate, onDataChange }) {
  const today = useMemo(() => toLocalDateStr(new Date()), []);

  const todayDate = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }, [today]);

  // Tasks due today (including recurring)
  const todayTasks = useMemo(() => {
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

  const pendingToday = todayTasks.filter(t => t.status !== 'completed');
  const completedToday = todayTasks.filter(t => t.status === 'completed');
  const completedCount = completedToday.length;
  const totalCount = todayTasks.length + overdueTasks.length;

  const getProject = id => projects.find(p => p.id === id);

  const renderTaskCard = (task, isOverdue = false) => {
    const project = getProject(task.projectId);
    const isCompleted = task.status === 'completed';
    const key = task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id;

    return (
      <div
        key={key}
        className={`tv-task${isCompleted ? ' tv-task--done' : ''}${isOverdue ? ' tv-task--overdue' : ''}`}
        style={{ borderLeftColor: project?.color || '#E2E8F0' }}
        onClick={() => onTaskClick && onTaskClick(task)}
      >
        <button
          className="tv-status-btn"
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
              </div>
              {overdueTasks.map(t => renderTaskCard(t, true))}
            </div>
          )}

          {/* Today's pending tasks */}
          <div className="tv-section">
            <div className="tv-section-header">
              <span>Today — {pendingToday.length} remaining</span>
              <button className="tv-add-inline-btn" onClick={() => onNewTask && onNewTask(today)}>
                <FaPlus /> Add task
              </button>
            </div>
            {pendingToday.length === 0 ? (
              <div className="tv-empty">
                {overdueTasks.length === 0 ? 'No tasks for today — add one!' : 'All done for today!'}
              </div>
            ) : (
              pendingToday.map(t => renderTaskCard(t))
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
