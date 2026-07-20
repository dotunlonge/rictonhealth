import express from 'express';
import notificationRoutes from './routes/notification.routes';

const app = express();

app.use('/api/notifications', notificationRoutes);

const PORT = process.env.NOTIFICATION_PORT || 4009;

app.listen(PORT, () => {
  console.log(`🔔 Notification Service running on port ${PORT}`);
});

export default app;
