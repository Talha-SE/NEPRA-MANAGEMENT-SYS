import React, { useEffect, useMemo, useState } from 'react';
import { apiSearchEmployees, EmployeeSearchItemDTO } from '../lib/api';

type Props = {
  value?: EmployeeSearchItemDTO | null;
  onChange: (emp: EmployeeSearchItemDTO | null) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showButton?: boolean;
  buttonLabel?: string;
};

export default function EmployeeSearch({ value, onChange, placeholder = 'Search employee by name, email, code or ID...', className, autoFocus, showButton = false, buttonLabel = 'Search' }: Props) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EmployeeSearchItemDTO[]>([]);
  const [open, setOpen] = useState(false);

  // debounce query
  const debouncedQ = useDebounced(q, 250);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debouncedQ || debouncedQ.trim().length < 2) {
        setItems([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await apiSearchEmployees(debouncedQ, 10);
        if (!cancelled) setItems(res);
      } catch (e) {
        if (!cancelled) setError('Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  async function runSearchNow() {
    const query = q.trim();
    setOpen(true);
    if (query.length < 2) { setItems([]); return; }
    let cancelled = false;
    try {
      setLoading(true);
      setError(null);
      const res = await apiSearchEmployees(query, 10);
      if (!cancelled) setItems(res);
    } catch {
      if (!cancelled) setError('Search failed');
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  function select(item: EmployeeSearchItemDTO) {
    onChange(item);
    setOpen(false);
  }

  function clear() {
    setQ('');
    setItems([]);
    onChange(null);
  }

  const display = useMemo(() => {
    if (!value) return '';
    const name = `${value.firstName} ${value.lastName}`.trim();
    const code = value.empCode ? ` • ${value.empCode}` : '';
    return `${name}${code}`;
  }, [value]);

  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <div className="flex items-center gap-2">
        <input
          className="input w-full"
          placeholder={placeholder}
          value={open ? q : display || q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
        />
        {showButton && (
          <button className="btn btn-primary" onClick={runSearchNow} title={buttonLabel}>{buttonLabel}</button>
        )}
        {value && (
          <button className="btn btn-secondary" onClick={clear} title="Clear selection">Clear</button>
        )}
      </div>
      {open && (q.trim().length >= 2) && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
          {error && !loading && <div className="p-3 text-sm text-red-600">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="p-3 text-sm text-gray-500">No results</div>
          )}
          <ul className="max-h-64 overflow-auto">
            {items.map((it) => (
              <li
                key={it.id}
                className="cursor-pointer px-3 py-2 hover:bg-gray-50 text-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(it)}
              >
                <div className="font-medium">{it.firstName} {it.lastName}</div>
                <div className="text-xs text-gray-500">{it.email}{it.empCode ? ` • ${it.empCode}` : ''}{it.companyName ? ` • ${it.companyName}` : ''}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function useDebounced<T>(val: T, ms: number) {
  const [v, setV] = useState(val);
  useEffect(() => {
    const h = setTimeout(() => setV(val), ms);
    return () => clearTimeout(h);
  }, [val, ms]);
  return v;
}
