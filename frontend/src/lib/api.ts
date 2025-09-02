import axios from 'axios';

export const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

export function assetUrl(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p)) return p;
  return joinUrl(baseURL, String(p));
}

export type Role = 'hr' | 'employee';

export interface UserDTO {
  id: string;
  role: Role;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
}

export interface DailyAttendanceRowDTO {
  id: string;
  attDate: string; // ISO
  weekday: number; // int
  checkIn: string | null; // ISO
  checkOut: string | null; // ISO
  clockIn: string | null; // ISO
  clockOut: string | null; // ISO
  breakIn?: string | null; // ISO (optional; not yet provided by backend)
  breakOut?: string | null; // ISO (optional; not yet provided by backend)
  present: boolean;
  fullAttendance: boolean;
}

export interface DailyAttendanceDTO {
  empId: number;
  date: string; // ISO of requested date
  rows: DailyAttendanceRowDTO[];
}

// Attendance API types
export interface WeeklyDayDTO {
  label: string; // Mon..Sun
  dayIndex: number; // 1..7
  inTime: string | null; // e.g. 09:00:00
  outTime: string | null; // e.g. 17:00:00
  present: boolean;
}

export interface WeeklyScheduleDTO {
  shiftId: number | null;
  days: WeeklyDayDTO[];
}

export interface TodayAttendanceDTO {
  date: string; // ISO timestamp of now from server
  weekday: string; // e.g. Mon, Tue
  scheduledIn: string | null; // HH:mm:ss
  scheduledOut: string | null; // HH:mm:ss
  status: 'off' | 'before_shift' | 'on_shift' | 'after_shift';
  elapsedMinutes: number;
  remainingMinutes: number;
  progressPercent: number; // 0..100
}

// Profile API types
export interface ProfileDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string | null;
  contactTel?: string | null;
  officeTel?: string | null;
  address?: string | null;
  city?: string | null;
  birthday?: string | null; // ISO date
  photo?: string | null; // URL or path
  empCode?: string | null;
  companyId?: number | null;
  companyName?: string | null;
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

// Profile endpoints
export async function apiGetProfile(): Promise<ProfileDTO> {
  const res = await api.get('/api/profile');
  return res.data.profile as ProfileDTO;
}

export async function apiUpdateProfile(payload: Partial<Pick<ProfileDTO, 'firstName' | 'lastName' | 'email' | 'mobile' | 'contactTel' | 'officeTel' | 'address' | 'city' | 'birthday' | 'photo'>>): Promise<ProfileDTO> {
  const res = await api.put('/api/profile', payload);
  return res.data.profile as ProfileDTO;
}

export async function apiUploadProfilePhoto(file: File): Promise<ProfileDTO> {
  const form = new FormData();
  form.append('photo', file);
  const res = await api.post('/api/profile/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.profile as ProfileDTO;
}

// Attendance endpoints
export async function apiGetWeeklyAttendance(shiftId?: number): Promise<WeeklyScheduleDTO> {
  const res = await api.get('/api/attendance/week', { params: shiftId ? { shiftId } : {} });
  return res.data as WeeklyScheduleDTO;
}

export async function apiGetTodayAttendance(): Promise<TodayAttendanceDTO> {
  const res = await api.get('/api/attendance/today');
  return res.data as TodayAttendanceDTO;
}

export async function apiGetDailyAttendance(params: { empId: number; date?: string }): Promise<DailyAttendanceDTO> {
  const res = await api.get('/api/attendance/daily', { params });
  return res.data as DailyAttendanceDTO;
}
