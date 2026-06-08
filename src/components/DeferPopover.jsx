import React, { useEffect, useRef } from 'react';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { FaTimes } from 'react-icons/fa';
import './DeferPopover.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function DeferPopover({ task, onDefer, onClose, anchorRef }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        if (anchorRef?.current && !anchorRef.current.contains(e.target)) {
          onClose();
        }
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorRef]);

  const handleQuickDefer = (daysToAdd) => {
    const newDate = addDays(new Date(), daysToAdd);
    onDefer(task, toLocalDateStr(newDate));
  };

  const handleNextWeek = () => {
    const newDate = addWeeks(new Date(), 1);
    onDefer(task, toLocalDateStr(newDate));
  };

  const handleNextMonth = () => {
    const newDate = addMonths(new Date(), 1);
    onDefer(task, toLocalDateStr(newDate));
  };

  const handleSomeday = () => {
    onDefer(task, null);
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    if (dateStr) {
      onDefer(task, dateStr);
    }
  };

  return (
    <div className="defer-popover" ref={popoverRef}>
      <div className="defer-popover-header">
        <span className="defer-popover-title">Defer task</span>
        <button className="defer-popover-close" onClick={onClose} aria-label="Close">
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
          autoFocus
        />
      </div>
    </div>
  );
}
