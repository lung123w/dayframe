# Three Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three independent enhancements: remove Teams, add Yearly Goals hybrid structure, add Projects management tab

**Architecture:** Sequential implementation (A → B → C) with commits after each enhancement

**Tech Stack:** React 19, SQLite (better-sqlite3), Express.js

---

## ENHANCEMENT 1: Remove Teams Functionality

### Task 1.1: Remove Team Tab and State from App.jsx

**Files:**
- Modify: `src/App.jsx:4,7,27,52,55,61,150-160,200-220`

**Step 1: Remove TeamManagement import**

Find line 4:
```jsx
import TeamManagement from './components/TeamManagement';
```

Delete this line.

**Step 2: Remove teamMemberService import**

Find line 7:
```jsx
import { taskService, teamMemberService, projectService, subtaskService, habitService, habitEntryService } from './api';
```

Change to:
```jsx
import { taskService, projectService, subtaskService, habitService, habitEntryService } from './api';
```

**Step 3: Remove teamMembers state**

Find line 27:
```jsx
const [teamMembers, setTeamMembers] = useState([]);
```

Delete this line.

**Step 4: Remove teamMembers from loadData()**

Find in loadData() function (around line 52):
```jsx
const [tasksData, projectsData, membersData, subtasksData] = await Promise.all([
  taskService.getAll(),
  projectService.getAll(),
  teamMemberService.getAll(),
  subtaskService.getAll()
]);
```

Change to:
```jsx
const [tasksData, projectsData, subtasksData] = await Promise.all([
  taskService.getAll(),
  projectService.getAll(),
  subtaskService.getAll()
]);
```

Find (around line 61):
```jsx
setTeamMembers(membersData);
```

Delete this line.

**Step 5: Remove team member handlers**

Search for and delete these handler functions (around lines 200-220):
- `handleAddTeamMember`
- `handleUpdateTeamMember`
- `handleDeleteTeamMember`

**Step 6: Remove Team tab from navigation**

Find the navigation section with tabs (around line 150-160), look for:
```jsx
<button 
  className={`tab ${activeView === 'team' ? 'active' : ''}`}
  onClick={() => setActiveView('team')}
>
  <FaUsers /> Team
</button>
```

Delete this button.

**Step 7: Remove Team view render**

Find the view rendering section, look for:
```jsx
{activeView === 'team' && (
  <TeamManagement 
    teamMembers={teamMembers}
    onAddMember={handleAddTeamMember}
    onUpdateMember={handleUpdateTeamMember}
    onDeleteMember={handleDeleteTeamMember}
  />
)}
```

Delete this entire block.

**Step 8: Remove FaUsers icon import**

Find line 9:
```jsx
import { FaPlus, FaBell, FaUsers, FaCalendar, FaFolder, FaDownload, FaLink } from 'react-icons/fa';
```

Change to:
```jsx
import { FaPlus, FaBell, FaCalendar, FaFolder, FaDownload, FaLink } from 'react-icons/fa';
```

**Step 9: Test App.jsx changes**

Run: `npm run dev`

Expected: App loads without errors, no Team tab visible

**Step 10: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: remove team functionality from App.jsx"
```

---

### Task 1.2: Delete TeamManagement Component Files

**Files:**
- Delete: `src/components/TeamManagement.jsx`
- Delete: `src/components/TeamManagement.css`

**Step 1: Delete TeamManagement.jsx**

Run: `rm src/components/TeamManagement.jsx`

Expected: File deleted

**Step 2: Delete TeamManagement.css**

Run: `rm src/components/TeamManagement.css`

Expected: File deleted

**Step 3: Verify app still runs**

Run: `npm run dev`

Expected: No import errors, app loads normally

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete TeamManagement component files"
```

---

### Task 1.3: Remove Assignment UI from TaskModal

**Files:**
- Modify: `src/components/TaskModal.jsx` (find assignedTo field section)

**Step 1: Read TaskModal to find assignedTo section**

Run: Open `src/components/TaskModal.jsx` and locate the section with:
- Multi-select for team members
- Label "Assigned To"
- State handling for `assignedTo` array

**Step 2: Remove assignedTo from formData state**

Find the initial state definition (around line 20-30), look for:
```jsx
assignedTo: task?.assignedTo || []
```

Change to remove this field entirely from the initial state.

**Step 3: Remove assignedTo field from form UI**

Find the form section with the multi-select dropdown (look for "Assigned To" label).

