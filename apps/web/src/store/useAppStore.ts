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
  fetchRewards: () => Promise<void>;
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
  appointments: [],
  prescriptions: [],
  notifications: [],
  walletBalance: 0,
  rewardsPoints: 0,
  isLoading: false,
  error: null,

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        const existing = get().user || {};
        const merged = { ...existing, ...user };
        localStorage.setItem('ricton_user', JSON.stringify(merged));
        set({ user: merged });
      } else {
        localStorage.removeItem('ricton_user');
        set({ user: null });
      }
    } else {
      set({ user });
    }
  },

  fetchUser: async () => {
    try {
      const res = await api.get('/users/me');
      if (res.success && res.data) {
        const u = res.data as UserProfile;
        const existing = get().user;
        const merged: UserProfile = {
          ...u,
          avatarUrl:
            u.avatarUrl ||
            u.patientProfile?.avatarUrl ||
            u.providerProfile?.avatarUrl ||
            existing?.avatarUrl,
          firstName:
            u.firstName ||
            u.patientProfile?.firstName ||
            u.providerProfile?.firstName ||
            existing?.firstName,
          lastName:
            u.lastName ||
            u.patientProfile?.lastName ||
            u.providerProfile?.lastName ||
            existing?.lastName,
        };
        get().setUser(merged);
        return merged;
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
    api.logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ricton_user');
      localStorage.removeItem('ricton_token');
    }
    set({
      user: null,
      appointments: [],
      prescriptions: [],
      notifications: [],
      walletBalance: 0,
      rewardsPoints: 0,
    });
  },
}));
