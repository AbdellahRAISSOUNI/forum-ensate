"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Company {
  _id: string;
  name: string;
  sector: string;
  logo?: string;
  website?: string;
  estimatedInterviewDuration: number;
  room?: {
    name: string;
    location: string;
  };
  queueLength: number;
  isSelected: boolean;
}

interface ConfirmationData {
  companyName: string;
  queuePosition: number;
  estimatedWaitTime: number;
}

export default function CompanySelectionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationData[] | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check role when session is loaded
    if (status === "authenticated") {
      if (session?.user?.role !== "student") {
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);
    }
  }, [session, status, router]);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      if (status !== "authenticated" || !isAuthorized) return;

      try {
        const response = await fetch('/api/student/companies');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des entreprises');
        }
        
        const data = await response.json();
        setCompanies(data.companies || []);
        
        // Pre-select already selected companies
        const alreadySelected = data.companies
          .filter((company: Company) => company.isSelected)
          .map((company: Company) => company._id);
        setSelectedCompanies(new Set(alreadySelected));
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching companies:", err);
        setError("Erreur lors du chargement des entreprises");
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [status, isAuthorized]);

  const handleCompanyToggle = (companyId: string, isCurrentlySelected: boolean) => {
    if (isCurrentlySelected) {
      // Cannot deselect already selected companies
      return;
    }

    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedCompanies(newSelected);
  };

  const handleSubmit = async () => {
    const newSelections = Array.from(selectedCompanies).filter(id => 
      !companies.find(c => c._id === id)?.isSelected
    );

    if (newSelections.length === 0) {
      setError("Veuillez sélectionner au moins une nouvelle entreprise");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/student/select-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyIds: newSelections
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sélection');
      }

      const data = await response.json();
      setConfirmation(data.interviews);
    } catch (err) {
      console.error("Error selecting companies:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sélection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (queueLength: number) => {
    if (queueLength === 0) return "text-green-600";
    if (queueLength <= 3) return "text-yellow-600";
    if (queueLength <= 6) return "text-orange-600";
    return "text-red-600";
  };

  const getStatusText = (queueLength: number) => {
    if (queueLength === 0) return "Disponible";
    if (queueLength <= 3) return "File courte";
    if (queueLength <= 6) return "File moyenne";
    return "File longue";
  };

  // Show loading state while checking authentication
  if (status === "loading" || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show unauthorized message if not a student
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 max-w-md w-full">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Accès non autorisé. Cette page est réservée aux étudiants.
              </p>
            </div>
          </div>
        </div>
        <Link href="/" className="text-[#0b2b5c] hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  // Show confirmation screen
  if (confirmation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link href="/etudiant/dashboard" className="text-[#0b2b5c] hover:underline mb-4 inline-block">
              ← Retour au tableau de bord
            </Link>
            <h1 className="text-2xl font-bold text-[#0b2b5c]">
              Sélection confirmée !
            </h1>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center mb-4">
              <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                Vos entreprises ont été sélectionnées avec succès
              </h2>
            </div>
            
            <div className="space-y-4">
              {confirmation.map((interview, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-medium text-gray-900">{interview.companyName}</h3>
                  <p className="text-gray-600">Position dans la file : {interview.queuePosition}</p>
                  <p className="text-gray-600">
                    Temps d&apos;attente estimé : {interview.estimatedWaitTime} minutes
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link href="/etudiant/dashboard">
              <button className="px-6 py-3 bg-[#0b2b5c] text-white rounded-md hover:bg-[#0a244e] transition-colors">
                Voir mon tableau de bord
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/etudiant/dashboard" className="text-[#0b2b5c] hover:underline mb-4 inline-block">
            ← Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-[#0b2b5c]">
            Sélectionner des entreprises
          </h1>
          <p className="text-gray-600 mt-1">
            Choisissez les entreprises avec lesquelles vous souhaitez passer un entretien
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {companies.map((company) => (
                <div
                  key={company._id}
                  className={`bg-white rounded-lg shadow p-6 border-2 transition-colors ${
                    selectedCompanies.has(company._id)
                      ? 'border-[#0b2b5c] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${company.isSelected ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {company.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{company.sector}</p>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0b2b5c] text-sm hover:underline"
                        >
                          Site web
                        </a>
                      )}
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.has(company._id)}
                        onChange={() => handleCompanyToggle(company._id, company.isSelected)}
                        disabled={company.isSelected}
                        className="h-5 w-5 text-[#0b2b5c] rounded border-gray-300 focus:ring-[#0b2b5c] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée estimée :</span>
                      <span className="font-medium">{company.estimatedInterviewDuration} min</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">File d&apos;attente :</span>
                      <span className={`font-medium ${getStatusColor(company.queueLength)}`}>
                        {company.queueLength} personnes
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut :</span>
                      <span className={`font-medium ${getStatusColor(company.queueLength)}`}>
                        {getStatusText(company.queueLength)}
                      </span>
                    </div>

                    {company.room && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Salle :</span>
                        <span className="font-medium">{company.room.name}</span>
                      </div>
                    )}

                    {company.isSelected && (
                      <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                        Déjà sélectionnée
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {companies.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune entreprise disponible pour le moment.</p>
              </div>
            )}

            {/* Selection Summary and Confirm Button */}
            {selectedCompanies.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">
                      {Array.from(selectedCompanies).filter(id => 
                        !companies.find(c => c._id === id)?.isSelected
                      ).length} nouvelle(s) entreprise(s) sélectionnée(s)
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || Array.from(selectedCompanies).filter(id => 
                      !companies.find(c => c._id === id)?.isSelected
                    ).length === 0}
                    className="px-6 py-3 bg-[#0b2b5c] text-white rounded-md hover:bg-[#0a244e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Confirmation...
                      </>
                    ) : (
                      'Confirmer la sélection'
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
