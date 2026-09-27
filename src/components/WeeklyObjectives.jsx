import React, { useState, useEffect, useCallback } from 'react';
import { FaBullseye, FaPlus, FaTimes, FaChevronDown, FaChevronRight, FaEdit, FaTrash, FaCheck, FaCalendarAlt } from 'react-icons/fa';
import { startOfWeek, format, addDays, parseISO, isEqual, startOfDay } from 'date-fns';
import { weeklyObjectiveService } from '../api';
import SaveStatus from './SaveStatus';
import { useDebouncedSave } from './useDebouncedSave';
import './WeeklyObjectives.css';

const CATEGORIES = ['', 'Meeting', 'Deadline', 'Event', 'Milestone', 'Personal', 'Other'];

// ── Key Event sub-components ────────────────────────────────────────────────

function EventCard({ event, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    title: event.title,
    date: event.date,
    description: event.description || '',
    category: event.category || '',
  });
  const [titleError, setTitleError] = useState('');

  const handleSave = async () => {
    if (!form.title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    await onUpdate(event.id, form);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      title: event.title,
      date: event.date,
      description: event.description || '',
      category: event.category || '',
    });
    setTitleError('');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="ke-card ke-card--editing">
        <div className="ke-field">
          <input
            className={`ke-input${titleError ? ' ke-input--error' : ''}`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Event title"
            autoFocus
          />
          {titleError && <span className="ke-error">{titleError}</span>}
        </div>
        <div className="ke-field">
          <input
            type="date"
            className="ke-input"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="ke-field">
          <input
            className="ke-input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
          />
        </div>
        <div className="ke-field">
          <select
            className="ke-select"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || 'No category'}</option>
            ))}
          </select>
        </div>
        <div className="ke-actions">
          <button className="ke-btn ke-btn--save" onClick={handleSave} title="Save"><FaCheck /></button>
          <button className="ke-btn ke-btn--cancel" onClick={handleCancel} title="Cancel"><FaTimes /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="ke-card">
      <div className="ke-card-body">
        <div className="ke-title">{event.title}</div>
        {event.category && <span className="ke-category">{event.category}</span>}
        {event.description && <div className="ke-description">{event.description}</div>}
      </div>
      <div className="ke-actions">
        <button
          className="ke-btn ke-btn--edit"
          onClick={() => { setEditing(true); setConfirmDelete(false); }}
          title="Edit"
        >
          <FaEdit />
        </button>
        {confirmDelete ? (
          <>
            <button className="ke-btn ke-btn--confirm-delete" onClick={() => onDelete(event.id)} title="Confirm delete"><FaCheck /></button>
            <button className="ke-btn ke-btn--cancel" onClick={() => setConfirmDelete(false)} title="Cancel"><FaTimes /></button>
          </>
        ) : (
          <button className="ke-btn ke-btn--delete" onClick={() => setConfirmDelete(true)} title="Delete"><FaTrash /></button>
        )}
      </div>
    </div>
  );
}

function AddEventForm({ date, onAdd, onCancel }) {
  const [form, setForm] = useState({ title: '', date, description: '', category: '' });
  const [titleError, setTitleError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    await onAdd(form);
    onCancel();
  };

  return (
    <form className="ke-add-form" onSubmit={handleSubmit}>
      <div className="ke-field">
        <input
          className={`ke-input${titleError ? ' ke-input--error' : ''}`}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Event title *"
          autoFocus
        />
        {titleError && <span className="ke-error">{titleError}</span>}
      </div>
      <div className="ke-field">
        <select className="ke-select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'No category'}</option>)}
        </select>
      </div>
      <div className="ke-actions">
        <button type="submit" className="ke-btn ke-btn--save" title="Add"><FaCheck /></button>
        <button type="button" className="ke-btn ke-btn--cancel" onClick={onCancel} title="Cancel"><FaTimes /></button>
      </div>
    </form>
  );
}

