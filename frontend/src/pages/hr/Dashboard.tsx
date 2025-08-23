import Navbar from '../../components/Navbar';
import ProfileCard from '../../components/ProfileCard';
import { useAuth } from '../../context/AuthContext';

export default function HRDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 grid gap-6">
        <h2 className="text-2xl font-semibold">HR Dashboard</h2>
        {user && (
          <ProfileCard
            firstName={user.firstName}
            middleName={user.middleName}
            lastName={user.lastName}
            email={user.email}
            role={user.role}
          />
        )}
      </main>
    </div>
  );
}
