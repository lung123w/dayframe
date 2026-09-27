import React, { useMemo } from 'react';
import { FaPlus, FaCircle, FaCheckCircle, FaSpinner, FaTrash, FaEdit, FaClock } from 'react-icons/fa';
import { generateRecurringTasks } from '../utils/recurrence';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import TooltipButton from './TooltipButton';
import './DayColumn.css';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_CYCLE = {
  pending: 'completed',
  completed: 'pending',
  todo: 'completed',
  'in-progress': 'completed',
};
const STATUS_ICON = {
  pending:     <FaCircle className="dc-status-icon dc-status-icon--todo" />,
  todo:        <FaCircle className="dc-status-icon dc-status-icon--todo" />,
  'in-progress': <FaSpinner className="dc-status-icon dc-status-icon--progress" />,
  'completed':   <FaCheckCircle className="dc-status-icon dc-status-icon--done" />,
};

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function formatDayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE');
}

function formatDayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMM d');
}

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

function formatScheduledTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? ' PM' : ' AM';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export default function DayColumn({
  dateStr,
  tasks,
  projects,
  subtasks,
  expanded = false,
  onTaskClick,
  onStatusUpdate,
  onNewTask,
  onDeleteTask,
  onSubtaskToggle,
  onEstimateChange,
  onDragOver,
  onDrop,
  onDayClick,
}) {
  const dayTasks = useMemo(() => {
    if (!dateStr) return [];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);

    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        const instances = generateRecurringTasks(task, dayStart, dayEnd);
        result.push(...instances);
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === dateStr) {
        result.push(task);
      }
    }
    return result.sort((a, b) => {
      // Sort by scheduledTime first (earliest first)
      const timeA = a.scheduledTime;
      const timeB = b.scheduledTime;
      
      // Tasks with scheduledTime come before tasks without
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;
      
      // Both have scheduledTime: sort by time
      if (timeA && timeB) {
        const compareTime = timeA.localeCompare(timeB);
        if (compareTime !== 0) return compareTime;
      }
      
      // Fall back to sortOrder, then priority
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    });
  }, [tasks, dateStr]);

  const subtasksByTaskId = useMemo(() => {
    const map = {};
    (subtasks || []).forEach(st => {
      if (!map[st.parentTaskId]) map[st.parentTaskId] = [];
      map[st.parentTaskId].push(st);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    return map;
  }, [subtasks]);

  const getProject = id => projects.find(p => p.id === id);

  const totalEstimated = dayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const todoTasks = dayTasks.filter(t => t.status !== 'completed');
  const doneTasks = dayTasks.filter(t => t.status === 'completed');

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const isTodayDate = isToday(dateObj);

  const [editingEstimate, setEditingEstimate] = React.useState(null);
  const [estimateValue, setEstimateValue] = React.useState('');
  const [dragOverIndex, setDragOverIndex] = React.useState(-1);

  const handleTaskDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverIndex(e.clientY < midY ? index : index + 1);
  };

  const handleColumnDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(-1);
    }
  };

  const handleEstimateSave = (task) => {
    const minutes = estimateValue ? parseInt(estimateValue, 10) : null;
    if (onEstimateChange) {
      onEstimateChange(task, minutes);
    }
    setEditingEstimate(null);
  };

  const renderTask = (task) => {
    const project = getProject(task.projectId);
    const isCompleted = task.status === 'completed';
    const subtaskTaskId = task.isRecurringInstance ? (task.recurringSourceId || task.id) : task.id;
    const taskSubtasks = subtasksByTaskId[subtaskTaskId] || [];
    const completedSubtasks = taskSubtasks.filter(st => st.completed).length;
    const taskKey = task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id;
    const isEditingEst = editingEstimate === taskKey;

    // Mini column: compact single-line display
    if (!expanded) {
      return (
        <div
          key={taskKey}
          className={`dc-task dc-task--mini${isCompleted ? ' dc-task--done' : ''}`}
          title={task.title}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.isRecurringInstance ? task.recurringSourceId : task.id, sourceDate: dateStr }));
            e.dataTransfer.effectAllowed = 'move';
            e.currentTarget.classList.add('dc-task--dragging');
          }}
          onDragEnd={(e) => {
            e.currentTarget.classList.remove('dc-task--dragging');
          }}
        >
          <TooltipButton
            className="dc-status-btn"
            label="Cycle task status"
            onClick={() => onStatusUpdate(task, STATUS_CYCLE[task.status], task.isRecurringInstance ? 'single' : undefined)}
          >
            {STATUS_ICON[task.status]}
          </TooltipButton>
          <span className={`dc-task-title dc-task-title--mini${isCompleted ? ' dc-task-title--done' : ''}`}>
            {task.title}
          </span>
        </div>
      );
    }

    return (
      <div
        key={taskKey}
        className={`dc-task${isCompleted ? ' dc-task--done' : ''}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.isRecurringInstance ? task.recurringSourceId : task.id, sourceDate: dateStr }));
          e.dataTransfer.effectAllowed = 'move';
          e.currentTarget.classList.add('dc-task--dragging');
        }}
        onDragEnd={(e) => {
          e.currentTarget.classList.remove('dc-task--dragging');
        }}
      >
        <TooltipButton
          className="dc-status-btn"
          label="Cycle task status"
          onClick={() => onStatusUpdate(task, STATUS_CYCLE[task.status], task.isRecurringInstance ? 'single' : undefined)}
        >
          {STATUS_ICON[task.status]}
        </TooltipButton>

        <div className="dc-task-content">
          <div className="dc-task-title-row">
            <span className={`dc-task-title${isCompleted ? ' dc-task-title--done' : ''}`}>
              {task.title}
            </span>
            {task.scheduledTime && (
              <span className="dc-scheduled-time-badge">
                {formatScheduledTime(task.scheduledTime)}
              </span>
            )}
            {task.startTime && (
              <span className="dc-time-badge">
                {formatTimeDisplay(task.startTime)}
                {task.endTime && ` - ${formatTimeDisplay(task.endTime)}`}
              </span>
            )}
            {isEditingEst ? (
              <span className="dc-estimate-edit" onClick={e => e.stopPropagation()}>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="dc-estimate-input"
                  value={estimateValue}
                  onChange={e => setEstimateValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEstimateSave(task); if (e.key === 'Escape') setEditingEstimate(null); }}
                  autoFocus
                  placeholder="min"
                />
                <button className="dc-estimate-save" onClick={() => handleEstimateSave(task)}>OK</button>
              </span>
            ) : (
              <TooltipButton
                className="dc-estimate-btn"
                label="Set time estimate"
                onClick={() => { setEditingEstimate(taskKey); setEstimateValue(task.estimatedMinutes ?? ''); }}
              >
                <FaClock />
                {task.estimatedMinutes ? <span className="dc-estimate-label">{formatMinutes(task.estimatedMinutes)}</span> : null}
              </TooltipButton>
            )}
          </div>

          {expanded && task.description && (
            <div
              className="dc-task-description"
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          )}

          {expanded && taskSubtasks.length > 0 && (
            <div className="dc-subtask-section" onClick={e => e.stopPropagation()}>
              <span className="dc-subtask-summary">[{completedSubtasks}/{taskSubtasks.length}]</span>
              <ul className="dc-subtask-list">
                {taskSubtasks.map(st => (
                  <li key={st.id} className={`dc-subtask-item${st.completed ? ' dc-subtask-item--done' : ''}`}>
                    <input
                      type="checkbox"
                      className="dc-subtask-checkbox"
                      checked={st.completed}
                      onChange={() => onSubtaskToggle(st.id)}
                    />
                    <span className="dc-subtask-title">{st.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="dc-task-meta">
            {project && (
              <span className="dc-meta-chip" style={{ color: project.color, borderColor: project.color + '50' }}>
                <span className="dc-meta-dot" style={{ background: project.color }} />
                {project.name}
              </span>
            )}
          </div>
        </div>

        {expanded && (
          <div className="dc-task-actions">
            <TooltipButton className="dc-action-btn" label="Edit" onClick={() => onTaskClick(task)}><FaEdit /></TooltipButton>
            {onDeleteTask && <TooltipButton className="dc-action-btn dc-action-btn--delete" label="Delete" onClick={() => onDeleteTask(task.id)}><FaTrash /></TooltipButton>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`dc-column${expanded ? ' dc-column--expanded' : ''}${isTodayDate ? ' dc-column--today' : ''}${dragOverIndex >= 0 ? ' dc-column--drag-over' : ''}`}
      onDragOver={onDragOver}
      onDrop={(e) => { setDragOverIndex(-1); if (onDrop) onDrop(e, dragOverIndex); }}
      onDragLeave={handleColumnDragLeave}
      data-date={dateStr}
    >
      <div className="dc-header">
        <div 
          className="dc-header-label" 
          onClick={() => onDayClick && onDayClick(dateStr)} 
          style={{ cursor: onDayClick ? 'pointer' : 'default' }}
        >
          <span className={`dc-day-name${isTodayDate ? ' dc-day-name--today' : ''}`}>{formatDayLabel(dateStr)}</span>
          <span className="dc-day-date">{formatDayDate(dateStr)}</span>
        </div>
        <div className="dc-header-stats">
          {totalEstimated > 0 && (
            <span className="dc-time-total" title="Total estimated time">
              <FaClock /> {formatMinutes(totalEstimated)}
            </span>
          )}
          <span className="dc-task-count">{dayTasks.length}</span>
        </div>
        <TooltipButton
          className="dc-header-add-btn"
          label="Add task"
          onClick={(e) => {
            e.stopPropagation();
            onNewTask(dateStr);
          }}
        >
          <FaPlus />
        </TooltipButton>
      </div>

      <div className="dc-body">
        {todoTasks.length === 0 && doneTasks.length === 0 ? (
          <div className="dc-empty">
            {expanded ? (
              <>
                <span>No tasks</span>
                <button className="dc-add-btn" onClick={() => onNewTask(dateStr)}>
                  <FaPlus /> Add task
                </button>
              </>
            ) : (
              <span className="dc-empty-mini">--</span>
            )}
          </div>
        ) : (
          <>
            {todoTasks.map((task, idx) => {
              const key = task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id;
              return (
                <React.Fragment key={key}>
                  {dragOverIndex === idx && <div className="dc-drop-indicator" />}
                  <div onDragOver={(e) => handleTaskDragOver(e, idx)}>
                    {renderTask(task)}
                  </div>
                </React.Fragment>
              );
            })}
            {dragOverIndex === todoTasks.length && <div className="dc-drop-indicator" />}
            {doneTasks.length > 0 && expanded && (
              <div className="dc-done-section">
                <div className="dc-done-divider">
                  <span>Completed ({doneTasks.length})</span>
                </div>
                {doneTasks.map(renderTask)}
              </div>
            )}
            {!expanded && doneTasks.length > 0 && (
              <div className="dc-done-count">{doneTasks.length} done</div>
            )}
          </>
        )}
      </div>

      {expanded && dayTasks.length > 0 && (
        <button className="dc-footer-add" onClick={() => onNewTask(dateStr)}>
          <FaPlus /> Add task
        </button>
      )}
    </div>
  );
}
