import { create } from 'zustand';
import { api } from '@/lib/api-client';

export type UserRole =
  | 'PATIENT'
  | 'CONSULTANT'
  | 'PHARMACIST'
  | 'HOSPITAL_ADMIN'
  | 'SUPER_ADMIN'
  | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  patientProfile?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  providerProfile?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    specialization?: string;
  };
}

export interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  durationMinutes?: number;
}

export interface Prescription {
  id: string;
  patientName: string;
  doctor: string;
  medication: string;
  dosage: string;
  frequency: string;
  strength: string;
  form: string;
  quantity: number;
  date: string;
  status: 'Pending' | 'Delivered' | 'Filled';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface AppState {
  user: UserProfile | null;
  appointments: Appointment[];
  prescriptions: Prescription[];
  notifications: NotificationItem[];
  walletBalance: number;
  rewardsPoints: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUser: () => Promise<UserProfile | null>;
  fetchAppointments: () => Promise<void>;
  fetchPrescriptions: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchWallet: () => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
}

function getInitialCachedUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('ricton_user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: getInitialCachedUser(),
  appointments: [
    {
      id: 'APT-1001',
      patientName: 'Alex Johnson',
      doctorName: 'Dr. Oluwaseun Davies',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      type: 'General Consultation',
      status: 'CONFIRMED',
      durationMinutes: 60,
    },
    {
      id: 'APT-1002',
      patientName: 'Sarah Connor',
      doctorName: 'Dr. Fatima Abubakar',
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      type: 'Ophthalmology Review',
      status: 'PENDING',
      durationMinutes: 45,
    },
  ],
  prescriptions: [
    {
      id: 'RX-101',
      patientName: 'Helen Olaleye',
      doctor: 'Dr. Adebayo Ogunlesi',
      medication: 'Amoxicillin Trihydrate',
      dosage: '500mg',
      frequency: '3 times daily (8 hourly)',
      strength: '500mg',
      form: 'Capsule',
      quantity: 21,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'Delivered',
    },
    {
      id: 'RX-102',
      patientName: 'James Carter',
      doctor: 'Dr. Chioma Nnadi',
      medication: 'Metformin Hydrochloride',
      dosage: '850mg',
      frequency: '2 times daily with meals',
      strength: '850mg',
      form: 'Tablet',
      quantity: 60,
      date: new Date(Date.now() - 86400000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'Pending',
    },
  ],
  notifications: [
    {
      id: 'N-1',
      title: 'Appointment Reminder',
      message: 'Your consultation with Dr. Oluwaseun Davies is scheduled for tomorrow.',
      createdAt: new Date().toISOString(),
      isRead: false,
    },
  ],
  walletBalance: 0,
  rewardsPoints: 0,
  isLoading: false,
  error: null,

  setUser: (user) => {
    if (user && typeof window !== 'undefined') {
      localStorage.setItem('ricton_user', JSON.stringify(user));
    }
    set({ user });
  },

  fetchUser: async () => {
    try {
      const res = await api.get('/users/me');
      if (res.success && res.data) {
        const u = res.data as UserProfile;
        get().setUser(u);
        return u;
      }
    } catch (err: unknown) {
      console.warn('Failed fetching current user profile', err);
    }
    return get().user;
  },

  fetchAppointments: async () => {
    try {
      const res = await api.get('/appointments/me');
      if (res.success && Array.isArray(res.data)) {
        set({ appointments: res.data });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching appointments', err);
    }
  },

  fetchPrescriptions: async () => {
    try {
      const res = await api.get('/pharmacy/prescriptions');
      if (res.success && Array.isArray(res.data)) {
        set({ prescriptions: res.data });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching prescriptions', err);
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success && Array.isArray(res.data?.notifications)) {
        set({ notifications: res.data.notifications });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching notifications', err);
    }
  },

  fetchWallet: async () => {
    try {
      const res = await api.get('/wallet/balance');
      if (res.success && res.data?.balance !== undefined) {
        set({ walletBalance: res.data.balance });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching wallet balance', err);
    }
  },

  fetchRewards: async () => {
    try {
      const res = await api.get('/rewards/balance');
      if (res.success && res.data?.balance !== undefined) {
        set({ rewardsPoints: res.data.balance });
      }
    } catch (err: unknown) {
      console.warn('Failed fetching rewards balance', err);
    }
  },

  logout: () => {
    api.setToken(null);
    api.clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ricton_user');
    }
    set({ user: null });
  },
}));
