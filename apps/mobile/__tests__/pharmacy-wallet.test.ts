/** Phase 5 TDD RED: server-authoritative pharmacy checkout + wallet top-up verify. */
import { PharmacyService, isTerminalOrder } from '@/features/pharmacy/pharmacy-service';
import { WalletService } from '@/features/wallet/wallet-service';
import type { ApiClient } from '@/lib/api/client';

function api() {
  return { get: jest.fn(), post: jest.fn(), patch: jest.fn() } as unknown as ApiClient;
}

describe('pharmacy checkout', () => {
  it('browses products with search + pagination', async () => {
    const a = api();
    (a.get as jest.Mock).mockResolvedValue({ products: [], meta: { total: 0 } });
    const s = new PharmacyService(a);
    await s.browseProducts({ search: 'para', limit: 20, offset: 0 });
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('/products'));
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('search=para'));
  });

  it('creates orders with idempotency and trusts server totals only', async () => {
    const a = api();
    (a.post as jest.Mock).mockResolvedValue({
      id: 'ord-1',
      totalAmount: '4500.00',
      status: 'PLACED',
    });
    const s = new PharmacyService(a);
    const order = await s.checkout(
      {
        items: [{ productId: 'prod-1', quantity: 2 }],
        deliveryType: 'DELIVERY',
        deliveryAddress: '1 Marina Road, Lagos',
      },
      { idempotencyKey: 'ord-key-1' }
    );
    expect(order).toMatchObject({ totalAmount: '4500.00', status: 'PLACED' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      {
        items: [{ productId: 'prod-1', quantity: 2 }],
        deliveryType: 'DELIVERY',
        deliveryAddress: '1 Marina Road, Lagos',
      },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'ord-key-1' }),
      })
    );
  });

  it('maps terminal tracking states', () => {
    expect(isTerminalOrder('DELIVERED')).toBe(true);
    expect(isTerminalOrder('CANCELLED')).toBe(true);
    expect(isTerminalOrder('IN_TRANSIT')).toBe(false);
  });

  it('lists orders and cancels placed ones', async () => {
    const a = api();
    (a.get as jest.Mock).mockResolvedValue({ orders: [], total: 0 });
    (a.patch as jest.Mock).mockResolvedValue({ id: 'ord-1', status: 'CANCELLED' });
    const s = new PharmacyService(a);
    await s.listOrders({ status: 'PLACED' });
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('/orders'));
    await expect(s.cancelOrder('ord-1')).resolves.toMatchObject({ status: 'CANCELLED' });
    expect(a.patch).toHaveBeenCalledWith(
      expect.stringContaining('/orders/ord-1/cancel'),
      expect.anything()
    );
  });
});

describe('wallet top-up', () => {
  it('launches provider-hosted checkout without local credit', async () => {
    const a = api();
    (a.post as jest.Mock).mockResolvedValue({
      checkoutUrl: 'https://paystack/checkout',
      reference: 'ref-1',
    });
    const s = new WalletService(a);
    const res = await s.launchTopUp({ amount: 5000 });
    expect(res).toMatchObject({ checkoutUrl: expect.stringContaining('http') });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/topup'),
      expect.objectContaining({ amount: 5000 })
    );
  });

  it('verifies returns via server reconciliation', async () => {
    const a = api();
    (a.get as jest.Mock).mockResolvedValue({ status: 'SUCCESS', balance: 15000 });
    const s = new WalletService(a);
    await expect(s.verifyTopUp({ reference: 'ref-1' })).resolves.toMatchObject({
      status: 'SUCCESS',
    });
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('ref-1'));
  });
});