Delete the entire form group:
```jsx
<div className="form-group">
  <label>Assigned To</label>
  <select 
    multiple
    value={formData.assignedTo}
    onChange={(e) => setFormData({...formData, assignedTo: Array.from(e.target.selectedOptions, opt => opt.value)})}
  >
    {teamMembers.map(member => (
      <option key={member.id} value={member.id}>{member.name}</option>
    ))}
  </select>
</div>
```

**Step 4: Remove teamMembers prop**

Find the component function signature:
```jsx
export default function TaskModal({ task, projects, teamMembers, ... })
```

Change to:
```jsx
export default function TaskModal({ task, projects, ... })
```

**Step 5: Test TaskModal**

Run: `npm run dev`

Test: Open task creation modal, verify no "Assigned To" field visible

Expected: Modal renders without assignment field, no errors

**Step 6: Commit**

```bash
git add src/components/TaskModal.jsx
git commit -m "refactor: remove assignment field from TaskModal"
```

---

### Task 1.4: Remove Team Display from Calendar

**Files:**
- Modify: `src/components/Calendar.jsx` (event rendering section)

**Step 1: Read Calendar component**

Locate the `renderEventContent` function or event rendering logic that displays team member names.

**Step 2: Remove team member name from event display**

Find code that displays team member names in calendar events (may look like):
```jsx
{event.extendedProps.assignedToNames && (
  <div className="event-assignees">{event.extendedProps.assignedToNames}</div>
)}
```

Delete this code block.

**Step 3: Remove teamMembers prop**

Find component function signature:
```jsx
export default function Calendar({ tasks, projects, teamMembers, ... })
```

Change to:
```jsx
export default function Calendar({ tasks, projects, ... })
```

**Step 4: Remove team member name mapping logic**

Find code that maps `assignedTo` IDs to names (may be in event transformation), e.g.:
```jsx
assignedToNames: task.assignedTo.map(id => teamMembers.find(m => m.id === id)?.name).join(', ')
```

Delete this mapping logic.

**Step 5: Test Calendar view**

Run: `npm run dev`

Test: Switch to Calendar view, verify events render without team member names

Expected: No console errors, events display correctly

**Step 6: Commit**

```bash
git add src/components/Calendar.jsx
git commit -m "refactor: remove team member display from Calendar"
```

---

### Task 1.5: Remove Team Display from DayPanel and DayColumn

**Files:**
- Modify: `src/components/DayPanel.jsx`
- Modify: `src/components/DayColumn.jsx`

**Step 1: Remove from DayPanel**

Open `src/components/DayPanel.jsx`

Find team member display in task cards (may be in TaskCard component or inline), e.g.:
```jsx
{task.assignedTo?.length > 0 && (
  <div className="task-assignees">
    {task.assignedTo.map(id => teamMembers.find(m => m.id === id)?.name).join(', ')}
  </div>
)}
```

Delete this code block.

Remove `teamMembers` from props:
```jsx
export default function DayPanel({ teamMembers, ... })
```

Change to:
```jsx
export default function DayPanel({ ... })
```

**Step 2: Remove from DayColumn**

Open `src/components/DayColumn.jsx`

Find similar team member display code and delete it.

Remove `teamMembers` from props.

**Step 3: Update parent components**

Check where DayPanel and DayColumn are used (likely in DailyPlanner.jsx or App.jsx) and remove `teamMembers={teamMembers}` prop passing.

**Step 4: Test Day and Week views**

Run: `npm run dev`

Test: View tasks in Day and Week views

Expected: Tasks display without team member names, no errors

**Step 5: Commit**

```bash
git add src/components/DayPanel.jsx src/components/DayColumn.jsx
git commit -m "refactor: remove team member display from DayPanel and DayColumn"
```

---

### Task 1.6: Manual Testing and Verification

**Step 1: Full application smoke test**

Run: `npm run dev`

Test checklist:
- [ ] App loads without console errors
- [ ] No Team tab in navigation
- [ ] Create new task - no assignment field
- [ ] Edit existing task - no assignment field
- [ ] View task in Calendar - no team names
- [ ] View task in Day view - no team names
- [ ] View task in Week view - no team names
- [ ] All other features work normally (habits, goals, etc.)

**Step 2: Check for any remaining references**

Run: `grep -r "teamMember" src/components/ --exclude-dir=node_modules`

Expected: No matches (or only in commented code)

**Step 3: Document completion**

Create verification note:
```bash
echo "Enhancement 1 (Remove Teams) completed and tested - $(date)" >> docs/plans/progress.txt
```

