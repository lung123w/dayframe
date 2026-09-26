import React, { useState, useEffect, useCallback } from 'react';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import ProjectsView from './components/ProjectsView';
import HabitTracker from './components/HabitTracker';
import DailyPlanner from './components/DailyPlanner';
import TodayView from './components/TodayView';
import WeeklyReview from './components/WeeklyReview';
import TopStrip from './components/TopStrip';
import CaptureLine from './components/CaptureLine';
import { readCaptureDefaults, writeCaptureDefaults } from './components/captureDefaults';
import MonthlyReview from './components/MonthlyReview';
import CommandPalette from './components/CommandPalette';
import useKeyboardLayer from './components/useKeyboardLayer';
import { ConfirmDialog } from './components/AppDialog';
import { taskService, projectService, subtaskService, habitService, habitEntryService, settingsService, keyEventService, financialCardService, monthlyReviewService } from './api';
import { startNotificationService, requestNotificationPermission } from './utils/notifications';
import { syncSortOrderFromTodayOrder } from './utils/syncTodayOrder';
import { ensureMonthlyReviewReminder } from './utils/monthlyReviewReminder';
import { FaPlus, FaFolder } from 'react-icons/fa';

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
  const [subtasks, setSubtasks] = useState([]);
  const [todayOrder, setTodayOrder] = useState([]);
  const [keyEvents, setKeyEvents] = useState([]);
  const [financialCards, setFinancialCards] = useState([]);
  const [monthlyReviews, setMonthlyReviews] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeView, setActiveView] = useState('today');

  // The keyboard layer (stage 5, design.md §6 D10). The only app-level state it
  // needs is the palette's open/closed boolean — the layer adds no view key and
  // no route.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  useKeyboardLayer({ onNavigate: setActiveView, onTogglePalette: togglePalette });

  // In-app dialogs (design.md §3 D7) replacing the native confirm / alert.
  const [pendingTaskDelete, setPendingTaskDelete] = useState(null);
  const [noticeDialog, setNoticeDialog] = useState(null);

  // Project management state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const loadData = async () => {
    try {
      const [tasksData, projectsData, subtasksData, savedOrder, keyEventsData, cardsData, reviewsData] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        subtaskService.getAll(),
        settingsService.get('todayOrder'),
        keyEventService.getAll(),
        financialCardService.getAll(),
        monthlyReviewService.getAll(),
      ]);

      setTasks(sortTasks(tasksData));
      setProjects(projectsData);
      setSubtasks(subtasksData);
      setTodayOrder(Array.isArray(savedOrder) ? savedOrder : []);
      setKeyEvents(keyEventsData);
      setFinancialCards(cardsData);
      setMonthlyReviews(reviewsData);

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

  useEffect(() => {
    loadData();
    requestNotificationPermission();

    // Start notification service
    const cleanup = startNotificationService(async () => {
      return await taskService.getAll();
    });

    // Ensure the recurring "Monthly Financial Review" task exists
    ensureMonthlyReviewReminder(taskService).catch(err => {
      console.error('Failed to ensure monthly review reminder:', err);
    });

    return cleanup;
  }, []);

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

      // D9 — an edit that sets a project or a priority becomes the next
      // capture's default. Client-only: no API, schema or settings change.
      const storedDefaults = readCaptureDefaults();
      writeCaptureDefaults({
        projectId: 'projectId' in taskData ? taskData.projectId : storedDefaults.projectId,
        priority: 'priority' in taskData ? taskData.priority : storedDefaults.priority,
      });

      await loadData();
      setShowTaskModal(false);
      setSelectedTask(null);
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDeleteTask = (taskId) => {
    // Ask in-app (design.md §3 D7): Escape closes without deleting and focus
    // returns to the control that asked.
    setPendingTaskDelete(taskId);
  };

  const confirmDeleteTask = async () => {
    const taskId = pendingTaskDelete;
    setPendingTaskDelete(null);
    if (taskId == null) return;
    try {
      await subtaskService.deleteByTaskId(taskId);
      await taskService.delete(taskId);
      await loadData();
      setShowTaskModal(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
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

  // ── Today order handler ──
  const handleTodayOrderChange = async (newOrder) => {
    setTodayOrder(newOrder);
    try {
      await settingsService.set('todayOrder', newOrder);
      // Sync sortOrder on real (non-recurring) tasks
      await syncSortOrderFromTodayOrder(newOrder, tasks, taskService.update);
    } catch (err) {
      console.error('Failed to save today order:', err);
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

  // ── Key Event handlers ──
  const handleAddKeyEvent = async (eventData) => {
    try {
      await keyEventService.create(eventData);
      await loadData();
    } catch (err) {
      console.error('Failed to add key event:', err);
    }
  };

  const handleUpdateKeyEvent = async (id, updates) => {
    try {
      await keyEventService.update(id, updates);
      await loadData();
    } catch (err) {
      console.error('Failed to update key event:', err);
    }
  };

  const handleDeleteKeyEvent = async (id) => {
    try {
      await keyEventService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete key event:', err);
    }
  };

  // ── Backup: export all DB data as a JSON download ──
  const handleBackup = async () => {
    try {
      const [allTasks, allProjects, allSubtasks, allHabits, allHabitEntries, allFinancialCards, allMonthlyReviews] = await Promise.all([
        taskService.getAll(),
        projectService.getAll(),
        subtaskService.getAll(),
        habitService.getAll(),
        habitEntryService.getAll(),
        financialCardService.getAll(),
        monthlyReviewService.getAll(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 4,
        tasks: allTasks,
        projects: allProjects,
        subtasks: allSubtasks,
        habits: allHabits,
        habitEntries: allHabitEntries,
        financialCards: allFinancialCards,
        monthlyReviews: allMonthlyReviews,
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
      setNoticeDialog({
        title: 'Backup failed',
        message: 'The export could not be created. See the console for details.',
      });
    }
  };

  return (
    <div className="app">
      <div className="app-chrome">
        <TopStrip
          currentView={activeView}
          onNavigate={setActiveView}
          onNotifications={requestNotificationPermission}
          onBackup={handleBackup}
        />

        {/* One capture line for the whole app — present on every view. */}
        <CaptureLine projects={projects} onCaptured={loadData} />
      </div>

      <main className="app-main">

        {activeView === 'today' && (
          <TodayView
            tasks={tasks}
            projects={projects}
            todayOrder={todayOrder}
            onTodayOrderChange={handleTodayOrderChange}
            onTaskClick={handleTaskClick}
            onNewTask={handleNewTaskForDay}
            onStatusUpdate={handleStatusUpdate}
            onDataChange={loadData}
          />
        )}

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
                    <span className="stat-value" style={{ color: 'var(--success-text)' }}>
                      {tasks.filter((t) => t.status === 'completed').length}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Pending</span>
                    <span className="stat-value" style={{ color: 'var(--accent)' }}>
                      {tasks.filter((t) => t.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DailyPlanner
              tasks={tasks}
              projects={projects}
              subtasks={subtasks}
              onTaskClick={handleTaskClick}
              onStatusUpdate={handleStatusUpdate}
              onNewTask={handleNewTaskForDay}
              onDeleteTask={handleDeleteTask}
              onSubtaskToggle={handleSubtaskToggle}
              onAssignDate={handleAssignDate}
              onDataChange={loadData}
              onTodayOrderChange={handleTodayOrderChange}
              keyEvents={keyEvents}
              onAddKeyEvent={handleAddKeyEvent}
              onUpdateKeyEvent={handleUpdateKeyEvent}
              onDeleteKeyEvent={handleDeleteKeyEvent}
            />
          </>
        )}

        {activeView === 'habits' && (
          <HabitTracker />
        )}

        {activeView === 'projects' && (
          <ProjectsView
            projects={projects}
            onCreateProject={() => handleOpenProjectModal()}
            onEditProject={(project) => handleOpenProjectModal(project)}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeView === 'review' && (
          <WeeklyReview
            keyEvents={keyEvents}
            onAddKeyEvent={handleAddKeyEvent}
            onUpdateKeyEvent={handleUpdateKeyEvent}
            onDeleteKeyEvent={handleDeleteKeyEvent}
            onDataChange={loadData}
          />
        )}

        {activeView === 'finance' && (
          <MonthlyReview
            reviews={monthlyReviews}
            financialCards={financialCards}
            onDataChange={loadData}
          />
        )}
      </main>

      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          projects={projects}
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

      <ConfirmDialog
        open={pendingTaskDelete != null}
        title="Delete this task?"
        description="The task and its subtasks will be removed. This cannot be undone."
        confirmLabel="Delete task"
        tone="danger"
        onConfirm={confirmDeleteTask}
        onCancel={() => setPendingTaskDelete(null)}
      />

      <ConfirmDialog
        open={!!noticeDialog}
        title={noticeDialog ? noticeDialog.title : 'DayFrame'}
        description={noticeDialog ? noticeDialog.message : ''}
        confirmLabel="OK"
        cancelLabel={null}
        onConfirm={() => setNoticeDialog(null)}
        onCancel={() => setNoticeDialog(null)}
      />

      {/* The droppable slice of stage 5: this component, this mount and the
          `Ctrl/⌘ + K` entry in `useKeyboardLayer` are the whole palette. */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        activeView={activeView}
        onNavigate={setActiveView}
      />
    </div>
  );
}

export default App;
