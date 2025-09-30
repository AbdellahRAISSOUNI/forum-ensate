import { signOut } from 'next-auth/react';

/**
 * Enhanced logout function that clears all session data and forces re-authentication
 */
export async function forceLogout() {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies by setting them to expire
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
    }

    // Sign out with NextAuth
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
    
  } catch (error) {
    console.error('Error during logout:', error);
    // Force redirect to login even if signOut fails
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

/**
 * Check if user needs to re-authenticate (called on app startup)
 */
export function shouldForceReauth(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if there's a flag indicating forced logout
  const forceReauth = localStorage.getItem('force_reauth');
  if (forceReauth === 'true') {
    localStorage.removeItem('force_reauth');
    return true;
  }
  
  return false;
}
