import React, { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { FaPlus } from 'react-icons/fa';
import BacklogSidebar from './BacklogSidebar';
import DayColumn from './DayColumn';
import MiniWeekBar from './MiniWeekBar';
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
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);
    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        result.push(...generateRecurringTasks(task, dayStart, dayEnd));
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === selectedDate) {
        result.push(task);
      }
    }
    return result;
  }, [tasks, selectedDate, y, m, d]);

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
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dateStr = e.currentTarget.getAttribute('data-date');
    if (!dateStr) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.taskId) {
        const task = tasks.find(t => t.id === data.taskId);
        if (task) {
          onAssignDate(task, new Date(dateStr));
        }
      }
    } catch (err) {
      // Invalid drag data
    }
  }, [tasks, onAssignDate]);

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
