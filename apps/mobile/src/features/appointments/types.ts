export interface Appointment {
  id: string;
  scheduledAt: string;
  durationMinutes?: number;
  type: string;
  status: string;
  reason?: string | null;
  provider?: {
    id?: string | null;
    email?: string | null;
    providerProfile?: {
      firstName?: string | null;
      lastName?: string | null;
      specialty?: string | null;
      consultationFee?: string | number | null;
    } | null;
  } | null;
  payment?: {
    id: string;
    status: string;
    amount?: string | number | null;
  } | null;
  telemedicineRoom?: {
    id: string;
    status: string;
    externalRoomId?: string | null;
  } | null;
  hospital?: {
    id: string;
    name?: string | null;
    address?: {
      line1?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  } | null;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
}
