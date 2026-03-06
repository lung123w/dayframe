# Architectural Patterns

This document describes the architectural patterns, design decisions, and conventions consistently applied throughout the codebase.

## Service Layer Pattern

### Overview
Data access abstracted through service objects that encapsulate Dexie database operations. Services provide consistent CRUD interfaces and hide IndexedDB complexity from components.

### Implementation
Defined in [db.js](../src/db.js):
- `taskService` - [db.js](../src/db.js#L51-L80)
- `teamMemberService` - [db.js](../src/db.js#L82-L111)
- `projectService` - [db.js](../src/db.js#L113-L140)

### Service API Convention
All services expose standardized methods:
```javascript
{
  async getAll()           // Fetch all records
  async getById(id)        // Fetch single record
  async create(data)       // Create new record
  async update(id, updates) // Update existing record
  async delete(id)         // Delete record
}
```

### Timestamp Management
Services automatically manage timestamps:
- `createdAt` set on create - [db.js](../src/db.js#L63)
- `updatedAt` set on update - [db.js](../src/db.js#L68)
- ISO string format for consistency

### Model Classes
Domain models define default values and structure:
- `Task` - [db.js](../src/db.js#L12-L28)
- `TeamMember` - [db.js](../src/db.js#L31-L39)
- `Project` - [db.js](../src/db.js#L42-L48)

Used in service `create()` methods to ensure data consistency.

## Component Composition

### Container/Presentation Pattern
**Container Component**: [App.jsx](../src/App.jsx)
- Manages global state (tasks, projects, team members)
- Handles data loading and mutations
- Passes data and callbacks to child components

**Presentation Components**: 
- [Calendar.jsx](../src/components/Calendar.jsx) - Renders calendar view
- [TaskModal.jsx](../src/components/TaskModal.jsx) - Task form UI
- [TeamManagement.jsx](../src/components/TeamManagement.jsx) - Team member list and form

### Props Flow
Unidirectional data flow from App to children:
```
App (state) 
  └─> Calendar (read-only props + callbacks)
  └─> TaskModal (read-only props + callbacks)
  └─> TeamManagement (read-only props + callbacks)
```

Components call parent callbacks to trigger mutations, parent reloads data.

## State Management Conventions

### Local State in Modals
Forms use local state (`useState`) to manage temporary input:
- [TaskModal.jsx](../src/components/TaskModal.jsx#L7-L23) - Form data state
- [TeamManagement.jsx](../src/components/TeamManagement.jsx#L6-L11) - Form state

### State Synchronization Pattern
After mutations, components reload data from database:
```javascript
await service.create(data);
await loadData(); // Refresh state from DB
```
Example: [App.jsx](../src/App.jsx#L70-L76)

This ensures UI reflects latest database state and handles edge cases.

### Effect Dependencies
`useEffect` hooks specify proper dependencies for data loading:
- [App.jsx](../src/App.jsx#L19-L27) - Load data on mount
- [Calendar.jsx](../src/components/Calendar.jsx#L13-L37) - Regenerate events when data changes

## Data Flow Architecture

### Load → Render → Mutate → Reload Cycle

1. **Initial Load**: App loads all data from IndexedDB on mount - [App.jsx](../src/App.jsx#L29-L49)
2. **Pass Down**: Data passed as props to child components
3. **User Action**: Child component calls callback (e.g., `onSave`, `onDelete`)
4. **Mutation**: Callback executes service method
5. **Reload**: App reloads data from database
6. **Re-render**: Components receive updated props

### Promise-Based Async Pattern
All database operations are async/await:
- Service methods return Promises
- Component handlers are async functions
- Parallel loads with `Promise.all()` - [App.jsx](../src/App.jsx#L30-L33)

## Utility Module Pattern

### Pure Function Utilities
Stateless utility modules export pure functions:

**Recurrence Logic** - [recurrence.js](../src/utils/recurrence.js)
- `generateRecurringTasks()` - [recurrence.js](../src/utils/recurrence.js#L14-L46)
- `getNextOccurrence()` - [recurrence.js](../src/utils/recurrence.js#L48-L67)
- Pure date calculations with date-fns

**Notifications** - [notifications.js](../src/utils/notifications.js)
- `requestNotificationPermission()` - [notifications.js](../src/utils/notifications.js#L1-L5)
- `showNotification()` - [notifications.js](../src/utils/notifications.js#L7-L14)
- `checkUpcomingTasks()` - [notifications.js](../src/utils/notifications.js#L16-L50)

### Side Effect Isolation
Side effects (notifications, intervals) isolated in utility modules, not scattered across components.

## Event Handling Conventions

### Callback Naming
Consistent naming for event handlers:
- `onSave` - Save/submit actions
- `onDelete` - Delete actions  
- `onChange` - Input changes
- `onClick` - Click events
- `onClose` - Close/cancel actions

Example: [TaskModal.jsx](../src/components/TaskModal.jsx#L6)

### Event Handler Pattern
Components define internal handlers that call prop callbacks:
```javascript
const handleSave = async () => {
  // Local logic
  await onSave(data); // Call parent callback
};
```

## Data Transformation Patterns

### Task to Calendar Event Mapping
Calendar component transforms task data to FullCalendar events:
- [Calendar.jsx](../src/components/Calendar.jsx#L39-L72)
- Applies color coding based on status, priority, project
- Maps task properties to event extended props

### Recurring Task Expansion
Before rendering, recurring tasks expanded to individual instances:
- [Calendar.jsx](../src/components/Calendar.jsx#L22-L33)
- Uses `generateRecurringTasks()` with view date range
- Each instance gets unique ID combining task ID and date

## Form State Management

### Controlled Components
All form inputs use controlled component pattern:
- Value from state: `value={formData.field}`
- Update via onChange: `onChange={(e) => setFormData({...formData, field: e.target.value})}`

Example: [TaskModal.jsx](../src/components/TaskModal.jsx#L47-L56)

### Form Initialization
Forms initialize from props on mount:
```javascript
useEffect(() => {
  if (task) {
    setFormData({...task, /* transformations */});
  }
}, [task]);
```

Example: [TaskModal.jsx](../src/components/TaskModal.jsx#L25-L45)

## Error Handling Patterns

### User Confirmation for Destructive Actions
Delete operations require confirmation:
- [App.jsx](../src/App.jsx#L84) - Task deletion
- [TeamManagement.jsx](../src/components/TeamManagement.jsx#L42) - Member deletion

### Drag-and-Drop Error Recovery
Calendar drag events include revert on error:
- [Calendar.jsx](../src/components/Calendar.jsx#L78-L89)
- Calls `info.revert()` if update fails

## Dependency Injection

### Service Import Pattern
Services imported at module level and used throughout:
```javascript
import { taskService, teamMemberService, projectService } from './db';
```
Example: [App.jsx](../src/App.jsx#L5)

No global state or singleton initialization required. Services are stateless objects.

## Testing Conventions

Test files co-located in `src/__tests__/`:
- Component tests: `ComponentName.test.jsx`
- Utility tests: `utilName.test.js`

Setup file for test environment: [setupTests.js](../src/setupTests.js)

## CSS Organization

Component-scoped stylesheets:
- Each component has matching CSS file (e.g., `Calendar.jsx` + `Calendar.css`)
- Global styles in [App.css](../src/App.css) and [index.css](../src/index.css)
- No CSS-in-JS or CSS modules used

## Constants and Magic Values

### Status Values
- `'todo'` - Not started
- `'in-progress'` - Work in progress
- `'completed'` - Finished

### Priority Values
- `'low'` - Low priority
- `'medium'` - Normal priority (default)
- `'high'` - High priority

### Recurrence Types
- `'daily'` - Daily recurrence
- `'weekly'` - Weekly recurrence
- `'monthly'` - Monthly recurrence
- `'yearly'` - Yearly recurrence

### Notification Timing
- Overdue: immediate alert
- 1 hour warning: tasks due within 60 minutes
- 24 hour reminder: tasks due within 24 hours
- Check interval: every 30 minutes - [notifications.js](../src/utils/notifications.js#L56)

## Design Decisions

### Why IndexedDB (Dexie)?
- Offline-first: works without network
- Large storage capacity for images
- No server/backend required
- Survives cache clearing

### Why FullCalendar?
- Rich feature set (multiple views, drag-drop)
- Outlook-like familiar interface
- Good React integration
- Handles complex date rendering

### Why Local State in Modals?
- Form state is ephemeral (discarded on close)
- Reduces parent component complexity
- Allows form validation before submission
- Standard React form pattern

### Why Service Layer?
- Decouples UI from database implementation
- Centralizes data access logic
- Easier to test in isolation
- Could swap storage backend without changing components

### Why Recurring Task Expansion?
- FullCalendar expects discrete events, not patterns
- Allows per-instance customization (e.g., drag one occurrence)
- Simplifies rendering logic
- Matches user mental model (seeing all dates)
