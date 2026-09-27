import React, { useEffect, useRef, useState } from 'react';
import RadixPopover from './RadixPopover';
import './TimePopover.css';

/**
 * The duration refinement of design.md §3 D7 / the spec's "Duration is an
 * optional refinement": it only ever refines an entry that already exists (the
 * one-click row control wrote it with zero minutes), so the caller PUTs the
 * existing row rather than writing the day twice (ADR-008's 409).
 */
export default function TimePopover({ anchorEl, point, label = 'Time spent (minutes)', onSave, onClose }) {
  const [minutes, setMinutes] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSave = () => {
    const mins = parseInt(minutes, 10);
    onSave(mins > 0 ? mins * 60 : 0);
  };

  const handleSkip = () => {
    onSave(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <RadixPopover anchorEl={anchorEl} point={point} className="time-popover" onClose={onClose}>
      <label className="time-popover-label" htmlFor="time-popover-input">{label}</label>
      <input
        id="time-popover-input"
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
    </RadixPopover>
  );
}
