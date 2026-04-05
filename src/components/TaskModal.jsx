import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaTrash, FaSearchPlus, FaPlus } from 'react-icons/fa';
import { getRecurrenceDescription } from '../utils/recurrence';
import { subtaskService } from '../api';
import RichTextEditor from './RichTextEditor';
import './TaskModal.css';

export default function TaskModal({ task, projects, tasks, onSave, onClose, onDelete, onSubtaskChange, selectedDate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    descriptionImages: [],
    dueDate: '',
    scheduledTime: '',
    priority: 'medium',
    status: 'pending',
    projectId: null,
    isRecurring: false,
    recurrencePattern: {
      type: 'daily',
      interval: 1,
      daysOfWeek: [],
      endDate: null,
      endAfterOccurrences: null
    },
    estimatedMinutes: '',
    startTime: '',
    endTime: '',
  });

  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // ── Subtask state ──
  const [localSubtasks, setLocalSubtasks] = useState([]);
  const [pendingSubtasks, setPendingSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // Load subtasks when task changes
  useEffect(() => {
    if (task?.id) {
      subtaskService.getByTaskId(task.id).then(setLocalSubtasks);
    } else {
      setLocalSubtasks([]);
    }
  }, [task?.id]);

  const addSubtask = async () => {
    const title = newSubtaskTitle.trim();
    if (!title || !task?.id) return;
    const sortOrder = localSubtasks.length;
    await subtaskService.create({ parentTaskId: task.id, title, sortOrder });
    setNewSubtaskTitle('');
    const updated = await subtaskService.getByTaskId(task.id);
    setLocalSubtasks(updated);
    if (onSubtaskChange) onSubtaskChange();
  };

  const toggleSubtask = async (subtaskId) => {
    await subtaskService.toggleCompleted(subtaskId);
    const updated = await subtaskService.getByTaskId(task.id);
    setLocalSubtasks(updated);
    if (onSubtaskChange) onSubtaskChange();
  };

  const deleteSubtask = async (subtaskId) => {
    await subtaskService.delete(subtaskId);
    const updated = await subtaskService.getByTaskId(task.id);
    setLocalSubtasks(updated);
    if (onSubtaskChange) onSubtaskChange();
  };

  const startEditSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const saveEditSubtask = async () => {
    const title = editingSubtaskTitle.trim();
    if (!title || !editingSubtaskId) {
      setEditingSubtaskId(null);
      return;
    }
    await subtaskService.update(editingSubtaskId, { title });
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
    const updated = await subtaskService.getByTaskId(task.id);
    setLocalSubtasks(updated);
    if (onSubtaskChange) onSubtaskChange();
  };

  // ── Pending subtask operations (create mode only) ──
  const addPendingSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setPendingSubtasks(prev => [...prev, {
      tempId: crypto.randomUUID(),
      title,
      completed: false,
      sortOrder: prev.length,
    }]);
    setNewSubtaskTitle('');
  };

  const removePendingSubtask = (tempId) => {
    setPendingSubtasks(prev => prev.filter(s => s.tempId !== tempId));
  };

  const startEditPendingSubtask = (subtask) => {
    setEditingSubtaskId(subtask.tempId);
    setEditingSubtaskTitle(subtask.title);
  };

  const saveEditPendingSubtask = () => {
    const title = editingSubtaskTitle.trim();
    if (!title || !editingSubtaskId) {
      setEditingSubtaskId(null);
      return;
    }
    setPendingSubtasks(prev => prev.map(s =>
      s.tempId === editingSubtaskId ? { ...s, title } : s
    ));
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const togglePendingSubtask = (tempId) => {
    setPendingSubtasks(prev => prev.map(s =>
      s.tempId === tempId ? { ...s, completed: !s.completed } : s
    ));
  };

  // Close lightbox on Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setLightboxSrc(null);
  }, []);
  useEffect(() => {
    if (lightboxSrc) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxSrc, handleKeyDown]);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        descriptionImages: task.descriptionImages || [],
        estimatedMinutes: task.estimatedMinutes ?? '',
        startTime: task.startTime || '',
        endTime: task.endTime || '',
        scheduledTime: task.scheduledTime || '',
        dueDate: task.dueDate ? (() => {
          const d = new Date(task.dueDate);
          return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0'),
          ].join('-');
        })() : '',
        recurrencePattern: task.recurrencePattern || {
          type: 'daily',
          interval: 1,
          daysOfWeek: [],
          endDate: null,
          endAfterOccurrences: null
        }
      });
      setShowRecurrenceOptions(task.isRecurring);
    } else {
      if (selectedDate) {
        // selectedDate is already a local YYYY-MM-DD string from Calendar's dateClick
        const dueDateStr = typeof selectedDate === 'string'
          ? selectedDate
          : [
              selectedDate.getFullYear(),
              String(selectedDate.getMonth() + 1).padStart(2, '0'),
              String(selectedDate.getDate()).padStart(2, '0'),
            ].join('-');
        setFormData(prev => ({
          ...prev,
          dueDate: dueDateStr,
        }));
      }
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

  const handleImagePaste = (base64Data) => {
    setFormData(prev => ({
      ...prev,
      descriptionImages: [...prev.descriptionImages, base64Data]
    }));
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
      estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes, 10) : null,
      startTime: formData.startTime || null,
      endTime: formData.endTime || null,
      scheduledTime: formData.scheduledTime || null,
      recurrencePattern: formData.isRecurring ? {
        ...formData.recurrencePattern,
        interval: parseInt(formData.recurrencePattern.interval) || 1,
        endAfterOccurrences: formData.recurrencePattern.endAfterOccurrences
          ? parseInt(formData.recurrencePattern.endAfterOccurrences)
          : null
      } : null
    };
    // Attach pending subtasks for new tasks
    if (!task?.id && pendingSubtasks.length > 0) {
      taskData._pendingSubtasks = pendingSubtasks.map(({ title, completed, sortOrder }) => ({
        title, completed, sortOrder
      }));
    }

    onSave(taskData);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const isCreateMode = !task?.id;
  const displaySubtasks = isCreateMode ? pendingSubtasks : localSubtasks;

  return (
    <>
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
            <label>Description (paste images with Ctrl+V)</label>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
              onImagePaste={handleImagePaste}
            />
            {formData.descriptionImages.length > 0 && (
              <div className="image-preview-container">
                {formData.descriptionImages.map((img, index) => (
                  <div key={index} className="image-preview">
                    <img
                      src={img}
                      alt={`Preview ${index + 1}`}
                      className="image-preview-thumb"
                      onClick={() => setLightboxSrc(img)}
                      title="Click to enlarge"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      <FaTrash />
                    </button>
                    <button
                      type="button"
                      className="enlarge-image-btn"
                      onClick={() => setLightboxSrc(img)}
                      title="Enlarge image"
                    >
                      <FaSearchPlus />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Subtasks ── */}
          <div className="form-group subtask-section">
            <div className="subtask-header">
              <label>
                Subtasks
                {displaySubtasks.length > 0 && (
                  <span className="subtask-count">
                    ({displaySubtasks.filter(s => s.completed).length}/{displaySubtasks.length})
                  </span>
                )}
              </label>
            </div>
            {displaySubtasks.length > 0 && (
              <ul className="subtask-list">
                {displaySubtasks.map(st => {
                  const key = st.tempId || st.id;
                  const editKey = st.tempId || st.id;
                  return (
                    <li key={key} className={`subtask-row${st.completed ? ' completed' : ''}`}>
                      <input
                        type="checkbox"
                        className="subtask-checkbox"
                        checked={st.completed}
                        onChange={() => isCreateMode ? togglePendingSubtask(st.tempId) : toggleSubtask(st.id)}
                      />
                      {editingSubtaskId === editKey ? (
                        <input
                          type="text"
                          className="subtask-edit-input"
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onBlur={() => isCreateMode ? saveEditPendingSubtask() : saveEditSubtask()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') isCreateMode ? saveEditPendingSubtask() : saveEditSubtask();
                            if (e.key === 'Escape') setEditingSubtaskId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="subtask-title"
                          onClick={() => isCreateMode ? startEditPendingSubtask(st) : startEditSubtask(st)}
                          title="Click to edit"
                        >
                          {st.title}
                        </span>
                      )}
                      <button
                        type="button"
                        className="subtask-delete-btn"
                        onClick={() => isCreateMode ? removePendingSubtask(st.tempId) : deleteSubtask(st.id)}
                        title="Delete subtask"
                      >
                        <FaTrash />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="subtask-add-row">
              <input
                type="text"
                className="subtask-add-input"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isCreateMode ? addPendingSubtask() : addSubtask(); } }}
                placeholder="Add a subtask..."
              />
              <button
                type="button"
                className="subtask-add-btn"
                onClick={() => isCreateMode ? addPendingSubtask() : addSubtask()}
                disabled={!newSubtaskTitle.trim()}
                title="Add subtask"
              >
                <FaPlus />
              </button>
            </div>
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

            <div className="form-group">
              <label htmlFor="estimatedMinutes">Est. Time (min)</label>
              <input
                type="number"
                id="estimatedMinutes"
                min="0"
                step="5"
                placeholder="e.g. 30"
                value={formData.estimatedMinutes}
                onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="scheduledTime">
              Scheduled Time <span className="optional-text">(optional)</span>
            </label>
            <input
              type="time"
              id="scheduledTime"
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time</label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="endTime">End Time</label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="form-input"
              />
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
                <option value="pending">Pending</option>
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
                  <label htmlFor="endDate">
                    End Date <span className="optional-text">(optional)</span>
                  </label>
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

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
        >
          <button
            className="lightbox-close"
            onClick={() => setLightboxSrc(null)}
            title="Close (Esc)"
          >
            <FaTimes />
          </button>
          <img
            src={lightboxSrc}
            alt="Enlarged preview"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
