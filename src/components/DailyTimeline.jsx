import React, { useMemo } from 'react';
import { FaClock } from 'react-icons/fa';
import { generateRecurringTasks } from '../utils/recurrence';
import './DailyTimeline.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm labels

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export default function DailyTimeline({ dateStr, tasks, projects }) {
  const dayTasks = useMemo(() => {
    if (!dateStr) return [];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);

    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        result.push(...generateRecurringTasks(task, dayStart, dayEnd));
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === dateStr) {
        result.push(task);
      }
    }
    return result.filter(t => t.status !== 'completed');
  }, [tasks, dateStr]);

  const GRID_START = 6 * 60; // 6am in minutes
  const GRID_END = 21 * 60;  // 9pm in minutes
  const totalMinutes = GRID_END - GRID_START;

  // Separate: tasks with startTime vs without
  const timedTasks = useMemo(() => {
    return dayTasks
      .filter(t => t.startTime)
      .map(t => {
        const startMin = timeToMinutes(t.startTime);
        let endMin;
        if (t.endTime) {
          endMin = timeToMinutes(t.endTime);
        } else if (t.estimatedMinutes) {
          endMin = startMin + t.estimatedMinutes;
        } else {
          endMin = startMin + 30; // default 30min block
        }
        return { task: t, startMin, endMin, duration: endMin - startMin };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [dayTasks]);

  const untimedTasks = dayTasks.filter(t => !t.startTime);

  const getProject = id => projects.find(p => p.id === id);

  // Current time indicator
  const now = new Date();
  const [dy, dm, dd] = dateStr ? dateStr.split('-').map(Number) : [0, 0, 0];
  const isToday = now.getFullYear() === dy && now.getMonth() + 1 === dm && now.getDate() === dd;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = isToday && nowMinutes >= GRID_START && nowMinutes <= GRID_END
    ? ((nowMinutes - GRID_START) / totalMinutes) * 100
    : null;

  return (
    <div className="tl-container">
      <div className="tl-header">
        <FaClock className="tl-header-icon" />
        <span className="tl-header-title">Timeline</span>
      </div>

      {untimedTasks.length > 0 && (
        <div className="tl-untimed">
          <span className="tl-untimed-label">No time set:</span>
          {untimedTasks.map(t => (
            <div key={t.isRecurringInstance ? `${t.id}-${t.instanceDate}` : t.id} className="tl-untimed-task">
              <span className="tl-untimed-dot" style={{ background: getProject(t.projectId)?.color || '#94A3B8' }} />
              <span className="tl-untimed-name">{t.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="tl-grid">
        {HOURS.map(hour => {
          const offset = ((hour * 60 - GRID_START) / totalMinutes) * 100;
          return (
            <div key={hour} className="tl-hour" style={{ top: `${offset}%` }}>
              <span className="tl-hour-label">{hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}</span>
              <div className="tl-hour-line" />
            </div>
          );
        })}

        {/* Current time indicator */}
        {nowOffset !== null && (
          <div className="tl-now-line" style={{ top: `${nowOffset}%` }}>
            <div className="tl-now-dot" />
            <div className="tl-now-rule" />
          </div>
        )}

        {timedTasks.map(({ task, startMin, duration }) => {
          const project = getProject(task.projectId);
          const top = ((startMin - GRID_START) / totalMinutes) * 100;
          const height = Math.max((duration / totalMinutes) * 100, 2.5);
          return (
            <div
              key={task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id}
              className="tl-block"
              style={{
                top: `${top}%`,
                height: `${height}%`,
                borderLeftColor: project?.color || '#3B82F6',
                background: (project?.color || '#3B82F6') + '15',
              }}
            >
              <span className="tl-block-time">{formatTimeLabel(task.startTime)}</span>
              <span className="tl-block-title">{task.title}</span>
              <span className="tl-block-duration">{formatMinutes(duration)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
