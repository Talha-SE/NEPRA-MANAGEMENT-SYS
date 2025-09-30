import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetProfile, apiUpdateProfile, apiUploadProfilePhoto, assetUrl, ProfileDTO, EmployeeSearchItemDTO } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EmployeeSearch from './EmployeeSearch';

type ProfilePanelProps = {
  hideSearch?: boolean;
  externalEmployee?: EmployeeSearchItemDTO | null;
};

export default function ProfilePanel({ hideSearch = false, externalEmployee = null }: ProfilePanelProps) {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [edit, setEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const [form, setForm] = useState<Partial<ProfileDTO>>({});
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSearchItemDTO | null>(externalEmployee);

  function photoSrc(p?: string | null): string | undefined {
    if (!p) return undefined;
    let s = p.replace(/\\/g, '/');
    const i = s.toLowerCase().indexOf('uploads');
    if (i >= 0) s = s.slice(i);
    if (!s.startsWith('/')) s = '/' + s;
    return assetUrl(s);
  }

  useEffect(() => {
    if (externalEmployee) {
      setSelectedEmp(externalEmployee);
    }
  }, [externalEmployee?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await apiGetProfile();
        setProfile(p);
        setForm({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          mobile: p.mobile ?? undefined,
          contactTel: p.contactTel ?? undefined,
          officeTel: p.officeTel ?? undefined,
          address: p.address ?? undefined,
          city: p.city ?? undefined,
          birthday: p.birthday ?? undefined,
          photo: p.photo ?? undefined,
        });
      } catch (e: any) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // When HR selects a different employee, fetch their profile
  useEffect(() => {
    if (!isHR) return;
    (async () => {
      if (!selectedEmp) return;
      setLoading(true);
      setError(null);
      try {
        const p = await apiGetProfile(selectedEmp.id);
        setProfile(p);
        setForm({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          mobile: p.mobile ?? undefined,
          contactTel: p.contactTel ?? undefined,
          officeTel: p.officeTel ?? undefined,
          address: p.address ?? undefined,
          city: p.city ?? undefined,
          birthday: p.birthday ?? undefined,
          photo: p.photo ?? undefined,
        });
        setEdit(false);
      } catch (e) {
        setError('Failed to load selected employee');
      } finally {
        setLoading(false);
      }
    })();
  }, [isHR, selectedEmp]);

  // reset image error state when server photo changes
  useEffect(() => {
    setImgError(false);
  }, [profile?.photo]);

  // compute avatar src (local preview while uploading else server path)
  const avatarSrc = localPreview || photoSrc(profile?.photo);

  const canSave = useMemo(() => {
    if (!form.firstName || !form.lastName || !form.email) return false;
    return true;
  }, [form.firstName, form.lastName, form.email]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        mobile: form.mobile,
        contactTel: form.contactTel,
        officeTel: form.officeTel,
        address: form.address,
        city: form.city,
        birthday: form.birthday,
        photo: form.photo,
      }, isHR && selectedEmp ? selectedEmp.id : undefined);
      setProfile(updated);
      setEdit(false);
    } catch (e: any) {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File) {
    try {
      setUploading(true);
      setError(null);
      // local preview
      const obj = URL.createObjectURL(file);
      setLocalPreview(obj);
      const updated = await apiUploadProfilePhoto(file);
      setProfile(updated);
      setForm((s) => ({ ...s, photo: updated.photo ?? undefined }));
      // clear preview after server responds
      URL.revokeObjectURL(obj);
      setLocalPreview(null);
    } catch (e: any) {
      setError('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body text-red-600">{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      {!hideSearch && isHR && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Search and view any employee</span>
            <div className="w-full max-w-md">
              <EmployeeSearch
                value={selectedEmp}
                onChange={setSelectedEmp}
                placeholder="Search employees..."
                className="rounded-2xl border-emerald-200/60 bg-white/95 text-slate-900 placeholder:text-slate-500 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/98 p-6 shadow-[0_36px_110px_-60px_rgba(15,64,45,0.35)]">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.12), transparent 55%)' }} aria-hidden />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_18px_40px_-24px_rgba(16,94,49,0.45)] ring-0 transition focus:outline-none focus:ring-2 focus:ring-emerald-300/70 group"
                onClick={() => avatarSrc && setPhotoOpen(true)}
                title={avatarSrc ? 'View photo' : 'No photo'}
              >
                {avatarSrc && !imgError ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-2xl font-semibold text-emerald-700 bg-emerald-50">
                    {profile.firstName?.[0]}
                    {profile.lastName?.[0]}
                  </div>
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
              </button>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Profile overview
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">{profile.firstName} {profile.lastName}</h3>
                <div className="text-sm text-slate-600">
                  {profile.email}
                  {profile.empCode ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      ID {profile.empCode}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }} />
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || (isHR && Boolean(selectedEmp && selectedEmp.id !== Number(user?.id)))}
                title={isHR && selectedEmp && selectedEmp.id !== Number(user?.id) ? 'Photo upload is only available for your own profile' : ''}
              >
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              {!edit && (
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                  onClick={() => setEdit(true)}
                >
                  Edit details
                </button>
              )}
              {edit && (
                <>
                  <button
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    onClick={() => { setEdit(false); }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60"
                    onClick={onSave}
                    disabled={!canSave || saving}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          {!edit ? (
            <dl className="grid gap-4 rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-inner sm:grid-cols-2">
              <Field label="First Name" value={profile.firstName} />
              <Field label="Last Name" value={profile.lastName} />
              <Field label="Email" value={profile.email} />
              <Field label="Mobile" value={profile.mobile} />
              <Field label="Contact Tel" value={profile.contactTel} />
              <Field label="Office Tel" value={profile.officeTel} />
              <Field label="Address" value={profile.address} />
              <Field label="City" value={profile.city} />
              <Field label="Birthday" value={profile.birthday} />
              <Field label="Employee Code" value={profile.empCode} />
              <Field label="Company" value={profile.companyName} />
              <Field label="Company ID" value={profile.companyId?.toString()} />
            </dl>
          ) : (
            <div className="grid gap-4 rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-inner sm:grid-cols-2">
              <Input label="First Name" value={form.firstName || ''} onChange={(v) => setForm((s) => ({ ...s, firstName: v }))} />
              <Input label="Last Name" value={form.lastName || ''} onChange={(v) => setForm((s) => ({ ...s, lastName: v }))} />
              <Input label="Email" value={form.email || ''} onChange={(v) => setForm((s) => ({ ...s, email: v }))} />
              <Input label="Mobile" value={form.mobile || ''} onChange={(v) => setForm((s) => ({ ...s, mobile: v }))} />
              <Input label="Contact Tel" value={form.contactTel || ''} onChange={(v) => setForm((s) => ({ ...s, contactTel: v }))} />
              <Input label="Office Tel" value={form.officeTel || ''} onChange={(v) => setForm((s) => ({ ...s, officeTel: v }))} />
              <Input label="Address" value={form.address || ''} onChange={(v) => setForm((s) => ({ ...s, address: v }))} />
              <Input label="City" value={form.city || ''} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
              <Input label="Birthday (YYYY-MM-DD)" value={form.birthday || ''} onChange={(v) => setForm((s) => ({ ...s, birthday: v }))} />
              <Input label="Photo URL" value={form.photo || ''} onChange={(v) => setForm((s) => ({ ...s, photo: v }))} />
            </div>
          )}
        </div>
      </div>
    {photoOpen && avatarSrc && (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPhotoOpen(false)}>
        <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
          <button
            className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm"
            onClick={() => setPhotoOpen(false)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt="Profile Large" className="max-h-[80vh] w-auto mx-auto rounded-lg shadow-2xl" />
        </div>
      </div>
    )}
  </>
  );

}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm">
      <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 break-words">{value || '-'}</dd>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{label}</span>
      <input
        className="w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
