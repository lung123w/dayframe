import React, { useState, useEffect, useCallback } from 'react';
import { FaMoon, FaArrowRight, FaChevronDown, FaChevronRight, FaClock } from 'react-icons/fa';
import { format, addDays } from 'date-fns';
import { dailyNoteService, taskService } from '../api';
import './DailyShutdown.css';

function formatMinutes(min) {
  if (!min) return '0m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DailyShutdown({ dateStr, dayTasks, onDataChange }) {
  const [collapsed, setCollapsed] = useState(true);
  const [highlights, setHighlights] = useState('');
  const [savedHighlights, setSavedHighlights] = useState('');
  const [, setLoading] = useState(false);

  const loadNote = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dailyNoteService.getByDate(dateStr);
      setHighlights(data.highlights || '');
      setSavedHighlights(data.highlights || '');
    } catch (e) {
      console.error('Failed to load daily note:', e);
    }
    setLoading(false);
  }, [dateStr]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadNote(); }, [loadNote]);

  // Compute stats
  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.status === 'completed').length;
  const incompleteTasks = dayTasks.filter(t => t.status !== 'completed');
  const totalEstimated = dayTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const completedEstimated = dayTasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.estimatedMinutes || 0), 0);

  const saveHighlights = async () => {
    try {
      await dailyNoteService.upsert({ date: dateStr, highlights });
      setSavedHighlights(highlights);
    } catch (e) {
      console.error('Failed to save highlights:', e);
    }
  };

  const rolloverTask = async (task) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const tomorrow = format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd');
    try {
      await taskService.update(task.id, { dueDate: new Date(tomorrow).toISOString() });
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error('Failed to rollover task:', e);
    }
  };

  const rolloverAll = async () => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const tomorrow = format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd');
    for (const task of incompleteTasks) {
      if (task.isRecurringInstance) continue; // skip recurring instances
      try {
        await taskService.update(task.id, { dueDate: new Date(tomorrow).toISOString() });
      } catch (e) {
        console.error('Failed to rollover task:', task.title, e);
      }
    }
    if (onDataChange) onDataChange();
  };

  const isDirty = highlights !== savedHighlights;

  return (
    <div className="sd-container">
      <button className="sd-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        <FaMoon className="sd-icon" />
        <span className="sd-title">Daily Shutdown</span>
      </button>

      {!collapsed && (
        <div className="sd-body">
          {/* Time summary */}
          <div className="sd-stats">
            <div className="sd-stat">
              <span className="sd-stat-label">Completed</span>
              <span className="sd-stat-value">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-label">Time planned</span>
              <span className="sd-stat-value"><FaClock /> {formatMinutes(totalEstimated)}</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-label">Time done</span>
              <span className="sd-stat-value sd-stat-value--done"><FaClock /> {formatMinutes(completedEstimated)}</span>
            </div>
          </div>

          {/* Incomplete tasks — rollover */}
          {incompleteTasks.length > 0 && (
            <div className="sd-rollover">
              <div className="sd-rollover-header">
                <span className="sd-rollover-label">Incomplete ({incompleteTasks.length})</span>
                <button className="sd-rollover-all" onClick={rolloverAll}>
                  Move all to tomorrow <FaArrowRight />
                </button>
              </div>
              <ul className="sd-rollover-list">
                {incompleteTasks.map(task => (
                  <li key={task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id} className="sd-rollover-item">
                    <span className="sd-rollover-name">{task.title}</span>
                    {!task.isRecurringInstance && (
                      <button className="sd-rollover-btn" onClick={() => rolloverTask(task)} title="Move to tomorrow">
                        <FaArrowRight />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights */}
          <div className="sd-highlights">
            <label className="sd-highlights-label">Daily highlights / notes</label>
            <textarea
              className="sd-highlights-input"
              value={highlights}
              onChange={e => setHighlights(e.target.value)}
              placeholder="What went well today? What did you accomplish?"
              rows={3}
            />
            {isDirty && (
              <button className="sd-save-btn" onClick={saveHighlights}>Save</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
