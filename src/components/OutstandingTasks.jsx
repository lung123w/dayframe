import React, { useState } from 'react';
import { FaCalendarPlus, FaEdit, FaExclamationCircle, FaFilter, FaTimes, FaTrash } from 'react-icons/fa';
import './OutstandingTasks.css';

export default function OutstandingTasks({ tasks, projects, teamMembers, onTaskClick, onAssignDate, onDeleteTask }) {
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState(null);
  const [assignDate, setAssignDate] = useState('');

  // Tasks with no due date (outstanding / unscheduled)
  const outstandingTasks = tasks.filter(t => !t.dueDate);

  const filteredTasks = outstandingTasks.filter(t => {
    if (filterProject && String(t.projectId) !== filterProject) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const getProject = (projectId) => projects.find(p => p.id === projectId);
  const getAssigneeNames = (assignedTo) => {
    const ids = Array.isArray(assignedTo)
      ? assignedTo
      : (assignedTo != null ? [assignedTo] : []);
    return ids
      .map(id => teamMembers.find(m => m.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const priorityColor = { high: '#DC2626', medium: '#F59E0B', low: '#10B981' };
  const statusLabel = { todo: 'To Do', 'in-progress': 'In Progress', completed: 'Completed' };
  const statusColor = { todo: '#64748B', 'in-progress': '#3B82F6', completed: '#16A34A' };

  const handleAssignDateSubmit = (task) => {
    if (!assignDate) return;
    onAssignDate(task, new Date(assignDate));
    setAssigningTaskId(null);
    setAssignDate('');
  };

  const handleCancelAssign = () => {
    setAssigningTaskId(null);
    setAssignDate('');
  };

  return (
    <div className="outstanding-container">
      {/* Header */}
      <div className="outstanding-header">
        <div className="outstanding-title-row">
          <FaExclamationCircle className="outstanding-icon" />
          <h2 className="outstanding-title">Outstanding Tasks</h2>
          <span className="outstanding-count">{outstandingTasks.length}</span>
        </div>
        <p className="outstanding-subtitle">Tasks without a due date — assign a date to schedule them on the calendar.</p>
      </div>

      {/* Filters */}
      <div className="outstanding-filters">
        <FaFilter className="filter-icon" />
        <select
          className="outstanding-select"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <select
          className="outstanding-select"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(filterProject || filterPriority) && (
          <button
            className="outstanding-clear-btn"
            onClick={() => { setFilterProject(''); setFilterPriority(''); }}
          >
            <FaTimes /> Clear
          </button>
        )}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="outstanding-empty">
          {outstandingTasks.length === 0
            ? 'All tasks have been scheduled.'
            : 'No tasks match the current filters.'}
        </div>
      ) : (
        <div className="outstanding-list">
          {filteredTasks.map(task => {
            const project = getProject(task.projectId);
            const assigneeNames = getAssigneeNames(task.assignedTo);
            const isAssigning = assigningTaskId === task.id;

            return (
              <div key={task.id} className="outstanding-card">
                {/* Left accent bar using project color */}
                <div
                  className="outstanding-card-accent"
                  style={{ background: project?.color || '#2563EB' }}
                />

                <div className="outstanding-card-body">
                  {/* Title + priority */}
                  <div className="outstanding-card-top">
                    <span
                      className="outstanding-priority-dot"
                      style={{ background: priorityColor[task.priority] || '#64748B' }}
                      title={task.priority}
                    />
                    <span className="outstanding-task-title">{task.title}</span>
                    <span
                      className="outstanding-status-badge"
                      style={{ color: statusColor[task.status], borderColor: statusColor[task.status] + '40', background: statusColor[task.status] + '12' }}
                    >
                      {statusLabel[task.status]}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="outstanding-card-meta">
                    {project && (
                      <span className="outstanding-meta-chip" style={{ borderColor: project.color + '60', color: project.color }}>
                        <span className="outstanding-meta-dot" style={{ background: project.color }} />
                        {project.name}
                      </span>
                    )}
                    {assigneeNames && (
                      <span className="outstanding-meta-chip outstanding-meta-assignee">
                        {assigneeNames}
                      </span>
                    )}
                    {task.description && (
                      <span className="outstanding-description">{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</span>
                    )}
                  </div>

                  {/* Date assignment inline form */}
                  {isAssigning ? (
                    <div className="outstanding-assign-row">
                      <input
                        type="date"
                        className="outstanding-date-input"
                        value={assignDate}
                        onChange={e => setAssignDate(e.target.value)}
                        autoFocus
                      />
                      <button
                        className="btn-assign-confirm"
                        onClick={() => handleAssignDateSubmit(task)}
                        disabled={!assignDate}
                      >
                        Assign
                      </button>
                      <button className="btn-assign-cancel" onClick={handleCancelAssign}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="outstanding-card-actions">
                      <button
                        className="outstanding-btn outstanding-btn-assign"
                        onClick={() => { setAssigningTaskId(task.id); setAssignDate(''); }}
                      >
                        <FaCalendarPlus /> Assign Date
                      </button>
                      <button
                        className="outstanding-btn outstanding-btn-edit"
                        onClick={() => onTaskClick(task)}
                      >
                        <FaEdit /> Edit
                      </button>
                      {onDeleteTask && (
                        <button
                          className="outstanding-btn outstanding-btn-delete"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          <FaTrash /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
