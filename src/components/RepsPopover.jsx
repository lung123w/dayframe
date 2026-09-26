import React, { useEffect, useId, useRef, useState } from 'react';
import RadixPopover from './RadixPopover';
import './RepsPopover.css';

/**
 * The reps refinement. `count` is inert on the server (ADR-011) — this
 * component and its call sites are restyled here, never "fixed".
 */
export default function RepsPopover({ anchorEl, point, onSave, onClose, initialValue = 0 }) {
  const [count, setCount] = useState(() => {
    const n = Number(initialValue);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const inputRef = useRef(null);
  const inputId = useId();

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const clamp = (n) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);

  const increment = (delta) => {
    setCount(prev => clamp(prev + delta));
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setCount(0);
      return;
    }
    const n = parseInt(raw, 10);
    setCount(clamp(Number.isNaN(n) ? 0 : n));
  };

  const handleSave = () => {
    onSave(count);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <RadixPopover anchorEl={anchorEl} point={point} className="reps-popover" onClose={onClose}>
      <label className="reps-popover-label" htmlFor={inputId}>Reps</label>
      <div className="reps-popover-row">
        <button
          type="button"
          className="reps-popover-step"
          onClick={() => increment(-1)}
          disabled={count <= 0}
          aria-label="Decrease reps"
        >
          −
        </button>
        <input
          id={inputId}
          ref={inputRef}
          type="number"
          min="0"
          value={count}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="reps-popover-input"
        />
        <button
          type="button"
          className="reps-popover-step"
          onClick={() => increment(1)}
          aria-label="Increase reps"
        >
          +
        </button>
      </div>
      <div className="reps-popover-actions">
        <button className="reps-popover-btn save" onClick={handleSave}>Save</button>
      </div>
    </RadixPopover>
  );
}
