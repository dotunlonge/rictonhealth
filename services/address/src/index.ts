import express from 'express';
import { errorHandler } from '@ricton/shared';
import addressRoutes from './routes/address.routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'address-service' });
});

// Address routes
app.use('/api/addresses', addressRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT_ADDRESS || 3007;

app.listen(PORT, () => {
  console.log(`🏠 Address Service running on port ${PORT}`);
});

export default app;
