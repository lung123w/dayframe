# Project Management Tool - Developer Guide

## Project Overview

Single-user project management application with Outlook-style calendar interface for organizing tasks across multiple projects. Features recurring tasks, team member tracking, browser notifications, and offline-first persistence using IndexedDB.

**Purpose**: Personal task management tool with calendar views, drag-and-drop scheduling, and smart notifications for upcoming deadlines.

## Tech Stack

### Core Technologies
- **React 19.2** - UI framework with hooks-based architecture
- **Vite 8** - Build tool and dev server
- **Dexie 4.3** - IndexedDB wrapper for local persistence
- **date-fns 4.1** - Date manipulation and formatting

### UI Libraries
- **FullCalendar 6.1** - Calendar component with day/week/month/list views
- **react-icons 5.5** - Icon library (FaPlus, FaBell, etc.)

### Testing
- **Vitest 4** - Test runner with React Testing Library
- **jsdom** - DOM environment for tests

### Dev Tools
- **ESLint 9** - Code linting
- **Testing Library** - Component testing utilities

## Project Structure

### Core Directories

**`src/`** - Application source code
- [App.jsx](src/App.jsx) - Main app component with state management and view routing
- [db.js](src/db.js) - Dexie database schema and service layer for tasks/projects/members

**`src/components/`** - React components
- [Calendar.jsx](src/components/Calendar.jsx) - FullCalendar integration with recurring task expansion
- [TaskModal.jsx](src/components/TaskModal.jsx) - Task create/edit form with recurrence configuration
- [TeamManagement.jsx](src/components/TeamManagement.jsx) - Team member CRUD interface

**`src/utils/`** - Business logic utilities
- [recurrence.js](src/utils/recurrence.js) - Recurring task generation and date calculations
- [notifications.js](src/utils/notifications.js) - Browser notification service with background polling

**`src/__tests__/`** - Test suite
- Unit tests for components and utilities

### Key Files

- [package.json](package.json) - Dependencies and npm scripts
- [vite.config.js](vite.config.js) - Vite configuration with Vitest setup
- [eslint.config.js](eslint.config.js) - ESLint rules
- [index.html](index.html) - HTML entry point

## Essential Commands

