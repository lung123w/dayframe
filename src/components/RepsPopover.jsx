import React, { useState, useEffect, useRef } from 'react';
import './RepsPopover.css';

export default function RepsPopover({ x, y, onSave, onClose, initialValue = 0 }) {
  const [count, setCount] = useState(() => {
    const n = Number(initialValue);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

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
    <div className="reps-popover" ref={ref} style={{ left: x, top: y }}>
      <label className="reps-popover-label" htmlFor="reps-popover-input">Reps</label>
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
          id="reps-popover-input"
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
    </div>
  );
}
