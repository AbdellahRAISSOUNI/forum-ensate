"use client";

import { useState } from 'react';

interface ForceSessionRefreshProps {
  userId: string;
  userName: string;
}

export default function ForceSessionRefresh({ userId, userName }: ForceSessionRefreshProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleForceRefresh = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/force-session-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du rafraîchissement');
      }

      setMessage(`Session de ${userName} marquée pour rafraîchissement`);
    } catch (error) {
      setMessage('Erreur lors du rafraîchissement de la session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleForceRefresh}
        disabled={isLoading}
        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Rafraîchissement...' : 'Forcer refresh'}
      </button>
      {message && (
        <span className="text-xs text-green-600">{message}</span>
      )}
    </div>
  );
}