---

## ENHANCEMENT 2: Yearly Goals Hybrid Structure

### Task 2.1: Database Migration

**Files:**
- Modify: `server/db.js:101-109` (yearly_goals table)

**Step 1: Add vision column and migrate data**

Open `server/db.js`

Find the migrations section (after line 118), add new migration:

```javascript
// Migrate yearly_goals: add vision column, migrate existing goals to vision
try {
  db.exec(`ALTER TABLE yearly_goals ADD COLUMN vision TEXT NOT NULL DEFAULT ''`);
  
  // Migrate existing goals data to vision column
  db.exec(`UPDATE yearly_goals SET vision = goals WHERE vision = ''`);
  
  // Reset goals column to empty JSON array
  db.exec(`UPDATE yearly_goals SET goals = '[]' WHERE goals != '[]'`);
} catch (e) {
  // Column already exists
}
```

**Step 2: Test migration**

Run: `npm run dev` (this will start server and run migrations)

Expected: Server starts without errors

**Step 3: Verify migration in database**

Run: 
```bash
sqlite3 data/app.db "PRAGMA table_info(yearly_goals);"
```

Expected: Output shows columns: id, year, goals, images, createdAt, updatedAt, vision

**Step 4: Verify data migration**

Run:
```bash
sqlite3 data/app.db "SELECT year, vision, goals FROM yearly_goals;"
```

Expected: Existing goals text now in `vision` column, `goals` column is `[]`

**Step 5: Commit**

```bash
git add server/db.js
git commit -m "feat: add vision column to yearly_goals and migrate data"
```

---

### Task 2.2: Update API Service for Yearly Goals

**Files:**
- Modify: `server/routes/yearlyGoals.js` (if exists)
- OR Modify: Backend API handlers for yearly goals

**Step 1: Locate yearly goals API endpoint**

Search for yearly goals routes:
```bash
find server -name "*yearly*" -o -name "*goal*"
```

**Step 2: Update getByYear endpoint**

Find the GET endpoint for yearly goals (returns goals for a specific year).

Ensure response includes both `vision` and `goals` fields:
```javascript
// Example update
const row = db.prepare('SELECT * FROM yearly_goals WHERE year = ?').get(year);
return {
  ...row,
  goals: JSON.parse(row.goals || '[]'),
  images: JSON.parse(row.images || '[]')
};
```

**Step 3: Update upsert endpoint**

Find the POST/PUT endpoint that saves yearly goals.

Update to handle both `vision` and `goals`:
```javascript
// Example update
const stmt = db.prepare(`
  INSERT INTO yearly_goals (year, vision, goals, images, updatedAt)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(year) DO UPDATE SET 
    vision = excluded.vision,
    goals = excluded.goals,
    images = excluded.images,
    updatedAt = datetime('now')
`);

stmt.run(
  year,
  vision,
  JSON.stringify(goals),
  JSON.stringify(images)
);
```

**Step 4: Test API endpoints**

Run: `npm run dev`

Test with curl or Postman:
```bash
# Get yearly goals
curl http://localhost:3001/api/yearly-goals/2026

# Update yearly goals
curl -X POST http://localhost:3001/api/yearly-goals \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"vision":"Test vision","goals":[{"text":"Goal 1","completed":false}],"images":[]}'
```

Expected: Endpoints work, data saves correctly

**Step 5: Commit**

```bash
git add server/routes/yearlyGoals.js
git commit -m "feat: update yearly goals API to support vision and goals fields"
```

---

### Task 2.3: Update Frontend API Service

**Files:**
- Modify: `src/api.js` (yearlyGoalService)

**Step 1: Locate yearlyGoalService**

Open `src/api.js` and find `yearlyGoalService` object.

**Step 2: Update service methods**

Ensure `getByYear` and `upsert` methods handle the new structure:

