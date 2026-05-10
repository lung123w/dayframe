import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronDown, FaChevronRight, FaPlus, FaTrash } from 'react-icons/fa';
import { workflowStepService, workflowCompletionService } from '../api';
import './DailyWorkflow.css';

export default function DailyWorkflow({ today }) {
  const [steps, setSteps] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [newStepText, setNewStepText] = useState('');

  const loadData = useCallback(async () => {
    const [stepsData, completions] = await Promise.all([
      workflowStepService.getAll(),
      workflowCompletionService.getForDate(today),
    ]);
    setSteps(stepsData);
    setCompletedIds(new Set(completions.map(c => c.stepId)));
  }, [today]);

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadData]);

  const handleAddStep = async (e) => {
    if (e.key !== 'Enter') return;
    const text = newStepText.trim();
    if (!text) return;
    await workflowStepService.create({ text });
    setNewStepText('');
    loadData();
  };

  const handleDelete = async (stepId) => {
    await workflowStepService.delete(stepId);
    loadData();
  };

  const handleToggle = async (stepId, isChecked) => {
    if (isChecked) {
      await workflowCompletionService.deleteByStepAndDate(stepId, today);
      setCompletedIds(prev => { const s = new Set(prev); s.delete(stepId); return s; });
    } else {
      await workflowCompletionService.create({ stepId, date: today });
      setCompletedIds(prev => new Set([...prev, stepId]));
    }
  };

  const doneCount = steps.filter(s => completedIds.has(s.id)).length;

  return (
    <div className="daily-workflow">
      <div className={`dw-header${!collapsed ? ' dw-header--expanded' : ''}`} onClick={() => setCollapsed(c => !c)}>
        <span className="dw-toggle-icon">
          {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        </span>
        <span className="dw-title">Daily Workflow</span>
        {steps.length > 0 && (
          <span className="dw-progress">{doneCount}/{steps.length}</span>
        )}
      </div>

      {!collapsed && (
        <div className="dw-body">
          {steps.map(step => {
            const isChecked = completedIds.has(step.id);
            return (
              <div key={step.id} className={`dw-step${isChecked ? ' dw-step--done' : ''}`}>
                <input
                  type="checkbox"
                  className="dw-checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(step.id, isChecked)}
                  aria-label={`Mark "${step.text}" complete`}
                />
                <span className="dw-step-text">{step.text}</span>
                <button
                  className="dw-delete-btn"
                  title="Delete step"
                  aria-label={`Delete step "${step.text}"`}
                  onClick={() => handleDelete(step.id)}
                >
                  <FaTrash />
                </button>
              </div>
            );
          })}

          <div className="dw-add-step">
            <FaPlus className="dw-add-icon" />
            <input
              className="dw-add-input"
              type="text"
              placeholder="Add a step… (press Enter)"
              value={newStepText}
              onChange={e => setNewStepText(e.target.value)}
              onKeyDown={handleAddStep}
              aria-label="Add workflow step"
            />
          </div>
        </div>
      )}
    </div>
  );
}
