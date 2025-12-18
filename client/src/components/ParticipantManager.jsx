import React, { useState, useEffect } from 'react';
import { 
  Users, Trash2, Edit2, UserMinus, UserPlus, AlertCircle, Search, Filter, 
  Check, X, Plus, Save, Key, Trophy, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { normalizeTeamName, validateTeamName, findTeamByName } from '../utils/helpers';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Composant de pagination
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-600">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 text-sm dark:text-white">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ParticipantManager = ({ participants, teams, onUpdateParticipant, onDeleteTeam, onRefreshData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const toast = useToast();
  
  // Pagination
  const [teamsPage, setTeamsPage] = useState(1);
  const [participantsPage, setParticipantsPage] = useState(1);
  const teamsPerPage = 8;
  const participantsPerPage = 10;
  
  // Etats pour feedback normalisation
  const [normalizedPreview, setNormalizedPreview] = useState('');
  const [existingTeamMatch, setExistingTeamMatch] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Etats pour creation equipe
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', score: 0 });

  // Etats pour edition equipe
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamScore, setEditTeamScore] = useState(0);

  // Etats pour creation participant
  const [showCreateParticipant, setShowCreateParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ pseudo: '', password: '', teamName: '' });

  // Etats pour edition participant complete
  const [editingParticipantFull, setEditingParticipantFull] = useState(null);
  const [editParticipantData, setEditParticipantData] = useState({ teamName: '', newPassword: '' });

  // Vue active: 'teams' ou 'participants'
  const [activeView, setActiveView] = useState('teams');

  // Mettre a jour la previsualisation en temps reel
  useEffect(() => {
    if (newTeamName && editingParticipant) {
      const normalized = normalizeTeamName(newTeamName);
      setNormalizedPreview(normalized);
      const existingTeam = findTeamByName(teams, normalized);
      setExistingTeamMatch(existingTeam);
      const validation = validateTeamName(normalized);
      setValidationError(validation.valid ? '' : validation.error);
    } else {
      setNormalizedPreview('');
      setExistingTeamMatch(null);
      setValidationError('');
    }
  }, [newTeamName, editingParticipant, teams]);

  // Filtrer les participants
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.pseudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = !filterTeam || filterTeam === 'NO_TEAM' ? !p.teamName : p.teamName === filterTeam;
    if (filterTeam === 'NO_TEAM') return !p.teamName && matchesSearch;
    if (filterTeam) return matchesTeam && matchesSearch;
    return matchesSearch;
  });

  // Grouper par equipe
  const participantsByTeam = {};
  const noTeamParticipants = [];

  filteredParticipants.forEach(p => {
    if (p.teamName) {
      if (!participantsByTeam[p.teamName]) {
        participantsByTeam[p.teamName] = [];
      }
      participantsByTeam[p.teamName].push(p);
    } else {
      noTeamParticipants.push(p);
    }
  });

  // Statistiques
  const totalParticipants = participants.length;
  const totalTeams = teams.length;
  const participantsWithTeam = participants.filter(p => p.teamName).length;
  const participantsWithoutTeam = totalParticipants - participantsWithTeam;

  // === HANDLERS EQUIPES ===

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error('Le nom de l\'equipe est requis');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/teams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeam.name, score: newTeam.score })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Equipe "${data.team.name}" creee`);
        setShowCreateTeam(false);
        setNewTeam({ name: '', score: 0 });
        onRefreshData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur lors de la creation');
    }
  };

  const handleUpdateTeamScore = async (team) => {
    try {
      const response = await fetch(`${API_URL}/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: editTeamScore })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Score de "${team.name}" mis a jour`);
        setEditingTeam(null);
        onRefreshData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const handleDeleteTeam = async (teamName) => {
    const teamParticipants = participants.filter(p => p.teamName === teamName);
    const team = teams.find(t => t.name === teamName);

    const confirmed = window.confirm(
      `SUPPRIMER L'EQUIPE "${teamName}" ?\n\n` +
      `- ${teamParticipants.length} participant(s) seront sans equipe\n` +
      `- Score actuel: ${team?.validatedScore || 0} points (perdu)\n` +
      `- Cette action est irreversible\n\n` +
      `Continuer ?`
    );

    if (confirmed) {
      await onDeleteTeam(teamName);
      onRefreshData();
    }
  };

  // === HANDLERS PARTICIPANTS ===

  const handleCreateParticipant = async () => {
    if (!newParticipant.pseudo.trim()) {
      toast.error('Le pseudo est requis');
      return;
    }
    if (!newParticipant.password || newParticipant.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caracteres');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/participants/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParticipant)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Participant "${newParticipant.pseudo}" cree`);
        setShowCreateParticipant(false);
        setNewParticipant({ pseudo: '', password: '', teamName: '' });
        onRefreshData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur lors de la creation');
    }
  };

  const handleUpdateParticipantFull = async (participant) => {
    try {
      const updates = {};
      if (editParticipantData.teamName !== undefined) {
        updates.teamName = editParticipantData.teamName;
      }
      if (editParticipantData.newPassword && editParticipantData.newPassword.length >= 4) {
        updates.password = editParticipantData.newPassword;
      }

      const response = await fetch(`${API_URL}/participants/${participant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Participant "${participant.pseudo}" mis a jour`);
        setEditingParticipantFull(null);
        setEditParticipantData({ teamName: '', newPassword: '' });
        onRefreshData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const handleDeleteParticipant = async (participant) => {
    const confirmed = window.confirm(
      `SUPPRIMER LE PARTICIPANT "${participant.pseudo}" ?\n\n` +
      `Cette action est irreversible.`
    );

    if (confirmed) {
      try {
        const response = await fetch(`${API_URL}/participants/${participant.id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
          toast.success(`Participant "${participant.pseudo}" supprime`);
          onRefreshData();
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleChangeTeam = async (participant) => {
    const normalized = normalizeTeamName(newTeamName);
    const validation = validateTeamName(normalized);
    
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    await onUpdateParticipant(participant.id, { teamName: normalized });
    setEditingParticipant(null);
    setNewTeamName('');
    onRefreshData();
  };

  const handleRemoveFromTeam = async (participant) => {
    const confirmed = window.confirm(
      `Retirer "${participant.pseudo}" de l'equipe "${participant.teamName}" ?`
    );

    if (confirmed) {
      await onUpdateParticipant(participant.id, { teamName: '' });
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            Gestion des Participants et Equipes
          </h2>
          <button
            onClick={onRefreshData}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalParticipants}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalTeams}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Equipes</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{participantsWithTeam}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avec equipe</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{participantsWithoutTeam}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sans equipe</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView('teams')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeView === 'teams'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Equipes
          </button>
          <button
            onClick={() => setActiveView('participants')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeView === 'participants'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Participants
          </button>
        </div>

        {/* Filtres */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Toutes les equipes</option>
              {teams.map(team => (
                <option key={team.id} value={team.name}>
                  {team.name} ({participants.filter(p => p.teamName === team.name).length})
                </option>
              ))}
              <option value="NO_TEAM">Sans equipe ({participantsWithoutTeam})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vue Equipes */}
      {activeView === 'teams' && (
        <div className="space-y-4">
          {/* Bouton creer equipe */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            {!showCreateTeam ? (
              <button
                onClick={() => setShowCreateTeam(true)}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Creer une nouvelle equipe
              </button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-bold dark:text-white">Nouvelle equipe</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom de l'equipe"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Score initial (0)"
                    value={newTeam.score}
                    onChange={(e) => setNewTeam({...newTeam, score: parseInt(e.target.value) || 0})}
                    className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTeam}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Creer
                  </button>
                  <button
                    onClick={() => { setShowCreateTeam(false); setNewTeam({ name: '', score: 0 }); }}
                    className="flex-1 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Liste des equipes */}
          {(() => {
            const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
            const totalTeamsPages = Math.ceil(sortedTeams.length / teamsPerPage);
            const startIndex = (teamsPage - 1) * teamsPerPage;
            const paginatedTeams = sortedTeams.slice(startIndex, startIndex + teamsPerPage);
            
            return (
              <>
                {paginatedTeams.map(team => {
                  const teamMembers = participantsByTeam[team.name] || [];
                  const isEmpty = teamMembers.length === 0;
                  const isEditing = editingTeam?.id === team.id;

                  return (
              <div 
                key={team.id} 
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${
                  isEmpty ? 'border-2 border-orange-300 dark:border-orange-700' : ''
                }`}
              >
                <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
                  isEmpty 
                    ? 'bg-orange-50 dark:bg-orange-900/20' 
                    : 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${
                        isEmpty ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-purple-100 dark:bg-purple-900/50'
                      }`}>
                        <Users className={`w-6 h-6 ${
                          isEmpty ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                          {team.name}
                          {isEmpty && (
                            <span className="px-2 py-1 bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 text-xs rounded-full">
                              Vide
                            </span>
                          )}
                        </h3>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <input
                              type="number"
                              value={editTeamScore}
                              onChange={(e) => setEditTeamScore(parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">points</span>
                            <button
                              onClick={() => handleUpdateTeamScore(team)}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTeam(null)}
                              className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} - {team.validatedScore || 0} points
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => { setEditingTeam(team); setEditTeamScore(team.validatedScore || 0); }}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Score
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTeam(team.name)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Membres */}
                {!isEmpty && (
                  <div className="p-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {teamMembers.map(participant => (
                        <div key={participant.id} className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                          <p className="font-bold dark:text-white">{participant.pseudo}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {participant.id.substring(0, 8)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {teams.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucune equipe</p>
          )}
          <Pagination
            currentPage={teamsPage}
            totalPages={totalTeamsPages}
            onPageChange={setTeamsPage}
            itemsPerPage={teamsPerPage}
            totalItems={teams.length}
          />
        </>
      );
    })()}
        </div>
      )}

      {/* Vue Participants */}
      {activeView === 'participants' && (
        <div className="space-y-4">
          {/* Bouton creer participant */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            {!showCreateParticipant ? (
              <button
                onClick={() => setShowCreateParticipant(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Creer un nouveau participant
              </button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-bold dark:text-white">Nouveau participant</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Pseudo *"
                    value={newParticipant.pseudo}
                    onChange={(e) => setNewParticipant({...newParticipant, pseudo: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="password"
                    placeholder="Mot de passe * (min 4 car.)"
                    value={newParticipant.password}
                    onChange={(e) => setNewParticipant({...newParticipant, password: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <select
                    value={newParticipant.teamName}
                    onChange={(e) => setNewParticipant({...newParticipant, teamName: e.target.value})}
                    className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Sans equipe</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateParticipant}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Creer
                  </button>
                  <button
                    onClick={() => { setShowCreateParticipant(false); setNewParticipant({ pseudo: '', password: '', teamName: '' }); }}
                    className="flex-1 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Liste des participants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white">
                {filteredParticipants.length} participant{filteredParticipants.length > 1 ? 's' : ''}
              </h3>
            </div>
            {(() => {
              const totalParticipantsPages = Math.ceil(filteredParticipants.length / participantsPerPage);
              const startIndex = (participantsPage - 1) * participantsPerPage;
              const paginatedParticipants = filteredParticipants.slice(startIndex, startIndex + participantsPerPage);
              
              return (
                <>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedParticipants.map(participant => {
                      const isEditingFull = editingParticipantFull?.id === participant.id;
                      const isEditingTeam = editingParticipant?.id === participant.id;

                      return (
                        <div key={participant.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-lg dark:text-white">{participant.pseudo}</p>
                                {participant.teamName && (
                                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                                    {participant.teamName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">ID: {participant.id}</p>
                            </div>

                            {!isEditingFull && !isEditingTeam && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingParticipant(participant);
                                    setNewTeamName(participant.teamName || '');
                                  }}
                                  className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900"
                                  title="Changer d'equipe"
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingParticipantFull(participant);
                                    setEditParticipantData({ teamName: participant.teamName || '', newPassword: '' });
                                  }}
                                  className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteParticipant(participant)}
                                  className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                    </div>

                    {/* Edition equipe rapide */}
                    {isEditingTeam && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm font-semibold mb-2 dark:text-white">Changer d'equipe</p>
                        <div className="flex gap-2">
                          <select
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-600 dark:text-white"
                          >
                            <option value="">Sans equipe</option>
                            {teams.map(team => (
                              <option key={team.id} value={team.name}>{team.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleChangeTeam(participant)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingParticipant(null); setNewTeamName(''); }}
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edition complete */}
                    {isEditingFull && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
                        <p className="text-sm font-semibold dark:text-white">Modifier le participant</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">Equipe</label>
                            <select
                              value={editParticipantData.teamName}
                              onChange={(e) => setEditParticipantData({...editParticipantData, teamName: e.target.value})}
                              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Sans equipe</option>
                              {teams.map(team => (
                                <option key={team.id} value={team.name}>{team.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                            <input
                              type="password"
                              placeholder="Nouveau mot de passe"
                              value={editParticipantData.newPassword}
                              onChange={(e) => setEditParticipantData({...editParticipantData, newPassword: e.target.value})}
                              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateParticipantFull(participant)}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => { setEditingParticipantFull(null); setEditParticipantData({ teamName: '', newPassword: '' }); }}
                            className="flex-1 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredParticipants.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    {searchTerm || filterTeam ? 'Aucun resultat' : 'Aucun participant'}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4">
              <Pagination
                currentPage={participantsPage}
                totalPages={totalParticipantsPages}
                onPageChange={setParticipantsPage}
                itemsPerPage={participantsPerPage}
                totalItems={filteredParticipants.length}
              />
            </div>
          </>
        );
      })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantManager;
