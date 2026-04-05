import React from 'react';
import { FaCalendar, FaLink, FaFolder, FaBell, FaDownload } from 'react-icons/fa';
import './Sidebar.css';

export default function Sidebar({ activeView, onViewChange, onNotifications, onBackup }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <FaCalendar className="sidebar-brand-icon" />
        <h1>DayFrame</h1>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-header">VIEWS</div>
          <button
            className={`sidebar-nav-item ${activeView === 'planner' ? 'active' : ''}`}
            onClick={() => onViewChange('planner')}
          >
            <FaCalendar />
            <span>Planner</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeView === 'habits' ? 'active' : ''}`}
            onClick={() => onViewChange('habits')}
          >
            <FaLink />
            <span>Habits</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeView === 'projects' ? 'active' : ''}`}
            onClick={() => onViewChange('projects')}
          >
            <FaFolder />
            <span>Projects</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">TOOLS</div>
          <button className="sidebar-nav-item" onClick={onNotifications}>
            <FaBell />
            <span>Notifications</span>
          </button>
          <button className="sidebar-nav-item" onClick={onBackup}>
            <FaDownload />
            <span>Backup</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
