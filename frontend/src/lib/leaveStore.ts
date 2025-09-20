export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  empId: number;
  empName: string;
  typeKey: string; // e.g., 'cl', 'el', etc.
  typeLabel: string;
  fromDate: string; // yyyy-mm-dd
  toDate: string;   // yyyy-mm-dd
  days: number;
  reason: string;
  contactDuringLeave: string;
  alternateOfficerName: string; // Name of Alternate Officer/Official (mandatory)
  attachment?: {
    name: string;
    type: string;
    size: number;
    dataUrl?: string; // optional preview/download data URL (kept small)
  };
  status: LeaveStatus;
  createdAt: string; // ISO
  reviewedAt?: string; // ISO
  reviewerId?: number;
  reviewerName?: string;
  reviewerNote?: string;
}

const STORAGE_KEY = 'leave-requests-v1';

function readAll(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as LeaveRequest[];
    return [];
  } catch {
    return [];
  }
}

function writeAll(items: LeaveRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listRequests(): LeaveRequest[] {
  return readAll().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export function listByEmployee(empId: number): LeaveRequest[] {
  return listRequests().filter(r => r.empId === empId);
}

export function listPending(): LeaveRequest[] {
  return listRequests().filter(r => r.status === 'pending');
}

export function createRequest(input: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'reviewedAt' | 'reviewerId' | 'reviewerName' | 'reviewerNote'>): LeaveRequest {
  const all = readAll();
  const id = `lr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const req: LeaveRequest = {
    ...input,
    id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  all.unshift(req);
  writeAll(all);
  return req;
}

export function updateStatus(id: string, status: LeaveStatus, reviewer: { reviewerId: number; reviewerName: string; reviewerNote?: string }): LeaveRequest | null {
  const all = readAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const updated: LeaveRequest = {
    ...all[idx],
    status,
    reviewedAt: new Date().toISOString(),
    reviewerId: reviewer.reviewerId,
    reviewerName: reviewer.reviewerName,
    reviewerNote: reviewer.reviewerNote,
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}
