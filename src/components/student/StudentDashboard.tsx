"use client";

import { useEffect, useState, useCallback } from "react";
import { Session } from "next-auth";
import CompanyCard from "./CompanyCard";
import InterviewHistory from "./InterviewHistory";
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
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [historyInterviews, setHistoryInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      // In a real app, this would be an API call
      // For now, we'll simulate with mock data
      const mockInterviews: Interview[] = [
        {
          _id: "1",
          student: user.id,
          company: {
            _id: "c1",
            name: "Microsoft",
            sector: "Technologie",
            logo: "/microsoft.png", // This would be a real path in production
            estimatedInterviewDuration: 30,
          },
          status: "WAITING",
          queuePosition: 5,
          totalInQueue: 12,
          estimatedWaitTime: 45,
          roomName: "Salle A",
          roomLocation: "Bâtiment principal, 2ème étage",
        },
        {
          _id: "2",
          student: user.id,
          company: {
            _id: "c2",
            name: "Orange",
            sector: "Télécommunications",
            estimatedInterviewDuration: 20,
          },
          status: "IN_PROGRESS",
          queuePosition: 1,
          totalInQueue: 8,
          roomName: "Salle B",
          roomLocation: "Bâtiment annexe, Rez-de-chaussée",
        },
      ];

      const mockHistory: Interview[] = [
        {
          _id: "3",
          student: user.id,
          company: {
            _id: "c3",
            name: "IBM",
            sector: "Technologie",
          },
          status: "COMPLETED",
          queuePosition: 0,
          totalInQueue: 0,
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3400000).toISOString(),
        },
        {
          _id: "4",
          student: user.id,
          company: {
            _id: "c4",
            name: "Alten",
            sector: "Conseil",
          },
          status: "CANCELLED",
          queuePosition: 0,
          totalInQueue: 0,
        },
      ];

      // In a real app, we would fetch from API
      // const response = await fetch('/api/student/interviews');
      // const data = await response.json();
      // setInterviews(data.activeInterviews);
      // setHistoryInterviews(data.historyInterviews);

      setInterviews(mockInterviews);
      setHistoryInterviews(mockHistory);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching interviews:", err);
      setError("Erreur lors du chargement des entretiens");
      setIsLoading(false);
    }
  }, [user.id]);

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
    // In a real app, this would be an API call
    console.log("Rescheduling interview:", interviewId);
    // After API call, refresh data
    await fetchData();
  };

  const handleCancel = async (interviewId: string) => {
    // In a real app, this would be an API call
    console.log("Cancelling interview:", interviewId);
    // After API call, refresh data
    await fetchData();
  };

  const activeInterviews = interviews.filter(
    (interview) => interview.status === "WAITING" || interview.status === "IN_PROGRESS"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0b2b5c]">
            Bonjour, {user.name || "Étudiant"}
          </h1>
          <p className="text-gray-600 mt-1">
            Bienvenue sur votre tableau de bord du Forum ENSA Tétouan
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#0b2b5c]">
              Mes entreprises sélectionnées
            </h2>
            <button className="px-4 py-2 bg-[#0b2b5c] text-white rounded-md hover:bg-[#0a244e] transition-colors">
              Sélectionner des entreprises
            </button>
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