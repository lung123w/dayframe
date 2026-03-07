import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import teamMembersRouter from './routes/teamMembers.js';
import subtasksRouter from './routes/subtasks.js';
import habitsRouter from './routes/habits.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' })); // large limit for base64 images

// API routes
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/subtasks', subtasksRouter);
app.use('/api/habits', habitsRouter);

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
