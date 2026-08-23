import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaTimes,
  FaCheck,
  FaCalendarAlt,
  FaBroom,
  FaHeart,
  FaBullseye,
  FaCalendarCheck,
  FaExternalLinkAlt,
  FaEdit,
  FaTrash,
} from 'react-icons/fa';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  subDays,
  format,
  addDays,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { weeklyReviewService, weeklyObjectiveService, habitService, habitEntryService } from '../api';
import { formatTimeSpent, formatCount, getTrackType, getEntryValue } from '../utils/habits';
import './WeeklyReview.css';

// ── Default cleanup template ───────────────────────────────────────────────
const DEFAULT_CLEANUP_TEMPLATE = [
  { text: 'Clean up all the items @box' },
  { text: 'Clean up all the items @desktop box' },
  { text: 'Clean up all the items @physical box' },
  { text: 'Check the items @outbox' },
  { text: 'Wipe the MacBook & iPhone with screen cleaner' },
  {
    text: '下載 Economists 至 Kindle',
    link: 'https://github.com/hehonghui/awesome-english-ebooks',
  },
  { text: '寫下每週的藍圖' },
];

// ── Fixed reflection questions ─────────────────────────────────────────────
const REFLECTION_QUESTIONS = [
  {
    id: 'accomplishments',
    label:
      '上週的目標中，我完成了哪些任務？哪些地方表現良好，哪些需要改進？',
  },
  {
    id: 'obstacles',
    label:
      '上週有哪些意外事件或障礙影響了我的計劃？如何避免類似情況？',
  },
  {
    id: 'energy',
    label: '上週我的能量水平如何？什麼活動讓我感到充實或疲憊？',
  },
  {
    id: 'habits',
    label: '上週的習慣上有沒有做至最低水平？(參考 DAY FRAME)',
  },
];

const KEY_EVENT_CATEGORIES = ['', 'Meeting', 'Deadline', 'Event', 'Milestone', 'Personal', 'Other'];

// Stable id generator (works in jsdom and browsers without crypto.randomUUID)
let __idCounter = 0;
function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  __idCounter += 1;
  return `id-${Date.now()}-${__idCounter}`;
}

function defaultDoc(weekStart) {
  return {
    weekStart,
    cleanupTasks: [],
    gratitudeEntries: [],
    reflectionAnswers: {},
    weeklyGoals: [],
    syncFlags: {},
  };
}

function seededCleanup() {
  return DEFAULT_CLEANUP_TEMPLATE.map((item) => ({
    id: genId(),
    text: item.text,
    completed: false,
    ...(item.link ? { link: item.link } : {}),
  }));
}

// ── Key Event add form (inline per day) ────────────────────────────────────
function KeyEventAddForm({ date, onAdd, onCancel }) {
  const [form, setForm] = useState({ title: '', date, description: '', category: '' });
  const [titleError, setTitleError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    onAdd(form);
    onCancel();
  };

  return (
    <form className="wr-ke-add-form" onSubmit={handleSubmit}>
      <div className="wr-ke-field">
        <input
          className={`wr-ke-input${titleError ? ' wr-ke-input--error' : ''}`}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Event title *"
          autoFocus
        />
        {titleError && <span className="wr-ke-error">{titleError}</span>}
      </div>
      <div className="wr-ke-field">
        <select
          className="wr-ke-select"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          {KEY_EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c || 'No category'}</option>
          ))}
        </select>
      </div>
      <div className="wr-ke-actions">
        <button type="submit" className="wr-ke-btn wr-ke-btn--save" title="Add">
          <FaCheck />
        </button>
        <button type="button" className="wr-ke-btn wr-ke-btn--cancel" onClick={onCancel} title="Cancel">
          <FaTimes />
        </button>
      </div>
    </form>
  );
}

