import React from 'react';
import { FaPlus, FaPencilAlt, FaTrash } from 'react-icons/fa';
import './ProjectsView.css';

export default function ProjectsView({ projects, onCreateProject, onEditProject, onDeleteProject }) {
  const handleDelete = (project) => {
    if (window.confirm(`Delete project "${project.name}"? Tasks in this project will not be deleted.`)) {
      onDeleteProject(project.id);
    }
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
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
