"use client";

import { InterviewStatus } from "@/models/Interview";
import Image from "next/image";

interface Company {
  _id: string;
  name: string;
  logo?: string;
  sector: string;
  estimatedInterviewDuration?: number;
}

interface Interview {
  _id: string;
  company: Company;
  status: InterviewStatus;
  queuePosition: number;
  totalInQueue: number;
  estimatedWaitTime?: number;
  roomName?: string;
  roomLocation?: string;
}

interface CompanyCardProps {
  interview: Interview;
  onReschedule: (interviewId: string) => void;
  onCancel: (interviewId: string) => void;
}

export default function CompanyCard({
  interview,
  onReschedule,
  onCancel,
}: CompanyCardProps) {
  const { company, status, queuePosition, totalInQueue, estimatedWaitTime, roomName, roomLocation } = interview;

  // Status indicator styles and labels
  const statusConfig = {
    WAITING: {
      label: "En attente",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-200",
    },
    IN_PROGRESS: {
      label: "En cours",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-200",
    },
    COMPLETED: {
      label: "Terminé",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      borderColor: "border-blue-200",
    },
    CANCELLED: {
      label: "Annulé",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      borderColor: "border-red-200",
    },
  };

  const statusStyle = statusConfig[status];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg text-[#0b2b5c]">{company.name}</h3>
            <p className="text-sm text-gray-500">{company.sector}</p>
          </div>
          {company.logo ? (
            <div className="h-12 w-12 relative">
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              {company.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor} ${statusStyle.borderColor} border`}
          >
            {statusStyle.label}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Position:</span>
            <span className="text-sm font-medium">
              {queuePosition}/{totalInQueue}
            </span>
          </div>

          {estimatedWaitTime && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Temps d&apos;attente estimé:</span>
              <span className="text-sm font-medium">
                {estimatedWaitTime < 60
                  ? `${estimatedWaitTime} min`
                  : `${Math.floor(estimatedWaitTime / 60)}h ${estimatedWaitTime % 60}min`}
              </span>
            </div>
          )}

          {roomName && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Salle:</span>
              <span className="text-sm font-medium">{roomName}</span>
            </div>
          )}

          {roomLocation && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Emplacement:</span>
              <span className="text-sm font-medium">{roomLocation}</span>
            </div>
          )}
        </div>

        {/* Progress bar for queue position */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-[#d4af37] h-2 rounded-full"
            style={{
              width: `${
                totalInQueue > 0
                  ? ((totalInQueue - queuePosition + 1) / totalInQueue) * 100
                  : 0
              }%`,
            }}
          ></div>
        </div>

        <div className="flex space-x-2">
          {status === "WAITING" && (
            <>
              <button
                onClick={() => onReschedule(interview._id)}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-[#0b2b5c] text-[#0b2b5c] hover:bg-[#0b2b5c]/5 transition-colors"
              >
                Reporter
              </button>
              <button
                onClick={() => onCancel(interview._id)}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
              >
                Annuler
              </button>
            </>
          )}
          {status === "IN_PROGRESS" && (
            <button
              disabled
              className="w-full px-3 py-2 text-sm font-medium rounded-md bg-green-100 text-green-800 cursor-not-allowed"
            >
              Entretien en cours
            </button>
          )}
        </div>
      </div>
    </div>
  );
}