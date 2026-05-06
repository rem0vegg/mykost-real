import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Tambahkan fungsi export ini untuk endpoint API baru
export const uploadMovingEvidence = async (orderId, file, type) => {
  const formData = new FormData();
  formData.append('evidence', file);
  formData.append('type', type); // 'pickup' atau 'delivery'

  // Asumsikan 'api' adalah instance axios Anda
  const response = await api.put(`/moving-orders/${orderId}/evidence`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getFileUrl = (path) => (path ? `${BASE_URL}${path}` : null);

export default api;
