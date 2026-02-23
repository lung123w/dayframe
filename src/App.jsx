import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import TaskModal from './components/TaskModal';
import TeamManagement from './components/TeamManagement';
import { taskService, teamMemberService, projectService } from './db';
import { startNotificationService, requestNotificationPermission } from './utils/notifications';
import { FaPlus, FaBell, FaUsers, FaCalendar } from 'react-icons/fa';

import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeView, setActiveView] = useState('calendar');

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
    const [tasksData, projectsData, membersData] = await Promise.all([
      taskService.getAll(),
      projectService.getAll(),
      teamMemberService.getAll()
    ]);

    setTasks(tasksData);
    setProjects(projectsData);
    setTeamMembers(membersData);

    // Create default project if none exists
    if (projectsData.length === 0) {
      const defaultProject = await projectService.create({
        name: 'General',
        color: '#3788d8'
      });
      setProjects([defaultProject]);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setSelectedDate(null);
    setShowTaskModal(true);
  };

  const handleDateSelect = (date) => {
    setSelectedTask(null);
    setSelectedDate(date);
    setShowTaskModal(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setSelectedDate(null);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskData) => {
    if (selectedTask) {
      await taskService.update(selectedTask.id, taskData);
    } else {
      await taskService.create(taskData);
    }
    
    await loadData();
    setShowTaskModal(false);
    setSelectedTask(null);
    setSelectedDate(null);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await taskService.delete(taskId);
      await loadData();
      setShowTaskModal(false);
      setSelectedTask(null);
    }
  };

  const handleEventDrop = async (task, newDate) => {
    await taskService.update(task.id, {
      dueDate: newDate.toISOString()
    });
    await loadData();
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Project Management Tool</h1>
        <nav className="app-nav">
          <button 
            className={`nav-btn ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <FaCalendar /> Calendar
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
        </nav>
      </header>

      <main className="app-main">
        {activeView === 'calendar' && (
          <>
            <div className="toolbar">
              <button className="btn btn-primary" onClick={handleNewTask}>
                <FaPlus /> New Task
              </button>
              <div className="task-stats">
                <span className="stat">
                  Total Tasks: <strong>{tasks.length}</strong>
                </span>
                <span className="stat">
                  Completed: <strong>{tasks.filter(t => t.status === 'completed').length}</strong>
                </span>
                <span className="stat">
                  In Progress: <strong>{tasks.filter(t => t.status === 'in-progress').length}</strong>
                </span>
              </div>
            </div>

            <Calendar
              tasks={tasks}
              projects={projects}
              teamMembers={teamMembers}
              onTaskClick={handleTaskClick}
              onDateSelect={handleDateSelect}
              onEventDrop={handleEventDrop}
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
          selectedDate={selectedDate}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
