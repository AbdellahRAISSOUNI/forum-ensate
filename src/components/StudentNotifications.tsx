"use client";

import { useEffect, useState } from 'react';

interface UpcomingItem {
  interviewId: string;
  companyName: string;
  queuePosition: number;
  room?: { name?: string; location?: string } | null;
  status: string;
}

export default function StudentNotifications() {
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [enabledSound, setEnabledSound] = useState(false);
  // const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/student/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        setUpcoming(data.upcoming || []);

        // Simple toast-like alerts
        (data.upcoming || []).forEach((item: UpcomingItem) => {
          if (item.queuePosition <= 3) {
            // Basic alert UI; in a real app, replace with a toast library
            // Tailwind animation classes are applied in container below
            if (enabledSound) {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            }
          }
        });

        // setLastSeen(new Date().toISOString());
      } catch (e) {
        // Ignore errors
      }
    };

    fetchNotifications();
    const id = setInterval(fetchNotifications, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [enabledSound]);

  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50">
      <div className="flex items-center justify-end gap-2">
        <label className="text-xs text-gray-600">Son</label>
        <input
          type="checkbox"
          checked={enabledSound}
          onChange={(e) => setEnabledSound(e.target.checked)}
          className="h-4 w-4"
        />
      </div>
      {upcoming
        .filter((u) => u.queuePosition <= 3)
        .map((u) => (
          <div
            key={u.interviewId}
            className="bg-white shadow-lg rounded-md border border-yellow-300 p-4 w-80 animate-bounce"
          >
            <div className="text-sm text-gray-800 font-semibold mb-1">
              Votre tour approche !
            </div>
            <div className="text-sm text-gray-700">
              Entreprise: <span className="font-medium">{u.companyName}</span>
            </div>
            <div className="text-sm text-gray-700">
              Position: <span className="font-medium">{u.queuePosition}</span>
            </div>
            {u.room && (
              <div className="text-sm text-gray-700">
                Salle: <span className="font-medium">{u.room.name || '—'}</span>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}


