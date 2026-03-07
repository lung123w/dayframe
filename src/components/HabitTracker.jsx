import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { FaPlus, FaFire, FaCheck, FaPlay, FaStop, FaClock, FaEdit } from 'react-icons/fa';
import HabitHeatmap from './HabitHeatmap';
import HabitModal from './HabitModal';
import { habitService, habitEntryService } from '../api';
import { calculateCurrentStreak, calculateLongestStreak, formatTimeSpent } from '../utils/habits';
import './HabitTracker.css';

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [entriesByHabit, setEntriesByHabit] = useState({});
  const [expandedHabitId, setExpandedHabitId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  // Timer state
  const [timerHabitId, setTimerHabitId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  // Manual time input
  const [manualMinutes, setManualMinutes] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    try {
      const habitsData = await habitService.getAll();
      setHabits(habitsData);

      const entriesMap = {};
      await Promise.all(
        habitsData.map(async (h) => {
          const entries = await habitEntryService.getByHabit(h.id);
          entriesMap[h.id] = entries;
        })
      );
      setEntriesByHabit(entriesMap);
    } catch (err) {
      console.error('Failed to load habits:', err);
    }
  }, []);

  useEffect(() => {
    // Initial data load - async fetch that sets state via callback
    let cancelled = false;
    (async () => {
      try {
        const habitsData = await habitService.getAll();
        if (cancelled) return;
        setHabits(habitsData);

        const entriesMap = {};
        await Promise.all(
          habitsData.map(async (h) => {
            const entries = await habitEntryService.getByHabit(h.id);
            entriesMap[h.id] = entries;
          })
        );
        if (cancelled) return;
        setEntriesByHabit(entriesMap);
      } catch (err) {
        console.error('Failed to load habits:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerHabitId) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerHabitId]);

  const handleToggleToday = async (habit) => {
    const entries = entriesByHabit[habit.id] || [];
    const todayEntry = entries.find(e => e.date === today);

    if (todayEntry) {
      await habitEntryService.deleteByDate(habit.id, today);
    } else {
      await habitEntryService.create({ habitId: habit.id, date: today, timeSpentSeconds: 0 });
    }
    await loadData();
  };

  const handleStartTimer = (habitId) => {
    if (timerHabitId) {
      handleStopTimer();
    }
    setTimerHabitId(habitId);
    setTimerSeconds(0);
  };

  const handleStopTimer = async () => {
    if (!timerHabitId || timerSeconds === 0) {
      setTimerHabitId(null);
      setTimerSeconds(0);
      return;
    }

    const entries = entriesByHabit[timerHabitId] || [];
    const todayEntry = entries.find(e => e.date === today);

    if (todayEntry) {
      await habitEntryService.update(todayEntry.id, {
        timeSpentSeconds: todayEntry.timeSpentSeconds + timerSeconds,
      });
    } else {
      await habitEntryService.create({
        habitId: timerHabitId,
        date: today,
        timeSpentSeconds: timerSeconds,
      });
    }

    clearInterval(timerRef.current);
    setTimerHabitId(null);
    setTimerSeconds(0);
    await loadData();
  };

  const handleLogManualTime = async (habitId) => {
    const minutes = parseInt(manualMinutes);
    if (!minutes || minutes <= 0) return;

    const entries = entriesByHabit[habitId] || [];
    const todayEntry = entries.find(e => e.date === today);
    const secondsToAdd = minutes * 60;

    if (todayEntry) {
      await habitEntryService.update(todayEntry.id, {
        timeSpentSeconds: todayEntry.timeSpentSeconds + secondsToAdd,
      });
    } else {
      await habitEntryService.create({
        habitId,
        date: today,
        timeSpentSeconds: secondsToAdd,
      });
    }

    setManualMinutes('');
    await loadData();
  };

  const handleSaveHabit = async (habitData) => {
    if (editingHabit) {
      await habitService.update(editingHabit.id, habitData);
    } else {
      await habitService.create(habitData);
    }
    setShowModal(false);
    setEditingHabit(null);
    await loadData();
  };

  const handleDeleteHabit = async (id) => {
    if (window.confirm('Delete this habit and all its history?')) {
      await habitService.delete(id);
      setShowModal(false);
      setEditingHabit(null);
      await loadData();
    }
  };

  const handleArchiveHabit = async (id) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    await habitService.update(id, { isArchived: !habit.isArchived });
    setShowModal(false);
    setEditingHabit(null);
    await loadData();
  };

  const openEditModal = (habit) => {
    setEditingHabit(habit);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingHabit(null);
    setShowModal(true);
  };

  const formatTimerDisplay = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getFrequencyLabel = (freq) => {
    if (freq.type === 'daily') return 'Daily';
    if (freq.type === 'weekdays') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return freq.days.map(d => dayNames[d - 1]).join(', ');
    }
    return `${freq.timesPerWeek}x per week`;
  };

  return (
    <div className="habit-tracker">
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <FaPlus /> New Habit
          </button>
        </div>
        <div className="toolbar-right">
          <div className="task-stats">
            <div className="stat-card">
              <span className="stat-label">Habits</span>
              <span className="stat-value">{habits.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Done Today</span>
              <span className="stat-value" style={{ color: '#10B981' }}>
                {habits.filter(h => (entriesByHabit[h.id] || []).some(e => e.date === today)).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="habit-list">
        {habits.length === 0 && (
          <div className="habit-empty">
            <p>No habits yet. Create your first habit to start building streaks!</p>
          </div>
        )}
        {habits.map(habit => {
          const entries = entriesByHabit[habit.id] || [];
          const todayEntry = entries.find(e => e.date === today);
          const currentStreak = calculateCurrentStreak(entries, habit.frequency);
          const longestStreak = calculateLongestStreak(entries, habit.frequency);
          const totalCompletions = entries.length;
          const totalTime = entries.reduce((sum, e) => sum + (e.timeSpentSeconds || 0), 0);
          const isExpanded = expandedHabitId === habit.id;
          const isTimerRunning = timerHabitId === habit.id;

          return (
            <div key={habit.id} className={`habit-card ${isExpanded ? 'expanded' : ''}`}>
              <div className="habit-card-header" onClick={() => setExpandedHabitId(isExpanded ? null : habit.id)}>
                <div className="habit-card-info">
                  <span className="habit-color-dot" style={{ backgroundColor: habit.color }} />
                  <h3 className="habit-name">{habit.name}</h3>
                  {currentStreak > 0 && (
                    <span className="habit-streak">
                      <FaFire /> {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="habit-card-meta">
                  <span className="habit-frequency">{getFrequencyLabel(habit.frequency)}</span>
                  <button
                    className="btn-icon"
                    onClick={(e) => { e.stopPropagation(); openEditModal(habit); }}
                    title="Edit habit"
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>

              <div className="habit-card-actions">
                <button
                  className={`btn btn-sm ${todayEntry ? 'btn-success' : 'btn-outline'}`}
                  onClick={(e) => { e.stopPropagation(); handleToggleToday(habit); }}
                >
                  <FaCheck /> {todayEntry ? 'Done' : 'Mark Done'}
                </button>

                {isTimerRunning ? (
                  <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleStopTimer(); }}>
                    <FaStop /> {formatTimerDisplay(timerSeconds)}
                  </button>
                ) : (
                  <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleStartTimer(habit.id); }}>
                    <FaPlay /> Timer
                  </button>
                )}

                <div className="manual-time-input" onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    min="1"
                    placeholder="min"
                    value={expandedHabitId === habit.id ? manualMinutes : ''}
                    onChange={e => setManualMinutes(e.target.value)}
                    className="time-input"
                  />
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleLogManualTime(habit.id)}
                    title="Log time"
                  >
                    <FaClock />
                  </button>
                </div>

                {todayEntry && todayEntry.timeSpentSeconds > 0 && (
                  <span className="today-time">{formatTimeSpent(todayEntry.timeSpentSeconds)} today</span>
                )}
              </div>

              {isExpanded && (
                <div className="habit-card-expanded">
                  <HabitHeatmap entries={entries} frequency={habit.frequency} color={habit.color} />
                  <div className="habit-stats">
                    <div className="habit-stat">
                      <span className="habit-stat-value">{currentStreak}</span>
                      <span className="habit-stat-label">Current</span>
                    </div>
                    <div className="habit-stat">
                      <span className="habit-stat-value">{longestStreak}</span>
                      <span className="habit-stat-label">Best</span>
                    </div>
                    <div className="habit-stat">
                      <span className="habit-stat-value">{totalCompletions}</span>
                      <span className="habit-stat-label">Total</span>
                    </div>
                    <div className="habit-stat">
                      <span className="habit-stat-value">{formatTimeSpent(totalTime)}</span>
                      <span className="habit-stat-label">Time</span>
                    </div>
                  </div>
                  {habit.description && (
                    <p className="habit-description">{habit.description}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <HabitModal
          habit={editingHabit}
          onSave={handleSaveHabit}
          onDelete={handleDeleteHabit}
          onArchive={handleArchiveHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}
    </div>
  );
}
