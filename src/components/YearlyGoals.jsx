import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { yearlyGoalService } from '../api';
import './YearlyGoals.css';

export default function YearlyGoals() {
  const currentYear = new Date().getFullYear();
  const [goals, setGoals] = useState('');
  const [images, setImages] = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('yearlyGoals.collapsed') === 'true'
  );
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, [currentYear]);

  const loadGoals = async () => {
    try {
      const data = await yearlyGoalService.getByYear(currentYear);
      setGoals(data.goals || '');
      setImages(JSON.parse(data.images || '[]'));
    } catch (err) {
      console.error('Failed to load yearly goals:', err);
    }
  };

  const saveGoals = async (goalsText, goalsImages) => {
    setIsSaving(true);
    try {
      await yearlyGoalService.upsert({ 
        year: currentYear, 
        goals: goalsText,
        images: JSON.stringify(goalsImages || images)
      });
    } catch (err) {
      console.error('Failed to save yearly goals:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const newGoals = e.target.value;
    setGoals(newGoals);

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveGoals(newGoals, images);
    }, 2000);
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveGoals(goals, images);
  };

  const handleImagePaste = (base64Data) => {
    const newImages = [...images, base64Data];
    setImages(newImages);
    saveGoals(goals, newImages);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    saveGoals(goals, newImages);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && lightboxSrc) {
      setLightboxSrc(null);
    }
  }, [lightboxSrc]);

  useEffect(() => {
    if (lightboxSrc) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxSrc, handleKeyDown]);

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
          <div onPaste={handlePaste}>
            <textarea
              className="yearly-goals-textarea"
              placeholder="What are your goals for this year? (Paste images with Ctrl+V)"
              value={goals}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={6}
            />
          </div>
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
