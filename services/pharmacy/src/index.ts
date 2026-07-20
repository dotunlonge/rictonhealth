import express from 'express';
import pharmacyRoutes from './routes/pharmacy.routes';

const app = express();

app.use('/api/pharmacy', pharmacyRoutes);

const PORT = process.env.PHARMACY_PORT || 4008;

app.listen(PORT, () => {
  console.log(`🏥 Pharmacy Service running on port ${PORT}`);
});

export default app;
