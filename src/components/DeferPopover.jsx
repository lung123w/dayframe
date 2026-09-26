import React, { useState } from 'react';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { FaTimes } from 'react-icons/fa';
import RadixPopover from './RadixPopover';
import './DeferPopover.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

/**
 * Defer a task. `trigger` is rendered by the caller (a row's text action) and
 * becomes the Radix trigger, so the popover is anchored to the action that
 * opened it and Radix owns the toggle, the outside dismissal and the clamping
 * (design.md §3 D7 — the old version positioned itself off a ref and had no
 * viewport clamping).
 */
export default function DeferPopover({ task, onDefer, trigger }) {
  const [open, setOpen] = useState(false);

  const handleQuickDefer = (daysToAdd) => {
    const newDate = addDays(new Date(), daysToAdd);
    onDefer(task, toLocalDateStr(newDate));
    setOpen(false);
  };

  const handleNextWeek = () => {
    onDefer(task, toLocalDateStr(addWeeks(new Date(), 1)));
    setOpen(false);
  };

  const handleNextMonth = () => {
    onDefer(task, toLocalDateStr(addMonths(new Date(), 1)));
    setOpen(false);
  };

  const handleSomeday = () => {
    onDefer(task, null);
    setOpen(false);
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    if (dateStr) {
      onDefer(task, dateStr);
      setOpen(false);
    }
  };

  return (
    <RadixPopover
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
      className="defer-popover"
      sideOffset={6}
    >
      <div className="defer-popover-header">
        <span className="defer-popover-title">Defer task</span>
        <button className="defer-popover-close" onClick={() => setOpen(false)} aria-label="Close">
          <FaTimes />
        </button>
      </div>

      <div className="defer-quick-options">
        <button className="defer-quick-btn" onClick={() => handleQuickDefer(1)}>
          Tomorrow
        </button>
        <button className="defer-quick-btn" onClick={handleNextWeek}>
          Next Week
        </button>
        <button className="defer-quick-btn" onClick={handleNextMonth}>
          Next Month
        </button>
        <button className="defer-quick-btn defer-quick-btn--someday" onClick={handleSomeday}>
          Someday
        </button>
      </div>

      <div className="defer-date-picker">
        <label className="defer-date-label" htmlFor="defer-date-input">
          Custom date:
        </label>
        <input
          id="defer-date-input"
          type="date"
          className="defer-date-input"
          min={toLocalDateStr(new Date())}
          onChange={handleDateChange}
        />
      </div>
    </RadixPopover>
  );
}
