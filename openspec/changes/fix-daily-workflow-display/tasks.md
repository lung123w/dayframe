## 1. CSS Fix

- [x] 1.1 Add `.dw-header--expanded` CSS rule to `DailyWorkflow.css` with `border-bottom: 1px solid var(--border, #E2E8F0)`
- [x] 1.2 Change existing `.dw-header` `border-bottom` from `transparent` to `none`

## 2. JSX Fix

- [x] 2.1 Update `.dw-header` className in `DailyWorkflow.jsx` to conditionally include `dw-header--expanded` when `!collapsed`

## 3. Verification

- [x] 3.1 Verify expanded state shows a visible border between header and task list
- [x] 3.2 Verify collapsed state shows no border (clean card header)
- [x] 3.3 Run `npm run test:run` to confirm no regressions
