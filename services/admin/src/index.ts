import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler, initOpenAPI } from '@ricton/shared';
import * as Sentry from '@sentry/node';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT_ADMIN || 3010;

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// OpenAPI documentation
initOpenAPI(app, 'admin-service', 'Ricton Admin Portal API');

// Routes
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin', timestamp: new Date().toISOString() });
});

// Error handling
app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Admin Service running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
});

export default app;
