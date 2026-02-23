import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { generateRecurringTasks } from '../utils/recurrence';
import './Calendar.css';

export default function Calendar({ tasks, projects, teamMembers, activeProjectFilters, onTaskClick, onDateSelect, onEventDrop }) {
  const calendarRef = useRef(null);
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    // Get the current view's date range
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const view = calendarApi.view;
    const startDate = view.activeStart;
    const endDate = view.activeEnd;

    // Filter tasks by active project filters
    const filteredTasks =
      activeProjectFilters && activeProjectFilters.size > 0
        ? tasks.filter((task) => activeProjectFilters.has(task.projectId))
        : tasks;

    // Generate events including recurring instances
    const events = [];
    filteredTasks.forEach(task => {
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
  }, [tasks, projects, teamMembers, activeProjectFilters]);

  const taskToEvent = (task, projects, teamMembers) => {
    const project = projects.find(p => p.id === task.projectId);
    const assignee = teamMembers.find(m => m.id === task.assignedTo);
    
    let backgroundColor = '#6366F1';
    let borderColor = '#6366F1';
    
    if (task.status === 'completed') {
      backgroundColor = '#10B981';
      borderColor = '#10B981';
    } else if (task.status === 'in-progress') {
      backgroundColor = '#F59E0B';
      borderColor = '#F59E0B';
    } else if (task.priority === 'high') {
      backgroundColor = '#EF4444';
      borderColor = '#EF4444';
    } else if (project) {
      backgroundColor = project.color;
      borderColor = project.color;
    }

    return {
      id: task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : String(task.id),
      title: task.title,
      start: task.dueDate,
      allDay: true,
      backgroundColor,
      borderColor,
      extendedProps: {
        task,
        assignee: assignee?.name || null,
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
    onTaskClick(task);
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

  const renderEventContent = (eventInfo) => {
    const { assignee, priority, status } = eventInfo.event.extendedProps;
    
    const priorityDot = priority === 'high' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#10B981';

    return (
      <div className="fc-event-content-wrapper">
        <div className="fc-event-title-row">
          <span className="fc-event-priority-dot" style={{ background: priorityDot }} />
          <span className="fc-event-title">{eventInfo.event.title}</span>
          {status === 'completed' && <span className="fc-event-badge fc-event-badge--done">✓</span>}
        </div>
        {assignee && (
          <div className="fc-event-assignee">{assignee}</div>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        events={calendarEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventContent={renderEventContent}
        height="auto"
        nowIndicator={true}
        weekends={true}
        dayMaxEvents={3}
        moreLinkClick="popover"
      />
    </div>
  );
}
