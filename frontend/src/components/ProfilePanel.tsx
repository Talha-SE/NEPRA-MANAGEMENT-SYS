import { useEffect, useMemo, useState } from 'react';
import { apiGetProfile, apiUpdateProfile, ProfileDTO } from '../lib/api';

export default function ProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [edit, setEdit] = useState(false);

  const [form, setForm] = useState<Partial<ProfileDTO>>({});

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
      });
      setProfile(updated);
      setEdit(false);
    } catch (e: any) {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
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
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Profile</h3>
          <div className="flex items-center gap-2">
            {!edit && (
              <button className="btn btn-primary" onClick={() => setEdit(true)}>Edit</button>
            )}
            {edit && (
              <>
                <button className="btn btn-secondary" onClick={() => { setEdit(false); }} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={onSave} disabled={!canSave || saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Photo */}
        {profile.photo && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.photo} alt="Profile" className="h-24 w-24 rounded object-cover border" />
          </div>
        )}

        {/* Read or edit form */}
        {!edit ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="font-medium break-words">{value || '-'}</dd>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
