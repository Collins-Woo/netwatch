import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tasksRouter from './routes/tasks.js';
import nodesRouter from './routes/nodes.js';
import alertsRouter from './routes/alerts.js';
import statusRouter from './routes/status.js';
import historyRouter from './routes/history.js';
import usersRouter from './routes/users.js';
import { requestLogger } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/nodes', nodesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/status', statusRouter);
app.use('/api/history', historyRouter);

// User management & Auth routes
app.use('/api/auth', usersRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit', usersRouter);

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./config/database.js');

    const [tasksResult, nodesResult, alertsResult] = await Promise.all([
      supabaseAdmin.from('tasks').select('*', { count: 'exact' }),
      supabaseAdmin.from('nodes').select('*', { count: 'exact' }),
      supabaseAdmin.from('alerts').select('*').eq('acknowledged', false)
    ]);

    const onlineNodes = await supabaseAdmin
      .from('nodes')
      .select('*')
      .eq('status', 'online')
      .eq('enabled', true);

    const activeTasks = await supabaseAdmin
      .from('tasks')
      .select('availability')
      .eq('enabled', true)
      .not('availability', 'is', null);

    const avgAvailability = activeTasks.data.length > 0
      ? Math.round(activeTasks.data.reduce((sum, t) => sum + (t.availability || 0), 0) / activeTasks.data.length)
      : 0;

    res.json({
      totalTasks: tasksResult.count || 0,
      onlineNodes: onlineNodes.data?.length || 0,
      totalNodes: nodesResult.count || 0,
      currentAlerts: alertsResult.data?.length || 0,
      avgAvailability
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`NetWatch Backend API running on port ${PORT}`);
});

export default app;
