import React, { useEffect, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { FaLink, FaCircle, FaCheckCircle } from 'react-icons/fa';
import { habitService, habitEntryService } from '../api';
import TimePopover from './TimePopover';
import RepsPopover from './RepsPopover';
import DailyWorkflow from './DailyWorkflow';
import { getTrackType, formatTimeSpent, formatCount } from '../utils/habits';
import './PlannerHabitsPanel.css';

/**
 * Today's habit rail (Concept A, stage 3 of `ui-modernization-calm-canvas`).
 *
 * - The rail is collapsed to one "N of M done" line until it is activated; the
 *   collapse state is view-local (design.md §3 D7 / the spec's "Logging a habit
 *   is one action").
 * - One activation on a not-done row writes the day with **zero minutes**
 *   through the existing path (create); activating a done row deletes the
 *   day's entry. There is no confirmation step and no second POST for the same
 *   day — a second POST answers 409 and the stale value survives (ADR-008).
 * - A duration is an optional in-place refinement: it PUTs the entry that
 *   already exists rather than writing the day again.
 */
export default function PlannerHabitsPanel({ onDataChange }) {
  const [habits, setHabits] = useState([]);
  const [entriesByHabit, setEntriesByHabit] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [refineTarget, setRefineTarget] = useState(null); // { habitId, el }
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

  const todayEntryFor = (habitId) => (entriesByHabit[habitId] || []).find(e => e.date === today);
  const isDoneToday = (habitId) => !!todayEntryFor(habitId);
  const doneCount = habits.filter(h => isDoneToday(h.id)).length;

  const withSavingGuard = async (habitId, work) => {
    if (savingHabitIdsRef.current.has(habitId)) {
      return;
    }

    savingHabitIdsRef.current.add(habitId);
    setSavingHabitIds((prev) => ({ ...prev, [habitId]: true }));

    try {
      await work();
      await loadData();
      if (onDataChange && isMountedRef.current) onDataChange();
    } catch (err) {
      console.error('Failed to save planner habit:', err);
    } finally {
      savingHabitIdsRef.current.delete(habitId);
      if (isMountedRef.current) {
        setSavingHabitIds((prev) => ({ ...prev, [habitId]: false }));
      }
    }
  };

  // One activation logs the day with zero minutes (or unmarks it).
  const handleToggleToday = async (habitId, value = 0) => {
    await withSavingGuard(habitId, async () => {
      const habit = habits.find(h => h.id === habitId);
      const isCount = habit && getTrackType(habit) === 'count';

      if (isDoneToday(habitId)) {
        await habitEntryService.deleteByDate(habitId, today);
      } else if (isCount) {
        await habitEntryService.create({
          habitId,
          date: today,
          count: value,
        });
      } else {
        await habitEntryService.create({
          habitId,
          date: today,
          timeSpentSeconds: value,
        });
      }
    });
  };

  // The duration/reps refinement: the entry already exists, so it is replaced
  // in place (PUT) — never a second POST for the same day.
  const handleRefineToday = async (habitId, value) => {
    await withSavingGuard(habitId, async () => {
      const existing = todayEntryFor(habitId);
      if (!existing) {
        return;
      }
      const habit = habits.find(h => h.id === habitId);
      const isCount = habit && getTrackType(habit) === 'count';
      if (isCount) {
        await habitEntryService.update(existing.id, { count: value });
      } else {
        await habitEntryService.update(existing.id, { timeSpentSeconds: value });
      }
    });
  };

  const renderValue = (entry, isCount, done) => {
    if (!done) return '';
    if (isCount) return formatCount(entry.count || 0);
    return entry.timeSpentSeconds > 0 ? formatTimeSpent(entry.timeSpentSeconds) : 'Done';
  };

  return (
    <div className="planner-habits-panel">
      <div className="planner-habits-header">
        <button
          type="button"
          className="planner-habits-title-wrap"
          aria-expanded={expanded}
          onClick={() => setExpanded(prev => !prev)}
        >
          <FaLink className="planner-habits-icon" />
          <span className="planner-habits-title">Today Habits</span>
          <span className="planner-habits-count">
            {habits.length === 0 ? '0' : `${doneCount} of ${habits.length} done`}
          </span>
        </button>
      </div>

      {expanded && (
        habits.length === 0 ? (
          <div className="planner-habits-empty">No habits for today</div>
        ) : (
          <div className="planner-habits-list">
            {habits.map((habit) => {
              const done = isDoneToday(habit.id);
              const entry = todayEntryFor(habit.id);
              const isCount = getTrackType(habit) === 'count';
              return (
                <div key={habit.id} className="planner-habits-item">
                  <button
                    type="button"
                    className={`planner-habit-toggle${done ? ' is-done' : ''}`}
                    aria-pressed={done}
                    aria-label={done ? `Unmark ${habit.name}` : `Mark ${habit.name} done`}
                    disabled={!!savingHabitIds[habit.id]}
                    onClick={() => handleToggleToday(habit.id, 0)}
                  >
                    {done ? <FaCheckCircle /> : <FaCircle />}
                  </button>
                  <span className="planner-habit-name">{habit.name}</span>
                  <span className="planner-habit-value">{renderValue(entry, isCount, done)}</span>
                  {done && (
                    <button
                      type="button"
                      className="planner-habit-refine"
                      onClick={(e) => setRefineTarget({ habitId: habit.id, el: e.currentTarget })}
                    >
                      {isCount ? 'Reps' : 'Time'}
                    </button>
                  )}
                  {refineTarget && refineTarget.habitId === habit.id && entry && (
                    isCount ? (
                      <RepsPopover
                        anchorEl={refineTarget.el}
                        initialValue={entry.count || 0}
                        onSave={async (reps) => {
                          setRefineTarget(null);
                          await handleRefineToday(habit.id, reps);
                        }}
                        onClose={() => setRefineTarget(null)}
                      />
                    ) : (
                      <TimePopover
                        anchorEl={refineTarget.el}
                        onSave={async (seconds) => {
                          setRefineTarget(null);
                          await handleRefineToday(habit.id, seconds);
                        }}
                        onClose={() => setRefineTarget(null)}
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
      <DailyWorkflow today={today} />
    </div>
  );
}
