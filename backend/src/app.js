import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Routes
import authRoutes from './api/v1/routes/auth.routes.js';
import schemaRoutes from './api/v1/routes/schema.routes.js';
import queryRoutes from './api/v1/routes/query.routes.js';
import terminalRoutes from './api/v1/routes/terminal.routes.js';
import savedQueriesRoutes from './api/v1/routes/savedQueries.routes.js';
import chatRoutes from './api/v1/routes/chat.routes.js';
import settingsRoutes from './api/v1/routes/settings.routes.js';
import { requireAuth } from './api/v1/middlewares/auth.middleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/schema', requireAuth, schemaRoutes);
app.use('/api/query', requireAuth, queryRoutes);
app.use('/api/terminal', requireAuth, terminalRoutes);
app.use('/api/saved-queries', requireAuth, savedQueriesRoutes);
app.use('/api/chat-history', requireAuth, chatRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SQL Query Generator Backend is running.' });
});

export default app;
