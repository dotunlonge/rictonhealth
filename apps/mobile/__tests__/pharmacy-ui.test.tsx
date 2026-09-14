/** B3 TDD RED: pharmacy catalog/detail/cart/checkout/tracking (component, mocked service). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ productId: 'prod-1', orderId: 'ord-1' }),
}));

jest.mock('@/features/pharmacy/pharmacy-service', () => ({
  pharmacyService: {
    browseProducts: jest.fn(),
    productDetail: jest.fn(),
    checkout: jest.fn(),
    trackOrder: jest.fn(),
    listOrders: jest.fn(),
    cancelOrder: jest.fn(),
  },
  isTerminalOrder: (status: string) => status === 'DELIVERED' || status === 'CANCELLED',
}));

import { pharmacyService } from '@/features/pharmacy/pharmacy-service';
import { cartStore } from '@/features/pharmacy/cart-store';
import CatalogScreen from '../app/(app)/pharmacy/index';
import ProductDetailScreen from '../app/(app)/pharmacy/[productId]';
import CartScreen from '../app/(app)/pharmacy/cart';
import CheckoutScreen from '../app/(app)/pharmacy/checkout';
import OrderTrackingScreen from '../app/(app)/pharmacy/orders/[orderId]';

const svc = pharmacyService as unknown as Record<string, jest.Mock>;

const PROD = {
  id: 'prod-1',
  name: 'E2E Paracetamol 500mg',
  price: '1500.00',
  stock: 5,
  requiresPrescription: false,
  pharmacyId: 'pharm-1',
  pharmacy: { pharmacyProfile: { pharmacyName: 'E2E Pharmacy' } },
};

beforeEach(() => {
  jest.clearAllMocks();
  cartStore.clear();
});

describe('pharmacy catalog', () => {
  it('searches and lists products', async () => {
    svc.browseProducts.mockResolvedValue({ products: [PROD], total: 1, limit: 20, offset: 0 });
    await render(<CatalogScreen />);
    await fireEvent.changeText(screen.getByTestId('pharmacy.search'), 'para');
    await waitFor(() =>
      expect(svc.browseProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'para' }))
    );
    expect(await screen.findByText(/Paracetamol/)).toBeTruthy();
  });

  it('shows an empty state when nothing matches', async () => {
    svc.browseProducts.mockResolvedValue({ products: [], total: 0, limit: 20, offset: 0 });
    await render(<CatalogScreen />);
    expect(await screen.findByTestId('pharmacy.empty')).toBeTruthy();
  });
});

describe('pharmacy cart', () => {
  it('caps quantity at available stock', async () => {
    svc.productDetail.mockResolvedValue({ ...PROD, stock: 1 });
    await render(<ProductDetailScreen />);
    expect(await screen.findByTestId('pharmacy.detail')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pharmacy.qty-plus'));
    await fireEvent.press(screen.getByTestId('pharmacy.qty-plus'));
    expect(screen.getByTestId('pharmacy.qty-value').props.children).toBe(1);
    await fireEvent.press(screen.getByTestId('pharmacy.add'));
    await render(<CartScreen />);
    expect(await screen.findByText(/Paracetamol/)).toBeTruthy();
  });

  it('requires a delivery address for home delivery', async () => {
    cartStore.add({ ...PROD, stock: 5 }, 1);
    svc.checkout.mockResolvedValue({ id: 'ord-1', totalAmount: '1500.00', status: 'PLACED' });
    await render(<CheckoutScreen />);
    await fireEvent.press(screen.getByTestId('pharmacy.fulfillment-delivery'));
    await fireEvent.press(screen.getByTestId('pharmacy.place-order'));
    expect(await screen.findByTestId('pharmacy.address-error')).toBeTruthy();
    expect(svc.checkout).not.toHaveBeenCalled();
  });

  it('places the order once with an idempotency key', async () => {
    cartStore.add({ ...PROD, stock: 5 }, 1);
    svc.checkout.mockResolvedValue({ id: 'ord-1', totalAmount: '1500.00', status: 'PLACED' });
    await render(<CheckoutScreen />);
    await fireEvent.changeText(screen.getByTestId('pharmacy.address'), '1 Marina Road, Lagos');
    await fireEvent.press(screen.getByTestId('pharmacy.place-order'));
    await waitFor(() =>
      expect(svc.checkout).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryType: 'DELIVERY' }),
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    );
    expect(svc.checkout).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('pharmacy.order-placed')).toBeTruthy();
  });
});

describe('order tracking', () => {
  it('cancels placed orders and hides cancel for delivered ones', async () => {
    svc.trackOrder.mockResolvedValue({
      id: 'ord-1',
      status: 'PLACED',
      totalAmount: '1500.00',
      items: [],
    });
    svc.cancelOrder.mockResolvedValue({ id: 'ord-1', status: 'CANCELLED' });
    const first = await render(<OrderTrackingScreen />);
    expect(await screen.findByTestId('pharmacy.tracking')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pharmacy.cancel'));
    await waitFor(() => expect(svc.cancelOrder).toHaveBeenCalledWith('ord-1'));
    first.unmount();

    svc.trackOrder.mockResolvedValue({
      id: 'ord-2',
      status: 'DELIVERED',
      totalAmount: '1500.00',
      items: [],
    });
    await render(<OrderTrackingScreen />);
    await screen.findByTestId('pharmacy.tracking');
    await waitFor(() => expect(screen.queryByTestId('pharmacy.cancel')).toBeNull());
  });
});
