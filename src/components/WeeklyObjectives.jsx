import React, { useState, useEffect, useCallback } from 'react';
import { FaBullseye, FaPlus, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { startOfWeek, format } from 'date-fns';
import { weeklyObjectiveService } from '../api';
import './WeeklyObjectives.css';

export default function WeeklyObjectives({ selectedDate }) {
  const [objectives, setObjectives] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compute Monday of current week
  const [y, m, d] = selectedDate.split('-').map(Number);
  const weekStart = format(startOfWeek(new Date(y, m - 1, d), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await weeklyObjectiveService.getByWeek(weekStart);
      setObjectives(data.objectives || []);
    } catch (e) {
      console.error('Failed to load weekly objectives:', e);
    }
    setLoading(false);
  }, [weekStart]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const save = async (updated) => {
    setObjectives(updated);
    try {
      await weeklyObjectiveService.upsert(weekStart, updated);
    } catch (e) {
      console.error('Failed to save weekly objectives:', e);
    }
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    save([...objectives, newGoal.trim()]);
    setNewGoal('');
  };

  const removeGoal = (index) => {
    save(objectives.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addGoal();
  };

  return (
    <div className="wo-container">
      <button className="wo-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        <FaBullseye className="wo-icon" />
        <span className="wo-title">Weekly Goals</span>
        {objectives.length > 0 && <span className="wo-badge">{objectives.length}</span>}
      </button>

      {!collapsed && (
        <div className="wo-body">
          {loading ? (
            <div className="wo-loading">Loading...</div>
          ) : (
            <>
              {objectives.length === 0 && (
                <div className="wo-empty">No goals set for this week</div>
              )}
              <ul className="wo-list">
                {objectives.map((goal, i) => (
                  <li key={i} className="wo-item">
                    <span className="wo-bullet">-</span>
                    <span className="wo-text">{goal}</span>
                    <button className="wo-remove" onClick={() => removeGoal(i)} title="Remove">
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="wo-add-row">
                <input
                  type="text"
                  className="wo-input"
                  placeholder="Add a goal..."
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="wo-add-btn" onClick={addGoal} disabled={!newGoal.trim()}>
                  <FaPlus />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
