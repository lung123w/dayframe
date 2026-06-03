## Why

The Daily Workflow component has a visual defect: when expanded, the header has no bottom border separating it from the task body (`border-bottom: 1px solid transparent`), making the UI look unfinished. When collapsed, the header-only card looks disconnected from the rest of the layout. This creates a poor first impression on the Today view.

## What Changes

- Fix `.dw-header` to show a visible bottom border when the section is expanded (not collapsed)
- When collapsed, suppress the bottom border so the card header renders cleanly as a standalone element
- Ensure the border color matches the card border (`var(--border, #E2E8F0)`) for visual consistency

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `daily-workflow-display`: The header separator border behavior changes — border is now visible when expanded, hidden when collapsed, using a CSS class toggle driven by the component's `collapsed` state.

## Impact

- `src/components/DailyWorkflow.css` — update `.dw-header` border-bottom rule
- `src/components/DailyWorkflow.jsx` — add conditional CSS class to `.dw-header` based on `collapsed` state
- No API or data model changes
- No test changes required (purely visual fix)
