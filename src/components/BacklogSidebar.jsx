import React, { useState, useMemo } from 'react';
import { FaInbox, FaTimes, FaGripVertical } from 'react-icons/fa';
import { getNextOccurrenceFrom } from '../utils/recurrence';
import './BacklogSidebar.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isOverduePending(task) {
  if (task.status !== 'pending' || !task.dueDate) return false;
  return toLocalDateStr(task.dueDate) < toLocalDateStr(new Date());
}

function isUnscheduledVisible(task, today) {
  if (task.status !== 'pending') return false;
  if (!task.dueDate) return true;
  if (task.isRecurring && task.recurrencePattern) {
    const next = getNextOccurrenceFrom(task, today);
    if (next === null) return false;
    return toLocalDateStr(next) < toLocalDateStr(today);
  }
  return isOverduePending(task);
}

export default function BacklogSidebar({ tasks, projects, onTaskClick }) {
  const [filterProject, setFilterProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('unscheduled'); // 'all-pending' | 'unscheduled'

  const displayTasks = useMemo(() => {
    const today = new Date();
    let result = viewMode === 'unscheduled'
      ? tasks.filter(t => isUnscheduledVisible(t, today))
      : tasks.filter(t => t.status === 'pending');

    if (filterProject) result = result.filter(t => String(t.projectId) === filterProject);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }

    // Sort by priority, then creation date
    return [...result].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority] ?? 1;
      const bPriority = priorityOrder[b.priority] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }, [tasks, viewMode, filterProject, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const task of displayTasks) {
      const pId = task.projectId || 0;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId).push(task);
    }
    return map;
  }, [displayTasks]);

  const getProject = id => projects.find(p => p.id === id);

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="backlog-sidebar">
      <div className="backlog-header">
        <div className="backlog-title-row">
          <FaInbox className="backlog-icon" />
          <span className="backlog-title">Backlog</span>
          <span className="backlog-count">{displayTasks.length}</span>
        </div>
        <p className="backlog-subtitle">
          {viewMode === 'all-pending' ? 'All outstanding tasks' : 'Drag tasks to a day'}
        </p>
        <div className="backlog-view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'all-pending' ? 'active' : ''}`}
            onClick={() => setViewMode('all-pending')}
          >
            All Pending
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'unscheduled' ? 'active' : ''}`}
            onClick={() => setViewMode('unscheduled')}
          >
            Unscheduled
          </button>
        </div>
      </div>

      <div className="backlog-controls">
        <input
          type="text"
          className="backlog-search"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          className="backlog-filter"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        {(filterProject || searchQuery) && (
          <button className="backlog-clear" onClick={() => { setFilterProject(''); setSearchQuery(''); }}>
            <FaTimes />
          </button>
        )}
      </div>

      <div className="backlog-body">
        {displayTasks.length === 0 ? (
          <div className="backlog-empty">
            {viewMode === 'all-pending'
              ? 'All tasks completed! 🎉'
              : (tasks.filter(t => !t.dueDate && t.status === 'pending').length === 0
                  ? 'All tasks scheduled!'
                  : 'No tasks match filters')}
          </div>
        ) : (
          <div className="backlog-groups-row">
            {[...grouped.entries()].map(([projectId, groupTasks]) => {
              const project = getProject(projectId);
              return (
                <div key={projectId} className="backlog-group">
                  <div className="backlog-group-header" style={{ borderLeftColor: project?.color || '#94A3B8' }}>
                    <span className="backlog-group-name">{project?.name || 'No Project'}</span>
                    <span className="backlog-group-count">{groupTasks.length}</span>
                  </div>
                  {groupTasks.map(task => {
                    const isOverdue = isOverduePending(task);
                    return (
                      <div
                        key={task.id}
                        className={`backlog-task ${isOverdue ? 'overdue' : ''}`}
                        draggable
                        onDragStart={e => handleDragStart(e, task)}
                      >
                        <FaGripVertical className="backlog-grip" />
                        <span className="backlog-task-title" onClick={() => onTaskClick(task)}>
                          {task.title}
                          {isOverdue && <span className="overdue-badge">Overdue</span>}
                        </span>
                        <span className={`backlog-priority backlog-priority--${task.priority}`} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
