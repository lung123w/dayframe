import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { FaLink, FaCheck } from 'react-icons/fa';
import { habitService, habitEntryService } from '../api';
import './PlannerHabitsPanel.css';

export default function PlannerHabitsPanel({ onDataChange }) {
  const [habits, setHabits] = useState([]);
  const [entriesByHabit, setEntriesByHabit] = useState({});

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    try {
      const habitsData = await habitService.getAll();
      const activeHabits = habitsData.filter(h => !h.isArchived);
      setHabits(activeHabits);

      const entriesMap = {};
      await Promise.all(
        activeHabits.map(async (habit) => {
          entriesMap[habit.id] = await habitEntryService.getByHabit(habit.id);
        })
      );
      setEntriesByHabit(entriesMap);
    } catch (err) {
      console.error('Failed to load planner habits:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isDoneToday = (habitId) => {
    const entries = entriesByHabit[habitId] || [];
    return entries.some(e => e.date === today);
  };

  const handleToggleToday = async (habitId) => {
    try {
      if (isDoneToday(habitId)) {
        await habitEntryService.deleteByDate(habitId, today);
      } else {
        await habitEntryService.create({
          habitId,
          date: today,
          timeSpentSeconds: 0,
        });
      }
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Failed to toggle planner habit:', err);
    }
  };

  return (
    <div className="planner-habits-panel">
      <div className="planner-habits-header">
        <div className="planner-habits-title-wrap">
          <FaLink className="planner-habits-icon" />
          <span className="planner-habits-title">Today Habits</span>
        </div>
        <span className="planner-habits-count">{habits.length}</span>
      </div>

      {habits.length === 0 ? (
        <div className="planner-habits-empty">No habits for today</div>
      ) : (
        <div className="planner-habits-list">
          {habits.map((habit) => {
            const done = isDoneToday(habit.id);
            return (
              <div key={habit.id} className="planner-habits-item">
                <span className="planner-habit-name">{habit.name}</span>
                <button
                  className={`planner-habit-toggle ${done ? 'is-done' : ''}`}
                  onClick={() => handleToggleToday(habit.id)}
                >
                  <FaCheck /> {done ? 'Done' : 'Mark Done'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