function KeyEventDayCol({ dateStr, dayLabel, events, isToday, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className={`ke-day-col${isToday ? ' ke-day-col--today' : ''}`}>
      <div className="ke-day-header">
        <span className="ke-day-name">{dayLabel}</span>
        {events.length > 0 && <span className="ke-day-badge">{events.length}</span>}
      </div>
      <div className="ke-day-body">
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        {events.length === 0 && !showForm && (
          <div className="ke-empty">No events</div>
        )}
        {showForm ? (
          <AddEventForm date={dateStr} onAdd={onAdd} onCancel={() => setShowForm(false)} />
        ) : (
          <button className="ke-add-btn" onClick={() => setShowForm(true)} title="Add key event">
            <FaPlus /> Add
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main WeeklyObjectives component ─────────────────────────────────────────

export default function WeeklyObjectives({ selectedDate, keyEvents = [], onAddKeyEvent, onUpdateKeyEvent, onDeleteKeyEvent }) {
  const [objectives, setObjectives] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compute Monday of current week
  const [y, m, d] = selectedDate.split('-').map(Number);
  const weekStart = format(startOfWeek(new Date(y, m - 1, d), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Build Mon–Sun day list for key events
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(parseISO(weekStart), i);
    return {
      dateStr: format(day, 'yyyy-MM-dd'),
      dayLabel: format(day, 'EEE d'),
      isToday: isEqual(startOfDay(day), startOfDay(new Date())),
    };
  });

  // Filter key events to this Mon–Sun window and group by date
  const eventsByDate = {};
  for (const ev of keyEvents) {
    if (weekDays.some(d => d.dateStr === ev.date)) {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push(ev);
    }
  }

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await weeklyObjectiveService.getByWeek(weekStart);
      let objs = data.objectives || [];
      objs = objs.map(item =>
        typeof item === 'string' ? { text: item, completed: false } : item
      );
      setObjectives(objs);
    } catch (e) {
      console.error('Failed to load weekly objectives:', e);
    }
    setLoading(false);
  }, [weekStart]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const writeObjectives = useCallback(async (payload) => {
    await weeklyObjectiveService.upsert(payload.weekStart, payload.objectives);
  }, []);

  const {
    status: saveStatus,
    schedule: scheduleSave,
    retry: retrySave,
  } = useDebouncedSave(writeObjectives);

  const save = (updated) => {
    setObjectives(updated);
    // Debounced (design.md §8 D12): toggling a goal or removing it no longer
    // fires a write per click, and the result lands in the one status line.
    scheduleSave({ weekStart, objectives: updated });
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    save([...objectives, { text: newGoal.trim(), completed: false }]);
    setNewGoal('');
  };

  const removeGoal = (index) => {
    save(objectives.filter((_, i) => i !== index));
  };

  const toggleGoal = (index) => {
    const updated = objectives.map((goal, i) =>
      i === index ? { ...goal, completed: !goal.completed } : goal
    );
    save(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addGoal();
  };

  return (
    <div className="wo-container">
      <button className="wo-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        <FaBullseye className="wo-icon" />
        <span className="wo-title">Weekly Goals &amp; Key Events</span>
        {objectives.length > 0 && (
          <span className="wo-badge">
            {objectives.filter(g => g.completed).length}/{objectives.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="wo-body">
          {loading ? (
            <div className="wo-loading">Loading...</div>
          ) : (
            <>
              {/* ── Weekly Goals sub-section ── */}
              <div className="wo-section-row">
                <div className="wo-section-label">
                  <FaBullseye className="wo-section-icon" /> Weekly Goals
                </div>
                <SaveStatus status={saveStatus} onRetry={retrySave} className="wo-save-status" />
              </div>
              {objectives.length === 0 && (
                <div className="wo-empty">No goals set for this week</div>
              )}
              <ul className="wo-list">
                {objectives.map((goal, i) => (
                  <li key={i} className={`wo-item ${goal.completed ? 'completed' : ''}`}>
                    <input
                      type="checkbox"
                      className="wo-checkbox"
                      checked={goal.completed}
                      onChange={() => toggleGoal(i)}
                    />
                    <span className="wo-text">{goal.text}</span>
                    <button className="wo-remove" onClick={() => removeGoal(i)} title="Remove">
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="wo-add-row">
                <input
                  type="text"
                  className="wo-input"
                  placeholder="Add a goal..."
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="wo-add-btn" onClick={addGoal} disabled={!newGoal.trim()}>
                  <FaPlus />
                </button>
              </div>

              {/* ── Key Events sub-section ── */}
              <div className="wo-section-label wo-section-label--ke">
                <FaCalendarAlt className="wo-section-icon" /> Key Events This Week
              </div>
              <div className="ke-week-grid">
                {weekDays.map(({ dateStr, dayLabel, isToday }) => (
                  <KeyEventDayCol
                    key={dateStr}
                    dateStr={dateStr}
                    dayLabel={dayLabel}
                    isToday={isToday}
                    events={eventsByDate[dateStr] || []}
                    onAdd={onAddKeyEvent}
                    onUpdate={onUpdateKeyEvent}
                    onDelete={onDeleteKeyEvent}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
