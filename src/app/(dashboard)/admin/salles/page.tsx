"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { forceLogout } from "@/lib/authUtils";

interface Company {
  _id: string;
  name: string;
  sector: string;
}

interface CommitteeMember {
  _id: string;
  name: string;
  email: string;
}

interface Room {
  _id: string;
  name: string;
  location: string;
  capacity: number;
  assignedCompany?: Company;
  committeeMembers: CommitteeMember[];
  currentStatus: 'free' | 'occupied';
}

interface RoomFormData {
  name: string;
  location: string;
  capacity: number;
  assignedCompanyId: string;
  committeeMembers: string[];
}

export default function RoomsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableMembers, setAvailableMembers] = useState<CommitteeMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    location: '',
    capacity: 10,
    assignedCompanyId: '',
    committeeMembers: []
  });

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
      const [roomsResponse, companiesResponse, membersResponse] = await Promise.all([
        fetch('/api/admin/rooms'),
        fetch('/api/admin/companies'),
        fetch('/api/admin/users?role=committee')
      ]);

      if (!roomsResponse.ok || !companiesResponse.ok || !membersResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const roomsData = await roomsResponse.json();
      const companiesData = await companiesResponse.json();
      const membersData = await membersResponse.json();
      
      setRooms(roomsData.rooms || []);
      setCompanies(companiesData.companies || []);
      setAvailableMembers(membersData.users || []);
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

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        assignedCompanyId: room.assignedCompany?._id || '',
        committeeMembers: room.committeeMembers.map(m => m._id)
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        location: '',
        capacity: 10,
        assignedCompanyId: '',
        committeeMembers: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setFormData({
      name: '',
      location: '',
      capacity: 10,
      assignedCompanyId: '',
      committeeMembers: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/admin/rooms';
      const method = editingRoom ? 'PUT' : 'POST';
      
      const requestData = editingRoom 
        ? { ...formData, roomId: editingRoom._id }
        : formData;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      console.error("Error saving room:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      committeeMembers: prev.committeeMembers.includes(memberId)
        ? prev.committeeMembers.filter(id => id !== memberId)
        : [...prev.committeeMembers, memberId]
    }));
  };

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
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar userName={session?.user?.name} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#0b2b5c]">
                Gestion des salles
              </h1>
              <p className="text-gray-600 mt-1">
                Gérer les salles et assignations
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Retour au tableau de bord
              </Link>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Ajouter une salle
              </button>
              <button
                onClick={forceLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    room.currentStatus === 'occupied'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {room.currentStatus === 'occupied' ? 'Occupée' : 'Libre'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Emplacement</p>
                    <p className="font-medium">{room.location}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Capacité</p>
                    <p className="font-medium">{room.capacity} personnes</p>
                  </div>

                  {room.assignedCompany ? (
                    <div>
                      <p className="text-sm text-gray-600">Entreprise assignée</p>
                      <p className="font-medium text-blue-600">{room.assignedCompany.name}</p>
                      <p className="text-sm text-gray-500">{room.assignedCompany.sector}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">Entreprise assignée</p>
                      <p className="text-gray-400">Aucune</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">Membres du comité ({room.committeeMembers.length})</p>
                    {room.committeeMembers.length > 0 ? (
                      <div className="mt-1">
                        {room.committeeMembers.map((member) => (
                          <span
                            key={member._id}
                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                          >
                            {member.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Aucun membre assigné</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => handleOpenModal(room)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune salle</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par créer une nouvelle salle.</p>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRoom ? 'Modifier la salle' : 'Ajouter une salle'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom de la salle *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Emplacement *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Capacité
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Entreprise assignée
                    </label>
                    <select
                      value={formData.assignedCompanyId}
                      onChange={(e) => setFormData({...formData, assignedCompanyId: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Aucune entreprise</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id}>
                          {company.name} - {company.sector}
                        </option>
                      ))}
                      {editingRoom?.assignedCompany && (
                        <option value={editingRoom.assignedCompany._id}>
                          {editingRoom.assignedCompany.name} - {editingRoom.assignedCompany.sector} (actuel)
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membres du comité
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {availableMembers.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucun membre du comité disponible</p>
                      ) : (
                        availableMembers.map((member) => (
                          <label key={member._id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              checked={formData.committeeMembers.includes(member._id)}
                              onChange={() => handleMemberToggle(member._id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{member.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingRoom ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
