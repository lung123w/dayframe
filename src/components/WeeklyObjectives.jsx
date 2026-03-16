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
      let objs = data.objectives || [];
      // Ensure all items are objects (backward compatibility)
      objs = objs.map(item => 
        typeof item === 'string' ? { text: item, completed: false } : item
      );
      setObjectives(objs);
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
    save([...objectives, { text: newGoal.trim(), completed: false }]);
    setNewGoal('');
  };

  const removeGoal = (index) => {
    save(objectives.filter((_, i) => i !== index));
  };

  const toggleGoal = (index) => {
    const updated = objectives.map((goal, i) => 
      i === index ? { ...goal, completed: !goal.completed } : goal
    );
    save(updated);
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
        {objectives.length > 0 && (
          <span className="wo-badge">
            {objectives.filter(g => g.completed).length}/{objectives.length}
          </span>
        )}
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
                  <li key={i} className={`wo-item ${goal.completed ? 'completed' : ''}`}>
                    <input
                      type="checkbox"
                      className="wo-checkbox"
                      checked={goal.completed}
                      onChange={() => toggleGoal(i)}
                    />
                    <span className="wo-text">{goal.text}</span>
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
