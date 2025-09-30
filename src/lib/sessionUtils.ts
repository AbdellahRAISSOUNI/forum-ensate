import { getSession } from 'next-auth/react';

/**
 * Force refresh the current session by making a new session request
 * This is useful when user roles change in the database
 */
export async function refreshSession() {
  // Trigger a session refresh by calling getSession with update
  const session = await getSession();
  
  // Force a page reload to ensure all components get the new session
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
  
  return session;
}

/**
 * Check if current session role matches expected role
 * If not, force a session refresh
 */
export async function validateSessionRole(expectedRole: string) {
  const session = await getSession();
  
  if (session?.user?.role !== expectedRole) {
    await refreshSession();
    return false;
  }
  
  return true;
}
