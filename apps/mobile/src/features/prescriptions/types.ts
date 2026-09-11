export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  status: string;
  createdAt: string;
  signedAt?: string | null;
  notes?: string | null;
  items: PrescriptionItem[];
  provider?: {
    email?: string | null;
    providerProfile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
}
