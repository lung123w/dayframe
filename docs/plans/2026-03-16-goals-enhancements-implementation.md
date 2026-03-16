# Goals Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image paste support to Yearly Goals and completion checkboxes to Weekly Goals

**Architecture:** Backend-first approach with schema updates, then frontend component enhancements. Reuse existing image handling patterns from TaskModal and checkbox patterns from Subtasks.

**Tech Stack:** React 19, Express.js, better-sqlite3, FileReader API for image paste

---

## Task 1: Backend - Add Images Column to Yearly Goals

**Files:**
- Modify: `server/db.js:101-108` (yearly_goals table)

**Step 1: Add images column to yearly_goals table**

In `server/db.js`, update the yearly_goals CREATE TABLE statement (around line 101):

```javascript
  CREATE TABLE IF NOT EXISTS yearly_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    goals TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(year)
  );
```

**Step 2: Verify server starts**

Run: `npm run dev`
Check console for no errors

**Step 3: Verify schema update**

```bash
sqlite3 data/app.db "PRAGMA table_info(yearly_goals);"
```
Expected: Should show images column

**Step 4: Commit schema changes**

```bash
git add server/db.js
git commit -m "feat: add images column to yearly_goals table"
```

---

## Task 2: Backend - Migrate Weekly Objectives Structure

**Files:**
- Modify: `server/db.js:115-127` (after yearly_goals table)

**Step 1: Add migration for weekly_objectives**

In `server/db.js`, add after the yearly_goals table creation (around line 110):

```javascript
// Migrate weekly objectives to object format
try {
  const objectives = db.prepare('SELECT * FROM weekly_objectives').all();
  for (const row of objectives) {
    try {
      const parsed = JSON.parse(row.objectives);
      // Check if already migrated (first item is object)
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        const migrated = parsed.map(text => ({ text, completed: false }));
        db.prepare('UPDATE weekly_objectives SET objectives = ? WHERE id = ?')
          .run(JSON.stringify(migrated), row.id);
      }
    } catch (e) {
      // Skip if parsing fails
    }
  }
} catch (e) {
  // Table might not exist yet, skip migration
}
```

**Step 2: Verify migration**

Run: `npm run dev`
Check console for no errors

**Step 3: Test migration with data**

If you have existing weekly objectives, verify they're migrated:
```bash
sqlite3 data/app.db "SELECT objectives FROM weekly_objectives LIMIT 1;"
```
Expected: Should show `[{"text":"...","completed":false}]` format

**Step 4: Commit migration**

```bash
git add server/db.js
git commit -m "feat: migrate weekly_objectives to object structure with completed field"
```

---

## Task 3: Frontend - Add Image Support to YearlyGoals Component

**Files:**
- Modify: `src/components/YearlyGoals.jsx:8,29-38,80-89`
- Modify: `src/components/YearlyGoals.css` (add image styles)

**Step 1: Add images state to YearlyGoals**

In `src/components/YearlyGoals.jsx`, update state (around line 8):

```javascript
const [goals, setGoals] = useState('');
const [images, setImages] = useState([]);
const [lightboxSrc, setLightboxSrc] = useState(null);
```

**Step 2: Update loadGoals to handle images**

Update `loadGoals` function (around line 20-27):

```javascript
const loadGoals = async () => {
  try {
    const data = await yearlyGoalService.getByYear(currentYear);
    setGoals(data.goals || '');
    setImages(JSON.parse(data.images || '[]'));
  } catch (err) {
    console.error('Failed to load yearly goals:', err);
  }
};
```

**Step 3: Update saveGoals to include images**

Update `saveGoals` function (around line 29-38):

```javascript
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
```

**Step 4: Update handleChange to save with images**

Update `handleChange` (around line 40-51):

```javascript
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
```

**Step 5: Update handleBlur**

Update `handleBlur` (around line 53-59):

```javascript
const handleBlur = () => {
  // Save immediately on blur
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  saveGoals(goals, images);
};
```

**Step 6: Add image paste handler**

Add new function after `handleBlur`:

```javascript
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
```

**Step 7: Update JSX to add paste handler and image preview**

Update the return JSX (around line 78-89):

```javascript
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
```

**Step 8: Add CSS for image preview**

In `src/components/YearlyGoals.css`, add at the end:

```css
.yearly-goals-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.yearly-goals-image-preview {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  aspect-ratio: 1;
}

.yearly-goals-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: opacity 0.2s;
}

.yearly-goals-image-thumb:hover {
  opacity: 0.8;
}

.yearly-goals-image-remove {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.yearly-goals-image-preview:hover .yearly-goals-image-remove {
  opacity: 1;
}

.yearly-goals-image-remove:hover {
  background: rgba(220, 38, 38, 0.9);
}

.yearly-goals-lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: pointer;
}

.yearly-goals-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f2937;
}

.yearly-goals-lightbox-close:hover {
  background: white;
}

.yearly-goals-lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: default;
}
```

**Step 9: Test image paste functionality**

Run: `npm run dev`

Test:
1. Open yearly goals panel
2. Copy an image (from browser/screenshot)
3. Paste into textarea area (Ctrl+V)
4. Verify image appears as thumbnail
5. Click thumbnail - verify lightbox shows
6. Click X to remove - verify image removed
7. Refresh page - verify image persists

**Step 10: Commit YearlyGoals image support**

```bash
git add src/components/YearlyGoals.jsx src/components/YearlyGoals.css
git commit -m "feat: add image paste support to YearlyGoals component"
```

---

## Task 4: Frontend - Add Completion Checkboxes to Weekly Goals

