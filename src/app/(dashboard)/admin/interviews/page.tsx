"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AdminNavbar from "@/components/admin/AdminNavbar";

interface Student {
  _id: string;
  name: string;
  email: string;
  status: 'ENSA' | 'EXTERNE';
  opportunityType: string;
}

interface Company {
  _id: string;
  name: string;
  sector: string;
}

interface Room {
  _id: string;
  name: string;
  location: string;
}

interface Interview {
  _id: string;
  student: Student;
  company: Company;
  room?: Room;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  queuePosition: number;
  priority: number;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InterviewsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    // Check authentication
    if (status === "unauthenticated") {
      router.push("/admin/login");
      return;
    }

    // Check role when session is loaded
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);
    }
  }, [session, status, router]);

  // Fetch data
  const fetchData = async () => {
    if (!isAuthorized) return;

    try {
      const [interviewsResponse, companiesResponse] = await Promise.all([
        fetch('/api/admin/interviews'),
        fetch('/api/admin/companies')
      ]);

      if (!interviewsResponse.ok || !companiesResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const interviewsData = await interviewsResponse.json();
      const companiesData = await companiesResponse.json();
      
      setInterviews(interviewsData.interviews || []);
      setCompanies(companiesData.companies || []);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Erreur lors du chargement des données");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isAuthorized) return;
    
    const intervalId = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isAuthorized]);

  const handleStatusChange = async (interviewId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/interviews/${interviewId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      await fetchData();
    } catch (err) {
      console.error("Error updating interview status:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 9) return 'bg-red-100 text-red-800';
    if (priority >= 7) return 'bg-orange-100 text-orange-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesStatus = !statusFilter || interview.status === statusFilter;
    const matchesCompany = !companyFilter || interview.company._id === companyFilter;
    const matchesSearch = !searchTerm || 
      interview.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.company.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesCompany && matchesSearch;
  });

  // Group interviews by company for better visualization
  const interviewsByCompany = companies.map(company => ({
    company,
    interviews: filteredInterviews.filter(interview => interview.company._id === company._id)
  })).filter(group => group.interviews.length > 0);

  // Show loading state while checking authentication
  if (status === "loading" || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show unauthorized message if not admin
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
                Accès non autorisé. Cette page est réservée aux administrateurs.
              </p>
            </div>
          </div>
        </div>
        <Link href="/admin/login" className="text-[#0b2b5c] hover:underline">
          Se connecter en tant qu&apos;administrateur
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar userName={session?.user?.name} />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar userName={session?.user?.name} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0b2b5c]">
            Gestion des entretiens
          </h1>
          <p className="text-gray-600 mt-1">
            Voir et gérer toutes les files d&apos;attente d&apos;entretiens
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Étudiant ou entreprise..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="WAITING">En attente</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entreprise
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les entreprises</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setCompanyFilter('');
                  fetchData();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">En attente</p>
                <p className="text-2xl font-bold text-gray-900">
                  {interviews.filter(i => i.status === 'WAITING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">▶️</span>
                </div>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">En cours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {interviews.filter(i => i.status === 'IN_PROGRESS').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✅</span>
                </div>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Terminés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {interviews.filter(i => i.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">❌</span>
                </div>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Annulés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {interviews.filter(i => i.status === 'CANCELLED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interviews by Company */}
        <div className="space-y-6">
          {interviewsByCompany.map(({ company, interviews: companyInterviews }) => (
            <div key={company._id} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {company.name} - {company.sector}
                </h3>
                <p className="text-sm text-gray-500">
                  {companyInterviews.length} entretien(s)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Étudiant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priorité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companyInterviews
                      .sort((a, b) => a.queuePosition - b.queuePosition)
                      .map((interview) => (
                      <tr key={interview._id} className={interview.status === 'IN_PROGRESS' ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-xs font-medium text-gray-800">
                              {interview.queuePosition}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {interview.student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {interview.student.status} - {interview.student.opportunityType}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(interview.priority)}`}>
                            {interview.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={interview.status}
                            onChange={(e) => handleStatusChange(interview._id, e.target.value)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusColor(interview.status)}`}
                          >
                            <option value="WAITING">En attente</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="COMPLETED">Terminé</option>
                            <option value="CANCELLED">Annulé</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interview.room ? `${interview.room.name} - ${interview.room.location}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interview.startedAt ? (
                            <div>
                              <div>Démarré: {new Date(interview.startedAt).toLocaleTimeString()}</div>
                              {interview.completedAt && (
                                <div>Terminé: {new Date(interview.completedAt).toLocaleTimeString()}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Non démarré</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {interview.status === 'WAITING' && (
                              <button
                                onClick={() => handleStatusChange(interview._id, 'IN_PROGRESS')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Démarrer
                              </button>
                            )}
                            {interview.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleStatusChange(interview._id, 'COMPLETED')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Terminer
                              </button>
                            )}
                            {['WAITING', 'IN_PROGRESS'].includes(interview.status) && (
                              <button
                                onClick={() => handleStatusChange(interview._id, 'CANCELLED')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {interviewsByCompany.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun entretien trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun entretien ne correspond aux filtres sélectionnés.
            </p>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Mise à jour automatique toutes les 10 secondes
          </p>
        </div>
      </div>
    </div>
  );
}
