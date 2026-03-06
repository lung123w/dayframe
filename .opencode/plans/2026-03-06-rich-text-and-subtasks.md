# Rich Text Editor & Subtasks — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a TipTap rich text editor for task descriptions (with clickable URLs, formatting, lists, headings, code) and a subtask checklist system with progress tracking on calendar events.

**Architecture:** Two independent features sharing a Dexie schema version bump. RichTextEditor is a new component replacing the textarea in TaskModal. Subtasks use a new Dexie table with their own service layer, displayed as a checklist in TaskModal and as a progress badge on calendar events.

**Tech Stack:** TipTap (ProseMirror), Dexie 4.3, React 19.2, Vitest

---

## Pre-Implementation Setup

### Task 0: Create feature branch and install dependencies

**Step 1: Create branch**

```bash
git checkout -b feature/rich-text-and-subtasks
```

**Step 2: Install TipTap dependencies**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/pm
```

**Step 3: Verify install succeeds**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add TipTap rich text editor dependencies"
```

---

## Feature 1: Rich Text Editor

### Task 1: Create RichTextEditor component

**Files:**
- Create: `src/components/RichTextEditor.jsx`
- Create: `src/components/RichTextEditor.css`

**Step 1: Create the RichTextEditor component**

```jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  FaBold, FaItalic, FaStrikethrough, FaCode,
  FaHeading, FaListUl, FaListOl, FaLink, FaUndo, FaRedo
} from 'react-icons/fa';
import './RichTextEditor.css';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="rich-editor-toolbar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''} title="Bold">
        <FaBold />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''} title="Italic">
        <FaItalic />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough">
        <FaStrikethrough />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1">
        <FaHeading /><span className="heading-level">1</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2">
        <FaHeading /><span className="heading-level">2</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3">
        <FaHeading /><span className="heading-level">3</span>
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List">
        <FaListUl />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List">
        <FaListOl />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? 'is-active' : ''} title="Inline Code">
        <FaCode />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''} title="Code Block">
        <FaCode /><span className="heading-level">{ }</span>
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={addLink}
        className={editor.isActive('link') ? 'is-active' : ''} title="Add Link">
        <FaLink />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()} title="Undo">
        <FaUndo />
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()} title="Redo">
        <FaRedo />
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange, onImagePaste }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file && onImagePaste) {
                const reader = new FileReader();
                reader.onload = (e) => onImagePaste(e.target.result);
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  return (
    <div className="rich-editor-container">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  );
}
```

**Step 2: Create the CSS file**

```css
/* src/components/RichTextEditor.css */

.rich-editor-container {
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  overflow: hidden;
  background: #FFFFFF;
}

.rich-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid #E2E8F0;
  background: #F8FAFC;
  flex-wrap: wrap;
}

.rich-editor-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 4px 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #64748B;
  font-size: 13px;
  transition: all 150ms ease;
}

.rich-editor-toolbar button:hover {
  background: #E2E8F0;
  color: #1E293B;
}

.rich-editor-toolbar button.is-active {
  background: #F97316;
  color: #FFFFFF;
}

.rich-editor-toolbar button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #E2E8F0;
  margin: 0 4px;
}

.heading-level {
  font-size: 10px;
  font-weight: 700;
}

.rich-editor-content {
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
}

.rich-editor-content .tiptap {
  padding: 12px;
  outline: none;
  min-height: 120px;
  font-size: 14px;
  line-height: 1.6;
  color: #1E293B;
}

.rich-editor-content .tiptap p {
  margin: 0 0 8px 0;
}

.rich-editor-content .tiptap h1,
.rich-editor-content .tiptap h2,
.rich-editor-content .tiptap h3 {
  margin: 16px 0 8px 0;
  color: #1E293B;
  font-weight: 700;
}

.rich-editor-content .tiptap h1 { font-size: 24px; }
.rich-editor-content .tiptap h2 { font-size: 20px; }
.rich-editor-content .tiptap h3 { font-size: 16px; }

.rich-editor-content .tiptap ul,
.rich-editor-content .tiptap ol {
  padding-left: 24px;
  margin: 0 0 8px 0;
}

.rich-editor-content .tiptap li {
  margin: 2px 0;
}

.rich-editor-content .tiptap code {
  background: #F1F5F9;
  border-radius: 3px;
  padding: 2px 4px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: #E11D48;
}

.rich-editor-content .tiptap pre {
  background: #1E293B;
  color: #E2E8F0;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 8px 0;
  overflow-x: auto;
}

.rich-editor-content .tiptap pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}

.rich-editor-content .tiptap a {
  color: #3B82F6;
  text-decoration: none;
  cursor: pointer;
}

.rich-editor-content .tiptap a:hover {
  text-decoration: underline;
}

.rich-editor-content .tiptap blockquote {
  border-left: 3px solid #E2E8F0;
  padding-left: 12px;
  margin: 8px 0;
  color: #64748B;
}
```

