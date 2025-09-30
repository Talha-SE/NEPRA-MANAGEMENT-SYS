import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListLeavesByEmployee, apiListPendingLeaves, type LeaveRequestRowDTO } from '../lib/api';

type NotifItem = {
  id: string;
  title: string;
  subtitle?: string;
  createdAt?: string; // ISO
};

const POLL_MS = 30000; // 30s

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const storageKey = useMemo(() => (user ? `notif-leave-status:${user.id}` : ''), [user?.id]);

  // Outside click to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'hr') {
        // HR: show pending leave requests as notifications
        const pending = await apiListPendingLeaves();
        const list: NotifItem[] = pending.slice(0, 10).map((r) => ({
          id: `pending-${r.id}`,
          title: `Leave request (#${r.id}) from Emp ${r.emp_id}`,
          subtitle: `${r.leave_type} • ${String(r.start_date).slice(0, 10)} → ${String(r.end_date).slice(0, 10)}`,
          createdAt: new Date(r.start_date).toISOString(),
        }));
        setItems(list);
      } else {
        // Employee: notify when status changes from pending -> approved/rejected
        const myList = await apiListLeavesByEmployee(Number(user.id));
        const prevRaw = storageKey ? localStorage.getItem(storageKey) : null;
        const prevMap: Record<string, string> = prevRaw ? JSON.parse(prevRaw) : {};

        const changes: NotifItem[] = [];
        const nextMap: Record<string, string> = { ...prevMap };

        for (const r of myList) {
          const k = String(r.id);
          const prev = prevMap[k];
          const curr = r.leave_status;
          // Consider notifications only for approved/rejected transitions
          if ((curr === 'approved' || curr === 'rejected') && prev !== curr) {
            changes.push({
              id: `change-${r.id}-${curr}`,
              title: `Leave ${curr}`,
              subtitle: `${r.leave_type} • ${String(r.start_date).slice(0, 10)} → ${String(r.end_date).slice(0, 10)}`,
              createdAt: new Date().toISOString(),
            });
          }
          nextMap[k] = curr;
        }

        // Keep only latest 10 changes
        setItems(changes.slice(0, 10));
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(nextMap));
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + polling
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const unreadCount = items.length;

  function markAllRead() {
    if (!user) return;
    if (user.role === 'hr') {
      // Nothing persistent to mark for HR; just collapse
      setItems([]);
    } else {
      // For employee: snapshot current statuses, so future changes only show diffs
      // Already updated in load(); clearing UI now
      setItems([]);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border bg-white text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-rose-600 text-white text-[10px] font-semibold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in"
        >
          <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Notifications</div>
            <button
              className="text-xs text-brand-700 hover:underline disabled:text-gray-400"
              disabled={loading || unreadCount === 0}
              onClick={markAllRead}
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-600">No new notifications.</div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id} className="px-3 py-3 hover:bg-gray-50">
                    <div className="text-sm font-medium text-slate-900">{n.title}</div>
                    {n.subtitle && <div className="text-xs text-slate-600 mt-0.5">{n.subtitle}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeWidth="1.5" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22z" />
      <path strokeWidth="1.5" d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7z" />
    </svg>
  );
}
