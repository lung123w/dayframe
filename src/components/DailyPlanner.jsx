import React, { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { FaPlus } from 'react-icons/fa';
import BacklogSidebar from './BacklogSidebar';
import DayColumn from './DayColumn';
import MiniWeekBar from './MiniWeekBar';
import YearlyGoals from './YearlyGoals';
import WeeklyObjectives from './WeeklyObjectives';
import DailyTimeline from './DailyTimeline';
import DailyShutdown from './DailyShutdown';
import { generateRecurringTasks } from '../utils/recurrence';
import { taskService } from '../api';
import './DailyPlanner.css';

function todayStr() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function DailyPlanner({
  tasks,
  projects,
  teamMembers,
  subtasks,
  onTaskClick,
  onStatusUpdate,
  onNewTask,
  onDeleteTask,
  onSubtaskToggle,
  onAssignDate,
  onDataChange,
}) {
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Parse selected date
  const [y, m, d] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(y, m - 1, d);

  // Get day tasks for the selected (expanded) day — needed for shutdown
  const expandedDayTasks = useMemo(() => {
    const [py, pm, pd] = selectedDate.split('-').map(Number);
    const dayStart = new Date(py, pm - 1, pd);
    const dayEnd = new Date(py, pm - 1, pd + 1);
    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        result.push(...generateRecurringTasks(task, dayStart, dayEnd));
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === selectedDate) {
        result.push(task);
      }
    }
    return result;
  }, [tasks, selectedDate]);

  // Week navigation
  const handlePrevWeek = () => {
    const newDate = addDays(selectedDateObj, -7);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };
  const handleNextWeek = () => {
    const newDate = addDays(selectedDateObj, 7);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
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
          const toLocalDateStr2 = (date) => {
            if (!date) return '';
            if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
            const d = typeof date === 'string' ? new Date(date) : date;
            return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
          };
          const dayTasks = tasks
            .filter(t => t.dueDate && toLocalDateStr2(t.dueDate) === dateStr && t.status !== 'completed')
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
        } else {
          // Cross-day move or from backlog
          onAssignDate(task, new Date(dateStr + 'T12:00:00'));
        }
      }
    } catch {
      // Invalid drag data
    }
  }, [tasks, onAssignDate, onDataChange]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Get week days for mini-week display in center panel
  const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

  return (
    <div className="dp-layout">
      {/* LEFT: Backlog Sidebar */}
      <BacklogSidebar
        tasks={tasks}
        projects={projects}
        onTaskClick={onTaskClick}
        onAssignDate={onAssignDate}
        onDeleteTask={onDeleteTask}
      />

      {/* CENTER: Main Planner Area */}
      <div className="dp-center">
        {/* Yearly Goals */}
        <YearlyGoals />

        {/* Weekly Objectives */}
        <WeeklyObjectives selectedDate={selectedDate} />

        {/* Mini Week Navigation */}
        <MiniWeekBar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          tasks={tasks}
        />

        {/* Day Columns: expanded selected day + mini others */}
        <div className="dp-columns">
          {weekDays.map(dayStr => (
            <DayColumn
              key={dayStr}
              dateStr={dayStr}
              tasks={tasks}
              projects={projects}
              teamMembers={teamMembers}
              subtasks={subtasks}
              expanded={dayStr === selectedDate}
              onTaskClick={onTaskClick}
              onStatusUpdate={onStatusUpdate}
              onNewTask={onNewTask}
              onDeleteTask={onDeleteTask}
              onSubtaskToggle={onSubtaskToggle}
              onEstimateChange={handleEstimateChange}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>

        {/* Daily Shutdown — inline at bottom */}
        <DailyShutdown
          dateStr={selectedDate}
          dayTasks={expandedDayTasks}
          onDataChange={onDataChange}
        />
      </div>

      {/* RIGHT: Timeline */}
      <DailyTimeline
        dateStr={selectedDate}
        tasks={tasks}
        projects={projects}
      />
    </div>
  );
}
