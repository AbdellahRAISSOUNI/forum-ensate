"use client";

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RefreshSessionButton() {
  const { data: session, update } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Force session update
      await update();
      
      // Wait a moment then check the role and redirect appropriately
      setTimeout(() => {
        if (session?.user?.role === 'committee') {
          router.push('/comite/dashboard');
        } else if (session?.user?.role === 'student') {
          router.push('/etudiant/dashboard');
        } else {
          // If unclear, sign out
          signOut({ callbackUrl: '/login' });
        }
        setIsRefreshing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error refreshing session:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
      title="Actualiser la session (utile après changement de rôle)"
    >
      {isRefreshing ? 'Actualisation...' : 'Actualiser session'}
    </button>
  );
}
