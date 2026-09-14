export interface Appointment {
  id: string;
  scheduledAt: string;
  durationMinutes?: number;
  type: string;
  status: string;
  reason?: string | null;
  provider?: {
    email?: string | null;
    providerProfile?: {
      firstName?: string | null;
      lastName?: string | null;
      specialty?: string | null;
    } | null;
  } | null;
  telemedicineRoom?: {
    id: string;
    status: string;
    externalRoomId?: string | null;
  } | null;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
}
