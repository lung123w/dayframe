import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTimes } from 'react-icons/fa';
import { yearlyGoalService } from '../api';
import './YearlyGoals.css';

export default function YearlyGoals() {
  const currentYear = new Date().getFullYear();
  const [vision, setVision] = useState('');
  const [goals, setGoals] = useState([]); // [{text, completed}]
  const [images, setImages] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('yearlyGoals.collapsed') === 'true'
  );
  const [isSaving, setIsSaving] = useState(false);
  const visionSaveTimeoutRef = useRef(null);

  // Load on mount
  useEffect(() => {
    loadGoals();
  }, [currentYear]);

  const loadGoals = async () => {
    try {
      const data = await yearlyGoalService.getByYear(currentYear);
      setVision(data.vision || '');
      try {
        const parsedGoals = JSON.parse(data.goals || '[]');
        setGoals(Array.isArray(parsedGoals) ? parsedGoals : []);
      } catch {
        setGoals([]);
      }
      try {
        const parsedImages = JSON.parse(data.images || '[]');
        setImages(Array.isArray(parsedImages) ? parsedImages : []);
      } catch {
        setImages([]);
      }
    } catch (err) {
      console.error('Failed to load yearly goals:', err);
    }
  };

  const saveAll = async ({ visionVal, goalsVal, imagesVal } = {}) => {
    const v = visionVal !== undefined ? visionVal : vision;
    const g = goalsVal !== undefined ? goalsVal : goals;
    const i = imagesVal !== undefined ? imagesVal : images;
    setIsSaving(true);
    try {
      await yearlyGoalService.upsert({
        year: currentYear,
        vision: v,
        goals: g,
        images: JSON.stringify(i),
      });
    } catch (err) {
      console.error('Failed to save yearly goals:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Vision handlers (debounced auto-save) ---
  const handleVisionChange = (e) => {
    const newVision = e.target.value;
    setVision(newVision);
    if (visionSaveTimeoutRef.current) clearTimeout(visionSaveTimeoutRef.current);
    visionSaveTimeoutRef.current = setTimeout(() => {
      saveAll({ visionVal: newVision });
    }, 2000);
  };

  const handleVisionBlur = () => {
    if (visionSaveTimeoutRef.current) clearTimeout(visionSaveTimeoutRef.current);
    saveAll();
  };

  // --- Goals handlers (immediate save) ---
  const handleAddGoal = () => {
    const text = newGoalText.trim();
    if (!text) return;
    const newGoals = [...goals, { text, completed: false }];
    setGoals(newGoals);
    setNewGoalText('');
    saveAll({ goalsVal: newGoals });
  };

  const handleGoalKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGoal();
    }
  };

  const handleToggleGoal = (index) => {
    const newGoals = goals.map((g, i) =>
      i === index ? { ...g, completed: !g.completed } : g
    );
    setGoals(newGoals);
    saveAll({ goalsVal: newGoals });
  };

  const handleDeleteGoal = (index) => {
    const newGoals = goals.filter((_, i) => i !== index);
    setGoals(newGoals);
    saveAll({ goalsVal: newGoals });
  };

  // --- Image handlers ---
  const handleImagePaste = (base64Data) => {
    const newImages = [...images, base64Data];
    setImages(newImages);
    saveAll({ imagesVal: newImages });
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    saveAll({ imagesVal: newImages });
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => handleImagePaste(event.target.result);
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    }
  };

  // --- Lightbox ---
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && lightboxSrc) setLightboxSrc(null);
  }, [lightboxSrc]);

  useEffect(() => {
    if (lightboxSrc) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxSrc, handleKeyDown]);

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('yearlyGoals.collapsed', String(newCollapsed));
  };

  return (
    <div className="yearly-goals">
      <div className="yearly-goals-header" onClick={toggleCollapse}>
        <h3 className="yearly-goals-title">{currentYear} Goals</h3>
        <div className="yearly-goals-actions">
          {isSaving && <span className="yearly-goals-saving">Saving...</span>}
          <button className="yearly-goals-toggle" type="button">
            {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="yearly-goals-body">
          {/* Vision textarea */}
          <div onPaste={handlePaste}>
            <label className="yearly-goals-label">Vision</label>
            <textarea
              className="yearly-goals-textarea"
              placeholder="Describe your vision for this year... (Paste images with Ctrl+V)"
              value={vision}
              onChange={handleVisionChange}
              onBlur={handleVisionBlur}
              rows={4}
            />
          </div>

          {/* Goals checklist */}
          <div className="yearly-goals-goals-section">
            <label className="yearly-goals-label">Goals</label>
            <ul className="yearly-goals-list">
              {goals.map((goal, index) => (
                <li key={index} className="yearly-goals-list-item">
                  <input
                    type="checkbox"
                    className="yearly-goals-checkbox"
                    checked={goal.completed}
                    onChange={() => handleToggleGoal(index)}
                    id={`goal-${index}`}
                  />
                  <label
                    htmlFor={`goal-${index}`}
                    className={`yearly-goals-goal-text${goal.completed ? ' yearly-goals-goal-completed' : ''}`}
                  >
                    {goal.text}
                  </label>
                  <button
                    type="button"
                    className="yearly-goals-delete-goal"
                    onClick={() => handleDeleteGoal(index)}
                    title="Remove goal"
                  >
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
            <div className="yearly-goals-add-row">
              <input
                type="text"
                className="yearly-goals-add-input"
                placeholder="Add a goal..."
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={handleGoalKeyDown}
              />
              <button
                type="button"
                className="yearly-goals-add-btn"
                onClick={handleAddGoal}
                title="Add goal"
              >
                <FaPlus />
              </button>
            </div>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="yearly-goals-images">
              {images.map((img, index) => (
                <div key={index} className="yearly-goals-image-preview">
                  <img
                    src={img}
                    alt={`Goal ${index + 1}`}
                    className="yearly-goals-image-thumb"
                    onClick={() => setLightboxSrc(img)}
                    title="Click to enlarge"
                  />
                  <button
                    type="button"
                    className="yearly-goals-image-remove"
                    onClick={() => removeImage(index)}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lightboxSrc && (
        <div
          className="yearly-goals-lightbox"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="yearly-goals-lightbox-close"
            onClick={() => setLightboxSrc(null)}
            title="Close (Esc)"
          >
            ×
          </button>
          <img
            src={lightboxSrc}
            alt="Full size"
            className="yearly-goals-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
