import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  capabilities: [],
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  hasCapability: (cap) => {
    const caps = useAuthStore.getState().capabilities || [];
    return caps.some((c) => c.capability === cap && c.status === 'active');
  },

  // Returns 'customer' | 'mover' | 'surveyor'
  getAccountType: () => {
    return useAuthStore.getState().user?.account_type || 'customer';
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({
        user: data.user,
        capabilities: data.capabilities || [],
        token: data.token,
        loading: false,
      });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login gagal';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  register: async (fields) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/api/auth/register', fields);
      localStorage.setItem('token', data.token);
      set({
        user: data.user,
        capabilities: data.capabilities || [],
        token: data.token,
        loading: false,
      });
      // Return redirect hint from server
      return { user: data.user, redirect: data.redirect || '/onboarding' };
    } catch (err) {
      const msg = err.response?.data?.error || 'Pendaftaran gagal';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      set({ user: data.user, capabilities: data.capabilities || [] });
    } catch {
      set({ user: null, capabilities: [], token: null });
      localStorage.removeItem('token');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, capabilities: [], token: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
