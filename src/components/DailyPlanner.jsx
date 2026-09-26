import React, { useState, useMemo, useCallback, useRef } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { FaPlus } from 'react-icons/fa';
import BacklogSidebar from './BacklogSidebar';
import DayColumn from './DayColumn';
import MiniWeekBar from './MiniWeekBar';
import YearlyGoals from './YearlyGoals';
import WeeklyObjectives from './WeeklyObjectives';
import { taskService } from '../api';
import './DailyPlanner.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function DailyPlanner({
  tasks,
  projects,
  subtasks,
  onTaskClick,
  onStatusUpdate,
  onNewTask,
  onDeleteTask,
  onSubtaskToggle,
  onAssignDate,
  onDataChange,
  onTodayOrderChange,
  keyEvents,
  onAddKeyEvent,
  onUpdateKeyEvent,
  onDeleteKeyEvent,
}) {
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const [weekStartDate, setWeekStartDate] = useState(currentWeekStart);
  // F20: the week bar's day buttons and each day column's header used to be
  // dead controls (`onSelectDate={() => {}}`). They now set a view-local
  // focused day — emphasis plus a horizontal scroll to that column. No
  // app-level state and no route (ADR-012).
  const [focusedDay, setFocusedDay] = useState(null);
  const scrollContainerRef = useRef(null);

  // Calculate 7-day week view
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => format(addDays(weekStartDate, i), 'yyyy-MM-dd'));
  }, [weekStartDate]);

  const handleSelectDay = useCallback((dateStr) => {
    if (!dateStr) return;
    setFocusedDay(dateStr);
    const container = scrollContainerRef.current;
    const column = container ? container.querySelector(`[data-date="${dateStr}"]`) : null;
    if (column && typeof column.scrollIntoView === 'function') {
      column.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  }, []);

  // Week navigation
  const handlePrevWeek = () => {
    setFocusedDay(null);
    setWeekStartDate(prev => addDays(prev, -7));
  };
  const handleNextWeek = () => {
    setFocusedDay(null);
    setWeekStartDate(prev => addDays(prev, 7));
  };
  const handleGoToToday = () => {
    setFocusedDay(null);
    setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Handle estimate change (inline on task card)
  const handleEstimateChange = useCallback(async (task, minutes) => {
    const taskId = task.isRecurringInstance ? task.recurringSourceId : task.id;
    try {
      await taskService.update(taskId, { estimatedMinutes: minutes });
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error('Failed to update estimate:', e);
    }
  }, [onDataChange]);

  // Drag-and-drop: drop onto a day column
  const handleDrop = useCallback(async (e, dropIndex) => {
    e.preventDefault();
    const dateStr = e.currentTarget.getAttribute('data-date');
    if (!dateStr) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.taskId) {
        const taskId = data.taskId;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const sourceDate = data.sourceDate;

        if (sourceDate && sourceDate === dateStr && dropIndex >= 0) {
          // Same-day reorder
          const dayTasks = tasks
            .filter(t => t.dueDate && toLocalDateStr(t.dueDate) === dateStr && t.status !== 'completed')
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

          const currentIndex = dayTasks.findIndex(t => t.id === taskId);
          if (currentIndex === -1 || currentIndex === dropIndex) return;

          const reordered = [...dayTasks];
          const [moved] = reordered.splice(currentIndex, 1);
          reordered.splice(dropIndex > currentIndex ? dropIndex - 1 : dropIndex, 0, moved);

          for (let i = 0; i < reordered.length; i++) {
            if (reordered[i].sortOrder !== i) {
              await taskService.update(reordered[i].id, { sortOrder: i });
            }
          }
          if (onDataChange) onDataChange();
          // If reordering today's column, sync todayOrder
          const todayStr = toLocalDateStr(new Date());
          if (dateStr === todayStr && onTodayOrderChange) {
            onTodayOrderChange(reordered.map(t => String(t.id)));
          }
        } else {
          // Cross-day move or from backlog
          onAssignDate(task, new Date(dateStr + 'T12:00:00'));
        }
      }
    } catch {
      // Invalid drag data
    }
  }, [tasks, onAssignDate, onDataChange, onTodayOrderChange]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="dp-layout">
      {/* Top section: 2026 Goals full width */}
      <div className="dp-top-goals">
        <YearlyGoals />
      </div>

      {/* Backlog - full width, same as task grid */}
      <div className="dp-top-backlog">
        <BacklogSidebar
          tasks={tasks}
          projects={projects}
          onTaskClick={onTaskClick}
          onAssignDate={onAssignDate}
          onDeleteTask={onDeleteTask}
          onStatusUpdate={onStatusUpdate}
        />
      </div>

      {/* Week Navigation */}
      <MiniWeekBar
        selectedDate={focusedDay || weekDays[0]}
        onSelectDate={handleSelectDay}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onGoToToday={handleGoToToday}
        tasks={tasks}
        weekStartDate={weekStartDate}
      />

      {/* Weekly Objectives - right under week navigation */}
      <WeeklyObjectives
        selectedDate={weekDays[0]}
        keyEvents={keyEvents}
        onAddKeyEvent={onAddKeyEvent}
        onUpdateKeyEvent={onUpdateKeyEvent}
        onDeleteKeyEvent={onDeleteKeyEvent}
      />

      {/* Day Columns: All 7 days shown equally - FULL WIDTH */}
      <div className="daily-planner-scroll-container" ref={scrollContainerRef}>
        {weekDays.map(dayStr => (
          <DayColumn
            key={dayStr}
            dateStr={dayStr}
            tasks={tasks}
            projects={projects}
            subtasks={subtasks}
            expanded={true}
            isFocused={focusedDay === dayStr}
            onTaskClick={onTaskClick}
            onStatusUpdate={onStatusUpdate}
            onNewTask={onNewTask}
            onDeleteTask={onDeleteTask}
            onSubtaskToggle={onSubtaskToggle}
            onEstimateChange={handleEstimateChange}
            onAssignDate={onAssignDate}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDayClick={handleSelectDay}
          />
        ))}
      </div>
    </div>
  );
}
