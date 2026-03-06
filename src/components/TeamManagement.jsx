import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import './TeamManagement.css';

export default function TeamManagement({ teamMembers, onAddMember, onUpdateMember, onDeleteMember }) {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingMember) {
      await onUpdateMember(editingMember.id, formData);
    } else {
      await onAddMember(formData);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', role: '' });
    setEditingMember(null);
    setShowForm(false);
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role
    });
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      await onDeleteMember(id);
    }
  };

  return (
    <div className="team-management">
      <div className="team-header">
        <h2>Team Members</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <FaPlus /> Add Member
        </button>
      </div>

      {showForm && (
        <form className="team-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingMember ? 'Update' : 'Add'} Member
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="team-list">
        {teamMembers.length === 0 ? (
          <div className="empty-state">
            <p>No team members yet. Add your first team member above.</p>
          </div>
        ) : (
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map(member => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email || '-'}</td>
                  <td>{member.role || '-'}</td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => handleEdit(member)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="icon-btn delete-btn"
                      onClick={() => handleDelete(member.id)}
                      title="Delete"
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
    </div>
  );
}
