# Habit Time + Yearly Vision Rich Text Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add time capture to planner "Today Habits" completion flow and upgrade Yearly Goals Vision to rich text with robust image enlarge behavior.

**Architecture:** Reuse existing UI patterns and services to keep scope small. `PlannerHabitsPanel` adopts the same `TimePopover` interaction used in `HabitTracker`, while `YearlyGoals` swaps vision textarea for `RichTextEditor` but continues persisting to the same `vision` field. Lightbox behavior remains the same structure, with improved close/open reliability and responsive sizing.

**Tech Stack:** React 19, date-fns, react-icons, existing API client (`habitService`, `habitEntryService`, `yearlyGoalService`), Vitest + Testing Library.

---

### Task 1: Planner Habits Popover Tests (RED)

**Files:**
- Modify: `src/__tests__/PlannerHabitsPanel.test.jsx`
- Test: `src/__tests__/PlannerHabitsPanel.test.jsx`

**Step 1: Write failing tests for popover workflow**

Add tests that verify:
- clicking `Mark Done` opens time popover instead of immediate create
- selecting time from popover calls `habitEntryService.create` with non-zero `timeSpentSeconds`
- clicking `Done` still deletes today's entry

Example snippet:

```jsx
it('opens time popover before creating entry', async () => {
  render(<PlannerHabitsPanel onDataChange={onDataChange} />);
  fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
  expect(screen.getByText(/how much time/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/PlannerHabitsPanel.test.jsx`

Expected: FAIL because panel currently creates `timeSpentSeconds: 0` directly and has no popover.

**Step 3: Commit test-only checkpoint**

```bash
git add src/__tests__/PlannerHabitsPanel.test.jsx
git commit -m "test: define planner habit time popover behavior"
```

### Task 2: Implement Planner Habit Time Popover (GREEN)

**Files:**
- Modify: `src/components/PlannerHabitsPanel.jsx`
- Modify: `src/components/PlannerHabitsPanel.css`
- Test: `src/__tests__/PlannerHabitsPanel.test.jsx`

**Step 1: Implement minimal popover behavior**

In `PlannerHabitsPanel`:
- import and render `TimePopover`
- add `todayPopover` state (`habitId`, `x`, `y`)
- on `Mark Done` click:
  - if done today: delete by date
  - if not done today: open popover at button coordinates
- on popover save: create entry with selected `timeSpentSeconds`, close popover

Example implementation shape:

```jsx
const [todayPopover, setTodayPopover] = useState(null);

if (!done) {
  const rect = e.currentTarget.getBoundingClientRect();
  setTodayPopover({ habitId: habit.id, x: rect.left, y: rect.bottom + 4 });
}
```

**Step 2: Run tests to verify pass**

Run: `npm run test:run -- src/__tests__/PlannerHabitsPanel.test.jsx`

Expected: PASS.

**Step 3: Commit implementation**

```bash
git add src/components/PlannerHabitsPanel.jsx src/components/PlannerHabitsPanel.css src/__tests__/PlannerHabitsPanel.test.jsx
git commit -m "feat: capture habit time from planner today panel"
```

### Task 3: Yearly Vision Rich Text Tests (RED)

**Files:**
- Create: `src/__tests__/YearlyGoals.test.jsx`
- Test: `src/__tests__/YearlyGoals.test.jsx`

**Step 1: Write failing tests for rich vision + lightbox interactions**

Cover:
- vision field renders rich editor container instead of textarea
- editor change triggers save payload with HTML vision string
- image thumbnail opens lightbox
- overlay/button/Escape close lightbox

Example snippet:

```jsx
expect(container.querySelector('.rich-editor-content')).toBeTruthy();
```

**Step 2: Run test to verify fail**

Run: `npm run test:run -- src/__tests__/YearlyGoals.test.jsx`

Expected: FAIL because component currently uses `textarea` and lacks test coverage.

**Step 3: Commit test-only checkpoint**

```bash
git add src/__tests__/YearlyGoals.test.jsx
git commit -m "test: define yearly goals rich vision and lightbox behavior"
```

### Task 4: Implement Yearly Vision Rich Text (GREEN)

**Files:**
- Modify: `src/components/YearlyGoals.jsx`
- Modify: `src/components/YearlyGoals.css`
- Modify: `src/__tests__/YearlyGoals.test.jsx`

**Step 1: Implement minimal rich editor replacement**

In `YearlyGoals.jsx`:
- import `RichTextEditor`
- replace vision textarea with `RichTextEditor`
- wire `onChange` into debounced save logic (same 2-second behavior)
- pass `onImagePaste` to keep Ctrl+V image support

Example shape:

```jsx
<RichTextEditor
  content={vision}
  onChange={handleVisionHtmlChange}
  onImagePaste={handleImagePaste}
/>
```

**Step 2: Keep persistence contract unchanged**

Ensure `saveAll` still writes:

```js
yearlyGoalService.upsert({ year: currentYear, vision: v, goals: g, images: JSON.stringify(i) })
```

**Step 3: Run yearly goals tests**

Run: `npm run test:run -- src/__tests__/YearlyGoals.test.jsx`

Expected: PASS.

**Step 4: Commit implementation**

```bash
git add src/components/YearlyGoals.jsx src/components/YearlyGoals.css src/__tests__/YearlyGoals.test.jsx
git commit -m "feat: use rich text editor for yearly vision"
```

### Task 5: Improve Yearly Image Enlarge UX + Validate

**Files:**
- Modify: `src/components/YearlyGoals.jsx`
- Modify: `src/components/YearlyGoals.css`
- Modify: `src/__tests__/YearlyGoals.test.jsx`

**Step 1: Implement lightbox reliability improvements**

- ensure click-to-open and click-to-close behavior is deterministic
- preserve Escape close behavior
- enforce responsive max width/height and overflow handling

Example CSS target:

```css
.yearly-goals-lightbox-img {
  max-width: min(96vw, 1200px);
  max-height: 88vh;
}
```

**Step 2: Run targeted tests**

Run: `npm run test:run -- src/__tests__/YearlyGoals.test.jsx src/__tests__/PlannerHabitsPanel.test.jsx`

Expected: PASS.

**Step 3: Commit lightbox polish**

```bash
git add src/components/YearlyGoals.jsx src/components/YearlyGoals.css src/__tests__/YearlyGoals.test.jsx
git commit -m "fix: improve yearly goals image enlarge interactions"
```

### Task 6: Full Verification and Final Integration Check

**Files:**
- Modify: touched files only if small fixes required

**Step 1: Run focused planner/goals suite**

Run: `npm run test:run -- src/__tests__/PlannerHabitsPanel.test.jsx src/__tests__/YearlyGoals.test.jsx src/__tests__/App.test.jsx`

Expected: PASS.

**Step 2: Run full test suite**

Run: `npm run test:run`

Expected: PASS (all test files green).

**Step 3: Run lint and evaluate scope impact**

Run: `npm run lint`

Expected: no new lint violations from touched files (repo may have pre-existing lint debt).

**Step 4: Final commit**

```bash
git add src/components/PlannerHabitsPanel.jsx src/components/PlannerHabitsPanel.css src/components/YearlyGoals.jsx src/components/YearlyGoals.css src/__tests__/PlannerHabitsPanel.test.jsx src/__tests__/YearlyGoals.test.jsx
git commit -m "feat: add planner habit time capture and yearly vision rich text"
```
