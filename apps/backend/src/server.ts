import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { courseRoutes } from './routes/courses';
import { userRoutes } from './routes/users';
import { trackingRoutes } from './routes/tracking';
import { webhookRoutes } from './routes/webhooks';
import { plannerRoutes } from './routes/planner';
import { adminRoutes } from './routes/admin';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Webhook route must be before body parsing middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
