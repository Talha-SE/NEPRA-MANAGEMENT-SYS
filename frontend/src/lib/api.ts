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
export async function apiGetProfile(empId?: number): Promise<ProfileDTO> {
  const params = empId ? { empId } : undefined;
  const res = await api.get('/api/profile', { params });
  return res.data.profile as ProfileDTO;
}

export async function apiUpdateProfile(
  payload: Partial<
    Pick<
      ProfileDTO,
      'firstName' | 'lastName' | 'email' | 'mobile' | 'contactTel' | 'officeTel' | 'address' | 'city' | 'birthday' | 'photo'
    >
  >,
  empId?: number
): Promise<ProfileDTO> {
  const params = empId ? { empId } : undefined;
  const res = await api.put('/api/profile', payload, { params });
  return res.data.profile as ProfileDTO;
}

export interface EmployeeSearchItemDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  empCode?: string | null;
  companyId?: number | null;
  companyName?: string | null;
}

export async function apiSearchEmployees(q: string, limit?: number): Promise<EmployeeSearchItemDTO[]> {
  const res = await api.get('/api/profile/search', { params: { q, ...(limit ? { limit } : {}) } });
  return res.data.results as EmployeeSearchItemDTO[];
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

// =====================
// Leave Requests (DB)
// Table: dbo.employee_leaves_request
// =====================

export type LeaveStatusDTO = 'pending' | 'approved' | 'rejected';

export interface LeaveRequestDTO {
  id: number;
  emp_id: number;
  leave_type: string;       // maps to your "leave_type" column
  start_date: string;       // yyyy-mm-dd
  end_date: string;         // yyyy-mm-dd
  total_days: number;       // computed by DB
  leave_status: LeaveStatusDTO;
  contact_number: string;
  alternate_officer: string;
  reason: string;
  // Backend may return these optionally
  created_at?: string | null;
  reviewed_at?: string | null;
  reviewer_id?: number | null;
  reviewer_name?: string | null;
  reviewer_note?: string | null;
  // Attachment is stored as varbinary(max) in DB; we won't fetch raw bytes here
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
}

export async function apiCreateLeaveRequest(payload: {
  emp_id: number;
  leave_type: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  reason: string;
  contact_number: string;
  alternate_officer: string;
  attachment?: File | null;
}): Promise<LeaveRequestDTO> {
  const form = new FormData();
  form.append('emp_id', String(payload.emp_id));
  form.append('leave_type', payload.leave_type);
  form.append('start_date', payload.start_date);
  form.append('end_date', payload.end_date);
  form.append('reason', payload.reason);
  form.append('contact_number', payload.contact_number);
  form.append('alternate_officer', payload.alternate_officer);
  if (payload.attachment) form.append('attachment', payload.attachment);
  const res = await api.post('/api/leaves', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as LeaveRequestDTO;
}

export async function apiListMyLeaves(emp_id: number): Promise<LeaveRequestDTO[]> {
  const res = await api.get('/api/leaves/mine', { params: { emp_id } });
  return res.data.items as LeaveRequestDTO[];
}

export async function apiListPendingLeaves(): Promise<LeaveRequestDTO[]> {
  const res = await api.get('/api/leaves/pending');
  return res.data.items as LeaveRequestDTO[];
}

export async function apiUpdateLeaveStatus(id: number, status: LeaveStatusDTO, reviewer?: { reviewer_id: number; reviewer_name: string; reviewer_note?: string }): Promise<LeaveRequestDTO> {
  const res = await api.patch(`/api/leaves/${id}/status`, {
    status,
    ...(reviewer ? reviewer : {}),
  });
  return res.data.item as LeaveRequestDTO;
}