### Development
```bash
npm install           # Install dependencies
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

### Testing
```bash
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI mode)
npm run test:ui      # Open Vitest UI
```

### Code Quality
```bash
npm run lint         # Run ESLint
```

## Data Architecture

### Database Schema
Three main tables defined in [db.js](src/db.js#L5-L9):
- **tasks** - Task details with recurrence patterns and image support
- **teamMembers** - Team member directory
- **projects** - Project metadata with color coding

### Key Models
- `Task` class - [db.js](src/db.js#L12-L28)
- `TeamMember` class - [db.js](src/db.js#L31-L39)
- `Project` class - [db.js](src/db.js#L42-L48)

### Service Pattern
CRUD operations exposed via service objects:
- `taskService` - [db.js](src/db.js#L51-L80)
- `teamMemberService` - [db.js](src/db.js#L82-L111)
- `projectService` - [db.js](src/db.js#L113-L140)

## Feature Implementation

### Recurring Tasks
- Pattern configuration in [TaskModal.jsx](src/components/TaskModal.jsx#L14-L22)
- Generation logic in [recurrence.js](src/utils/recurrence.js#L14-L46)
- Daily/weekly/monthly/yearly with end date or occurrence count

### Notifications
- Permission request on app load - [App.jsx](src/App.jsx#L21-L27)
- Background polling every 30 minutes - [notifications.js](src/notifications.js#L51-L64)
- Alerts for overdue, 1-hour warning, 24-hour reminder

### Image Support
- Paste images via Ctrl+V in task descriptions
- Base64 storage in `descriptionImages` array
- Paste handler in [TaskModal.jsx](src/components/TaskModal.jsx#L82-L94)

### Drag and Drop
- FullCalendar drag events handled in [Calendar.jsx](src/components/Calendar.jsx#L78-L89)
- Updates task due date via `taskService.update()`

## State Management

Centralized state in [App.jsx](src/App.jsx):
- Tasks, projects, and team members loaded from IndexedDB on mount ([App.jsx](src/App.jsx#L29-L49))
- Handlers passed down as props to child components
- Data reloaded after mutations to maintain consistency

## Browser Compatibility

Requires modern browser with:
- IndexedDB support (all current browsers)
- Notification API (optional feature)
- ES2015+ features

## Adding New Features
** IMPORTANT** : When you work on a new feauture/ bug , create a git branch first. Then work on change in that branch for the remainder of the session 

### Step-by-Step Process

1. **Database Schema Changes** (if needed)
   - Add fields to model classes in [db.js](src/db.js#L12-L48)
   - Update Dexie schema version and stores in [db.js](src/db.js#L5-L9)
   - Add migration logic if modifying existing tables

2. **Service Layer Updates**
   - Add new methods to relevant service objects in [db.js](src/db.js#L51-L140)
   - Follow CRUD pattern: `getAll()`, `getById()`, `create()`, `update()`, `delete()`
   - Maintain timestamp management (`createdAt`, `updatedAt`)

3. **Component Changes**
   - Update [App.jsx](src/App.jsx) state if adding new data entities
   - Modify or create components in `src/components/`
   - Add handlers in [App.jsx](src/App.jsx) and pass as props to children
   - Follow controlled component pattern for forms

4. **Utility Functions** (if needed)
   - Create pure functions in `src/utils/` for business logic
   - Keep utilities stateless and testable
   - Use date-fns for date operations

5. **Testing**
   - Add tests in `src/__tests__/` for new components or utilities
   - Run `npm test` during development
   - Ensure `npm run test:run` passes before committing

6. **UI Integration**
   - Update Calendar view if feature affects task display
   - Add navigation/buttons in [App.jsx](src/App.jsx#L117-L137) header if needed
   - Follow existing icon usage from react-icons

### Common Feature Patterns

**Adding a new data entity:**
- Create model class in [db.js](src/db.js)
- Create service object with CRUD methods
- Add state management in [App.jsx](src/App.jsx)
- Create component in `src/components/`

**Adding task properties:**
- Update `Task` model in [db.js](src/db.js#L12-L28)
- Modify [TaskModal.jsx](src/components/TaskModal.jsx) form
- Update task-to-event mapping in [Calendar.jsx](src/components/Calendar.jsx#L39-L72) if visual

**Adding calendar features:**
- Modify [Calendar.jsx](src/components/Calendar.jsx)
- Check FullCalendar docs for supported features
- Update event rendering in `renderEventContent()` method

## Bug Fixing

### Debugging Workflow

1. **Reproduce the Issue**
   - Run `npm run dev` and test in browser
   - Check browser console for errors (F12)
   - Look for React error boundaries or rendering issues

2. **Check Data Flow**
   - Verify database state using browser DevTools → Application → IndexedDB
   - Add `console.log()` to trace data through service → App → component
   - Check that `loadData()` is called after mutations - [App.jsx](src/App.jsx#L29-L49)

3. **Common Issue Areas**

   **State not updating:**
   - Ensure `loadData()` called after service mutations
   - Check `useEffect` dependencies are correct
   - Verify props passed correctly to child components

   **Date/time bugs:**
   - Check ISO string conversions
   - Verify timezone handling with date-fns
   - Look at recurring task generation logic - [recurrence.js](src/utils/recurrence.js)

   **Form issues:**
   - Check controlled component `value` and `onChange`
   - Verify form state initialization in `useEffect`
   - Ensure required fields validated

   **Calendar display problems:**
   - Check task-to-event transformation - [Calendar.jsx](src/components/Calendar.jsx#L39-L72)
   - Verify recurring task expansion - [Calendar.jsx](src/components/Calendar.jsx#L22-L33)
   - Inspect FullCalendar event structure

4. **Test the Fix**
   - Write/update test in `src/__tests__/` if applicable
   - Run `npm run test:run` to ensure no regressions
   - Test in browser with various edge cases
   - Run `npm run lint` to catch code issues

5. **Common Fixes**

   **IndexedDB issues:**
   - Clear browser data if schema changed
   - Check Dexie version migrations
   - Verify all async/await properly handled

   **Notification bugs:**
   - Check browser permission status
   - Verify polling interval in [notifications.js](src/utils/notifications.js#L51-L64)
   - Test notification cleanup on component unmount

   **Performance issues:**
   - Check if recurring task expansion generates too many instances
   - Verify no unnecessary re-renders (use React DevTools)
   - Look for missing `useEffect` dependencies causing loops

## Additional Documentation

For detailed architectural patterns and conventions observed in this codebase:

- [Architectural Patterns](.claude/docs/architectural_patterns.md) - Service layer pattern, component composition, data flow conventions

## Development Notes

- All dates stored as ISO strings for consistency
- Status values: `'todo'`, `'in-progress'`, `'completed'`
- Priority values: `'low'`, `'medium'`, `'high'`
- Default project ('General') auto-created if none exists - [App.jsx](src/App.jsx#L42-L48)
