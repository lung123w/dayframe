import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { FaPlus, FaFire, FaCheck, FaClock, FaEdit, FaUndo } from 'react-icons/fa';
import HabitHeatmap from './HabitHeatmap';
import HabitModal from './HabitModal';
import TimePopover from './TimePopover';
import RepsPopover from './RepsPopover';
import { habitService, habitEntryService } from '../api';
import { calculateCurrentStreak, calculateLongestStreak, formatTimeSpent, formatCount, getEntryValue, getTrackType } from '../utils/habits';
import './HabitTracker.css';

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [entriesByHabit, setEntriesByHabit] = useState({});
  const [expandedHabitId, setExpandedHabitId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  // Manual time input
  const [manualMinutes, setManualMinutes] = useState('');

  // Undo delete state
  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimerRef = useRef(null);

  // "Mark Done" popover state
  const [todayPopover, setTodayPopover] = useState(null); // { habitId, x, y }

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

  // Cleanup delete timer on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleToggleToday = async (habit, value = 0) => {
    try {
      const entries = entriesByHabit[habit.id] || [];
      const todayEntry = entries.find(e => e.date === today);
      const isCount = getTrackType(habit) === 'count';

      if (todayEntry) {
        await habitEntryService.deleteByDate(habit.id, today);
      } else if (isCount) {
        await habitEntryService.create({ habitId: habit.id, date: today, count: value });
      } else {
        await habitEntryService.create({ habitId: habit.id, date: today, timeSpentSeconds: value });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to toggle today:', err);
    }
  };

  const handleLogManualTime = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const raw = parseInt(manualMinutes);
    if (!raw || raw <= 0) return;
    const isCount = getTrackType(habit) === 'count';

    try {
      const entries = entriesByHabit[habitId] || [];
      const todayEntry = entries.find(e => e.date === today);

      if (isCount) {
        if (todayEntry) {
          await habitEntryService.update(todayEntry.id, {
            count: (todayEntry.count || 0) + raw,
          });
        } else {
          await habitEntryService.create({
            habitId,
            date: today,
            count: raw,
          });
        }
      } else {
        const secondsToAdd = raw * 60;
        if (todayEntry) {
          await habitEntryService.update(todayEntry.id, {
            timeSpentSeconds: (todayEntry.timeSpentSeconds || 0) + secondsToAdd,
          });
        } else {
          await habitEntryService.create({
            habitId,
            date: today,
            timeSpentSeconds: secondsToAdd,
          });
        }
      }

      setManualMinutes('');
      await loadData();
    } catch (err) {
      console.error('Failed to log manual time:', err);
    }
  };

  const handleSaveHabit = async (habitData) => {
    try {
      if (editingHabit) {
        await habitService.update(editingHabit.id, habitData);
      } else {
        await habitService.create(habitData);
      }
      setShowModal(false);
      setEditingHabit(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save habit:', err);
    }
  };

  const handleDeleteHabit = async (id) => {
    // Soft delete: hide from UI, show undo toast, delete after 5s
    const habitToDelete = habits.find(h => h.id === id);
    if (!habitToDelete) return;

    // Clear any existing pending delete
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      // Execute the previous pending delete immediately
      if (pendingDelete) {
        habitService.delete(pendingDelete.id).catch(err => console.error('Failed to delete habit:', err));
      }
    }

    setShowModal(false);
    setEditingHabit(null);
    setPendingDelete({ id, habit: habitToDelete });

    // Hide from UI immediately
    setHabits(prev => prev.filter(h => h.id !== id));

    // Schedule permanent delete after 5 seconds
    deleteTimerRef.current = setTimeout(async () => {
      try {
        await habitService.delete(id);
        setPendingDelete(null);
        deleteTimerRef.current = null;
      } catch (err) {
        console.error('Failed to delete habit:', err);
        await loadData(); // Restore on failure
        setPendingDelete(null);
      }
    }, 5000);
  };

  const handleUndoDelete = async () => {
    if (!pendingDelete) return;
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDelete(null);
    await loadData(); // Restore the habit from DB (it hasn't been deleted yet)
  };

  const handleToggleDate = async (habitId, dateStr, value = 0) => {
    try {
      const habit = habits.find(h => h.id === habitId);
      const isCount = habit && getTrackType(habit) === 'count';
      const entries = entriesByHabit[habitId] || [];
      const existing = entries.find(e => e.date === dateStr);

      if (existing) {
        await habitEntryService.deleteByDate(habitId, dateStr);
      } else if (isCount) {
        await habitEntryService.create({ habitId, date: dateStr, count: value });
      } else {
        await habitEntryService.create({ habitId, date: dateStr, timeSpentSeconds: value });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to toggle date:', err);
    }
  };

  const handleArchiveHabit = async (id) => {
    try {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;
      await habitService.update(id, { isArchived: !habit.isArchived });
      setShowModal(false);
      setEditingHabit(null);
      await loadData();
    } catch (err) {
      console.error('Failed to archive habit:', err);
    }
  };

  const openEditModal = (habit) => {
    setEditingHabit(habit);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingHabit(null);
    setShowModal(true);
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
          const isCount = getTrackType(habit) === 'count';
          const totalValue = entries.reduce((sum, e) => sum + getEntryValue(e, habit), 0);
          const isExpanded = expandedHabitId === habit.id;

          return (
            <div key={habit.id} className={`habit-card ${isExpanded ? 'expanded' : ''}`}>
              <div className="habit-card-header" onClick={() => { setExpandedHabitId(isExpanded ? null : habit.id); setManualMinutes(''); }}>
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
                <div className="mark-done-wrapper" onClick={e => e.stopPropagation()}>
                  <button
                    className={`btn btn-sm ${todayEntry ? 'btn-success' : 'btn-outline'}`}
                    onClick={(e) => {
                      if (todayEntry) {
                        // Already done — toggle off (delete), no popover
                        handleToggleToday(habit);
                      } else {
                        // Show time popover
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTodayPopover({ habitId: habit.id, x: rect.left, y: rect.bottom + 4 });
                      }
                    }}
                  >
                    <FaCheck /> {todayEntry ? 'Done' : 'Mark Done'}
                  </button>
                  {todayPopover && todayPopover.habitId === habit.id && (
                    isCount ? (
                      <RepsPopover
                        x={todayPopover.x}
                        y={todayPopover.y}
                        onSave={(reps) => {
                          handleToggleToday(habit, reps);
                          setTodayPopover(null);
                        }}
                        onClose={() => setTodayPopover(null)}
                      />
                    ) : (
                      <TimePopover
                        x={todayPopover.x}
                        y={todayPopover.y}
                        onSave={(seconds) => {
                          handleToggleToday(habit, seconds);
                          setTodayPopover(null);
                        }}
                        onClose={() => setTodayPopover(null)}
                      />
                    )
                  )}
                </div>

                <div className="manual-time-input" onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    min="1"
                    placeholder={isCount ? 'reps' : 'min'}
                    value={manualMinutes}
                    onChange={e => setManualMinutes(e.target.value)}
                    className="time-input"
                  />
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleLogManualTime(habit.id)}
                    title={isCount ? 'Add reps' : 'Log time'}
                  >
                    <FaClock />
                  </button>
                </div>

                {todayEntry && getEntryValue(todayEntry, habit) > 0 && (
                  <span className="today-time">
                    {isCount ? formatCount(todayEntry.count || 0) : formatTimeSpent(todayEntry.timeSpentSeconds)} today
                  </span>
                )}
              </div>

              <div className="habit-card-heatmap">
                <HabitHeatmap
                  entries={entries}
                  frequency={habit.frequency}
                  color={habit.color}
                  trackType={getTrackType(habit)}
                  onToggleDate={(dateStr, value) => handleToggleDate(habit.id, dateStr, value)}
                />
              </div>

              {isExpanded && (
                <div className="habit-card-expanded">
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
                      <span className="habit-stat-value">
                        {isCount ? formatCount(totalValue) : formatTimeSpent(totalValue)}
                      </span>
                      <span className="habit-stat-label">{isCount ? 'Reps' : 'Time'}</span>
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
          entriesCount={editingHabit ? (entriesByHabit[editingHabit.id] || []).length : 0}
        />
      )}

      {pendingDelete && (
        <div className="undo-toast">
          <span>"{pendingDelete.habit.name}" deleted</span>
          <button className="btn btn-sm undo-toast-btn" onClick={handleUndoDelete}>
            <FaUndo /> Undo
          </button>
        </div>
      )}
    </div>
  );
}
