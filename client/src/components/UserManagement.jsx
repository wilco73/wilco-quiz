import React, { useState, useEffect, useMemo } from 'react';
import { Users, Crown, Shield, User, Search, ChevronDown, Check, X, RefreshCw } from 'lucide-react';
import { useToast } from './ToastProvider';

const ROLES = {
  user: { label: 'Utilisateur', icon: User, color: 'gray' },
  admin: { label: 'Admin', icon: Shield, color: 'blue' },
  superadmin: { label: 'Super Admin', icon: Crown, color: 'yellow' }
};

const UserManagement = ({ socket, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const toast = useToast();

  // Charger les utilisateurs
  const loadUsers = () => {
    if (!socket || !currentUser?.id) {
      console.log('[UserManagement] Socket ou currentUser manquant', { socket: !!socket, currentUser });
      setLoading(false);
      return;
    }
    
    console.log('[UserManagement] Chargement des utilisateurs...', { requesterId: currentUser.id });
    setLoading(true);
    
    // Timeout de sécurité
    const timeout = setTimeout(() => {
      console.log('[UserManagement] Timeout - pas de réponse du serveur');
      toast.error('Timeout - le serveur ne répond pas');
      setLoading(false);
    }, 10000);
    
    socket.emit('auth:getAllUsers', { requesterId: currentUser.id }, (response) => {
      clearTimeout(timeout);
      console.log('[UserManagement] Réponse reçue:', response);
      
      if (response?.success) {
        setUsers(response.users || []);
      } else {
        toast.error(response?.message || 'Erreur lors du chargement');
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadUsers();
  }, [socket, currentUser?.id]);

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.pseudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !filterRole || user.role === filterRole;
      const matchesTeam = !filterTeam || user.teamName === filterTeam;
      return matchesSearch && matchesRole && matchesTeam;
    });
  }, [users, searchTerm, filterRole, filterTeam]);

  // Liste des équipes uniques
  const teams = useMemo(() => {
    return [...new Set(users.map(u => u.teamName).filter(Boolean))].sort();
  }, [users]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      superadmins: users.filter(u => u.role === 'superadmin').length,
      users: users.filter(u => u.role === 'user').length
    };
  }, [users]);

  // Changer le rôle d'un utilisateur
  const handleRoleChange = (userId, newRole) => {
    socket.emit('auth:updateRole', {
      requesterId: currentUser.id,
      targetId: userId,
      newRole
    }, (response) => {
      if (response.success) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ));
        toast.success(`Rôle mis à jour !`);
      } else {
        toast.error(response.message || 'Erreur lors de la mise à jour');
      }
      setEditingUserId(null);
    });
  };

  const getRoleIcon = (role) => {
    const RoleIcon = ROLES[role]?.icon || User;
    return <RoleIcon className="w-4 h-4" />;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'admin': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Gestion des utilisateurs
          </h2>
          <button
            onClick={loadUsers}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{stats.users}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.admins}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">Admins</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.superadmins}</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Super Admins</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Tous les rôles</option>
            <option value="user">Utilisateurs</option>
            <option value="admin">Admins</option>
            <option value="superadmin">Super Admins</option>
          </select>
          
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Toutes les équipes</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Équipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                        {user.pseudo.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {user.pseudo}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                              Vous
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {user.id.substring(0, 15)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.teamName ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded">
                        {user.teamName}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">
                        Aucune
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      {ROLES[user.role]?.label || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.id === currentUser?.id ? (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                    ) : user.role === 'superadmin' ? (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">Protégé</span>
                    ) : editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            user.role === 'admin' 
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'Retirer Admin' : 'Promouvoir Admin'}
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingUserId(user.id)}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
                      >
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucun utilisateur trouvé
            </p>
          </div>
        )}
        
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-400">
          {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
