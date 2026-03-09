import React, { useState, useEffect, useRef } from 'react';
import './TimePopover.css';

export default function TimePopover({ x, y, onSave, onClose }) {
  const [minutes, setMinutes] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleSave = () => {
    const mins = parseInt(minutes);
    const seconds = mins > 0 ? mins * 60 : 0;
    onSave(seconds);
  };

  const handleSkip = () => {
    onSave(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="time-popover" ref={ref} style={{ left: x, top: y }}>
      <label className="time-popover-label">Time spent (minutes)</label>
      <input
        ref={inputRef}
        type="number"
        min="0"
        placeholder="0"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        onKeyDown={handleKeyDown}
        className="time-popover-input"
      />
      <div className="time-popover-actions">
        <button className="time-popover-btn skip" onClick={handleSkip}>Skip</button>
        <button className="time-popover-btn save" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