```javascript
const yearlyGoalService = {
  async getByYear(year) {
    const res = await fetch(`${API_BASE}/yearly-goals/${year}`);
    if (!res.ok) throw new Error('Failed to fetch yearly goals');
    return res.json(); // Should return {year, vision, goals, images}
  },

  async upsert(data) {
    // data: {year, vision, goals, images}
    const res = await fetch(`${API_BASE}/yearly-goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save yearly goals');
    return res.json();
  }
};
```

**Step 3: Test service methods**

Run: `npm run dev`

Open browser console, test:
```javascript
await yearlyGoalService.getByYear(2026);
// Should return {year, vision, goals: [], images: []}
```

Expected: Data structure matches expected format

**Step 4: Commit**

```bash
git add src/api.js
git commit -m "feat: update yearlyGoalService to handle vision and goals fields"
```

---

### Task 2.4: Restructure YearlyGoals Component State

**Files:**
- Modify: `src/components/YearlyGoals.jsx:1-92`

**Step 1: Update state structure**

Find state initialization (around line 8-13):

```jsx
const [goals, setGoals] = useState('');
```

Change to:
```jsx
const [vision, setVision] = useState('');
const [goals, setGoals] = useState([]);
const [images, setImages] = useState([]);
const [newGoalText, setNewGoalText] = useState('');
```

**Step 2: Update loadGoals function**

Find `loadGoals` function (around line 20-27):

```jsx
const loadGoals = async () => {
  try {
    const data = await yearlyGoalService.getByYear(currentYear);
    setGoals(data.goals || '');
  } catch (err) {
    console.error('Failed to load yearly goals:', err);
  }
};
```

Change to:
```jsx
const loadGoals = async () => {
  try {
    const data = await yearlyGoalService.getByYear(currentYear);
    setVision(data.vision || '');
    setGoals(data.goals || []);
    setImages(data.images || []);
  } catch (err) {
    console.error('Failed to load yearly goals:', err);
  }
};
```

**Step 3: Update saveGoals function**

Find `saveGoals` function (around line 29-38):

```jsx
const saveGoals = async (goalsText) => {
  setIsSaving(true);
  try {
    await yearlyGoalService.upsert({ year: currentYear, goals: goalsText });
  } catch (err) {
    console.error('Failed to save yearly goals:', err);
  } finally {
    setIsSaving(false);
  }
};
```

Change to:
```jsx
const saveData = async (updatedVision, updatedGoals, updatedImages) => {
  setIsSaving(true);
  try {
    await yearlyGoalService.upsert({ 
      year: currentYear, 
      vision: updatedVision,
      goals: updatedGoals,
      images: updatedImages
    });
  } catch (err) {
    console.error('Failed to save yearly goals:', err);
  } finally {
    setIsSaving(false);
  }
};
```

**Step 4: Commit**

```bash
git add src/components/YearlyGoals.jsx
git commit -m "refactor: restructure YearlyGoals state for hybrid structure"
```

---

### Task 2.5: Add Vision Textarea UI

**Files:**
- Modify: `src/components/YearlyGoals.jsx:78-89` (body section)

**Step 1: Update handleChange for vision**

Find `handleChange` function (around line 40-51):

```jsx
const handleChange = (e) => {
  const newGoals = e.target.value;
  setGoals(newGoals);

  // Auto-save after 2 seconds of inactivity
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  saveTimeoutRef.current = setTimeout(() => {
    saveGoals(newGoals);
  }, 2000);
};
```

Change to:
```jsx
const handleVisionChange = (e) => {
  const newVision = e.target.value;
  setVision(newVision);

  // Auto-save after 2 seconds of inactivity
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  saveTimeoutRef.current = setTimeout(() => {
    saveData(newVision, goals, images);
  }, 2000);
};
```

**Step 2: Update handleBlur for vision**

Find `handleBlur` function (around line 53-59):

```jsx
const handleBlur = () => {
  // Save immediately on blur
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  saveGoals(goals);
};
```

Change to:
```jsx
const handleVisionBlur = () => {
  // Save immediately on blur
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  saveData(vision, goals, images);
};
```

**Step 3: Update textarea JSX**

Find the textarea in the body section (around line 80-87):

```jsx
<textarea
  className="yearly-goals-textarea"
  placeholder="What are your goals for this year?"
  value={goals}
  onChange={handleChange}
  onBlur={handleBlur}
  rows={6}
/>
```

Change to:
```jsx
<div className="yearly-goals-section">
  <label className="yearly-goals-label">Vision for {currentYear}</label>
  <textarea
    className="yearly-goals-textarea"
    placeholder="Describe your vision for this year..."
    value={vision}
    onChange={handleVisionChange}
    onBlur={handleVisionBlur}
    rows={4}
  />
