type Props = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: 'hr' | 'employee';
};

export default function ProfileCard({ firstName, middleName, lastName, email, role }: Props) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Profile</h3>
          <span className="px-2 py-1 text-xs rounded bg-brand-100 text-brand-700 capitalize">{role}</span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">First Name</dt>
            <dd className="font-medium">{firstName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Middle Name</dt>
            <dd className="font-medium">{middleName || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Last Name</dt>
            <dd className="font-medium">{lastName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="font-medium">{email}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
