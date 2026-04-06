import React, { useMemo } from 'react';
import { startOfWeek, addDays, format, isToday, isSameDay } from 'date-fns';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './MiniWeekBar.css';

export default function MiniWeekBar({ selectedDate, onSelectDate, onPrevWeek, onNextWeek, tasks, weekStartDate }) {
  const [y, m, d] = selectedDate.split('-').map(Number);
  const selected = useMemo(() => new Date(y, m - 1, d), [y, m, d]);
  const weekStart = useMemo(() => {
    if (weekStartDate instanceof Date && !Number.isNaN(weekStartDate.getTime())) {
      return weekStartDate;
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  }, [weekStartDate]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const taskCount = tasks.filter(t => {
        if (!t.dueDate) return false;
        const td = typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : format(new Date(t.dueDate), 'yyyy-MM-dd');
        return td === dateStr;
      }).length;
      return {
        date,
        dateStr,
        dayName: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        isToday: isToday(date),
        isSelected: isSameDay(date, selected),
        taskCount,
      };
    });
  }, [weekStart, selected, tasks]);

  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

  return (
    <div className="mini-week">
      <div className="mini-week-nav">
        <button className="mini-week-arrow" onClick={onPrevWeek}><FaChevronLeft /></button>
        <span className="mini-week-label">{weekLabel}</span>
        <button className="mini-week-arrow" onClick={onNextWeek}><FaChevronRight /></button>
      </div>
      <div className="mini-week-days">
        {days.map(day => (
          <button
            key={day.dateStr}
            className={`mini-week-day${day.isToday ? ' mini-week-day--today' : ''}${day.isSelected ? ' mini-week-day--selected' : ''}`}
            onClick={() => onSelectDate(day.dateStr)}
          >
            <span className="mini-week-day-name">{day.dayName}</span>
            <span className="mini-week-day-num">{day.dayNum}</span>
            {day.taskCount > 0 && <span className="mini-week-day-dots">{day.taskCount}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