</div>
```

**Step 4: Test vision textarea**

Run: `npm run dev`

Test: Type in vision textarea, verify auto-save after 2 seconds

Expected: Vision saves and persists on page reload

**Step 5: Commit**

```bash
git add src/components/YearlyGoals.jsx
git commit -m "feat: add vision textarea to YearlyGoals component"
```

---

### Task 2.6: Add Checkbox List UI for Goals

**Files:**
- Modify: `src/components/YearlyGoals.jsx:78-89` (add after vision section)

**Step 1: Add goal management functions**

Add these functions after `handleVisionBlur`:

```jsx
const addGoal = () => {
  if (!newGoalText.trim()) return;
  const updatedGoals = [...goals, { text: newGoalText.trim(), completed: false }];
  setGoals(updatedGoals);
  setNewGoalText('');
  saveData(vision, updatedGoals, images);
};

const toggleGoal = (index) => {
  const updatedGoals = goals.map((goal, i) => 
    i === index ? { ...goal, completed: !goal.completed } : goal
  );
  setGoals(updatedGoals);
  saveData(vision, updatedGoals, images);
};

const deleteGoal = (index) => {
  const updatedGoals = goals.filter((_, i) => i !== index);
  setGoals(updatedGoals);
  saveData(vision, updatedGoals, images);
};

const handleGoalKeyDown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addGoal();
  }
};
```

**Step 2: Add checkbox list JSX**

After the vision textarea section, add:

```jsx
<div className="yearly-goals-section">
  <label className="yearly-goals-label">Goals</label>
  
  {goals.length === 0 && (
    <div className="yearly-goals-empty">No goals set yet</div>
  )}
  
  <ul className="yearly-goals-list">
    {goals.map((goal, index) => (
      <li key={index} className={`yearly-goal-item ${goal.completed ? 'completed' : ''}`}>
        <input
          type="checkbox"
          checked={goal.completed}
          onChange={() => toggleGoal(index)}
          className="yearly-goal-checkbox"
        />
        <span className="yearly-goal-text">{goal.text}</span>
        <button
          className="yearly-goal-delete"
          onClick={() => deleteGoal(index)}
          title="Delete goal"
        >
          <FaTimes />
        </button>
      </li>
    ))}
  </ul>
  
  <div className="yearly-goal-add">
    <input
      type="text"
      className="yearly-goal-input"
      placeholder="Add a goal..."
      value={newGoalText}
      onChange={(e) => setNewGoalText(e.target.value)}
      onKeyDown={handleGoalKeyDown}
    />
    <button
      className="yearly-goal-add-btn"
      onClick={addGoal}
      disabled={!newGoalText.trim()}
    >
      <FaPlus />
    </button>
  </div>
</div>
```

**Step 3: Add FaTimes and FaPlus imports**

At top of file, update imports:

```jsx
import { FaChevronDown, FaChevronUp, FaTimes, FaPlus } from 'react-icons/fa';
```

**Step 4: Test checkbox functionality**

Run: `npm run dev`

Test:
- Add new goal via input + button
- Add new goal via Enter key
- Toggle goal completion
- Delete goal
- Verify data persists on page reload

Expected: All actions work, data saves automatically

**Step 5: Commit**

```bash
git add src/components/YearlyGoals.jsx
git commit -m "feat: add checkbox list for goals in YearlyGoals component"
```

---

### Task 2.7: Add CSS Styling for New Structure

**Files:**
- Modify: `src/components/YearlyGoals.css`

**Step 1: Add section styles**

Add at end of file:

```css
.yearly-goals-section {
  margin-bottom: 1.5rem;
}

.yearly-goals-label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 0.5rem;
}

.yearly-goals-empty {
  color: #9ca3af;
  font-size: 0.875rem;
  font-style: italic;
  padding: 0.5rem 0;
}
```

**Step 2: Add checkbox list styles**

```css
.yearly-goals-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
}

.yearly-goal-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  transition: background-color 0.15s;
}

.yearly-goal-item:hover {
  background-color: #f3f4f6;
}

.yearly-goal-item.completed .yearly-goal-text {
  text-decoration: line-through;
  color: #9ca3af;
}

