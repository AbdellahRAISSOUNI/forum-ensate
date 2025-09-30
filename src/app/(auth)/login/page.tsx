"use client";

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push('/etudiant/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    const registered = searchParams.get('registered');
    if (registered === 'true') {
      setShowRegisteredMessage(true);
    }

    // Handle error from NextAuth
    const authError = searchParams.get('error');
    if (authError) {
      switch (authError) {
        case 'CredentialsSignin':
          setError('Email ou mot de passe incorrect');
          break;
        default:
          setError('Une erreur est survenue lors de la connexion');
          break;
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou mot de passe incorrect');
        setIsLoading(false);
        return;
      }

      // Success - the useEffect above will handle redirection
    } catch (error) {
      console.error('Login error:', error);
      setError('Une erreur est survenue lors de la connexion');
      setIsLoading(false);
    }
  };

  // If already authenticated, show loading
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b2b5c]"></div>
        <div className="ml-3">Redirection en cours...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#0b2b5c]">
          Connexion Étudiant
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou{' '}
          <Link href="/register" className="font-medium text-[#d4af37] hover:underline">
            créez un nouveau compte
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          <Link href="/admin/login" className="hover:underline">
            Accès administrateur
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {showRegisteredMessage && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-green-700">
                Inscription réussie ! Vous pouvez maintenant vous connecter.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse e-mail
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0b2b5c] hover:bg-[#0a244e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d4af37] disabled:opacity-50"
              >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}