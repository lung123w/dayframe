import React, { useState, useMemo } from 'react';
import { FaInbox, FaTimes, FaGripVertical } from 'react-icons/fa';
import './BacklogSidebar.css';

export default function BacklogSidebar({ tasks, projects, onTaskClick }) {
  const [filterProject, setFilterProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const unscheduledTasks = useMemo(() => {
    let result = tasks.filter(t => !t.dueDate);
    if (filterProject) result = result.filter(t => String(t.projectId) === filterProject);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, filterProject, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const task of unscheduledTasks) {
      const pId = task.projectId || 0;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId).push(task);
    }
    return map;
  }, [unscheduledTasks]);

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
          <span className="backlog-count">{unscheduledTasks.length}</span>
        </div>
        <p className="backlog-subtitle">Drag tasks to a day</p>
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
        {unscheduledTasks.length === 0 ? (
          <div className="backlog-empty">
            {tasks.filter(t => !t.dueDate).length === 0
              ? 'All tasks scheduled!'
              : 'No tasks match filters'}
          </div>
        ) : (
          [...grouped.entries()].map(([projectId, groupTasks]) => {
            const project = getProject(projectId);
            return (
              <div key={projectId} className="backlog-group">
                <div className="backlog-group-header" style={{ borderLeftColor: project?.color || '#94A3B8' }}>
                  <span className="backlog-group-name">{project?.name || 'No Project'}</span>
                  <span className="backlog-group-count">{groupTasks.length}</span>
                </div>
                {groupTasks.map(task => (
                  <div
                    key={task.id}
                    className="backlog-task"
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                  >
                    <FaGripVertical className="backlog-grip" />
                    <span className="backlog-task-title" onClick={() => onTaskClick(task)}>
                      {task.title}
                    </span>
                    <span className={`backlog-priority backlog-priority--${task.priority}`} />
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