function KeyEventDayColumn({ dateStr, dayLabel, isToday, events, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setEditForm({ title: ev.title, date: ev.date, description: ev.description || '', category: ev.category || '' });
    setConfirmDeleteId(null);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) return;
    await onUpdate(editingId, editForm);
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div className={`wr-ke-day-col${isToday ? ' wr-ke-day-col--today' : ''}`}>
      <div className="wr-ke-day-header">
        <span className="wr-ke-day-name">{dayLabel}</span>
        {events.length > 0 && <span className="wr-ke-day-badge">{events.length}</span>}
      </div>
      <div className="wr-ke-day-body">
        {events.map((ev) =>
          editingId === ev.id ? (
            <div key={ev.id} className="wr-ke-card wr-ke-card--editing">
              <input
                className="wr-ke-input"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
              <input
                className="wr-ke-input"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
              />
              <select
                className="wr-ke-select"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              >
                {KEY_EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c || 'No category'}</option>
                ))}
              </select>
              <div className="wr-ke-actions">
                <button className="wr-ke-btn wr-ke-btn--save" onClick={saveEdit} title="Save"><FaCheck /></button>
                <button className="wr-ke-btn wr-ke-btn--cancel" onClick={() => { setEditingId(null); setEditForm(null); }} title="Cancel"><FaTimes /></button>
              </div>
            </div>
          ) : (
            <div key={ev.id} className="wr-ke-card">
              <div className="wr-ke-card-body">
                <div className="wr-ke-title">{ev.title}</div>
                {ev.category && <span className="wr-ke-category">{ev.category}</span>}
                {ev.description && <div className="wr-ke-description">{ev.description}</div>}
              </div>
              <div className="wr-ke-actions">
                <button className="wr-ke-btn wr-ke-btn--edit" onClick={() => startEdit(ev)} title="Edit">
                  <FaEdit />
                </button>
                {confirmDeleteId === ev.id ? (
                  <>
                    <button className="wr-ke-btn wr-ke-btn--confirm-delete" onClick={() => onDelete(ev.id)} title="Confirm">
                      <FaCheck />
                    </button>
                    <button className="wr-ke-btn wr-ke-btn--cancel" onClick={() => setConfirmDeleteId(null)} title="Cancel">
                      <FaTimes />
                    </button>
                  </>
                ) : (
                  <button className="wr-ke-btn wr-ke-btn--delete" onClick={() => setConfirmDeleteId(ev.id)} title="Delete">
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          )
        )}
        {events.length === 0 && !showForm && <div className="wr-ke-empty">No events</div>}
        {showForm ? (
          <KeyEventAddForm date={dateStr} onAdd={onAdd} onCancel={() => setShowForm(false)} />
        ) : (
          <button className="wr-ke-add-btn" onClick={() => setShowForm(true)} title="Add key event">
            <FaPlus /> Add
          </button>
        )}
      </div>
    </div>
  );
}

