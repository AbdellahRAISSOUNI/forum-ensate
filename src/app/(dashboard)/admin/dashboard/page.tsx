import { cookies } from 'next/headers';
import UserManagement from '@/components/admin/UserManagement';
import LogoutButton from '@/components/admin/LogoutButton';

const SESSION_COOKIE = 'admin_session';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session?.value) {
    return (
      <div className="min-h-screen bg-white text-[#0b2b5c] flex flex-col items-center justify-center gap-4">
        <p>Non authentifié.</p>
        <a 
          href="/admin/login" 
          className="underline text-[#0b2b5c] px-4 py-2 border border-[#0b2b5c] rounded hover:bg-[#0b2b5c]/5"
        >
          Aller à la page de connexion
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0b2b5c]">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
          <LogoutButton />
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-[#0b2b5c]">Gestion des utilisateurs</h2>
              <p className="mt-1 text-sm text-gray-500">
                Gérer les utilisateurs et leurs rôles
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <UserManagement />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}