import React, { useState } from 'react';
import { FaTimes, FaTrash, FaArchive } from 'react-icons/fa';
import './HabitModal.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_COLORS = ['#10B981', '#3B82F6', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B'];

function getInitialFreq(habit) {
  return habit?.frequency || { type: 'daily' };
}

export default function HabitModal({ habit, onSave, onDelete, onArchive, onClose }) {
  const initFreq = getInitialFreq(habit);
  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [color, setColor] = useState(habit?.color || '#10B981');
  const [freqType, setFreqType] = useState(initFreq.type);
  const [weekdays, setWeekdays] = useState(initFreq.type === 'weekdays' ? (initFreq.days || [1, 2, 3, 4, 5]) : [1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(initFreq.type === 'weekly' ? (initFreq.timesPerWeek || 3) : 3);

  const handleSubmit = (e) => {
    e.preventDefault();
    let frequency;
    if (freqType === 'daily') {
      frequency = { type: 'daily' };
    } else if (freqType === 'weekdays') {
      frequency = { type: 'weekdays', days: weekdays };
    } else {
      frequency = { type: 'weekly', timesPerWeek };
    }
    onSave({ name, description, color, frequency });
  };

  const toggleWeekday = (day) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal habit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button className="btn-icon" onClick={onClose}><FaTimes /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="habit-name">Name</label>
            <input
              id="habit-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Meditate, Exercise, Read..."
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="habit-description">Description (optional)</label>
            <textarea
              id="habit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any notes about this habit..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Frequency</label>
            <div className="freq-options">
              <label className="freq-option">
                <input
                  type="radio"
                  name="freq"
                  value="daily"
                  checked={freqType === 'daily'}
                  onChange={() => setFreqType('daily')}
                />
                Every day
              </label>
              <label className="freq-option">
                <input
                  type="radio"
                  name="freq"
                  value="weekdays"
                  checked={freqType === 'weekdays'}
                  onChange={() => setFreqType('weekdays')}
                />
                Specific days
              </label>
              <label className="freq-option">
                <input
                  type="radio"
                  name="freq"
                  value="weekly"
                  checked={freqType === 'weekly'}
                  onChange={() => setFreqType('weekly')}
                />
                X times per week
              </label>
            </div>

            {freqType === 'weekdays' && (
              <div className="weekday-picker">
                {DAY_NAMES.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`weekday-btn ${weekdays.includes(i + 1) ? 'active' : ''}`}
                    onClick={() => toggleWeekday(i + 1)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {freqType === 'weekly' && (
              <div className="weekly-count">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={timesPerWeek}
                  onChange={e => setTimesPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
                />
                <span>times per week</span>
              </div>
            )}
          </div>

          <div className="modal-actions">
            {habit && onDelete && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(habit.id)}>
                <FaTrash /> Delete
              </button>
            )}
            {habit && onArchive && (
              <button type="button" className="btn btn-secondary" onClick={() => onArchive(habit.id)}>
                <FaArchive /> {habit.isArchived ? 'Unarchive' : 'Archive'}
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">{habit ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