// ── Collapsible section wrapper ─────────────────────────────────────────────
function Section({ id, icon, title, badge, defaultOpen = true, children }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(`wr.section.${id}.collapsed`) === 'true'
  );
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(`wr.section.${id}.collapsed`, String(next));
  };
  // Respect defaultOpen only on first render when no stored value
  useEffect(() => {
    if (localStorage.getItem(`wr.section.${id}.collapsed`) === null && !defaultOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, [id, defaultOpen]);

  return (
    <section className="wr-section">
      <button className="wr-section-header" onClick={toggle} type="button">
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        {icon}
        <span className="wr-section-title">{title}</span>
        {badge != null && <span className="wr-section-badge">{badge}</span>}
      </button>
      {!collapsed && <div className="wr-section-body">{children}</div>}
    </section>
  );
}

// ── Main WeeklyReview component ────────────────────────────────────────────
export default function WeeklyReview({
  keyEvents = [],
  onAddKeyEvent,
  onUpdateKeyEvent,
  onDeleteKeyEvent,
  onDataChange,
}) {
  // Default to the week containing *yesterday*: a weekly review is typically
  // done late in the evening, and defaulting to "this week" made the review
  // show an empty new week (all habits 0m) as soon as the clock crossed
  // midnight into Monday. Yesterday's week is always the most recently
  // completed (or current) week, so the reflection data is never blank.
  const [weekStartDate, setWeekStartDate] = useState(() =>
    startOfWeek(subDays(new Date(), 1), { weekStartsOn: 1 })
  );
  const [review, setReview] = useState(() => defaultDoc(''));
  const [loading, setLoading] = useState(false);
  const [habits, setHabits] = useState([]);
  const [habitEntries, setHabitEntries] = useState([]);
  const [newGratitude, setNewGratitude] = useState('');
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalStep, setNewGoalStep] = useState('');
  const [newCleanupText, setNewCleanupText] = useState('');
  const reviewRef = useRef(review);
  reviewRef.current = review;

  const weekStart = format(weekStartDate, 'yyyy-MM-dd');
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const weekRangeLabel = `${format(weekStartDate, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStartDate, i);
    return {
      dateStr: format(day, 'yyyy-MM-dd'),
      dayLabel: format(day, 'EEE d'),
      isToday: isSameDay(startOfDay(day), startOfDay(new Date())),
    };
  });

  // Group key events for the selected week
  const eventsByDate = {};
  for (const ev of keyEvents) {
    if (weekDays.some((d) => d.dateStr === ev.date)) {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push(ev);
    }
  }

  // ── Load review document + habit context on week change ──
  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const [doc, habitsData, entriesData] = await Promise.all([
        weeklyReviewService.getByWeek(weekStart),
        habitService.getAll(),
        habitEntryService.getAll({ from: weekStart, to: weekEndStr }),
      ]);
      // Seed cleanup template for a new week with no saved tasks
      if (!doc.cleanupTasks || doc.cleanupTasks.length === 0) {
        doc.cleanupTasks = seededCleanup();
      }
      setReview(doc);
      setHabits(habitsData || []);
      setHabitEntries(entriesData || []);
    } catch (err) {
      console.error('Failed to load weekly review:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEndStr]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // ── Persist helper ──
  const save = useCallback(
    async (updated) => {
      setReview(updated);
      try {
        await weeklyReviewService.upsert(updated.weekStart, {
          cleanupTasks: updated.cleanupTasks,
          gratitudeEntries: updated.gratitudeEntries,
          reflectionAnswers: updated.reflectionAnswers,
          weeklyGoals: updated.weeklyGoals,
          syncFlags: updated.syncFlags,
        });
      } catch (err) {
        console.error('Failed to save weekly review:', err);
      }
    },
    []
  );

  // ── Week navigation ──
  const goPrev = () => setWeekStartDate((d) => subWeeks(d, 1));
  const goNext = () => setWeekStartDate((d) => addWeeks(d, 1));
  const goThisWeek = () => setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // ── Cleanup handlers ──
  const toggleCleanup = (id) => {
    const updated = {
      ...review,
      cleanupTasks: review.cleanupTasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    };
    save(updated);
  };

  const editCleanupText = (id, text) => {
    const updated = {
      ...review,
      cleanupTasks: review.cleanupTasks.map((t) => (t.id === id ? { ...t, text } : t)),
    };
    save(updated);
  };

  const addCleanup = () => {
    const text = newCleanupText.trim();
    if (!text) return;
    const updated = {
      ...review,
      cleanupTasks: [...review.cleanupTasks, { id: genId(), text, completed: false }],
    };
    save(updated);
    setNewCleanupText('');
  };

  const removeCleanup = (id) => {
    const updated = {
      ...review,
      cleanupTasks: review.cleanupTasks.filter((t) => t.id !== id),
    };
    save(updated);
  };

  // ── Gratitude handlers ──
  const addGratitude = () => {
    const text = newGratitude.trim();
    if (!text) return;
    const updated = {
      ...review,
      gratitudeEntries: [...review.gratitudeEntries, { id: genId(), text }],
    };
    save(updated);
    setNewGratitude('');
  };

  const editGratitude = (id, text) => {
    const updated = {
      ...review,
      gratitudeEntries: review.gratitudeEntries.map((g) => (g.id === id ? { ...g, text } : g)),
    };
    save(updated);
  };

  const removeGratitude = (id) => {
    const updated = {
      ...review,
      gratitudeEntries: review.gratitudeEntries.filter((g) => g.id !== id),
    };
    save(updated);
  };

  // ── Reflection handlers ──
  const setReflection = (questionId, answer) => {
    const updated = {
      ...review,
      reflectionAnswers: { ...review.reflectionAnswers, [questionId]: answer },
    };
    save(updated);
  };

  // ── Goal handlers ──
  const addGoal = () => {
    const text = newGoalText.trim();
    if (!text) return;
    const updated = {
      ...review,
      weeklyGoals: [
        ...review.weeklyGoals,
        { id: genId(), text, minimumStep: newGoalStep.trim(), completed: false },
      ],
    };
    save(updated);
    setNewGoalText('');
    setNewGoalStep('');
  };

  const editGoal = (id, field, value) => {
    const updated = {
      ...review,
      weeklyGoals: review.weeklyGoals.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    };
    save(updated);
  };

  const toggleGoal = (id) => {
    const updated = {
      ...review,
      weeklyGoals: review.weeklyGoals.map((g) =>
        g.id === id ? { ...g, completed: !g.completed } : g
      ),
    };
    save(updated);
  };

  const removeGoal = (id) => {
    const updated = {
      ...review,
      weeklyGoals: review.weeklyGoals.filter((g) => g.id !== id),
    };
    save(updated);
  };

  // ── Sync goals to DayFrame (bridging action) ──
  const syncGoals = async () => {
    if (review.weeklyGoals.length === 0) {
      window.alert('No weekly goals to sync. Add at least one goal first.');
      return;
    }
    // Check for existing objectives to warn about replacement
    let existing = [];
    try {
      const existingDoc = await weeklyObjectiveService.getByWeek(weekStart);
      existing = existingDoc.objectives || [];
    } catch (err) {
      console.error('Failed to check existing objectives:', err);
    }
    if (existing.length > 0) {
      const ok = window.confirm(
        `This will replace ${existing.length} existing weekly objective(s) for this week with your ${review.weeklyGoals.length} review goal(s). Continue?`
      );
      if (!ok) return;
    }
    try {
      const objectives = review.weeklyGoals.map((g) => ({ text: g.text, completed: !!g.completed }));
      await weeklyObjectiveService.upsert(weekStart, objectives);
      const updated = {
        ...review,
        syncFlags: { ...review.syncFlags, goalsSynced: true, goalsSyncedAt: new Date().toISOString() },
      };
      save(updated);
      if (onDataChange) await onDataChange();
    } catch (err) {
      console.error('Failed to sync goals:', err);
      window.alert('Failed to sync goals. See console for details.');
    }
  };

  // ── Key events listed checkbox (bridging action) ──
  const toggleKeyEventsListed = () => {
    const updated = {
      ...review,
      syncFlags: { ...review.syncFlags, keyEventsListed: !review.syncFlags.keyEventsListed },
    };
    save(updated);
  };

  const handleAddKeyEvent = async (eventData) => {
    if (onAddKeyEvent) await onAddKeyEvent(eventData);
  };
  const handleUpdateKeyEvent = async (id, updates) => {
    if (onUpdateKeyEvent) await onUpdateKeyEvent(id, updates);
  };
  const handleDeleteKeyEvent = async (id) => {
    if (onDeleteKeyEvent) await onDeleteKeyEvent(id);
  };

  // ── Habit summary for reflection ──
  const habitSummary = habits
    .filter((h) => !h.isArchived)
    .map((h) => {
      const entries = habitEntries.filter((e) => String(e.habitId) === String(h.id));
      const isCount = getTrackType(h) === 'count';
      const total = entries.reduce((sum, e) => sum + getEntryValue(e, h), 0);
      return { id: h.id, name: h.name, color: h.color, checkIns: entries.length, total, isCount };
    });

  const cleanupDone = review.cleanupTasks.filter((t) => t.completed).length;
  const gratitudeCount = review.gratitudeEntries.length;
  const goalsDone = review.weeklyGoals.filter((g) => g.completed).length;

  return (
    <div className="wr-container">
      {/* ── Week navigation ── */}
      <div className="wr-week-nav">
        <button className="wr-nav-btn" onClick={goPrev} title="Previous week">
          ‹ Prev
        </button>
        <div className="wr-week-label">
          <FaCalendarAlt className="wr-week-icon" />
          <span>{weekRangeLabel}</span>
        </div>
        <button className="wr-nav-btn" onClick={goNext} title="Next week">
          Next ›
        </button>
        <button className="wr-nav-btn wr-nav-btn--this" onClick={goThisWeek} title="Jump to current week">
          This Week
        </button>
      </div>

      {loading ? (
        <div className="wr-loading">Loading weekly review…</div>
      ) : (
        <>
          {/* ── Section 1: Weekly Miscellaneous Cleanup ── */}
          <Section
            id="cleanup"
            icon={<FaBroom className="wr-section-icon wr-section-icon--cleanup" />}
            title="Weekly Miscellaneous Cleanup"
            badge={`${cleanupDone}/${review.cleanupTasks.length}`}
          >
            <ul className="wr-checklist">
              {review.cleanupTasks.map((task) => (
                <li key={task.id} className={`wr-checklist-item${task.completed ? ' completed' : ''}`}>
                  <input
                    type="checkbox"
                    className="wr-checkbox"
                    checked={task.completed}
                    onChange={() => toggleCleanup(task.id)}
                  />
                  <input
                    type="text"
                    className="wr-checklist-text"
                    value={task.text}
                    onChange={(e) => editCleanupText(task.id, e.target.value)}
                  />
                  {task.link && (
                    <a
                      className="wr-checklist-link"
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open link"
                    >
                      <FaExternalLinkAlt />
                    </a>
                  )}
                  <button
                    className="wr-remove-btn"
                    onClick={() => removeCleanup(task.id)}
                    title="Remove item"
                  >
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
            <div className="wr-add-row">
              <input
                type="text"
                className="wr-add-input"
                placeholder="Add a cleanup item…"
                value={newCleanupText}
                onChange={(e) => setNewCleanupText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCleanup();
                }}
              />
              <button className="wr-add-btn" onClick={addCleanup} disabled={!newCleanupText.trim()}>
                <FaPlus />
              </button>
            </div>
          </Section>

          {/* ── Section 2: Weekly Gratitude ── */}
          <Section
            id="gratitude"
            icon={<FaHeart className="wr-section-icon wr-section-icon--gratitude" />}
            title="Weekly Gratitude"
            badge={gratitudeCount}
          >
            <p className="wr-hint">Write down 5 things you are grateful about ✦</p>
            <ul className="wr-gratitude-list">
              {review.gratitudeEntries.map((entry) => (
                <li key={entry.id} className="wr-gratitude-item">
                  <span className="wr-gratitude-bullet">♥</span>
                  <input
                    type="text"
                    className="wr-gratitude-text"
                    value={entry.text}
                    onChange={(e) => editGratitude(entry.id, e.target.value)}
                  />
                  <button
                    className="wr-remove-btn"
                    onClick={() => removeGratitude(entry.id)}
                    title="Remove entry"
                  >
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
            <div className="wr-add-row">
              <input
                type="text"
                className="wr-add-input"
                placeholder="Add something you're grateful for…"
                value={newGratitude}
                onChange={(e) => setNewGratitude(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addGratitude();
                }}
              />
              <button className="wr-add-btn" onClick={addGratitude} disabled={!newGratitude.trim()}>
                <FaPlus />
              </button>
            </div>
          </Section>

          {/* ── Section 3: Weekly Goal Setup ── */}
          <Section
            id="goals"
            icon={<FaBullseye className="wr-section-icon wr-section-icon--goals" />}
            title="Weekly Goal Setup"
            badge={`${goalsDone}/${review.weeklyGoals.length}`}
          >
            {/* 3a: Reflection prompts */}
            <div className="wr-subsection-label">上週回顧 (Reflection)</div>
            {REFLECTION_QUESTIONS.map((q) => (
              <div key={q.id} className="wr-reflection">
                <label className="wr-reflection-label">{q.label}</label>
                {q.id === 'habits' && habitSummary.length > 0 && (
                  <div className="wr-habit-summary">
                    <span className="wr-habit-summary-title">Habits ({weekRangeLabel}):</span>
                    {habitSummary.map((h) => (
                      <span
                        key={h.id}
                        className="wr-habit-chip"
                        style={{ borderLeftColor: h.color }}
                        title={`${h.name}: ${h.isCount ? formatCount(h.total) : formatTimeSpent(h.total)} for week of ${weekRangeLabel} (${h.checkIns} check-in${h.checkIns === 1 ? '' : 's'})`}
                      >
                        {h.name}: {h.isCount ? formatCount(h.total) : formatTimeSpent(h.total)}
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  className="wr-reflection-input"
                  value={review.reflectionAnswers[q.id] || ''}
                  onChange={(e) => setReflection(q.id, e.target.value)}
                  rows={3}
                  placeholder="Write your reflection…"
                />
              </div>
            ))}

            {/* 3b: Weekly goals with minimum steps */}
            <div className="wr-subsection-label">設定目標 (Define 3 main goals, each with a minimum startup step)</div>
            <ul className="wr-goals-list">
              {review.weeklyGoals.map((goal) => (
                <li key={goal.id} className={`wr-goal-item${goal.completed ? ' completed' : ''}`}>
                  <input
                    type="checkbox"
                    className="wr-checkbox"
                    checked={goal.completed}
                    onChange={() => toggleGoal(goal.id)}
                  />
                  <div className="wr-goal-fields">
                    <input
                      type="text"
                      className="wr-goal-text"
                      value={goal.text}
                      onChange={(e) => editGoal(goal.id, 'text', e.target.value)}
                      placeholder="Goal"
                    />
                    <input
                      type="text"
                      className="wr-goal-step"
                      value={goal.minimumStep || ''}
                      onChange={(e) => editGoal(goal.id, 'minimumStep', e.target.value)}
                      placeholder="Minimum viable next step"
                    />
                  </div>
                  <button
                    className="wr-remove-btn"
                    onClick={() => removeGoal(goal.id)}
                    title="Remove goal"
                  >
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
            <div className="wr-goal-add">
              <input
                type="text"
                className="wr-add-input"
                placeholder="Goal title…"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
              />
              <input
                type="text"
                className="wr-add-input"
                placeholder="Minimum viable step…"
                value={newGoalStep}
                onChange={(e) => setNewGoalStep(e.target.value)}
              />
              <button
                className="wr-add-btn"
                onClick={addGoal}
                disabled={!newGoalText.trim()}
                title="Add goal"
              >
                <FaPlus />
              </button>
            </div>

            {/* 3c: Bridging actions */}
            <div className="wr-subsection-label">橋接行動 (Bridging Actions)</div>
            <label className={`wr-bridge${review.syncFlags.goalsSynced ? ' checked' : ''}`}>
              <FaCalendarCheck className="wr-bridge-icon" />
              <input
                type="checkbox"
                checked={!!review.syncFlags.goalsSynced}
                onChange={syncGoals}
              />
              <span className="wr-bridge-text">
                Write weekly goals to DayFrame
                {review.syncFlags.goalsSyncedAt && (
                  <span className="wr-bridge-meta">
                    {' '}(synced {new Date(review.syncFlags.goalsSyncedAt).toLocaleString()})
                  </span>
                )}
              </span>
            </label>
            <label className={`wr-bridge${review.syncFlags.keyEventsListed ? ' checked' : ''}`}>
              <FaCalendarAlt className="wr-bridge-icon" />
              <input
                type="checkbox"
                checked={!!review.syncFlags.keyEventsListed}
                onChange={toggleKeyEventsListed}
              />
              <span className="wr-bridge-text">List this week's key events</span>
            </label>

            {/* Key events grid */}
            <div className="wr-ke-grid">
              {weekDays.map(({ dateStr, dayLabel, isToday }) => (
                <KeyEventDayColumn
                  key={dateStr}
                  dateStr={dateStr}
                  dayLabel={dayLabel}
                  isToday={isToday}
                  events={eventsByDate[dateStr] || []}
                  onAdd={handleAddKeyEvent}
                  onUpdate={handleUpdateKeyEvent}
                  onDelete={handleDeleteKeyEvent}
                />
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
