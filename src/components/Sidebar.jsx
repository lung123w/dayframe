import React from 'react';
import { FaCalendar, FaLink, FaFolder, FaBell, FaDownload, FaCalendarDay, FaClipboardCheck, FaWallet } from 'react-icons/fa';
import './Sidebar.css';

export default function Sidebar({ currentView, onNavigate, onNotifications, onBackup }) {
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
            className={`sidebar-nav-item ${currentView === 'today' ? 'active' : ''}`}
            onClick={() => onNavigate('today')}
            aria-label="Navigate to Today view"
          >
            <FaCalendarDay />
            <span>Today</span>
          </button>
          <button
            className={`sidebar-nav-item ${currentView === 'planner' ? 'active' : ''}`}
            onClick={() => onNavigate('planner')}
            aria-label="Navigate to Planner view"
          >
            <FaCalendar />
            <span>Planner</span>
          </button>
          <button
            className={`sidebar-nav-item ${currentView === 'habits' ? 'active' : ''}`}
            onClick={() => onNavigate('habits')}
            aria-label="Navigate to Habits view"
          >
            <FaLink />
            <span>Habits</span>
          </button>
          <button
            className={`sidebar-nav-item ${currentView === 'review' ? 'active' : ''}`}
            onClick={() => onNavigate('review')}
            aria-label="Navigate to Weekly Review view"
          >
            <FaClipboardCheck />
            <span>Review</span>
          </button>
          <button
            className={`sidebar-nav-item ${currentView === 'finance' ? 'active' : ''}`}
            onClick={() => onNavigate('finance')}
            aria-label="Navigate to Finance view"
          >
            <FaWallet />
            <span>Finance</span>
          </button>
          <button
            className={`sidebar-nav-item ${currentView === 'projects' ? 'active' : ''}`}
            onClick={() => onNavigate('projects')}
            aria-label="Navigate to Projects view"
          >
            <FaFolder />
            <span>Projects</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">TOOLS</div>
          <button className="sidebar-nav-item" onClick={onNotifications} aria-label="Open notifications">
            <FaBell />
            <span>Notifications</span>
          </button>
          <button className="sidebar-nav-item" onClick={onBackup} aria-label="Backup data">
            <FaDownload />
            <span>Backup</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
