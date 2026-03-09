import React, { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isFuture,
  isSameWeek,
} from 'date-fns';
import { isDateApplicable, formatTimeSpent } from '../utils/habits';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import TimePopover from './TimePopover';
import './HabitHeatmap.css';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitHeatmap({ entries, frequency, color, onToggleDate }) {
  const [tooltip, setTooltip] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [expanded, setExpanded] = useState(false);
  const [cellPopover, setCellPopover] = useState(null); // { dateStr, x, y }

  const entryMap = useMemo(() => {
    const map = {};
    for (const e of entries) {
      map[e.date] = e;
    }
    return map;
  }, [entries]);

  // Build the calendar grid for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let current = gridStart;

    while (current <= gridEnd) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const inMonth = isSameMonth(current, viewDate);
      const todayFlag = isToday(current);
      const futureFlag = isFuture(current) && !todayFlag;
      const applicable = isDateApplicable(dateStr, frequency);
      const entry = entryMap[dateStr];

      days.push({
        dateStr,
        date: new Date(current),
        dayNum: current.getDate(),
        inMonth,
        isToday: todayFlag,
        isFuture: futureFlag,
        applicable,
        entry,
      });
      current = addDays(current, 1);
    }
    return days;
  }, [viewDate, entryMap, frequency]);

  // Split into weeks (rows of 7)
  const allWeeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  // When collapsed, show only the current week
  const weeks = useMemo(() => {
    if (expanded) return allWeeks;
    const today = new Date();
    const currentWeekRow = allWeeks.find(week =>
      week.some(cell => isSameWeek(cell.date, today, { weekStartsOn: 1 }))
    );
    return currentWeekRow ? [currentWeekRow] : [allWeeks[0]];
  }, [allWeeks, expanded]);

  function getCellClass(cell) {
    const classes = ['cal-cell'];
    if (!cell.inMonth) classes.push('outside-month');
    else if (cell.isFuture) classes.push('future');
    else if (!cell.applicable) classes.push('not-applicable');
    else if (cell.entry) classes.push('completed');
    else classes.push('missed');

    if (cell.isToday) classes.push('today');
    return classes.join(' ');
  }

  function getCellStyle(cell) {
    if (!cell.inMonth) return {};
    if (cell.entry) {
      return { '--habit-color': color, backgroundColor: color + '20' };
    }
    if (!cell.applicable || cell.isFuture) return {};
    return { backgroundColor: '#FEE2E2' };
  }

  function getTodayBorderStyle(cell) {
    if (cell.isToday && cell.inMonth) {
      return { boxShadow: `inset 0 0 0 2px ${color}` };
    }
    return {};
  }

  const canClick = (cell) => cell.inMonth && !cell.isFuture && cell.applicable && onToggleDate;

  const handleCellClick = (cell, e) => {
    if (!canClick(cell)) return;
    if (cell.entry) {
      // Already completed — toggle off (delete), no popover
      onToggleDate(cell.dateStr, 0);
    } else {
      // Show time popover
      const rect = e.currentTarget.getBoundingClientRect();
      setCellPopover({ dateStr: cell.dateStr, x: rect.right + 4, y: rect.top });
    }
  };

  return (
    <div className="habit-calendar">
      {expanded && (
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={() => setViewDate(prev => subMonths(prev, 1))}>
            <FaChevronLeft />
          </button>
          <span className="cal-month-title">{format(viewDate, 'MMMM yyyy')}</span>
          <button className="cal-nav-btn" onClick={() => setViewDate(prev => addMonths(prev, 1))}>
            <FaChevronRight />
          </button>
        </div>
      )}

      <div className="cal-grid">
        {DAY_HEADERS.map(d => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
        {weeks.map((week, wi) =>
          week.map((cell, di) => (
            <div
              key={`${wi}-${di}`}
              className={getCellClass(cell)}
              style={{ ...getCellStyle(cell), ...getTodayBorderStyle(cell) }}
              onClick={(e) => handleCellClick(cell, e)}
              onMouseEnter={(e) => cell.inMonth && setTooltip({
                x: e.clientX,
                y: e.clientY,
                date: cell.dateStr,
                entry: cell.entry,
                applicable: cell.applicable,
                isFuture: cell.isFuture,
              })}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className="cal-day-num">{cell.dayNum}</span>
            </div>
          ))
        )}
      </div>

      <button
        className="cal-toggle-btn"
        onClick={() => setExpanded(prev => !prev)}
      >
        {expanded ? 'Show week' : 'Show month'}
      </button>

      {cellPopover && (
        <TimePopover
          x={cellPopover.x}
          y={cellPopover.y}
          onSave={(seconds) => {
            onToggleDate(cellPopover.dateStr, seconds);
            setCellPopover(null);
          }}
          onClose={() => setCellPopover(null)}
        />
      )}

      {tooltip && !cellPopover && (
        <div
          className="cal-tooltip"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          <strong>{format(new Date(tooltip.date + 'T00:00:00'), 'MMM d, yyyy')}</strong>
          {tooltip.isFuture ? (
            <><br />Upcoming</>
          ) : tooltip.entry ? (
            <>
              <br />Completed
              {tooltip.entry.timeSpentSeconds > 0 && (
                <> — {formatTimeSpent(tooltip.entry.timeSpentSeconds)}</>
              )}
            </>
          ) : tooltip.applicable ? (
            <><br />Missed</>
          ) : (
            <><br />Rest day</>
          )}
        </div>
      )}
    </div>
  );
}
