import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#3788d8',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    descriptionImages TEXT NOT NULL DEFAULT '[]',
    dueDate TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    projectId INTEGER,
    assignedTo TEXT NOT NULL DEFAULT '[]',
    isRecurring INTEGER NOT NULL DEFAULT 0,
    recurrencePattern TEXT,
    statusOverrides TEXT NOT NULL DEFAULT '{}',
    statusFromOverrides TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parentTaskId INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parentTaskId) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#10B981',
    frequency TEXT NOT NULL DEFAULT '{"type":"daily"}',
    isArchived INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habit_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habitId INTEGER NOT NULL,
    date TEXT NOT NULL,
    timeSpentSeconds INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE(habitId, date)
  );

  CREATE TABLE IF NOT EXISTS weekly_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekStart TEXT NOT NULL,
    objectives TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(weekStart)
  );

  CREATE TABLE IF NOT EXISTS daily_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    highlights TEXT NOT NULL DEFAULT '',
    rolledOverTaskIds TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(date)
  );

  CREATE TABLE IF NOT EXISTS yearly_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    goals TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(year)
  );
`);

// Migrate weekly objectives to object format
try {
  const objectives = db.prepare('SELECT * FROM weekly_objectives').all();
  for (const row of objectives) {
    try {
      const parsed = JSON.parse(row.objectives);
      // Check if already migrated (first item is object)
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        const migrated = parsed.map(text => ({ text, completed: false }));
        db.prepare('UPDATE weekly_objectives SET objectives = ? WHERE id = ?')
          .run(JSON.stringify(migrated), row.id);
      }
    } catch (e) {
      // Skip if parsing fails
    }
  }
} catch (e) {
  // Table might not exist yet, skip migration
}

// Migrate task status: todo/in-progress → pending
db.exec(`
  UPDATE tasks SET status = 'pending' WHERE status = 'todo';
  UPDATE tasks SET status = 'pending' WHERE status = 'in-progress';
`);

// Migrations — add columns safely
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN estimatedMinutes INTEGER DEFAULT NULL`);
} catch (e) {
  // Column already exists — ignore
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN sortOrder INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN startTime TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN endTime TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE yearly_goals ADD COLUMN images TEXT NOT NULL DEFAULT '[]'`);
} catch (e) {
  // Column already exists
}

export default db;
