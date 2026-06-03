## Context

`DailyWorkflow.jsx` is a collapsible checklist component embedded in `TodayView`. It uses a `collapsed` boolean state to toggle the body visibility. The header CSS rule `.dw-header { border-bottom: 1px solid transparent; }` means the separator between the header and body is always invisible — there is no visual divider when expanded, making the component look unpolished.

## Goals / Non-Goals

**Goals:**
- Show a visible bottom border on `.dw-header` only when the section is expanded
- Keep the header border hidden when collapsed (card edge provides sufficient boundary)
- Use minimal code changes — a single conditional CSS class is enough

**Non-Goals:**
- Redesigning the Daily Workflow component layout
- Changing colors, typography, or spacing
- Any behavior or data changes

## Decisions

**Conditional class via JSX, not JS style object**
Add a `dw-header--expanded` modifier class to `.dw-header` when `!collapsed`. Define the border in CSS on `.dw-header--expanded`. This keeps styling in CSS and logic minimal in JSX.

Alternative: inline style `borderBottom: collapsed ? 'none' : '1px solid ...'` — rejected, mixes styles with component logic unnecessarily.

## Risks / Trade-offs

- [Low] CSS variable `--border` may not be defined in all theme contexts → mitigated by fallback value `#E2E8F0` already used elsewhere in the file.
