import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient, ApiClient } from '@/lib/api/client';

function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

export interface OrderablePrescription {
  id: string;
  status: string;
  signedAt?: string | null;
}

export function isOrderable(rx: OrderablePrescription): boolean {
  return Boolean(rx.signedAt) && rx.status === 'SIGNED';
}

export interface PharmacyAssignmentInput {
  prescriptionId: string;
  pharmacyId: string;
}

export class PrescriptionService {
  constructor(private readonly api: ApiClient = apiClient) {}

  detail(id: string): Promise<unknown> {
    return this.api.get(`${rel(GATEWAY_PATHS.prescriptionDetail)}/${id}`);
  }

  listPharmacies(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.pharmacyDirectory));
  }

  sendToPharmacy(input: PharmacyAssignmentInput): Promise<unknown> {
    return this.api.patch(
      `${rel(GATEWAY_PATHS.prescriptionDetail)}/${input.prescriptionId}/send-to-pharmacy`,
      { pharmacyId: input.pharmacyId }
    );
  }
}

export const prescriptionService = new PrescriptionService();
