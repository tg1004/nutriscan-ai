import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// Replace with your computer's local IP address
// Find it by running: ipconfig (Windows) → look for IPv4 Address
// Example: 192.168.1.5
const API_BASE = 'http://10.172.183.232:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token')
        if (refreshToken) {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          await SecureStore.setItemAsync('access_token', res.data.access_token)
          await SecureStore.setItemAsync('refresh_token', res.data.refresh_token)
          original.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(original)
        }
      } catch {
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('refresh_token')
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  refresh: (refresh_token) =>
    api.post('/auth/refresh', { refresh_token }),
}

export const userAPI = {
  getMe: () => api.get('/users/me'),
  getProfile: () => api.get('/users/me/profile'),
  updateProfile: async (data) => {
    const token = await SecureStore.getItemAsync('access_token')
    return api.put('/users/me/profile', data, token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined)
  },
}

export const foodAPI = {
  search: (q) => api.get(`/food/search?q=${encodeURIComponent(q)}`),
  searchIngredients: (q) => api.get(`/food/ingredients/search?q=${encodeURIComponent(q)}`),
  resolveContext: (data) => api.post('/food/scan/context', data),
  barcodeLookup: (barcode) => api.get(`/food/barcode/${barcode}`),
}

export const logAPI = {
  create: (data) => api.post('/logs', data),
  getByDate: (date) => api.get(`/logs?date=${date}`),
  getSummary: (from, to) => api.get(`/logs/summary?from=${from}&to=${to}`),
  delete: (id) => api.delete(`/logs/${id}`),
}

export const analyticsAPI = {
  daily: (date) => api.get(`/analytics/daily${date ? `?log_date=${date}` : ''}`),
  weekly: () => api.get('/analytics/weekly'),
  monthly: () => api.get('/analytics/monthly'),
}

export const suggestAPI = {
  getMeals: (ingredients) => api.post('/suggest', { ingredient_names: ingredients }),
}

export default api
