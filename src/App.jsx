import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import TeamManagement from './components/TeamManagement';
import OutstandingTasks from './components/OutstandingTasks';
import DayPanel from './components/DayPanel';
import { taskService, teamMemberService, projectService, subtaskService } from './db';
import { startNotificationService, requestNotificationPermission } from './utils/notifications';
import { FaPlus, FaBell, FaUsers, FaCalendar, FaFolder, FaTimes, FaEdit, FaExclamationCircle, FaDownload } from 'react-icons/fa';

import './App.css';

// Sort tasks: ascending by dueDate (nulls last), then high > medium > low priority
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDate !== bDate) return aDate - bDate;
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
  });
}

function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeView, setActiveView] = useState('calendar');

  // Day panel: which date is selected (defaults to today)
  const [selectedDayDate, setSelectedDayDate] = useState(todayStr);

  // Project management state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Project filter state: empty Set = show all, non-empty = show only selected
  const [activeProjectFilters, setActiveProjectFilters] = useState(new Set());

  useEffect(() => {
    loadData();
    requestNotificationPermission();
    
    // Start notification service
    const cleanup = startNotificationService(async () => {
      return await taskService.getAll();
    });

    return cleanup;
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, projectsData, membersData, subtasksData] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        teamMemberService.getAll(),
        subtaskService.getAll()
      ]);

      setTasks(sortTasks(tasksData));
      setProjects(projectsData);
      setTeamMembers(membersData);
      setSubtasks(subtasksData);

      // Create default project if none exists
      if (projectsData.length === 0) {
        const defaultProject = await projectService.create({
          name: 'General',
          color: '#3788d8'
        });
        setProjects([defaultProject]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setSelectedDate(null);
    setShowTaskModal(true);
  };

  const handleDateSelect = (dateStr) => {
    // Update the day panel to show tasks for this date
    setSelectedDayDate(dateStr);
    // Do NOT open the task modal on plain date click — use New Task button instead
  };

  const handleNewTaskForDay = (dateStr) => {
    setSelectedTask(null);
    setSelectedDate(dateStr);
    setShowTaskModal(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setSelectedDate(null);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      const pendingSubtasks = taskData._pendingSubtasks || [];
      delete taskData._pendingSubtasks;

      if (selectedTask) {
        await taskService.update(selectedTask.id, taskData);
      } else {
        const newTask = await taskService.create(taskData);
        for (const sub of pendingSubtasks) {
          await subtaskService.create({ parentTaskId: newTask.id, ...sub });
        }
      }
      await loadData();
      setShowTaskModal(false);
      setSelectedTask(null);
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await subtaskService.deleteByTaskId(taskId);
        await taskService.delete(taskId);
        await loadData();
        setShowTaskModal(false);
        setSelectedTask(null);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleEventDrop = async (task, newDate) => {
    try {
      await taskService.update(task.id, {
        dueDate: newDate.toISOString()
      });
      await loadData();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  // Update task status directly from calendar view
  const handleStatusUpdate = async (task, newStatus, scope) => {
    try {
      if (task.isRecurringInstance) {
        // Recurring instance — update overrides on the source task, not the base status
        const sourceId = task.recurringSourceId || task.id;
        const sourceTask = await taskService.getById(sourceId);
        if (!sourceTask) {
          console.error('Source task not found for recurring instance:', sourceId);
          return;
        }

        if (scope === 'future') {
          // "This and all future" — append to statusFromOverrides
          const fromOverrides = sourceTask.statusFromOverrides || [];
          // Remove any existing override for the exact same fromDate to avoid duplicates
          const filtered = fromOverrides.filter(o => o.fromDate !== task.instanceDate);
          filtered.push({ fromDate: task.instanceDate, status: newStatus });
          await taskService.update(sourceId, { statusFromOverrides: filtered });
        } else {
          // "This instance only" — add to statusOverrides map
          const overrides = { ...(sourceTask.statusOverrides || {}) };
          overrides[task.instanceDate] = newStatus;
          await taskService.update(sourceId, { statusOverrides: overrides });
        }
      } else {
        // Non-recurring: update status directly
        await taskService.update(task.id, { status: newStatus });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Refresh all data after subtask mutations (add/toggle/delete/edit)
  const handleSubtaskChange = async () => {
    await loadData();
  };

  // Toggle a subtask's completed state directly from DayPanel
  const handleSubtaskToggle = async (subtaskId) => {
    try {
      await subtaskService.toggleCompleted(subtaskId);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  // Assign a due date to an outstanding (unscheduled) task
  const handleAssignDate = async (task, date) => {
    try {
      await taskService.update(task.id, { dueDate: date.toISOString() });
      await loadData();
    } catch (err) {
      console.error('Failed to assign date:', err);
    }
  };

  // ── Project handlers ──
  const handleOpenProjectModal = (project = null) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleSaveProject = async (projectData) => {
    try {
      if (editingProject) {
        await projectService.update(editingProject.id, projectData);
      } else {
        await projectService.create(projectData);
      }
      await loadData();
      setShowProjectModal(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    await projectService.delete(projectId);
    setActiveProjectFilters((prev) => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
    await loadData();
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const toggleProjectFilter = (projectId) => {
    setActiveProjectFilters((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const clearFilters = () => setActiveProjectFilters(new Set());

  const handleAddMember = async (memberData) => {
    await teamMemberService.create(memberData);
    await loadData();
  };

  const handleUpdateMember = async (id, memberData) => {
    await teamMemberService.update(id, memberData);
    await loadData();
  };

  const handleDeleteMember = async (id) => {
    await teamMemberService.delete(id);
    await loadData();
  };

  // ── Backup: export all DB data as a JSON download ──
  const handleBackup = async () => {
    try {
      const [allTasks, allProjects, allMembers, allSubtasks] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        teamMemberService.getAll(),
        subtaskService.getAll(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 2,
        tasks: allTasks,
        projects: allProjects,
        teamMembers: allMembers,
        subtasks: allSubtasks,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projectflow-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup failed:', err);
      alert('Backup failed. See console for details.');
    }
  };

  const outstandingCount = tasks.filter(t => !t.dueDate).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <FaCalendar />
          <h1>ProjectFlow</h1>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <FaCalendar /> Calendar
          </button>
          <button
            className={`nav-btn ${activeView === 'outstanding' ? 'active' : ''}`}
            onClick={() => setActiveView('outstanding')}
          >
            <FaExclamationCircle /> Outstanding
            {outstandingCount > 0 && (
              <span className="nav-badge">{outstandingCount}</span>
            )}
          </button>
          <button
            className={`nav-btn ${activeView === 'team' ? 'active' : ''}`}
            onClick={() => setActiveView('team')}
          >
            <FaUsers /> Team
          </button>
          <button className="btn-icon" onClick={requestNotificationPermission} title="Enable Notifications">
            <FaBell />
          </button>
          <button className="btn-icon" onClick={handleBackup} title="Backup data to JSON (save to repo/backups/)">
            <FaDownload />
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeView === 'calendar' && (
          <>
            {/* ── Toolbar ── */}
            <div className="toolbar">
              <div className="toolbar-left">
                <button className="btn btn-primary" onClick={handleNewTask}>
                  <FaPlus /> New Task
                </button>
                <button className="btn btn-secondary" onClick={() => handleOpenProjectModal()}>
                  <FaFolder /> New Project
                </button>
              </div>
              <div className="toolbar-right">
                <div className="task-stats">
                  <div className="stat-card">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">{tasks.length}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Done</span>
                    <span className="stat-value" style={{ color: '#10B981' }}>
                      {tasks.filter((t) => t.status === 'completed').length}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Active</span>
                    <span className="stat-value" style={{ color: '#6366F1' }}>
                      {tasks.filter((t) => t.status === 'in-progress').length}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">O/S</span>
                    <span className="stat-value" style={{ color: '#F97316' }}>
                      {outstandingCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Project Filter Bar ── */}
            {projects.length > 0 && (
              <div className="project-filter-bar">
                <span className="project-filter-label">Projects</span>
                {projects.map((project) => {
                  const isActive = activeProjectFilters.has(project.id);
                  return (
                    <div
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      className={`project-chip ${isActive ? 'active' : ''}`}
                      style={
                        isActive
                          ? { background: project.color, borderColor: project.color }
                          : { borderColor: project.color + '40' }
                      }
                      onClick={() => toggleProjectFilter(project.id)}
                      onKeyDown={(e) => e.key === 'Enter' && toggleProjectFilter(project.id)}
                    >
                      <span
                        className="project-chip-dot"
                        style={{ background: isActive ? 'rgba(255,255,255,0.8)' : project.color }}
                      />
                      {project.name}
                      <button
                        className="project-chip-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProjectModal(project);
                        }}
                        title={`Edit ${project.name}`}
                      >
                        <FaEdit />
                      </button>
                    </div>
                  );
                })}
                {activeProjectFilters.size > 0 && (
                  <>
                    <span className="filter-separator" />
                    <button className="filter-clear-btn" onClick={clearFilters}>
                      <FaTimes /> Clear
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="calendar-day-layout">
              <div className="calendar-day-layout__calendar">
                <Calendar
                  tasks={tasks}
                  projects={projects}
                  teamMembers={teamMembers}
                  subtasks={subtasks}
                  activeProjectFilters={activeProjectFilters}
                  selectedDayDate={selectedDayDate}
                  onTaskClick={handleTaskClick}
                  onDateSelect={handleDateSelect}
                  onNewTask={handleNewTaskForDay}
                  onEventDrop={handleEventDrop}
                  onStatusUpdate={handleStatusUpdate}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
              <div className="calendar-day-layout__panel">
                <DayPanel
                  date={selectedDayDate}
                  tasks={tasks}
                  projects={projects}
                  teamMembers={teamMembers}
                  subtasks={subtasks}
                  onSubtaskToggle={handleSubtaskToggle}
                  onTaskClick={handleTaskClick}
                  onStatusUpdate={handleStatusUpdate}
                  onNewTask={handleNewTaskForDay}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
            </div>
          </>
        )}

        {activeView === 'outstanding' && (
          <>
            {/* ── Toolbar ── */}
            <div className="toolbar">
              <div className="toolbar-left">
                <button className="btn btn-primary" onClick={handleNewTask}>
                  <FaPlus /> New Task
                </button>
              </div>
              <div className="toolbar-right">
                <div className="task-stats">
                  <div className="stat-card">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">{tasks.length}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">O/S</span>
                    <span className="stat-value" style={{ color: '#F97316' }}>
                      {outstandingCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <OutstandingTasks
              tasks={tasks}
              projects={projects}
              teamMembers={teamMembers}
              onTaskClick={handleTaskClick}
              onAssignDate={handleAssignDate}
              onDeleteTask={handleDeleteTask}
            />
          </>
        )}

        {activeView === 'team' && (
          <TeamManagement
            teamMembers={teamMembers}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
          />
        )}
      </main>

      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          teamMembers={teamMembers}
          tasks={tasks}
          subtasks={subtasks}
          selectedDate={selectedDate}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onSubtaskChange={handleSubtaskChange}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
            setSelectedDate(null);
          }}
        />
      )}

      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
