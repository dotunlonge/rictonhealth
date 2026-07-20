import express from 'express';
import { errorHandler } from '@ricton/shared';
import subscriptionRoutes from './routes/subscription.routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'subscription-service' });
});

// Subscription routes
app.use('/api/subscriptions', subscriptionRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT_SUBSCRIPTION || 3009;

app.listen(PORT, () => {
  console.log(`💎 Subscription Service running on port ${PORT}`);
});

export default app;