.yearly-goal-checkbox {
  margin-right: 0.75rem;
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.yearly-goal-text {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.5;
}

.yearly-goal-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.yearly-goal-item:hover .yearly-goal-delete {
  opacity: 1;
}

.yearly-goal-delete:hover {
  color: #dc2626;
}
```

**Step 3: Add input row styles**

```css
.yearly-goal-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.yearly-goal-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.yearly-goal-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.yearly-goal-add-btn {
  padding: 0.5rem 0.75rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.15s;
}

.yearly-goal-add-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.yearly-goal-add-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
```

**Step 4: Test visual styling**

Run: `npm run dev`

Test: View Yearly Goals panel, verify styles match design

Expected: Clean, readable layout with proper spacing and hover effects

**Step 5: Commit**

```bash
git add src/components/YearlyGoals.css
git commit -m "style: add CSS for hybrid yearly goals structure"
```

---

### Task 2.8: Handle Image Paste Support (Verify Existing)

**Files:**
- Verify: `src/components/YearlyGoals.jsx` (image paste already implemented)

**Step 1: Check existing image paste code**

Verify that image paste handler exists and works with new structure.

Look for `handlePaste` function and image display code.

**Step 2: Update image paste handler if needed**

If `saveGoals` is called in paste handler, update to `saveData`:

```jsx
const handlePaste = async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        const updatedImages = [...images, base64];
        setImages(updatedImages);
        saveData(vision, goals, updatedImages);
      };
      reader.readAsDataURL(file);
    }
  }
};
```

**Step 3: Verify image delete handler**

Ensure delete image function updates all three pieces of state:

```jsx
const deleteImage = (index) => {
  const updatedImages = images.filter((_, i) => i !== index);
  setImages(updatedImages);
  saveData(vision, goals, updatedImages);
};
```

**Step 4: Test image paste**

Run: `npm run dev`

Test:
- Paste image with Ctrl+V
- Verify image appears in preview grid
- Delete image
- Verify data persists on reload

Expected: Images work seamlessly with new structure

**Step 5: Commit (if changes needed)**

```bash
git add src/components/YearlyGoals.jsx
git commit -m "fix: update image handlers to work with hybrid structure"
```

---

### Task 2.9: Manual Testing and Verification

**Step 1: Full yearly goals smoke test**

Run: `npm run dev`

Test checklist:
- [ ] Vision textarea displays and saves
- [ ] Can add goals via input + button
- [ ] Can add goals via Enter key
- [ ] Can toggle goal completion
- [ ] Can delete goals
- [ ] Images paste and display correctly
- [ ] All data persists on page reload
- [ ] Auto-save works for vision (2s idle)
- [ ] Saving indicator appears
- [ ] No console errors

**Step 2: Test with existing data**

If you had existing yearly goals data:
- [ ] Old goals text moved to vision field
- [ ] Goals list starts empty
- [ ] No data loss

**Step 3: Document completion**

```bash
echo "Enhancement 2 (Yearly Goals Hybrid) completed and tested - $(date)" >> docs/plans/progress.txt
```

---

## ENHANCEMENT 3: Projects Management Tab

### Task 3.1: Create ProjectsView Component

**Files:**
- Create: `src/components/ProjectsView.jsx`

**Step 1: Create component file**

Create `src/components/ProjectsView.jsx` with initial structure:

```jsx
import React from 'react';
import { FaPlus, FaEdit, FaTrash, FaFolder } from 'react-icons/fa';
import './ProjectsView.css';

export default function ProjectsView({ 
  projects, 
  onCreateProject, 
  onEditProject, 
  onDeleteProject 
}) {
  const handleDelete = (project) => {
    if (window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      onDeleteProject(project.id);
    }
  };

  return (
    <div className="projects-view">
      <div className="projects-header">
        <h2><FaFolder /> Projects</h2>
        <button className="btn btn-primary" onClick={onCreateProject}>
          <FaPlus /> New Project
        </button>
      </div>

      <div className="projects-list">
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects yet. Create your first project above.</p>
          </div>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Color</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>
                    <div className="project-color-display">
                      <span 
                        className="project-color-swatch" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="project-color-hex">{project.color}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => onEditProject(project)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="icon-btn delete-btn"
                      onClick={() => handleDelete(project)}
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
```

**Step 2: Verify component structure**

Check that:
- Component receives correct props
- Handlers are called with correct arguments
- Table structure matches TeamManagement pattern

**Step 3: Test component (will fail until wired up)**

Expected: Component defined, but not yet visible in app

**Step 4: Commit**

```bash
git add src/components/ProjectsView.jsx
git commit -m "feat: create ProjectsView component with table layout"
```

---

### Task 3.2: Add CSS Styling for ProjectsView

**Files:**
- Create: `src/components/ProjectsView.css`

**Step 1: Create CSS file**

Create `src/components/ProjectsView.css`:

```css
.projects-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.projects-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.projects-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #6b7280;
}

.projects-table {
  width: 100%;
  border-collapse: collapse;
}

.projects-table thead {
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.projects-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.projects-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.15s;
}

.projects-table tbody tr:hover {
  background-color: #f9fafb;
}

.projects-table td {
  padding: 1rem;
  font-size: 0.875rem;
  color: #1f2937;
}

.project-color-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.project-color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.project-color-hex {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  color: #6b7280;
}

.icon-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.15s;
  font-size: 1rem;
}

