import React, { useState, useEffect } from 'react';
import { FaTimes, FaTrash, FaFolder } from 'react-icons/fa';
import './ProjectModal.css';

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#7C3AED', '#BE185D', '#DC2626', '#EA580C', '#D97706',
  '#059669', '#0F766E', '#0284C7', '#4F46E5', '#9333EA',
];

export default function ProjectModal({ project, onSave, onClose, onDelete }) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366F1',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        color: project.color || '#6366F1',
      });
    }
  }, [project]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="modal-icon" style={{ background: formData.color + '20', color: formData.color }}>
              <FaFolder />
            </span>
            <h2>{project ? 'Edit Project' : 'New Project'}</h2>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="project-name">Project Name</label>
            <input
              type="text"
              id="project-name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Project Color</label>
            <div className="color-palette">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${formData.color === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setFormData((p) => ({ ...p, color }))}
                  title={color}
                />
              ))}
            </div>
            <div className="color-preview-row">
              <span className="color-preview-dot" style={{ background: formData.color }} />
              <span className="color-hex">{formData.color}</span>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                className="color-input-native"
                title="Custom color"
              />
            </div>
          </div>

          <div className="modal-actions">
            {project && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm('Delete this project? Tasks will remain but become unassigned.')) {
                    onDelete(project.id);
                  }
                }}
              >
                <FaTrash /> Delete Project
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {project ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
