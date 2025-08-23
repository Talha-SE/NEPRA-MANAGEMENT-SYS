import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export type Role = 'hr' | 'employee';

export interface UserDTO {
  id: string;
  role: Role;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
}

export async function apiRegister(data: {
  role: Role;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<UserDTO> {
  const res = await api.post('/api/auth/register', data);
  return res.data.user as UserDTO;
}

export async function apiLogin(data: { role: Role; email: string; password: string }): Promise<UserDTO> {
  const res = await api.post('/api/auth/login', data);
  return res.data.user as UserDTO;
}

export async function apiMe(): Promise<UserDTO | null> {
  try {
    const res = await api.get('/api/me');
    return res.data.user as UserDTO;
  } catch {
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  await api.post('/api/auth/logout');
}
