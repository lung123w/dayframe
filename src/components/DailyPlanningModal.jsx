import React, { useMemo, useState } from 'react';
import { FaCalendarCheck, FaTimes, FaExclamationCircle, FaCalendarDay, FaCalendarAlt } from 'react-icons/fa';
import { groupTasksByUrgency } from '../utils/planningGroups';
import './DailyPlanningModal.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function DailyPlanningModal({ tasks, projects, todayOrder, onConfirm, onClose }) {
  const today = useMemo(() => toLocalDateStr(new Date()), []);
  const { overdue, dueToday, upcoming } = useMemo(() => groupTasksByUrgency(tasks, today), [tasks, today]);

  // Pre-select tasks already in todayOrder
  const todayOrderSet = new Set((todayOrder || []).map(String));
  const [selected, setSelected] = useState(() => {
    const initial = new Set();
    [...overdue, ...dueToday, ...upcoming].forEach(t => {
      if (todayOrderSet.has(String(t.id))) initial.add(String(t.id));
    });
    return initial;
  });

  const toggleTask = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  };

  const handleConfirm = () => {
    // Build new order: keep existing order for selected tasks, append newly selected at end
    const allTasks = [...overdue, ...dueToday, ...upcoming];
    const selectedTasks = allTasks.filter(t => selected.has(String(t.id)));
    // Preserve existing order for tasks that remain selected
    const existingOrdered = (todayOrder || [])
      .filter(id => selected.has(String(id)))
      .map(id => selectedTasks.find(t => String(t.id) === String(id)))
      .filter(Boolean);
    const existingIds = new Set(existingOrdered.map(t => String(t.id)));
    const newlySelected = selectedTasks.filter(t => !existingIds.has(String(t.id)));
    const newOrder = [...existingOrdered, ...newlySelected].map(t => String(t.id));
    onConfirm(newOrder);
  };

  const getProject = id => projects.find(p => p.id === id);

  const renderTask = (task) => {
    const project = getProject(task.projectId);
    const isChecked = selected.has(String(task.id));
    return (
      <label
        key={task.id}
        className={`dpm-task${isChecked ? ' dpm-task--checked' : ''}`}
        style={{ borderLeftColor: project?.color || '#E2E8F0' }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => toggleTask(task.id)}
          className="dpm-checkbox"
        />
        <span className="dpm-task-title">{task.title}</span>
        {project && <span className="dpm-task-project" style={{ color: project.color }}>{project.name}</span>}
        {task.dueDate && toLocalDateStr(task.dueDate) < today && (
          <span className="dpm-overdue-badge">Overdue</span>
        )}
      </label>
    );
  };

  const sections = [
    { id: 'overdue', label: 'Overdue', icon: <FaExclamationCircle />, tasks: overdue, className: 'dpm-section--overdue' },
    { id: 'today', label: 'Due Today', icon: <FaCalendarDay />, tasks: dueToday, className: 'dpm-section--today' },
    { id: 'upcoming', label: 'Upcoming (next 7 days)', icon: <FaCalendarAlt />, tasks: upcoming, className: '' },
  ];

  return (
    <div className="dpm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dpm-modal" role="dialog" aria-modal="true" aria-label="Plan My Day">
        <div className="dpm-header">
          <div className="dpm-header-left">
            <FaCalendarCheck className="dpm-header-icon" />
            <h2 className="dpm-title">Plan My Day</h2>
          </div>
          <button className="dpm-close-btn" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <p className="dpm-subtitle">Select the tasks you want to focus on today.</p>

        <div className="dpm-body">
          {sections.every(s => s.tasks.length === 0) ? (
            <p className="dpm-empty">No pending tasks in the next 7 days. Great job!</p>
          ) : (
            sections.map(section => section.tasks.length > 0 && (
              <div key={section.id} className={`dpm-section ${section.className}`}>
                <div className="dpm-section-header">
                  {section.icon}
                  <span>{section.label} ({section.tasks.length})</span>
                </div>
                {section.tasks.map(renderTask)}
              </div>
            ))
          )}
        </div>

        <div className="dpm-footer">
          <span className="dpm-selection-count">{selected.size} task{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="dpm-footer-actions">
            <button className="dpm-btn dpm-btn--cancel" onClick={onClose}>Cancel</button>
            <button className="dpm-btn dpm-btn--confirm" onClick={handleConfirm}>
              Start Day
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
