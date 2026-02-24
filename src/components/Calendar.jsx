import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { generateRecurringTasks } from '../utils/recurrence';
import './Calendar.css';

export default function Calendar({ tasks, projects, teamMembers, activeProjectFilters, onTaskClick, onDateSelect, onEventDrop, onStatusUpdate, onDeleteTask }) {
  const calendarRef = useRef(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [statusPopup, setStatusPopup] = useState(null); // { task, x, y }
  const [projectFilter, setProjectFilter] = useState(''); // '' = all projects

  useEffect(() => {
    // Get the current view's date range
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const view = calendarApi.view;
    const startDate = view.activeStart;
    const endDate = view.activeEnd;

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
  }, [tasks, projects, teamMembers, activeProjectFilters, projectFilter]);

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
      // Grey for completed tasks
      backgroundColor = '#94A3B8';
      borderColor = '#94A3B8';
    } else if (task.status === 'in-progress') {
      backgroundColor = '#3B82F6';
      borderColor = '#3B82F6';
    } else if (task.priority === 'high') {
      backgroundColor = '#DC2626';
      borderColor = '#DC2626';
    } else if (project) {
      backgroundColor = project.color;
      borderColor = project.color;
    } else {
      backgroundColor = '#2563EB';
      borderColor = '#2563EB';
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
    onDateSelect(info.date);
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
    if (statusPopup && onStatusUpdate) {
      onStatusUpdate(statusPopup.task, status);
    }
    setStatusPopup(null);
  };

  const handleOpenTaskEdit = () => {
    if (statusPopup) {
      onTaskClick(statusPopup.task);
    }
    setStatusPopup(null);
  };

  const handleDeleteTask = () => {
    if (statusPopup && onDeleteTask) {
      const task = statusPopup.task;
      setStatusPopup(null);
      onDeleteTask(task.id);
    }
  };

  const renderEventContent = (eventInfo) => {
    const { assignee, priority, status, projectName } = eventInfo.event.extendedProps;
    const isListView = eventInfo.view.type === 'listWeek';

    const priorityDot = priority === 'high' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#10B981';
    const isCompleted = status === 'completed';

    if (isListView) {
      // List view: show project name as a chip next to the title
      return (
        <div className={`fc-event-content-wrapper fc-list-event-wrapper${isCompleted ? ' fc-event--completed' : ''}`}>
          <div className="fc-event-title-row">
            <span className="fc-event-priority-dot" style={{ background: isCompleted ? '#CBD5E1' : priorityDot }} />
            <span className="fc-event-title">{eventInfo.event.title}</span>
            {isCompleted && <span className="fc-event-badge fc-event-badge--done">✓</span>}
            {status === 'in-progress' && <span className="fc-event-badge fc-event-badge--progress">●</span>}
          </div>
          <div className="fc-list-meta-row">
            {projectName && (
              <span
                className="fc-list-project-chip"
                style={{
                  borderColor: (eventInfo.event.extendedProps.projectColor || '#2563EB') + '60',
                  color: isCompleted ? '#94A3B8' : (eventInfo.event.extendedProps.projectColor || '#2563EB'),
                }}
              >
                <span
                  className="fc-list-project-dot"
                  style={{ background: isCompleted ? '#CBD5E1' : (eventInfo.event.extendedProps.projectColor || '#2563EB') }}
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
          <span className="fc-event-priority-dot" style={{ background: isCompleted ? 'rgba(255,255,255,0.5)' : priorityDot }} />
          <span className="fc-event-title">{eventInfo.event.title}</span>
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

      <div className="calendar-container" onClick={() => setStatusPopup(null)}>
        <FullCalendar
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
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
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
          </div>
        )}
      </div>
    </div>
  );
}
