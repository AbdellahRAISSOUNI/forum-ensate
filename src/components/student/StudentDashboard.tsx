"use client";

import { useEffect, useState, useCallback } from "react";
import { Session } from "next-auth";
import Link from "next/link";
import { forceLogout } from "@/lib/authUtils";
import CompanyCard from "./CompanyCard";
import dynamic from "next/dynamic";
import InterviewHistory from "./InterviewHistory";
import SessionMonitor from "@/components/SessionMonitor";
import RefreshSessionButton from "@/components/RefreshSessionButton";
import { InterviewStatus } from "@/models/Interview";

interface StudentDashboardProps {
  user: Session["user"];
}

interface Company {
  _id: string;
  name: string;
  logo?: string;
  sector: string;
  estimatedInterviewDuration?: number;
}

interface Interview {
  _id: string;
  student: string;
  company: Company;
  status: InterviewStatus;
  queuePosition: number;
  totalInQueue: number;
  estimatedWaitTime?: number; // in minutes
  roomName?: string;
  roomLocation?: string;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const StudentNotifications = dynamic(() => import("@/components/StudentNotifications"), { ssr: false });
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [historyInterviews, setHistoryInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/student/interviews');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }
      
      const data = await response.json();
      setInterviews(data.activeInterviews || []);
      setHistoryInterviews(data.historyInterviews || []);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching interviews:", err);
      setError("Erreur lors du chargement des entretiens");
      setIsLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleReschedule = async (interviewId: string) => {
    try {
      const response = await fetch('/api/student/interviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interviewId,
          action: 'reschedule'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du report');
      }

      // Refresh data after successful action
      await fetchData();
    } catch (err) {
      console.error("Error rescheduling interview:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du report");
    }
  };

  const handleCancel = async (interviewId: string) => {
    try {
      const response = await fetch('/api/student/interviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interviewId,
          action: 'cancel'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'annulation');
      }

      // Refresh data after successful action
      await fetchData();
    } catch (err) {
      console.error("Error cancelling interview:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'annulation");
    }
  };

  const activeInterviews = interviews.filter(
    (interview) => interview.status === "WAITING" || interview.status === "IN_PROGRESS"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionMonitor />
      <StudentNotifications />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#0b2b5c]">
                Bonjour, {user.name || "Étudiant"}
                {user.role === 'committee' && <span className="text-blue-600 text-lg ml-2">(Comité)</span>}
              </h1>
              <p className="text-gray-600 mt-1">
                {user.role === 'committee' 
                  ? "Tableau de bord étudiant - Vous avez aussi des fonctions de comité ci-dessus"
                  : "Bienvenue sur votre tableau de bord du Forum ENSA Tétouan"
                }
              </p>
            </div>
            <div className="flex gap-2">
              <RefreshSessionButton />
              <button
                onClick={forceLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#0b2b5c]">
              Mes entreprises sélectionnées
            </h2>
            <Link href="/etudiant/entreprises">
              <button className="px-4 py-2 bg-[#0b2b5c] text-white rounded-md hover:bg-[#0a244e] transition-colors">
                Sélectionner des entreprises
              </button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b2b5c]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          ) : activeInterviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">
                Vous n&apos;avez pas encore sélectionné d&apos;entreprises.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeInterviews.map((interview) => (
                <CompanyCard
                  key={interview._id}
                  interview={interview}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-[#0b2b5c] mb-4">
            Historique des entretiens
          </h2>
          <InterviewHistory interviews={historyInterviews} />
        </div>
      </div>
    </div>
  );
}