.icon-btn:hover {
  color: #3b82f6;
}

.icon-btn.delete-btn:hover {
  color: #ef4444;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

**Step 2: Verify styles**

Check that:
- Table styles match TeamManagement
- Color swatch displays correctly
- Hover effects work
- Button styles consistent with app

**Step 3: Commit**

```bash
git add src/components/ProjectsView.css
git commit -m "style: add CSS for ProjectsView component"
```

---

### Task 3.3: Add Projects Tab to App.jsx

**Files:**
- Modify: `src/App.jsx:2,150-160,350-360`

**Step 1: Import ProjectsView component**

At top of `src/App.jsx`, add import:

```jsx
import ProjectsView from './components/ProjectsView';
```

**Step 2: Add Projects tab to navigation**

Find the navigation section (around line 150-160), add Projects tab button:

```jsx
<button 
  className={`tab ${activeView === 'projects' ? 'active' : ''}`}
  onClick={() => setActiveView('projects')}
>
  <FaFolder /> Projects
</button>
```

**Step 3: Add Projects view render**

Find the view rendering section (around line 350-360), add:

```jsx
{activeView === 'projects' && (
  <ProjectsView
    projects={projects}
    onCreateProject={() => {
      setEditingProject(null);
      setShowProjectModal(true);
    }}
    onEditProject={(project) => {
      setEditingProject(project);
      setShowProjectModal(true);
    }}
    onDeleteProject={handleDeleteProject}
  />
)}
```

**Step 4: Add handleDeleteProject function**

Find the project handlers section in App.jsx, add:

```jsx
const handleDeleteProject = async (projectId) => {
  try {
    await projectService.delete(projectId);
    await loadData();
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
};
```

**Step 5: Test Projects tab**

Run: `npm run dev`

Test:
- Click Projects tab in navigation
- Verify ProjectsView component renders
- Verify table shows existing projects

Expected: Projects tab appears, component displays

**Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add Projects tab to navigation and wire up ProjectsView"
```

---

### Task 3.4: Test Create and Edit Functionality

**Files:**
- Verify: Existing `ProjectModal` integration

**Step 1: Test create project**

Run: `npm run dev`

Test:
1. Click Projects tab
2. Click "New Project" button
3. Verify ProjectModal opens
4. Create new project
5. Verify table updates with new project

Expected: Create flow works, table refreshes

**Step 2: Test edit project**

Test:
1. Click Edit icon on a project row
2. Verify ProjectModal opens with project data
3. Change project name or color
4. Save
5. Verify table updates

Expected: Edit flow works, changes reflected

**Step 3: Verify modal state management**

Check that:
- Modal closes after save
- `editingProject` state resets correctly
- Table refreshes after both create and edit

**Step 4: Document test results**

If issues found, note them for fixing.

Expected: Both create and edit work correctly

---

### Task 3.5: Test Delete Functionality

**Files:**
- Verify: Delete handler and confirmation

**Step 1: Test delete with confirmation**

Run: `npm run dev`

Test:
1. Click Delete icon on a project row
2. Verify confirmation dialog appears
3. Click Cancel - verify nothing deleted
4. Click Delete icon again
5. Click OK - verify project deleted
6. Verify table updates

Expected: Delete works with confirmation

**Step 2: Test delete with tasks**

Test:
1. Create a task assigned to a project
2. Go to Projects tab
3. Delete that project
4. Go back to Calendar/Day view
5. Verify task still exists (without project association)

Expected: Task not deleted, just loses project reference

**Step 3: Verify edge cases**

Test:
- Delete last project - table shows empty state
- Delete project, create new one - ID increments correctly
- Cannot delete default "General" project (if protected)

Expected: All edge cases handled gracefully

---

### Task 3.6: Manual Testing and Final Verification

**Step 1: Full projects management smoke test**

Run: `npm run dev`

Test checklist:
- [ ] Projects tab visible in navigation
- [ ] Table displays all projects correctly
- [ ] Color swatches show correct colors
- [ ] Create new project works
- [ ] Edit project name works
- [ ] Edit project color works
- [ ] Delete project shows confirmation
- [ ] Delete project removes from table
- [ ] Table shows empty state when no projects
- [ ] No console errors
- [ ] Styling matches app design

**Step 2: Integration test**

Test across views:
- [ ] Create project in Projects tab
- [ ] Create task with that project in Calendar
- [ ] Verify project color shows on task
- [ ] Edit project color in Projects tab
- [ ] Verify color updates on task
- [ ] Delete project
- [ ] Verify task still visible (no color)

Expected: Full integration works correctly

**Step 3: Document completion**

```bash
echo "Enhancement 3 (Projects Tab) completed and tested - $(date)" >> docs/plans/progress.txt
```

**Step 4: Final commit**

```bash
git commit -m "test: verify all projects management functionality"
```

---

## Final Integration Testing

### Task 4.1: Cross-Enhancement Smoke Test

**Step 1: Test all three enhancements together**

Run: `npm run dev`

Test checklist:
- [ ] No Team tab visible
- [ ] No assignment fields in tasks
- [ ] Yearly Goals shows vision + checkbox list
- [ ] Projects tab shows and works
- [ ] All existing features still work (Calendar, Habits, etc.)
- [ ] No console errors anywhere

**Step 2: Test data persistence**

Test:
1. Add yearly vision and goals
2. Create a project
3. Create a task with that project
4. Close browser
5. Reopen app
6. Verify all data persisted

Expected: All data intact after reload

**Step 3: Test performance**

Check:
- App loads quickly
- No lag when switching views
- Auto-save doesn't cause UI jank

Expected: Performance is acceptable

---

### Task 4.2: Update Documentation

**Files:**
- Modify: `CLAUDE.md` (if needed)
- Modify: `README.md` (if needed)

**Step 1: Update CLAUDE.md**

Add to relevant sections:
- Yearly Goals now has vision + goals structure
- Team functionality removed
- Projects tab added for management

**Step 2: Update README (if user-facing)**

Document new features:
- Yearly Goals hybrid structure
- Projects management tab

**Step 3: Commit documentation**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update documentation for three enhancements"
```

---

### Task 4.3: Final Commit and Wrap-Up

**Step 1: Review all commits**

Run: `git log --oneline`

Expected: Clean commit history with descriptive messages

**Step 2: Create summary commit (if needed)**

If minor cleanup needed:
```bash
git add .
git commit -m "chore: final cleanup for three enhancements"
```

**Step 3: Document completion**

```bash
echo "All three enhancements completed successfully - $(date)" >> docs/plans/progress.txt
```

**Step 4: Announce completion**

Report to user:
- ✅ Enhancement 1: Teams removed
- ✅ Enhancement 2: Yearly Goals hybrid structure
- ✅ Enhancement 3: Projects management tab
- All features tested and working

---

## Rollback Instructions

If any enhancement fails:

**Rollback Enhancement 1 (Teams):**
```bash
git revert <commit-range-for-task-1>
```

**Rollback Enhancement 2 (Yearly Goals):**
```bash
git revert <commit-range-for-task-2>
# May need to manually restore database schema
```

**Rollback Enhancement 3 (Projects):**
```bash
git revert <commit-range-for-task-3>
```

**Full rollback:**
```bash
git reset --hard <commit-before-enhancements>
```

---

## Estimated Timeline

- **Enhancement 1 (Teams Removal):** 30-45 minutes
- **Enhancement 2 (Yearly Goals):** 45-60 minutes
- **Enhancement 3 (Projects Tab):** 30-45 minutes
- **Integration Testing:** 15-30 minutes

**Total:** 2-3 hours

---

## Success Criteria

### Enhancement 1: Teams Removal ✓
- [ ] No Team tab in navigation
- [ ] No assignment UI in TaskModal
- [ ] No team member names anywhere in app
- [ ] No console errors
- [ ] App functions normally

### Enhancement 2: Yearly Goals Hybrid ✓
- [ ] Vision textarea at top
- [ ] Checkbox list for goals below
- [ ] Can add, toggle, delete goals
- [ ] Images work correctly
- [ ] All data persists
- [ ] Auto-save works

### Enhancement 3: Projects Tab ✓
- [ ] Projects tab in navigation
- [ ] Table displays all projects
- [ ] Can create new projects
- [ ] Can edit existing projects
- [ ] Can delete projects
- [ ] Confirmation on delete
- [ ] Table updates after operations

---

## Notes

- Follow TDD where applicable (write tests for complex logic)
- Use DRY principles (reuse existing patterns)
- Apply YAGNI (no over-engineering)
- Commit frequently (after each task)
- Test thoroughly before moving to next enhancement

---

**End of Implementation Plan**