**Files:**
- Modify: `src/components/WeeklyObjectives.jsx:8,17-48,73-81`
- Modify: `src/components/WeeklyObjectives.css` (add completion styles)

**Step 1: Update objectives state to handle objects**

In `src/components/WeeklyObjectives.jsx`, the objectives state (line 8) already handles arrays. Update the `loadObjectives` function to handle both formats (around line 17-26):

```javascript
const loadObjectives = useCallback(async () => {
  setLoading(true);
  try {
    const data = await weeklyObjectiveService.getByWeek(weekStart);
    let objs = data.objectives || [];
    // Ensure all items are objects (backward compatibility)
    objs = objs.map(item => 
      typeof item === 'string' ? { text: item, completed: false } : item
    );
    setObjectives(objs);
  } catch (e) {
    console.error('Failed to load weekly objectives:', e);
  }
  setLoading(false);
}, [weekStart]);
```

**Step 2: Update addGoal to create object**

Update `addGoal` function (around line 40-44):

```javascript
const addGoal = () => {
  if (!newGoal.trim()) return;
  save([...objectives, { text: newGoal.trim(), completed: false }]);
  setNewGoal('');
};
```

**Step 3: Add toggleGoal function**

Add new function after `removeGoal`:

```javascript
const toggleGoal = (index) => {
  const updated = objectives.map((goal, i) => 
    i === index ? { ...goal, completed: !goal.completed } : goal
  );
  save(updated);
};
```

**Step 4: Update badge to show completion count**

Update badge in JSX (around line 60):

```javascript
{objectives.length > 0 && (
  <span className="wo-badge">
    {objectives.filter(g => g.completed).length}/{objectives.length}
  </span>
)}
```

**Step 5: Update goal list JSX to add checkboxes**

Update the goal list rendering (around line 73-81):

```javascript
<ul className="wo-list">
  {objectives.map((goal, i) => (
    <li key={i} className={`wo-item ${goal.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="wo-checkbox"
        checked={goal.completed}
        onChange={() => toggleGoal(i)}
      />
      <span className="wo-text">{goal.text}</span>
      <button className="wo-remove" onClick={() => removeGoal(i)} title="Remove">
        <FaTimes />
      </button>
    </li>
  ))}
</ul>
```

**Step 6: Add CSS for checkboxes and completed state**

In `src/components/WeeklyObjectives.css`, update `.wo-item` and add new styles:

```css
.wo-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.wo-item:hover {
  background: #f3f4f6;
}

.wo-item.completed .wo-text {
  text-decoration: line-through;
  opacity: 0.6;
}

.wo-checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
}

.wo-bullet {
  display: none; /* Remove bullet since we have checkbox */
}

.wo-text {
  flex: 1;
  color: #1f2937;
  transition: all 0.2s;
}
```

**Step 7: Test weekly goals completion**

Run: `npm run dev`

Test:
1. Add a weekly goal
2. Check the checkbox
3. Verify goal shows strike-through
4. Verify badge updates (e.g., "1/3")
5. Uncheck - verify strike-through removes
6. Refresh page - verify completion state persists
7. Remove a completed goal - verify it's removed

**Step 8: Commit weekly goals completion**

```bash
git add src/components/WeeklyObjectives.jsx src/components/WeeklyObjectives.css
git commit -m "feat: add completion checkboxes to weekly goals"
```

---

## Task 5: Testing and Verification

**Files:**
- Test: Manual testing of both features

**Step 1: Test yearly goals with images**

1. Open yearly goals panel
2. Paste multiple images
3. Verify all images display
4. Click to enlarge each image
5. Remove some images
6. Add text goals along with images
7. Refresh page - verify everything persists
8. Test on different years (2025, 2026)

**Step 2: Test weekly goals completion**

1. Create several weekly goals
2. Mark some as completed
3. Verify strike-through and badge count
4. Add new goals - verify they default to uncompleted
5. Remove completed and uncompleted goals
6. Change weeks - verify each week has separate goals
7. Refresh - verify completion states persist

**Step 3: Test data migration**

If you had existing data before:
- Yearly goals: Should have empty images array
- Weekly goals: Old string arrays should auto-convert to objects

**Step 4: Run build**

```bash
npm run build
```
Expected: No errors, successful build

**Step 5: Check console for errors**

Open browser console:
Expected: No errors or warnings

---

## Task 6: Documentation Update

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md**

Add to components section:
- YearlyGoals: Now supports image paste (Ctrl+V) with lightbox preview
- WeeklyObjectives: Goals have completion checkboxes with strike-through styling

**Step 2: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with goals enhancement features"
```

**Step 3: Create summary**

All features implemented:
✅ Yearly goals support image paste (Ctrl+V)
✅ Images display as thumbnails with lightbox view
✅ Images persist in database
✅ Weekly goals have completion checkboxes
✅ Completed goals show strike-through
✅ Completion count in badge (3/5)
✅ Data migration for existing weekly goals
✅ No regressions

---

## Rollback Plan

If issues arise:

1. **Database rollback:**
```bash
# Backup database first
cp data/app.db data/app.db.backup

# Remove images column if needed
sqlite3 data/app.db "ALTER TABLE yearly_goals DROP COLUMN images;"

# Revert weekly objectives migration
# (Would need to restore from backup)
```

2. **Code rollback:**
```bash
git revert <commit-hash>
```

---

## Future Enhancements

- Image optimization (resize/compress before save)
- Drag-and-drop for images
- Rich text editor for yearly goals
- Filter weekly goals by completion
- Archive completed weekly goals
- Export goals with images
