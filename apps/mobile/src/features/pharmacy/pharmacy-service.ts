import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient, ApiClient } from '@/lib/api/client';

function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

export interface BrowseQuery {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  items: CheckoutItem[];
  deliveryType: 'PICKUP' | 'DELIVERY';
  /** Free-text address; required by backend for DELIVERY. */
  deliveryAddress?: string;
  prescriptionId?: string;
  notes?: string;
}

const TERMINAL = new Set(['DELIVERED', 'CANCELLED']);

export interface PharmacyOrderResult {
  id: string;
  totalAmount: number | string;
  status: string;
}

export function isTerminalOrder(status: string): boolean {
  return TERMINAL.has(status);
}

export interface OrderPaymentLaunch {
  authorization_url: string;
  reference: string;
  paymentId: string;
}

export interface OrderPaymentVerification {
  status: string;
}

export class PharmacyService {
  constructor(private readonly api: ApiClient = apiClient) {}

  browseProducts(query: BrowseQuery = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    params.set('limit', String(query.limit ?? 20));
    params.set('offset', String(query.offset ?? 0));
    return this.api.get(`${rel(GATEWAY_PATHS.pharmacyProducts)}?${params.toString()}`);
  }

  productDetail(id: string): Promise<unknown> {
    return this.api.get(`${rel(GATEWAY_PATHS.pharmacyProducts)}/${id}`);
  }

  /** Server calculates totals/stock; client must not send `total`. */
  checkout(
    input: CheckoutInput,
    options: { idempotencyKey: string }
  ): Promise<PharmacyOrderResult> {
    return this.api.post<PharmacyOrderResult>(
      rel(GATEWAY_PATHS.pharmacyOrders),
      {
        items: input.items,
        deliveryType: input.deliveryType,
        ...(input.deliveryAddress !== undefined ? { deliveryAddress: input.deliveryAddress } : {}),
        ...(input.prescriptionId ? { prescriptionId: input.prescriptionId } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
      },
      { headers: { 'Idempotency-Key': options.idempotencyKey } }
    );
  }

  trackOrder(id: string): Promise<unknown> {
    return this.api.get(`${rel(GATEWAY_PATHS.pharmacyOrders)}/${id}`);
  }

  listOrders(query: { status?: string; limit?: number; offset?: number } = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    params.set('limit', String(query.limit ?? 20));
    params.set('offset', String(query.offset ?? 0));
    return this.api.get(`${rel(GATEWAY_PATHS.pharmacyOrders)}?${params.toString()}`);
  }

  /** Only PLACED orders can be cancelled (backend restocks transactionally). */
  cancelOrder(id: string): Promise<unknown> {
    return this.api.patch(`${rel(GATEWAY_PATHS.pharmacyOrders)}/${id}/cancel`, {});
  }

  /**
   * Provider-hosted pharmacy checkout. Amount is server-resolved from the
   * order total; the client only passes type + referenceId. Initializes a
   * Paystack transaction and links the pending payment to the order.
   */
  initiateOrderPayment(input: { orderId: string; email?: string }): Promise<OrderPaymentLaunch> {
    return this.api.post<OrderPaymentLaunch>(rel(GATEWAY_PATHS.paymentInitialize), {
      type: 'PHARMACY_ORDER',
      referenceId: input.orderId,
      ...(input.email ? { email: input.email } : {}),
    });
  }

  /** Reconcile a provider return against server state. */
  verifyOrderPayment(reference: string): Promise<OrderPaymentVerification> {
    return this.api.get<OrderPaymentVerification>(
      `${rel(GATEWAY_PATHS.paymentVerify)}/${reference}`
    );
  }
}

export const pharmacyService = new PharmacyService();
