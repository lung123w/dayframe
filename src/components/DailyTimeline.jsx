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

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

  // Tasks with estimates get stacked in timeline; others shown at top
  const timedTasks = dayTasks.filter(t => t.estimatedMinutes);
  const untimedTasks = dayTasks.filter(t => !t.estimatedMinutes);

  // Auto-stack timed tasks starting from 9am
  const stackedTasks = useMemo(() => {
    let currentMinute = 60; // offset from 8am start => 9am
    return timedTasks.map(task => {
      const startOffset = currentMinute;
      currentMinute += task.estimatedMinutes;
      return { task, startOffset, duration: task.estimatedMinutes };
    });
  }, [timedTasks]);

  const totalMinutes = 12 * 60; // 8am to 8pm = 720 minutes
  const getProject = id => projects.find(p => p.id === id);

  return (
    <div className="tl-container">
      <div className="tl-header">
        <FaClock className="tl-header-icon" />
        <span className="tl-header-title">Timeline</span>
      </div>

      {/* Untimed tasks */}
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

      {/* Timeline grid */}
      <div className="tl-grid">
        {/* Hour lines */}
        {HOURS.map(hour => (
          <div key={hour} className="tl-hour" style={{ top: `${((hour - 8) * 60 / totalMinutes) * 100}%` }}>
            <span className="tl-hour-label">{hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}</span>
            <div className="tl-hour-line" />
          </div>
        ))}

        {/* Task blocks */}
        {stackedTasks.map(({ task, startOffset, duration }) => {
          const project = getProject(task.projectId);
          const top = (startOffset / totalMinutes) * 100;
          const height = Math.max((duration / totalMinutes) * 100, 2.5); // min height
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
              <span className="tl-block-title">{task.title}</span>
              <span className="tl-block-time">{formatMinutes(duration)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
