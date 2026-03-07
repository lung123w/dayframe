import React, { useMemo, useState } from 'react';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { isDateApplicable, formatTimeSpent } from '../utils/habits';
import './HabitHeatmap.css';

const WEEKS_TO_SHOW = 16;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function HabitHeatmap({ entries, frequency, color }) {
  const [tooltip, setTooltip] = useState(null);

  const entryMap = useMemo(() => {
    const map = {};
    for (const e of entries) {
      map[e.date] = e;
    }
    return map;
  }, [entries]);

  const grid = useMemo(() => {
    const today = new Date();
    const endOfGrid = today;
    const startDay = subDays(startOfWeek(endOfGrid, { weekStartsOn: 1 }), (WEEKS_TO_SHOW - 1) * 7);

    const weeks = [];
    let currentDay = startDay;

    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = format(currentDay, 'yyyy-MM-dd');
        const isFuture = currentDay > today;
        const applicable = isDateApplicable(dateStr, frequency);
        const entry = entryMap[dateStr];
        week.push({ dateStr, isFuture, applicable, entry, date: new Date(currentDay) });
        currentDay = addDays(currentDay, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [entryMap, frequency]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    for (let w = 0; w < grid.length; w++) {
      const firstDayOfWeek = grid[w][0];
      const month = firstDayOfWeek.date.getMonth();
      if (month !== lastMonth) {
        labels.push({ weekIndex: w, label: format(firstDayOfWeek.date, 'MMM') });
        lastMonth = month;
      }
    }
    return labels;
  }, [grid]);

  function getCellClass(cell) {
    if (cell.isFuture) return 'heatmap-cell future';
    if (!cell.applicable) return 'heatmap-cell not-applicable';
    if (cell.entry) return 'heatmap-cell completed';
    return 'heatmap-cell missed';
  }

  function getCellStyle(cell) {
    if (cell.entry) return { backgroundColor: color };
    if (!cell.applicable || cell.isFuture) return {};
    return { backgroundColor: color + '20' };
  }

  return (
    <div className="habit-heatmap">
      <div className="heatmap-month-labels">
        <div className="heatmap-day-label-spacer" />
        {grid.map((_, w) => {
          const label = monthLabels.find(l => l.weekIndex === w);
          return (
            <div key={w} className="heatmap-month-cell">
              {label ? label.label : ''}
            </div>
          );
        })}
      </div>
      <div className="heatmap-grid-container">
        <div className="heatmap-day-labels">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="heatmap-day-label">{label}</div>
          ))}
        </div>
        <div className="heatmap-grid">
          {grid.map((week, w) => (
            <div key={w} className="heatmap-week">
              {week.map((cell, d) => (
                <div
                  key={d}
                  className={getCellClass(cell)}
                  style={getCellStyle(cell)}
                  onMouseEnter={(e) => setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    date: cell.dateStr,
                    entry: cell.entry,
                    applicable: cell.applicable,
                  })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          <strong>{format(new Date(tooltip.date + 'T00:00:00'), 'MMM d, yyyy')}</strong>
          {tooltip.entry ? (
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
