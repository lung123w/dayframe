# Habit Heatmap Enhancement Design

**Date**: 2026-03-08
**Status**: Approved

## Summary

Make the habit tracker more intuitive by enlarging the GitHub-style heatmap, making it always visible, and removing the timer (stopwatch) feature while keeping manual time entry.

## Changes

### 1. Larger, Always-Visible Heatmap

- **HabitHeatmap.jsx**: Change `WEEKS_TO_SHOW` from 16 to 26 (6 months)
- **HabitHeatmap.css**: Increase cell size from 12px to 16px, gaps from 2px to 3px
- **HabitTracker.jsx**: Move `<HabitHeatmap>` from the expanded section to always render on each habit card (below the actions row)
- Update month label and day label sizing to match new cell dimensions

### 2. Remove Timer (Stopwatch) from UI

- **HabitTracker.jsx**: Remove timer state (`timerHabitId`, `timerSeconds`, `timerRef`), timer useEffect, `handleStartTimer`, `handleStopTimer`, `formatTimerDisplay`
- Remove Start/Stop timer button from habit card actions
- Remove `FaPlay`, `FaStop` icon imports
- Keep manual time input and `handleLogManualTime`
- Keep time-spent-today display

### 3. Update Expanded Section

- Move heatmap out of expanded section (always visible)
- Keep stats (current streak, best streak, total completions, total time) in expanded section
- Keep description in expanded section

## Files Modified

1. `src/components/HabitHeatmap.jsx` - Increase weeks to 26
2. `src/components/HabitHeatmap.css` - Larger cells (16px), larger gaps (3px), updated label sizing
3. `src/components/HabitTracker.jsx` - Remove timer, move heatmap outside expanded section
4. `src/components/HabitTracker.css` - Adjust layout for always-visible heatmap

## No Database Changes Required
