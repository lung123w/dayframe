import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { generateRecurringTasks } from '../utils/recurrence';
import './Calendar.css';

export default function Calendar({ tasks, projects, teamMembers, onTaskClick, onDateSelect, onEventDrop }) {
  const calendarRef = useRef(null);
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    // Get the current view's date range
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const view = calendarApi.view;
    const startDate = view.activeStart;
    const endDate = view.activeEnd;

    // Generate events including recurring instances
    const events = [];
    tasks.forEach(task => {
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
  }, [tasks, projects, teamMembers]);

  const taskToEvent = (task, projects, teamMembers) => {
    const project = projects.find(p => p.id === task.projectId);
    const assignee = teamMembers.find(m => m.id === task.assignedTo);
    
    let backgroundColor = '#3788d8';
    let borderColor = '#3788d8';
    
    if (task.status === 'completed') {
      backgroundColor = '#28a745';
      borderColor = '#28a745';
    } else if (task.status === 'in-progress') {
      backgroundColor = '#ffc107';
      borderColor = '#ffc107';
    } else if (task.priority === 'high') {
      backgroundColor = '#dc3545';
      borderColor = '#dc3545';
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
        status: task.status
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
    
    return (
      <div className="fc-event-content-wrapper">
        <div className="fc-event-title">
          {eventInfo.event.title}
        </div>
        {assignee && (
          <div className="fc-event-assignee">
            👤 {assignee}
          </div>
        )}
        <div className="fc-event-meta">
          {priority === 'high' && '🔴'}
          {priority === 'medium' && '🟡'}
          {priority === 'low' && '🟢'}
          {status === 'completed' && ' ✓'}
          {status === 'in-progress' && ' ⏳'}
        </div>
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