**Step 3: Verify component renders**

Run: `npm run dev`
Manually import and test in browser.

**Step 4: Commit**

```bash
git add src/components/RichTextEditor.jsx src/components/RichTextEditor.css
git commit -m "feat: add RichTextEditor component with TipTap"
```

---

### Task 2: Integrate RichTextEditor into TaskModal

**Files:**
- Modify: `src/components/TaskModal.jsx`

**Step 1: Replace textarea with RichTextEditor**

In `TaskModal.jsx`:
- Import `RichTextEditor` from `'./RichTextEditor'`
- Replace the `<textarea>` for description with `<RichTextEditor content={description} onChange={setDescription} onImagePaste={handleImagePaste} />`
- Remove the old `handleImagePaste` from the textarea's `onPaste` — the RichTextEditor handles it internally
- Keep the `descriptionImages` state and display logic (image thumbnails below editor)

**Step 2: Verify in browser**

Run: `npm run dev`
- Create a new task, verify the rich editor appears
- Type a URL, verify it auto-links
- Test bold, italic, headings, lists, code
- Test Ctrl+V image paste still works
- Edit an existing task with plain text description — verify it renders correctly

**Step 3: Commit**

```bash
git add src/components/TaskModal.jsx
git commit -m "feat: integrate RichTextEditor into TaskModal"
```

---

### Task 3: Render rich text in DayPanel

**Files:**
- Modify: `src/components/DayPanel.jsx`
- Modify: `src/components/DayPanel.css` (add styles for rendered HTML)

**Step 1: Update description rendering**

Find where task description is rendered in DayPanel. Replace plain text display with:

```jsx
{task.description && (
  <div 
    className="day-panel-task-description"
    dangerouslySetInnerHTML={{ __html: task.description }}
  />
)}
```

**Step 2: Add CSS for rendered HTML in DayPanel**

Add styles in `DayPanel.css` for links, headings, lists, code within `.day-panel-task-description`:

```css
.day-panel-task-description a {
  color: #3B82F6;
  text-decoration: none;
}
.day-panel-task-description a:hover {
  text-decoration: underline;
}
/* ... similar to RichTextEditor content styles */
```

**Step 3: Verify in browser**

- Open DayPanel, click a task with rich text description
- Verify links are clickable, formatting renders correctly

**Step 4: Commit**

```bash
git add src/components/DayPanel.jsx src/components/DayPanel.css
git commit -m "feat: render rich text descriptions in DayPanel"
```

---

### Task 4: Write tests for RichTextEditor

**Files:**
- Create: `src/__tests__/RichTextEditor.test.jsx`

**Step 1: Write tests**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RichTextEditor from '../components/RichTextEditor';

