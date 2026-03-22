import React, { useEffect, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { FaLink, FaCheck } from 'react-icons/fa';
import { habitService, habitEntryService } from '../api';
import TimePopover from './TimePopover';
import './PlannerHabitsPanel.css';

export default function PlannerHabitsPanel({ onDataChange }) {
  const [habits, setHabits] = useState([]);
  const [entriesByHabit, setEntriesByHabit] = useState({});
  const [todayPopover, setTodayPopover] = useState(null);
  const [savingHabitIds, setSavingHabitIds] = useState({});
  const isMountedRef = useRef(true);
  const savingHabitIdsRef = useRef(new Set());
  const loadRequestVersionRef = useRef(0);

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    const requestVersion = ++loadRequestVersionRef.current;

    try {
      const habitsData = await habitService.getAll();
      const activeHabits = habitsData.filter(h => !h.isArchived);
      if (!isMountedRef.current || requestVersion !== loadRequestVersionRef.current) return;
      setHabits(activeHabits);

      const entriesMap = {};
      await Promise.all(
        activeHabits.map(async (habit) => {
          entriesMap[habit.id] = await habitEntryService.getByHabit(habit.id);
        })
      );
      if (!isMountedRef.current || requestVersion !== loadRequestVersionRef.current) return;
      setEntriesByHabit(entriesMap);
    } catch (err) {
      console.error('Failed to load planner habits:', err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const isDoneToday = (habitId) => {
    const entries = entriesByHabit[habitId] || [];
    return entries.some(e => e.date === today);
  };

  const handleToggleToday = async (habitId, timeSpentSeconds = 0) => {
    if (savingHabitIdsRef.current.has(habitId)) {
      return;
    }

    savingHabitIdsRef.current.add(habitId);
    setSavingHabitIds((prev) => ({ ...prev, [habitId]: true }));

    try {
      if (isDoneToday(habitId)) {
        await habitEntryService.deleteByDate(habitId, today);
      } else {
        await habitEntryService.create({
          habitId,
          date: today,
          timeSpentSeconds,
        });
      }
      await loadData();
      if (onDataChange && isMountedRef.current) onDataChange();
    } catch (err) {
      console.error('Failed to toggle planner habit:', err);
    } finally {
      savingHabitIdsRef.current.delete(habitId);
      if (isMountedRef.current) {
        setSavingHabitIds((prev) => ({ ...prev, [habitId]: false }));
      }
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
                <div className="planner-habit-toggle-wrap">
                  <button
                    className={`planner-habit-toggle ${done ? 'is-done' : ''}`}
                    disabled={!!savingHabitIds[habit.id]}
                    onClick={(e) => {
                      if (savingHabitIdsRef.current.has(habit.id)) {
                        return;
                      }

                      if (done) {
                        handleToggleToday(habit.id);
                        return;
                      }

                      const rect = e.currentTarget.getBoundingClientRect();
                      setTodayPopover({
                        habitId: habit.id,
                        x: rect.left,
                        y: rect.bottom + 4,
                      });
                    }}
                  >
                    <FaCheck /> {done ? 'Done' : 'Mark Done'}
                  </button>
                  {todayPopover && todayPopover.habitId === habit.id && (
                    <TimePopover
                      x={todayPopover.x}
                      y={todayPopover.y}
                      onSave={async (seconds) => {
                        setTodayPopover(null);
                        await handleToggleToday(habit.id, seconds);
                      }}
                      onClose={() => setTodayPopover(null)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
