"use client";

import { useState, useEffect, useCallback } from 'react';
import { UserRole, StudentStatus, OpportunityType } from '@/models/User';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: StudentStatus;
  opportunityType?: OpportunityType;
  isCommittee: boolean;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/users?page=${page}&limit=${pagination.limit}`;
      if (roleFilter) url += `&role=${roleFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Une erreur est survenue lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, pagination.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchUsers(newPage);
    }
  };

  const toggleCommitteeStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users?action=toggle-committee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, isCommittee: !user.isCommittee, role: !user.isCommittee ? 'committee' : user.role } 
          : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Une erreur est survenue lors de la mise à jour de l&apos;utilisateur');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const translateRole = (role: string) => {
    switch (role) {
      case 'student': return 'Étudiant';
      case 'committee': return 'Comité';
      default: return role;
    }
  };

  const translateStatus = (status?: string) => {
    if (!status) return '-';
    switch (status) {
      case 'ENSA': return 'ENSA Tétouan';
      case 'EXTERNE': return 'Externe';
      default: return status;
    }
  };

  const translateOpportunityType = (type?: string) => {
    if (!type) return '-';
    switch (type) {
      case 'PFA': return 'PFA';
      case 'PFE': return 'PFE';
      case 'STAGE_OBSERVATION': return 'Stage d&apos;observation';
      case 'EMPLOI': return 'Emploi';
      default: return type;
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700">
            Filtrer par rôle
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37] sm:text-sm rounded-md"
          >
            <option value="">Tous les rôles</option>
            <option value="student">Étudiant</option>
            <option value="committee">Comité</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
            Filtrer par statut
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37] sm:text-sm rounded-md"
          >
            <option value="">Tous les statuts</option>
            <option value="ENSA">ENSA Tétouan</option>
            <option value="EXTERNE">Externe</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type d&apos;opportunité
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date d&apos;inscription
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b2b5c]"></div>
                    <span className="ml-2">Chargement...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {translateRole(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {translateStatus(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {translateOpportunityType(user.opportunityType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => toggleCommitteeStatus(user._id)}
                      className={`text-sm font-medium px-3 py-1 rounded ${
                        user.isCommittee
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.isCommittee ? 'Retirer du comité' : 'Ajouter au comité'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Affichage de {(pagination.page - 1) * pagination.limit + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} utilisateurs
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}