describe('RichTextEditor', () => {
  it('renders the editor with toolbar', () => {
    render(<RichTextEditor content="" onChange={vi.fn()} />);
    // Verify toolbar buttons exist
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Add Link')).toBeInTheDocument();
  });

  it('renders initial content', () => {
    render(<RichTextEditor content="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders plain text content wrapped in paragraphs', () => {
    render(<RichTextEditor content="Plain text" onChange={vi.fn()} />);
    expect(screen.getByText('Plain text')).toBeInTheDocument();
  });
});
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/__tests__/RichTextEditor.test.jsx
git commit -m "test: add RichTextEditor component tests"
```

---

## Feature 2: Subtasks

### Task 5: Add subtasks table and service layer to db.js

**Files:**
- Modify: `src/db.js`

**Step 1: Write the failing test**

Create `src/__tests__/subtaskService.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
// Test the Subtask model shape and service methods exist
import { Subtask, subtaskService } from '../db';

describe('Subtask model', () => {
  it('creates with defaults', () => {
    const s = new Subtask();
    expect(s.title).toBe('');
    expect(s.completed).toBe(false);
    expect(s.sortOrder).toBe(0);
    expect(s.parentTaskId).toBeUndefined();
  });

  it('creates with provided data', () => {
    const s = new Subtask({ title: 'Test', parentTaskId: 1, completed: true, sortOrder: 2 });
    expect(s.title).toBe('Test');
    expect(s.parentTaskId).toBe(1);
    expect(s.completed).toBe(true);
    expect(s.sortOrder).toBe(2);
  });
});

describe('subtaskService', () => {
  it('exports expected methods', () => {
    expect(typeof subtaskService.getAll).toBe('function');
    expect(typeof subtaskService.getByTaskId).toBe('function');
    expect(typeof subtaskService.create).toBe('function');
    expect(typeof subtaskService.update).toBe('function');
    expect(typeof subtaskService.delete).toBe('function');
    expect(typeof subtaskService.deleteByTaskId).toBe('function');
    expect(typeof subtaskService.toggleCompleted).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/subtaskService.test.js`
Expected: FAIL — `Subtask` and `subtaskService` not exported

**Step 3: Implement in db.js**

Add Dexie version 3 with `subtasks` table. Add `Subtask` class and `subtaskService` object following existing patterns. Export both.

Version 3 schema:
```js
db.version(3).stores({
  tasks: '++id, title, description, dueDate, priority, status, projectId, assignedTo, createdAt, updatedAt, isRecurring, recurrencePattern',
  teamMembers: '++id, name, email, role, createdAt',
  projects: '++id, name, color, createdAt',
  subtasks: '++id, parentTaskId, title, completed, sortOrder, createdAt, updatedAt'
});
```

Subtask class:
```js
export class Subtask {
  constructor(data = {}) {
    this.id = data.id;
    this.parentTaskId = data.parentTaskId;
    this.title = data.title || '';
    this.completed = data.completed || false;
    this.sortOrder = data.sortOrder ?? 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}
```

subtaskService:
```js
export const subtaskService = {
  async getAll() {
    return await db.subtasks.toArray();
  },
  async getByTaskId(taskId) {
    return await db.subtasks.where('parentTaskId').equals(taskId).sortBy('sortOrder');
  },
  async create(subtask) {
    const newSubtask = new Subtask(subtask);
    newSubtask.createdAt = new Date().toISOString();
    newSubtask.updatedAt = new Date().toISOString();
    const id = await db.subtasks.add(newSubtask);
    return id;
  },
  async update(id, updates) {
    updates.updatedAt = new Date().toISOString();
    return await db.subtasks.update(id, updates);
  },
  async delete(id) {
    return await db.subtasks.delete(id);
  },
  async deleteByTaskId(taskId) {
    return await db.subtasks.where('parentTaskId').equals(taskId).delete();
  },
  async toggleCompleted(id) {
    const subtask = await db.subtasks.get(id);
    if (subtask) {
      return await db.subtasks.update(id, {
        completed: !subtask.completed,
        updatedAt: new Date().toISOString()
      });
    }
  }
};
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/subtaskService.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/db.js src/__tests__/subtaskService.test.js
git commit -m "feat: add subtasks table, model, and service layer"
```

---

### Task 6: Add subtask state management in App.jsx

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add subtasks state and loading**

- Import `subtaskService` from `'./db'`
- Add `const [subtasks, setSubtasks] = useState([])`
- In `loadData()`, add `subtaskService.getAll()` to the `Promise.all` and set subtasks state
- Pass `subtasks` as prop to `Calendar` and `TaskModal`

**Step 2: Add cascade delete**

In `handleDeleteTask`, add `await subtaskService.deleteByTaskId(taskId)` before or alongside `taskService.delete(taskId)`.

**Step 3: Add subtask reload trigger**

Create `handleSubtaskChange` function that calls `loadData()` to refresh subtask counts. Pass to TaskModal.

**Step 4: Verify build**

Run: `npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add subtask state management and cascade delete"
```

---

### Task 7: Add subtask UI in TaskModal

**Files:**
- Modify: `src/components/TaskModal.jsx`
- Modify: `src/components/TaskModal.css`

**Step 1: Add subtask section to TaskModal**

After the description/images section and before the metadata fields, add a "Subtasks" section:

- Header with "Subtasks (completed/total)" and Add button
- List of subtask rows: checkbox + title (editable on click) + delete button
- Input field at bottom for adding new subtasks
- Subtasks loaded via `subtaskService.getByTaskId(task.id)` on modal open
- Each action (add, toggle, delete, edit) calls the service immediately and refreshes local state
- Call `onSubtaskChange()` after mutations so App.jsx can reload

Key implementation details:
- Use local `useState` for the subtask list within TaskModal
- `useEffect` to load subtasks when `task.id` changes
- For new (unsaved) tasks: disable subtask section or show message "Save task first to add subtasks"
- Inline edit: clicking title switches to an input, blur/Enter saves

**Step 2: Add CSS for subtask section**

Add to `TaskModal.css`:
- `.subtask-section` container styles
- `.subtask-header` with flex layout for title + count + add button
- `.subtask-row` with checkbox, title, delete button
- `.subtask-input` for the add input
- Completed subtask titles get strikethrough + muted color
- Checkbox uses the Orange accent color when checked

**Step 3: Verify in browser**

- Create a task, save it, reopen — verify subtask section appears
- Add subtasks, toggle them, delete them
- Verify progress count updates

**Step 4: Commit**

```bash
git add src/components/TaskModal.jsx src/components/TaskModal.css
git commit -m "feat: add subtask checklist UI in TaskModal"
```

---

### Task 8: Add subtask progress badge on Calendar events

**Files:**
- Modify: `src/components/Calendar.jsx`
- Modify: `src/components/Calendar.css`

**Step 1: Accept subtasks prop**

Add `subtasks` to Calendar's destructured props.

**Step 2: Compute subtask counts per task**

Create a `useMemo` that builds a map of `taskId -> { completed, total }`:

```js
const subtaskCounts = useMemo(() => {
  const counts = {};
  subtasks.forEach(st => {
    if (!counts[st.parentTaskId]) {
      counts[st.parentTaskId] = { completed: 0, total: 0 };
    }
    counts[st.parentTaskId].total++;
    if (st.completed) counts[st.parentTaskId].completed++;
  });
  return counts;
}, [subtasks]);
```

**Step 3: Render progress badge in renderEventContent**

In the month/week grid view rendering, after the assignee display, add:

```jsx
{subtaskCounts[task.id] && (
  <span className="fc-event-subtask-badge">
    [{subtaskCounts[task.id].completed}/{subtaskCounts[task.id].total}]
  </span>
)}
```

For recurring task instances, use the source task ID (the numeric part before the dash in the event ID).

**Step 4: Add CSS**

```css
.fc-event-subtask-badge {
  font-size: 10px;
  color: #94A3B8;
  margin-left: 4px;
  font-weight: 500;
}
```

**Step 5: Verify in browser**

- Create a task with subtasks, check calendar shows `[2/5]` badge
- Complete all subtasks, verify badge updates to `[5/5]`

**Step 6: Commit**

```bash
git add src/components/Calendar.jsx src/components/Calendar.css
git commit -m "feat: show subtask progress badge on calendar events"
```

---

### Task 9: Write tests for subtask UI in TaskModal

**Files:**
- Modify: `src/__tests__/TaskModal.test.jsx`

**Step 1: Update existing tests**

Update mocks and test setup to account for the new `subtasks` prop and `onSubtaskChange` callback. Ensure existing tests still pass.

**Step 2: Add subtask-specific tests**

```jsx
it('shows subtask section for existing tasks', async () => {
  // Render with an existing task (has an id)
  // Verify "Subtasks" header appears
});

it('shows "save first" message for new tasks', () => {
  // Render with task=null
  // Verify subtask section shows appropriate message or is hidden
});

it('displays subtask progress count', async () => {
  // Mock subtaskService.getByTaskId to return subtasks
  // Verify "(2/3)" count shown
});
```

**Step 3: Run all tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/__tests__/TaskModal.test.jsx
git commit -m "test: add subtask UI tests to TaskModal"
```

---

### Task 10: Final verification and cleanup

**Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual browser testing checklist**

- [ ] Create new task with rich text formatting
- [ ] Type URL in description — auto-links
- [ ] Manually add link via toolbar button
- [ ] Bold, italic, strike, headings, lists, code all work
- [ ] Ctrl+V image paste still works
- [ ] Edit existing task — plain text description renders in editor
- [ ] DayPanel shows formatted description with clickable links
- [ ] Create task, save, add subtasks
- [ ] Toggle subtask completion
- [ ] Delete a subtask
- [ ] Calendar shows subtask progress badge [2/5]
- [ ] Delete a task with subtasks — subtasks cascade deleted
- [ ] Recurring tasks show subtask badge for source task

**Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup for rich text and subtasks features"
```
