"use client";

import { useEffect, useState } from "react";

interface Student {
  _id: string;
  name: string;
  email: string;
  status: 'ENSA' | 'EXTERNE';
  opportunityType: string;
}

interface QueueItem {
  _id: string;
  student: Student;
  queuePosition: number;
  priority: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface RoomData {
  _id: string;
  name: string;
  location: string;
  company?: {
    _id: string;
    name: string;
    sector: string;
  };
  currentInterview?: {
    _id: string;
    student: Student;
    startedAt: string;
  };
  queue: QueueItem[];
}

export default function CommitteeExtraFeatures() {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch room data
  const fetchRoomData = async () => {
    try {
      const response = await fetch('/api/committee/room-queue');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }
      
      const data = await response.json();
      setRoomData(data.room || null);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching room data:", err);
      setError("Erreur lors du chargement des données de la salle");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
    // Auto-refresh every 10 seconds
    const intervalId = setInterval(fetchRoomData, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleStartInterview = async (interviewId: string) => {
    setActionLoading('start');
    try {
      const response = await fetch('/api/committee/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du démarrage de l\'entretien');
      }

      await fetchRoomData();
    } catch (err) {
      console.error("Error starting interview:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du démarrage");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndInterview = async (interviewId: string) => {
    setActionLoading('end');
    try {
      const response = await fetch('/api/committee/end-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la fin de l\'entretien');
      }

      await fetchRoomData();
    } catch (err) {
      console.error("Error ending interview:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la fin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAbsent = async (interviewId: string) => {
    setActionLoading('absent');
    try {
      const response = await fetch('/api/committee/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du marquage d\'absence');
      }

      await fetchRoomData();
    } catch (err) {
      console.error("Error marking absent:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du marquage");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'text-yellow-600 bg-yellow-50';
      case 'IN_PROGRESS': return 'text-green-600 bg-green-50';
      case 'COMPLETED': return 'text-blue-600 bg-blue-50';
      case 'CANCELLED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING': return 'En attente';
      case 'IN_PROGRESS': return 'En cours';
      case 'COMPLETED': return 'Terminé';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">
          Gestion des entretiens (Comité)
        </h3>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">
          Gestion des entretiens (Comité)
        </h3>
        <p className="text-yellow-700">
          Aucune salle assignée. Veuillez contacter l&apos;administrateur.
        </p>
      </div>
    );
  }

  const nextStudent = roomData.queue.find(q => q.status === 'WAITING' && q.queuePosition === 1);
  const upcomingStudents = roomData.queue
    .filter(q => q.status === 'WAITING' && q.queuePosition > 1)
    .sort((a, b) => a.queuePosition - b.queuePosition)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Committee Features Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">
          Gestion des entretiens (Comité)
        </h3>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Room Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-600">Salle assignée</p>
            <p className="font-medium">{roomData.name}</p>
            <p className="text-sm text-gray-500">{roomData.location}</p>
          </div>
          {roomData.company && (
            <div>
              <p className="text-gray-600">Entreprise</p>
              <p className="font-medium">{roomData.company.name}</p>
              <p className="text-sm text-gray-500">{roomData.company.sector}</p>
            </div>
          )}
        </div>

        {/* Current Interview */}
        {roomData.currentInterview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-green-800 mb-2">Entretien en cours</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900">
                  {roomData.currentInterview.student.name}
                </p>
                <p className="text-sm text-green-700">
                  Démarré à: {new Date(roomData.currentInterview.startedAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => handleEndInterview(roomData.currentInterview!._id)}
                disabled={actionLoading === 'end'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'end' ? 'Traitement...' : 'Terminer'}
              </button>
            </div>
          </div>
        )}

        {/* Next Student */}
        {nextStudent && !roomData.currentInterview && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Prochain étudiant</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-900">{nextStudent.student.name}</p>
                <p className="text-sm text-yellow-700">
                  Position: {nextStudent.queuePosition}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartInterview(nextStudent._id)}
                  disabled={actionLoading === 'start'}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'start' ? 'Démarrage...' : 'Commencer'}
                </button>
                <button
                  onClick={() => handleMarkAbsent(nextStudent._id)}
                  disabled={actionLoading === 'absent'}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'absent' ? 'Traitement...' : 'Absent'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Students */}
        {upcomingStudents.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Prochains étudiants ({upcomingStudents.length})
            </h4>
            <div className="space-y-2">
              {upcomingStudents.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {item.queuePosition}
                    </div>
                    <span className="text-sm font-medium">{item.student.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
