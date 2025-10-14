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
  departmentId?: number | null;
  departmentName?: string | null;
  hireDate?: string | null;
  positionId?: number | null;
  positionName?: string | null;
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
      'firstName' | 'lastName' | 'email' | 'mobile' | 'contactTel' | 'officeTel' | 'address' | 'city' | 'birthday' | 'photo' | 'hireDate' | 'departmentId' | 'positionId'
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

// Leave DTOs and API
export type LeaveStatusDTO = 'pending' | 'hr_approved' | 'approved' | 'rejected';

export interface LeaveRequestRowDTO {
  id: number;
  emp_id: number;
  leave_type: string;
  start_date: string; // ISO date string from server
  end_date: string;   // ISO date string from server
  total_days: number | null; // computed by DB, may be null if not computed
  leave_status: LeaveStatusDTO;
  contact_number: string;
  alternate_officer: string | null;
  reason: string | null;
  hr_remarks?: string | null;
  attachment_present?: boolean;
}

export async function apiCreateLeaveRequest(payload: {
  empId: number;
  leaveType: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  contactNumber: string;
  alternateOfficerName: string;
  reason: string;
  attachmentBase64?: string | null; // data URL or base64
}): Promise<LeaveRequestRowDTO> {
  const res = await api.post('/api/leaves', {
    ...payload,
    status: 'pending',
  });
  return res.data.data as LeaveRequestRowDTO;
}

export async function apiListPendingLeaves(): Promise<LeaveRequestRowDTO[]> {
  const res = await api.get('/api/leaves/pending');
  return res.data.data as LeaveRequestRowDTO[];
}

export async function apiListPendingLeavesRO(): Promise<LeaveRequestRowDTO[]> {
  const res = await api.get('/api/leaves/pending-ro');
  return res.data.data as LeaveRequestRowDTO[];
}

export async function apiListLeavesByEmployee(empId: number): Promise<LeaveRequestRowDTO[]> {
  const res = await api.get('/api/leaves/by-employee', { params: { empId } });
  return res.data.data as LeaveRequestRowDTO[];
}

export async function apiUpdateLeaveStatus(id: number, status: LeaveStatusDTO, hrRemarks?: string): Promise<LeaveRequestRowDTO> {
  const res = await api.patch(`/api/leaves/${id}/status`, { status, hrRemarks });
  return res.data.data as LeaveRequestRowDTO;
}

// Leave summary (available/approved only)
export interface LeaveSummaryRowDTO {
  id: number;
  emp_id: number;
  leave_type: string;
  available: number | null;
  approved: number | null;
}

export async function apiGetLeaveSummary(empId?: number): Promise<LeaveSummaryRowDTO[]> {
  const params = empId ? { empId } : undefined;
  const res = await api.get('/api/leaves/summary', { params });
  return res.data.data as LeaveSummaryRowDTO[];
}

export async function apiUpsertLeaveSummary(payload: { empId: number; leaveType: string; available?: number | null; approved?: number | null }): Promise<LeaveSummaryRowDTO> {
  const res = await api.put('/api/leaves/summary', payload);
  return res.data.data as LeaveSummaryRowDTO;
}
