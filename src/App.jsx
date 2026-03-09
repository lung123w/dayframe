import React, { useState, useEffect } from 'react';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import TeamManagement from './components/TeamManagement';
import HabitTracker from './components/HabitTracker';
import DailyPlanner from './components/DailyPlanner';
import { taskService, teamMemberService, projectService, subtaskService, habitService, habitEntryService } from './api';
import { startNotificationService, requestNotificationPermission } from './utils/notifications';
import { FaPlus, FaBell, FaUsers, FaCalendar, FaFolder, FaDownload, FaLink } from 'react-icons/fa';

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

function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeView, setActiveView] = useState('planner');

  // Project management state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

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
      const d = typeof date === 'string' ? new Date(date) : date;
      await taskService.update(task.id, { dueDate: d.toISOString() });
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
    await loadData();
    setShowProjectModal(false);
    setEditingProject(null);
  };

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
      const [allTasks, allProjects, allMembers, allSubtasks, allHabits, allHabitEntries] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        teamMemberService.getAll(),
        subtaskService.getAll(),
        habitService.getAll(),
        habitEntryService.getAll(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 3,
        tasks: allTasks,
        projects: allProjects,
        teamMembers: allMembers,
        subtasks: allSubtasks,
        habits: allHabits,
        habitEntries: allHabitEntries,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dayframe-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup failed:', err);
      alert('Backup failed. See console for details.');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <FaCalendar />
          <h1>DayFrame</h1>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeView === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveView('planner')}
          >
            <FaCalendar /> Planner
          </button>
          <button
            className={`nav-btn ${activeView === 'team' ? 'active' : ''}`}
            onClick={() => setActiveView('team')}
          >
            <FaUsers /> Team
          </button>
          <button
            className={`nav-btn ${activeView === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveView('habits')}
          >
            <FaLink /> Habits
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
        {activeView === 'planner' && (
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
                </div>
              </div>
            </div>

            <DailyPlanner
              tasks={tasks}
              projects={projects}
              teamMembers={teamMembers}
              subtasks={subtasks}
              onTaskClick={handleTaskClick}
              onStatusUpdate={handleStatusUpdate}
              onNewTask={handleNewTaskForDay}
              onDeleteTask={handleDeleteTask}
              onSubtaskToggle={handleSubtaskToggle}
              onAssignDate={handleAssignDate}
              onDataChange={loadData}
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

        {activeView === 'habits' && (
          <HabitTracker />
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
