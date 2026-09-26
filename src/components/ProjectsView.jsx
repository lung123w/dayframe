import React, { useState } from 'react';
import { FaPlus, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { ConfirmDialog } from './AppDialog';
import './ProjectsView.css';

export default function ProjectsView({ projects, onCreateProject, onEditProject, onDeleteProject }) {
  // The delete confirmation is an in-app dialog now (design.md §3 D7): focus is
  // trapped, Escape closes it without deleting, and focus returns to the trash
  // button that opened it.
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleDelete = (project) => {
    setPendingDelete(project);
  };

  const confirmDelete = () => {
    const project = pendingDelete;
    setPendingDelete(null);
    if (project) onDeleteProject(project.id);
  };

  return (
    <div className="projects-view">
      <div className="projects-view-header">
        <h2 className="projects-view-title">Projects</h2>
        <button className="btn btn-primary" onClick={onCreateProject}>
          <FaPlus /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="projects-view-empty">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th className="projects-table-th">Name</th>
              <th className="projects-table-th">Color</th>
              <th className="projects-table-th projects-table-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="projects-table-row">
                <td className="projects-table-td projects-table-name">{project.name}</td>
                <td className="projects-table-td projects-table-color">
                  <span
                    className="projects-color-swatch"
                    style={{ background: project.color }}
                    title={project.color}
                  />
                  <span className="projects-color-hex">{project.color}</span>
                </td>
                <td className="projects-table-td projects-table-actions">
                  <button
                    className="projects-action-btn"
                    onClick={() => onEditProject(project)}
                    title="Edit project"
                  >
                    <FaPencilAlt />
                  </button>
                  <button
                    className="projects-action-btn projects-action-btn-delete"
                    onClick={() => handleDelete(project)}
                    title="Delete project"
                    aria-label={`Delete project ${project.name}`}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete ? `Delete project "${pendingDelete.name}"?` : 'Delete project?'}
        description="Tasks in this project will not be deleted — they keep their other fields."
        confirmLabel="Delete project"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
