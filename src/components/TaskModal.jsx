import React, { useState, useEffect } from 'react';
import { FaTimes, FaImage, FaTrash } from 'react-icons/fa';
import { getRecurrenceDescription } from '../utils/recurrence';
import './TaskModal.css';

export default function TaskModal({ task, projects, teamMembers, onSave, onClose, onDelete, selectedDate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    descriptionImages: [],
    dueDate: '',
    priority: 'medium',
    status: 'todo',
    projectId: null,
    assignedTo: null,
    isRecurring: false,
    recurrencePattern: {
      type: 'daily',
      interval: 1,
      daysOfWeek: [],
      endDate: null,
      endAfterOccurrences: null
    }
  });

  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        descriptionImages: task.descriptionImages || [],
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        recurrencePattern: task.recurrencePattern || {
          type: 'daily',
          interval: 1,
          daysOfWeek: [],
          endDate: null,
          endAfterOccurrences: null
        }
      });
      setShowRecurrenceOptions(task.isRecurring);
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        dueDate: new Date(selectedDate).toISOString().split('T')[0]
      }));
    }
  }, [task, selectedDate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'isRecurring') {
      setShowRecurrenceOptions(checked);
    }
  };

  const handleRecurrenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'daysOfWeek') {
      const day = parseInt(value);
      setFormData(prev => ({
        ...prev,
        recurrencePattern: {
          ...prev.recurrencePattern,
          daysOfWeek: checked 
            ? [...prev.recurrencePattern.daysOfWeek, day]
            : prev.recurrencePattern.daysOfWeek.filter(d => d !== day)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        recurrencePattern: {
          ...prev.recurrencePattern,
          [name]: value === '' ? null : value
        }
      }));
    }
  };

  const handleImagePaste = (e) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            descriptionImages: [...prev.descriptionImages, event.target.result]
          }));
        };
        
        reader.readAsDataURL(blob);
      }
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      descriptionImages: prev.descriptionImages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      projectId: formData.projectId ? parseInt(formData.projectId) : null,
      assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
      recurrencePattern: formData.isRecurring ? {
        ...formData.recurrencePattern,
        interval: parseInt(formData.recurrencePattern.interval) || 1,
        endAfterOccurrences: formData.recurrencePattern.endAfterOccurrences 
          ? parseInt(formData.recurrencePattern.endAfterOccurrences) 
          : null
      } : null
    };

    onSave(taskData);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Task title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (paste images with Ctrl+V)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              onPaste={handleImagePaste}
              rows="4"
              placeholder="Task description..."
            />
            
            {formData.descriptionImages.length > 0 && (
              <div className="image-preview-container">
                {formData.descriptionImages.map((img, index) => (
                  <div key={index} className="image-preview">
                    <img src={img} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="projectId">Project</label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId || ''}
                onChange={handleChange}
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo || ''}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="toggle-group">
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
              />
              <span>Recurring Task</span>
            </label>
          </div>

          {showRecurrenceOptions && (
            <div className="recurrence-options">
              <h3>Recurrence Pattern</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="recurrenceType">Repeat</label>
                  <select
                    id="recurrenceType"
                    name="type"
                    value={formData.recurrencePattern.type}
                    onChange={handleRecurrenceChange}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="interval">Every</label>
                  <input
                    type="number"
                    id="interval"
                    name="interval"
                    min="1"
                    value={formData.recurrencePattern.interval}
                    onChange={handleRecurrenceChange}
                  />
                </div>
              </div>

              {formData.recurrencePattern.type === 'weekly' && (
                <div className="form-group">
                  <label>Repeat On</label>
                  <div className="days-of-week">
                    {dayNames.map((day, index) => (
                      <label key={index} className="day-checkbox">
                        <input
                          type="checkbox"
                          name="daysOfWeek"
                          value={index}
                          checked={formData.recurrencePattern.daysOfWeek.includes(index)}
                          onChange={handleRecurrenceChange}
                        />
                        {day.substring(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="endDate">End Date (optional)</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.recurrencePattern.endDate || ''}
                    onChange={handleRecurrenceChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endAfterOccurrences">Or after # occurrences</label>
                  <input
                    type="number"
                    id="endAfterOccurrences"
                    name="endAfterOccurrences"
                    min="1"
                    value={formData.recurrencePattern.endAfterOccurrences || ''}
                    onChange={handleRecurrenceChange}
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>

              <div className="recurrence-description">
                {getRecurrenceDescription(formData.recurrencePattern)}
              </div>
            </div>
          )}

          <div className="modal-actions">
            {task && onDelete && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(task.id)}>
                Delete Task
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {task ? 'Update' : 'Create'} Task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
