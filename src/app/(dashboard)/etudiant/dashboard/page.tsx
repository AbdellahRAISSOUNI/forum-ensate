"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function StudentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b2b5c]"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-white text-[#0b2b5c]">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tableau de bord étudiant</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-[#0b2b5c] text-white rounded-md hover:bg-[#0a244e]"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-3xl font-bold text-center mb-6">
              Bonjour, {session.user.name}
            </h2>
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-4">
                Bienvenue sur votre tableau de bord du Forum ENSA Tétouan
              </p>
              
              {session.user.status && (
                <p className="text-md text-gray-500 mb-2">
                  <span className="font-medium">Statut:</span> {session.user.status}
                </p>
              )}
              
              {session.user.opportunityType && (
                <p className="text-md text-gray-500">
                  <span className="font-medium">Type d&apos;opportunité:</span> {session.user.opportunityType}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}