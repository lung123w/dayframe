import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import teamMembersRouter from './routes/teamMembers.js';
import subtasksRouter from './routes/subtasks.js';
import habitsRouter from './routes/habits.js';
import habitEntriesRouter from './routes/habitEntries.js';
import weeklyObjectivesRouter from './routes/weeklyObjectives.js';
import dailyNotesRouter from './routes/dailyNotes.js';
import yearlyGoalsRouter from './routes/yearlyGoals.js';
import settingsRouter from './routes/settings.js';
import workflowStepsRouter from './routes/workflowSteps.js';
import workflowCompletionsRouter from './routes/workflowCompletions.js';
import keyEventsRouter from './routes/keyEvents.js';
import weeklyReviewsRouter from './routes/weeklyReviews.js';
import financialCardsRouter from './routes/financialCards.js';
import monthlyReviewsRouter from './routes/monthlyReviews.js';

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
app.use('/api/habit-entries', habitEntriesRouter);
app.use('/api/weekly-objectives', weeklyObjectivesRouter);
app.use('/api/daily-notes', dailyNotesRouter);
app.use('/api/yearly-goals', yearlyGoalsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/workflow-steps', workflowStepsRouter);
app.use('/api/workflow-completions', workflowCompletionsRouter);
app.use('/api/key-events', keyEventsRouter);
app.use('/api/weekly-reviews', weeklyReviewsRouter);
app.use('/api/financial-cards', financialCardsRouter);
app.use('/api/monthly-reviews', monthlyReviewsRouter);

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
