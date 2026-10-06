import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('wallet-funded consultation contract', () => {
  it('exposes an idempotent wallet settlement route for appointments', () => {
    const routes = read('services/payment/src/routes/payment.routes.ts');
    expect(routes).toMatch(/appointments\/:appointmentId\/wallet/);
    expect(routes).toMatch(/idempotency\(prisma\)/);
  });

  it('writes debit, successful payment, appointment, and earning as one transaction', () => {
    const controller = read('services/payment/src/controllers/payment.controller.ts');
    const start = controller.indexOf('export const payAppointmentWithWallet');
    const end = controller.indexOf('export const verifyPayment');
    const body = controller.slice(start, end);
    expect(body).toMatch(/prisma\.\$transaction/);
    expect(body).toMatch(/balance:\s*\{\s*gte:\s*amount\s*\}/);
    expect(body).toMatch(/WalletTransactionType\.DEBIT/);
    expect(body).toMatch(/PaymentProvider\.WALLET/);
    expect(body).toMatch(/PaymentStatus\.SUCCESS/);
    expect(body).toMatch(/AppointmentStatus\.CONFIRMED/);
    expect(body).toMatch(/providerEarning\.upsert/);
  });

  it('offers wallet settlement alongside Paystack on web and mobile', () => {
    expect(read('apps/web/src/app/appointments/page.tsx')).toMatch(/Pay from wallet/);
    expect(read('apps/mobile/app/(app)/(tabs)/appointments.tsx')).toMatch(/Use wallet/);
  });
});
