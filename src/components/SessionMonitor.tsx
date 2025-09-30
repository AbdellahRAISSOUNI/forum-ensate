"use client";

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SessionMonitor() {
  const { data: session, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user?.id) return;

    const checkForRefresh = async () => {
      try {
        const response = await fetch(`/api/admin/force-session-refresh?userId=${session.user.id}`);
        const data = await response.json();

        if (data.shouldRefresh) {
          // Force session update
          await update();
          
          // Give a moment for the session to update, then redirect
          setTimeout(() => {
            const currentRole = session.user.role;
            
            // Redirect to appropriate dashboard based on role
            if (currentRole === 'committee') {
              router.push('/comite/dashboard');
            } else if (currentRole === 'student') {
              router.push('/etudiant/dashboard');
            } else {
              // If role is unclear, sign out and let them log in again
              signOut({ callbackUrl: '/login' });
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking for session refresh:', error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkForRefresh, 30000);

    return () => clearInterval(interval);
  }, [session, update, router]);

  return null; // This component doesn't render anything
}
