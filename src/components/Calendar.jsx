import React, { useEffect, useRef, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { generateRecurringTasks } from '../utils/recurrence';
import './Calendar.css';

export default function Calendar({ tasks, projects, teamMembers, subtasks, activeProjectFilters, selectedDayDate, onTaskClick, onDateSelect, onNewTask, onEventDrop, onStatusUpdate, onDeleteTask }) {
  const calendarRef = useRef(null);
  const lastClickRef = useRef({ dateStr: null, time: 0 });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [statusPopup, setStatusPopup] = useState(null); // { task, x, y }
  const [pendingStatus, setPendingStatus] = useState(null); // status value awaiting scope choice
  const [projectFilter, setProjectFilter] = useState(''); // '' = all projects
  // Track the visible date range so events re-generate on month navigation
  const [viewRange, setViewRange] = useState({ start: null, end: null });

  // Build subtask completion counts per task for badge display
  const subtaskCounts = useMemo(() => {
    const counts = {};
    (subtasks || []).forEach(st => {
      if (!counts[st.parentTaskId]) {
        counts[st.parentTaskId] = { completed: 0, total: 0 };
      }
      counts[st.parentTaskId].total++;
      if (st.completed) counts[st.parentTaskId].completed++;
    });
    return counts;
  }, [subtasks]);

  // Called by FullCalendar whenever the view or dates change
  const handleDatesSet = (dateInfo) => {
    setViewRange({ start: dateInfo.start, end: dateInfo.end });
  };

  useEffect(() => {
    // Wait until FullCalendar has reported its visible range via datesSet
    if (!viewRange.start || !viewRange.end) return;

    const startDate = viewRange.start;
    const endDate = viewRange.end;

    // Apply project chip filters from parent (multi-select) OR internal dropdown (single)
    let filteredTasks = tasks;
    if (projectFilter) {
      filteredTasks = tasks.filter(t => String(t.projectId) === projectFilter);
    } else if (activeProjectFilters && activeProjectFilters.size > 0) {
      filteredTasks = tasks.filter(t => activeProjectFilters.has(t.projectId));
    }

    // Generate events including recurring instances
    const events = [];
    filteredTasks.forEach(task => {
      if (!task.dueDate) return; // skip unscheduled tasks
      if (task.isRecurring) {
        const recurringInstances = generateRecurringTasks(task, startDate, endDate);
        recurringInstances.forEach(instance => {
          events.push(taskToEvent(instance, projects, teamMembers));
        });
      } else {
        events.push(taskToEvent(task, projects, teamMembers));
      }
    });

    setCalendarEvents(events);
  }, [tasks, projects, teamMembers, activeProjectFilters, projectFilter, viewRange]);

  const taskToEvent = (task, projects, teamMembers) => {
    const project = projects.find(p => p.id === task.projectId);

    // assignedTo is now an array of ids
    const assignedIds = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : (task.assignedTo != null ? [task.assignedTo] : []);
    const assigneeNames = assignedIds
      .map(id => teamMembers.find(m => m.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    let backgroundColor;
    let borderColor;
    let textColor = 'white';

    if (task.status === 'completed') {
      // Grey for completed tasks regardless of project
      backgroundColor = '#94A3B8';
      borderColor = '#94A3B8';
    } else {
      // Always colour by project; fall back to slate if no project assigned
      const projectColor = project?.color || '#64748B';
      backgroundColor = projectColor;
      borderColor = projectColor;
    }

    return {
      id: task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : String(task.id),
      title: task.title,
      start: task.dueDate,
      allDay: true,
      backgroundColor,
      borderColor,
      textColor,
      extendedProps: {
        task,
        assignee: assigneeNames || null,
        priority: task.priority,
        status: task.status,
        projectColor: project?.color || null,
        projectName: project?.name || null,
      }
    };
  };

  const handleEventClick = (info) => {
    info.jsEvent.preventDefault();
    const task = info.event.extendedProps.task;
    setStatusPopup({
      task,
      x: info.jsEvent.clientX,
      y: info.jsEvent.clientY,
    });
  };

  const handleDateClick = (info) => {
    // info.date is midnight UTC for the clicked day; use local date parts to
    // avoid a timezone shift when converting to YYYY-MM-DD.
    const d = info.date;
    const localDateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');

    const now = Date.now();
    const last = lastClickRef.current;
    const DBL_CLICK_MS = 350;

    if (last.dateStr === localDateStr && now - last.time < DBL_CLICK_MS) {
      // Double-click on same cell — open new task modal for that date
      lastClickRef.current = { dateStr: null, time: 0 };
      if (onNewTask) onNewTask(localDateStr);
    } else {
      lastClickRef.current = { dateStr: localDateStr, time: now };
      onDateSelect(localDateStr);
    }
  };

  const handleEventDrop = async (info) => {
    const task = info.event.extendedProps.task;
    const newDate = info.event.start;
    if (onEventDrop) {
      try {
        await onEventDrop(task, newDate);
      } catch (error) {
        info.revert();
        console.error('Failed to update task:', error);
      }
    }
  };

  const handleStatusChange = (status) => {
    if (!statusPopup) return;
    const task = statusPopup.task;

    // For recurring instances, show a scope sub-menu before applying
    if (task.isRecurringInstance) {
      setPendingStatus(status);
      return;
    }

    // Non-recurring: apply immediately
    if (onStatusUpdate) {
      onStatusUpdate(task, status);
    }
    setStatusPopup(null);
    setPendingStatus(null);
  };

  const handleScopeChoice = (scope) => {
    if (statusPopup && pendingStatus && onStatusUpdate) {
      onStatusUpdate(statusPopup.task, pendingStatus, scope);
    }
    setStatusPopup(null);
    setPendingStatus(null);
  };

  const handleOpenTaskEdit = () => {
    if (statusPopup) {
      onTaskClick(statusPopup.task);
    }
    setStatusPopup(null);
    setPendingStatus(null);
  };

  const handleDeleteTask = () => {
    if (statusPopup && onDeleteTask) {
      const task = statusPopup.task;
      setStatusPopup(null);
      setPendingStatus(null);
      onDeleteTask(task.id);
    }
  };

  // Highlight the day cell that matches selectedDayDate
  const getDayCellClassNames = (arg) => {
    const cellStr = [
      arg.date.getFullYear(),
      String(arg.date.getMonth() + 1).padStart(2, '0'),
      String(arg.date.getDate()).padStart(2, '0'),
    ].join('-');
    return cellStr === selectedDayDate ? ['fc-day--selected'] : [];
  };

  const renderEventContent = (eventInfo) => {
    const { assignee, priority, status, projectName, task } = eventInfo.event.extendedProps;
    const isListView = eventInfo.view.type === 'listWeek';
    const isCompleted = status === 'completed';

    // Priority badge: H / M / L text label
    const priorityLabel = priority === 'high' ? 'H' : priority === 'medium' ? 'M' : 'L';
    const priorityClass = `fc-priority-badge fc-priority-badge--${priority || 'low'}`;
    // Don't show priority badge for completed tasks (de-emphasised)
    const showPriority = !isCompleted;

    // Subtask progress badge — for recurring instances use the source task ID
    const subtaskTaskId = task.isRecurringInstance ? (task.recurringSourceId || task.id) : task.id;
    const stCount = subtaskCounts[subtaskTaskId];

    if (isListView) {
      return (
        <div className={`fc-event-content-wrapper fc-list-event-wrapper${isCompleted ? ' fc-event--completed' : ''}`}>
          <div className="fc-event-title-row">
            {showPriority && <span className={priorityClass}>{priorityLabel}</span>}
            <span className="fc-event-title">{eventInfo.event.title}</span>
            {stCount && (
              <span className="fc-event-subtask-badge">[{stCount.completed}/{stCount.total}]</span>
            )}
            {isCompleted && <span className="fc-event-badge fc-event-badge--done">✓</span>}
            {status === 'in-progress' && <span className="fc-event-badge fc-event-badge--progress">●</span>}
          </div>
          <div className="fc-list-meta-row">
            {projectName && (
              <span
                className="fc-list-project-chip"
                style={{
                  borderColor: (eventInfo.event.extendedProps.projectColor || '#94A3B8') + '60',
                  color: isCompleted ? '#94A3B8' : (eventInfo.event.extendedProps.projectColor || '#64748B'),
                }}
              >
                <span
                  className="fc-list-project-dot"
                  style={{ background: isCompleted ? '#CBD5E1' : (eventInfo.event.extendedProps.projectColor || '#94A3B8') }}
                />
                {projectName}
              </span>
            )}
            {assignee && (
              <span className="fc-event-assignee-chip">{assignee}</span>
            )}
          </div>
        </div>
      );
    }

    // Month / week grid view
    return (
      <div className={`fc-event-content-wrapper${isCompleted ? ' fc-event--completed' : ''}`}>
        <div className="fc-event-title-row">
          {showPriority && <span className={priorityClass}>{priorityLabel}</span>}
          <span className="fc-event-title">{eventInfo.event.title}</span>
          {stCount && (
            <span className="fc-event-subtask-badge">[{stCount.completed}/{stCount.total}]</span>
          )}
          {isCompleted && <span className="fc-event-badge fc-event-badge--done">✓</span>}
          {status === 'in-progress' && <span className="fc-event-badge fc-event-badge--progress">●</span>}
        </div>
        {assignee && (
          <div className="fc-event-assignee">{assignee}</div>
        )}
      </div>
    );
  };

  const statusOptions = [
    { value: 'todo', label: 'To Do', color: '#64748B' },
    { value: 'in-progress', label: 'In Progress', color: '#3B82F6' },
    { value: 'completed', label: 'Completed', color: '#94A3B8' },
  ];

  return (
    <div className="calendar-wrapper">
      {/* Project filter dropdown for calendar */}
      <div className="calendar-filter-bar">
        <label className="calendar-filter-label" htmlFor="cal-project-filter">Show Project</label>
        <select
          id="cal-project-filter"
          className="calendar-filter-select"
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        {projectFilter && (
          <button className="calendar-filter-clear" onClick={() => setProjectFilter('')}>
            ✕ Clear
          </button>
        )}
      </div>

      <div className="calendar-container" onClick={() => { setStatusPopup(null); setPendingStatus(null); }}>
        <FullCalendar
          key={projects.map(p => `${p.id}:${p.color}`).join(',')}
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,listWeek'
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          dayCellClassNames={getDayCellClassNames}
          height="auto"
          nowIndicator={false}
          weekends={true}
          dayMaxEvents={3}
          moreLinkClick="popover"
        />

        {/* Status quick-update popup */}
        {statusPopup && (
          <div
            className="status-popup"
            style={{ top: statusPopup.y, left: statusPopup.x }}
            onClick={e => e.stopPropagation()}
          >
            <div className="status-popup-title">{statusPopup.task.title}</div>

            {/* Scope sub-menu: shown after choosing a status for a recurring instance */}
            {pendingStatus && statusPopup.task.isRecurringInstance ? (
              <>
                <div className="status-popup-section-label">Apply to&hellip;</div>
                <button
                  className="status-popup-option"
                  onClick={() => handleScopeChoice('single')}
                >
                  <span className="status-popup-dot" style={{ background: '#3B82F6' }} />
                  This instance only
                </button>
                <button
                  className="status-popup-option"
                  onClick={() => handleScopeChoice('future')}
                >
                  <span className="status-popup-dot" style={{ background: '#8B5CF6' }} />
                  This and all future
                </button>
                <div className="status-popup-divider" />
                <button
                  className="status-popup-option"
                  onClick={() => setPendingStatus(null)}
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <div className="status-popup-section-label">Update Status</div>
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`status-popup-option ${statusPopup.task.status === opt.value ? 'active' : ''}`}
                    style={{ '--status-color': opt.color }}
                    onClick={() => handleStatusChange(opt.value)}
                  >
                    <span className="status-popup-dot" style={{ background: opt.color }} />
                    {opt.label}
                    {statusPopup.task.status === opt.value && <span className="status-popup-check">✓</span>}
                  </button>
                ))}
                <div className="status-popup-divider" />
                <button className="status-popup-edit" onClick={handleOpenTaskEdit}>
                  Open &amp; Edit Task
                </button>
                <button className="status-popup-delete" onClick={handleDeleteTask}>
                  Delete Task
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
