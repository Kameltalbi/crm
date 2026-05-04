import { create } from 'zustand';
import { api } from './api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  paymentStatus: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  paymentStatus: localStorage.getItem('paymentStatus'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('paymentStatus', data.paymentStatus || 'PENDING');
      set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, paymentStatus: data.paymentStatus || 'PENDING', loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('paymentStatus');
    set({ user: null, accessToken: null, refreshToken: null, paymentStatus: null });
  },

  fetchMe: async () => {
    const accessToken = get().accessToken;
    if (!accessToken) return;
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('paymentStatus', data.paymentStatus || 'PENDING');
      set({ user: data.user, paymentStatus: data.paymentStatus || 'PENDING' });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('paymentStatus');
      set({ user: null, accessToken: null, refreshToken: null, paymentStatus: null });
    }
  },

  refreshAccessToken: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return;

    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      set({ accessToken: data.accessToken });
    } catch {
      // Refresh failed, logout
      get().logout();
    }
  },
}));
