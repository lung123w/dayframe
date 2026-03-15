import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { yearlyGoalService } from '../api';
import './YearlyGoals.css';

export default function YearlyGoals() {
  const currentYear = new Date().getFullYear();
  const [goals, setGoals] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('yearlyGoals.collapsed') === 'true'
  );
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, [currentYear]);

  const loadGoals = async () => {
    try {
      const data = await yearlyGoalService.getByYear(currentYear);
      setGoals(data.goals || '');
    } catch (err) {
      console.error('Failed to load yearly goals:', err);
    }
  };

  const saveGoals = async (goalsText) => {
    setIsSaving(true);
    try {
      await yearlyGoalService.upsert({ year: currentYear, goals: goalsText });
    } catch (err) {
      console.error('Failed to save yearly goals:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const newGoals = e.target.value;
    setGoals(newGoals);

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveGoals(newGoals);
    }, 2000);
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveGoals(goals);
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('yearlyGoals.collapsed', String(newCollapsed));
  };

  return (
    <div className="yearly-goals">
      <div className="yearly-goals-header" onClick={toggleCollapse}>
        <h3 className="yearly-goals-title">{currentYear} Goals</h3>
        <div className="yearly-goals-actions">
          {isSaving && <span className="yearly-goals-saving">Saving...</span>}
          <button className="yearly-goals-toggle" type="button">
            {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="yearly-goals-body">
          <textarea
            className="yearly-goals-textarea"
            placeholder="What are your goals for this year?"
            value={goals}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={6}
          />
        </div>
      )}
    </div>
  );
}
