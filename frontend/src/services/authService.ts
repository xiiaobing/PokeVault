
import api from './api'

export interface AuthResponse {
  message: string
  token: string
  username: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  username: string
  password: string
}

export async function registerUser(data: RegisterData) {
  const response = await api.post<AuthResponse>(
    '/collection/register/',
    data
  )

  return response.data
}

export async function loginUser(data: LoginData) {
  const response = await api.post<AuthResponse>(
    '/collection/login/',
    data
  )

  return response.data
}

export function logoutUser() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}
