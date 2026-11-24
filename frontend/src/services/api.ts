import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: `${apiBaseUrl.replace(/\/+$/, '')}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Automatically attach the authentication token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Token ${token}`
  }

  return config
})

export default api
