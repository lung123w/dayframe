# Planner UX Fixes + Habit Window Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix planner description rendering and week-view behavior, add a daily habits window on the planner page, enable direct inline progress updates, and make backlog include overdue pending tasks while keeping due dates.

**Architecture:** Keep changes localized to planner/habit UI components and existing API services. Normalize planner status behavior to `pending/completed` (with compatibility fallback for legacy `todo/in-progress`) to eliminate inconsistent task state behavior. Add one lightweight planner-only habits component rather than embedding full `HabitTracker`.

**Tech Stack:** React 19, date-fns, Vitest + Testing Library, existing Express API services (`taskService`, `subtaskService`, `habitService`, `habitEntryService`)

---

### Task 1: Create Branch + Baseline Validation

**Files:**
- Modify: none (git workflow only)

1. Create feature branch and isolated worktree.
2. Run baseline tests and capture current state.

### Task 2: Fix Description Rendering + Status Normalization in Day Cards

**Files:**
- Modify: `src/components/DayColumn.jsx`
- Test: `src/__tests__/DayColumn.test.jsx`

1. Add failing tests for description rendering and pending/completed status cycle.
2. Implement minimal DayColumn changes.
3. Re-run targeted tests.

### Task 3: Add Planner Daily Habits Window (Left Rail)

**Files:**
- Create: `src/components/PlannerHabitsPanel.jsx`
- Create: `src/components/PlannerHabitsPanel.css`
- Modify: `src/components/DailyPlanner.jsx`
- Test: `src/__tests__/PlannerHabitsPanel.test.jsx`

1. Add failing tests for today habit load/toggle.
2. Implement compact panel and wire into planner left rail.
3. Re-run targeted tests.

### Task 4: Fix Weekly Mini Calendar to Always Use Current Week

**Files:**
- Modify: `src/components/DailyPlanner.jsx`
- Modify: `src/components/MiniWeekBar.jsx`
- Test: `src/__tests__/MiniWeekBar.test.jsx`

1. Add failing tests for current-week anchor behavior.
2. Implement week anchoring from today.
3. Re-run targeted tests.

### Task 5: Backlog Enhancement for Overdue Pending Tasks

**Files:**
- Modify: `src/components/BacklogSidebar.jsx`
- Test: `src/__tests__/BacklogSidebar.test.jsx`

1. Add failing tests for overdue pending visibility.
2. Implement overdue-aware display filtering.
3. Re-run targeted tests.

### Task 6: Full Verification + Cleanup

**Files:**
- Modify: touched files only as needed

1. Run targeted planner tests.
2. Run full test suite.
3. Run lint.
4. Fix any failures and re-run.
