"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { forceLogout } from "@/lib/authUtils";

interface Room {
  _id: string;
  name: string;
  location: string;
}

type CommitteeMemberRef = { _id: string } | string;
interface ApiRoom extends Room {
  committeeMembers?: CommitteeMemberRef[];
}

interface CommitteeMember {
  _id: string;
  name: string;
  email: string;
  assignedRooms?: Room[];
  isActive: boolean;
  createdAt: string;
}

interface ImportData {
  name: string;
  email: string;
  assignedRoomIds?: string[];
}

export default function CommitteeManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [manualData, setManualData] = useState<ImportData>({
    name: '',
    email: '',
    assignedRoomIds: []
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [bulkRoomId, setBulkRoomId] = useState('');

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
      const [membersResponse, roomsResponse] = await Promise.all([
        fetch('/api/admin/users?role=committee'),
        fetch('/api/admin/rooms')
      ]);

      if (!membersResponse.ok || !roomsResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const membersData = await membersResponse.json();
      const roomsData = await roomsResponse.json();
      
      const fetchedRooms: ApiRoom[] = (roomsData.rooms || []) as ApiRoom[];
      setRooms(fetchedRooms);

      const users = (membersData.users || []) as Array<Partial<CommitteeMember>>;

      const usersWithDerivedRooms = users.map((u) => {
        const assigned: Room[] | undefined = u.assignedRooms && u.assignedRooms.length > 0
          ? u.assignedRooms
          : fetchedRooms
              .filter((r) => (r.committeeMembers || []).some((cm) => {
                const cmId = typeof cm === 'string' ? cm : cm._id;
                return cmId === (u._id as string);
              }))
              .map((r) => ({ _id: r._id, name: r.name, location: r.location }));
        return {
          ...u,
          assignedRooms: assigned || []
        } as CommitteeMember;
      });

      setMembers(usersWithDerivedRooms);
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

  const handleCsvImport = async () => {
    try {
      const lines = csvData.trim().split('\n');
      const members: ImportData[] = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const [name, email, roomNames] = lines[i].split(',').map(s => s.trim());
        
        if (name && email) {
          const assignedRoomIds: string[] = [];
          
          if (roomNames) {
            const roomNamesList = roomNames.split(';').map(r => r.trim());
            for (const roomName of roomNamesList) {
              const room = rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase());
              if (room) {
                assignedRoomIds.push(room._id);
              }
            }
          }

          members.push({
            name,
            email,
            assignedRoomIds
          });
        }
      }

      const response = await fetch('/api/admin/committee/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'importation');
      }

      await fetchData();
      setIsImportModalOpen(false);
      setCsvData('');
    } catch (err) {
      console.error("Error importing members:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'importation");
    }
  };

  const handleManualAdd = async () => {
    try {
      const response = await fetch('/api/admin/committee/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members: [manualData] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'ajout');
      }

      await fetchData();
      setIsManualModalOpen(false);
      setManualData({ name: '', email: '', assignedRoomIds: [] });
    } catch (err) {
      console.error("Error adding member:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    }
  };

  const handleBulkRoomAssignment = async () => {
    if (!bulkRoomId || selectedMembers.length === 0) return;

    try {
      const response = await fetch('/api/admin/committee/assign-room', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberIds: selectedMembers,
          roomId: bulkRoomId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'assignation');
      }

      await fetchData();
      setSelectedMembers([]);
      setBulkRoomId('');
    } catch (err) {
      console.error("Error assigning rooms:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'assignation");
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleRoomToggle = (roomId: string) => {
    setManualData(prev => ({
      ...prev,
      assignedRoomIds: prev.assignedRoomIds?.includes(roomId)
        ? prev.assignedRoomIds.filter(id => id !== roomId)
        : [...(prev.assignedRoomIds || []), roomId]
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
                Gestion du comité
              </h1>
              <p className="text-gray-600 mt-1">
                Gérer les membres du comité d&apos;organisation
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
                onClick={() => setIsManualModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Ajouter un membre
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Importer CSV
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

        {/* Bulk Actions */}
        {selectedMembers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  {selectedMembers.length} membre(s) sélectionné(s)
                </h3>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={bulkRoomId}
                  onChange={(e) => setBulkRoomId(e.target.value)}
                  className="border border-blue-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Assigner à une salle</option>
                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.name} - {room.location}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkRoomAssignment}
                  disabled={!bulkRoomId}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Assigner
                </button>
                <button
                  onClick={() => setSelectedMembers([])}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === members.length && members.length > 0}
                        onChange={(e) => setSelectedMembers(e.target.checked ? members.map(m => m._id) : [])}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salles assignées
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d&apos;ajout
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member._id} className={selectedMembers.includes(member._id) ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member._id)}
                          onChange={() => handleMemberToggle(member._id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(member.assignedRooms?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(member.assignedRooms ?? []).map((room) => (
                              <span
                                key={room._id}
                                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                              >
                                {room.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Aucune salle</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.isActive !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.isActive !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {members.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun membre du comité trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* CSV Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Importer des membres via CSV
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Format CSV attendu (première ligne = en-têtes):
                  </p>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    nom,email,salles<br/>
                    Jean Dupont,jean@example.com,Salle A;Salle B<br/>
                    Marie Martin,marie@example.com,Salle C
                  </div>
                </div>

                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Collez vos données CSV ici..."
                  className="w-full h-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCsvImport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Importer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Add Modal */}
        {isManualModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Ajouter un membre du comité
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualData.name}
                      onChange={(e) => setManualData({...manualData, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={manualData.email}
                      onChange={(e) => setManualData({...manualData, email: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salles assignées
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {rooms.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune salle disponible</p>
                      ) : (
                        rooms.map((room) => (
                          <label key={room._id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              checked={manualData.assignedRoomIds?.includes(room._id) || false}
                              onChange={() => handleRoomToggle(room._id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {room.name} - {room.location}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleManualAdd}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
