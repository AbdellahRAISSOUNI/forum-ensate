"use client";

import { InterviewStatus } from "@/models/Interview";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Company {
  _id: string;
  name: string;
  sector: string;
}

interface Interview {
  _id: string;
  company: Company;
  status: InterviewStatus;
  startedAt?: string;
  completedAt?: string;
}

interface InterviewHistoryProps {
  interviews: Interview[];
}

export default function InterviewHistory({ interviews }: InterviewHistoryProps) {
  if (interviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Aucun historique d&apos;entretien disponible.</p>
      </div>
    );
  }

  // Status indicator styles and labels
  const statusConfig = {
    WAITING: {
      label: "En attente",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
    IN_PROGRESS: {
      label: "En cours",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    COMPLETED: {
      label: "Terminé",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    CANCELLED: {
      label: "Annulé",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: fr,
      });
    } catch {
      return "Date invalide";
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Entreprise
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Secteur
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Statut
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Date
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Durée
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {interviews.map((interview) => {
            const statusStyle = statusConfig[interview.status];
            
            // Calculate duration if applicable
            let duration = "N/A";
            if (interview.startedAt && interview.completedAt && interview.status === "COMPLETED") {
              const start = new Date(interview.startedAt);
              const end = new Date(interview.completedAt);
              const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
              duration = `${durationMinutes} min`;
            }

            return (
              <tr key={interview._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {interview.company.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {interview.company.sector}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}
                  >
                    {statusStyle.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(interview.completedAt || interview.startedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {duration}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}