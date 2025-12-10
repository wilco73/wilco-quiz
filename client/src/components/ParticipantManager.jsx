import React, { useState, useEffect } from 'react';
import { Users, Trash2, Edit2, UserMinus, UserPlus, AlertCircle, Search, Filter, Check, X } from 'lucide-react';
import { normalizeTeamName, validateTeamName, findTeamByName } from '../utils/helpers';
import { useToast } from './ToastProvider';

const ParticipantManager = ({ participants, teams, onUpdateParticipant, onDeleteTeam, onRefreshData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const toast = useToast();
  
  // ✅ NOUVEAU: États pour feedback normalisation
  const [normalizedPreview, setNormalizedPreview] = useState('');
  const [existingTeamMatch, setExistingTeamMatch] = useState(null);
  const [validationError, setValidationError] = useState('');

  // ✅ NOUVEAU: Mettre à jour la prévisualisation en temps réel
  useEffect(() => {
    if (newTeamName && editingParticipant) {
      const normalized = normalizeTeamName(newTeamName);
      setNormalizedPreview(normalized);
      
      // Vérifier si une équipe existante correspond
      const existingTeam = findTeamByName(teams, normalized);
      setExistingTeamMatch(existingTeam);
      
      // Valider
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
    const matchesTeam = !filterTeam || p.teamName === filterTeam;
    return matchesSearch && matchesTeam;
  });

  // Grouper par équipe
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

  // Changer l'équipe d'un participant
  const handleChangeTeam = async (participant) => {
    // ✅ AMÉLIORATION: Valider avant d'envoyer
    const normalized = normalizeTeamName(newTeamName);
    const validation = validateTeamName(normalized);
    
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Vérifier si changement vers équipe existante
    const existingTeam = findTeamByName(teams, normalized);
    let confirmMessage = '';
    
    if (existingTeam && existingTeam.name !== normalized) {
      // Équipe existe avec casse différente
      confirmMessage = `Changer "${participant.pseudo}" vers l'équipe existante "${existingTeam.name}" ?\n\n` +
                      `(Vous avez tapé: "${newTeamName}")`;
    } else if (existingTeam) {
      // Équipe existe exactement
      confirmMessage = `Changer "${participant.pseudo}" de l'équipe "${participant.teamName || 'Aucune'}" vers "${existingTeam.name}" ?`;
    } else {
      // Nouvelle équipe
      confirmMessage = `Créer une nouvelle équipe "${normalized}" et y assigner "${participant.pseudo}" ?\n\n` +
                      `(Équipe actuelle: "${participant.teamName || 'Aucune'}")`;
    }

    const confirmed = window.confirm(confirmMessage);

    if (confirmed) {
      await onUpdateParticipant(participant.id, { teamName: normalized });
      setEditingParticipant(null);
      setNewTeamName('');
      onRefreshData();
    }
  };

  // Retirer un participant de son équipe
  const handleRemoveFromTeam = async (participant) => {
    const confirmed = window.confirm(
      `Retirer "${participant.pseudo}" de l'équipe "${participant.teamName}" ?\n\nLe participant restera inscrit mais sans équipe.`
    );

    if (confirmed) {
      await onUpdateParticipant(participant.id, { teamName: '' });
      onRefreshData();
    }
  };

  // Supprimer une équipe
  const handleDeleteTeam = async (teamName) => {
    const teamParticipants = participants.filter(p => p.teamName === teamName);
    const team = teams.find(t => t.name === teamName);

    const confirmed = window.confirm(
      `⚠️  SUPPRIMER L'ÉQUIPE "${teamName}" ?\n\n` +
      `- ${teamParticipants.length} participant(s) seront sans équipe\n` +
      `- Score actuel: ${team?.validatedScore || 0} points (perdu)\n` +
      `- Cette action est irréversible\n\n` +
      `Continuer ?`
    );

    if (confirmed) {
      await onDeleteTeam(teamName);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white flex items-center gap-2">
          <Users className="w-7 h-7" />
          Gestion des Participants et Équipes
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalParticipants}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalTeams}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Équipes</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{participantsWithTeam}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avec équipe</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{participantsWithoutTeam}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sans équipe</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un participant ou une équipe..."
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
              <option value="">Toutes les équipes</option>
              {teams.map(team => (
                <option key={team.id} value={team.name}>{team.name} ({participants.filter(p => p.teamName === team.name).length})</option>
              ))}
              <option value="NO_TEAM">Sans équipe ({participantsWithoutTeam})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste par équipe */}
      <div className="space-y-4">
        {Object.keys(participantsByTeam).sort().map(teamName => {
          const team = teams.find(t => t.name === teamName);
          const teamMembers = participantsByTeam[teamName];

          return (
            <div key={teamName} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              {/* Header de l'équipe */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full p-2">
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold dark:text-white">{teamName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} • {team?.validatedScore || 0} points
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteTeam(teamName)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer l'équipe
                  </button>
                </div>
              </div>

              {/* Membres de l'équipe */}
              <div className="p-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamMembers.map(participant => (
                    <div 
                      key={participant.id}
                      className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:border-purple-400 dark:hover:border-purple-500 transition bg-white dark:bg-gray-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-bold dark:text-white">{participant.pseudo}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {participant.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>

                      {editingParticipant?.id === participant.id ? (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            placeholder="Nouvelle équipe"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            onKeyPress={(e) => e.key === 'Enter' && !validationError && handleChangeTeam(participant)}
                          />
                          
                          {/* ✅ NOUVEAU: Feedback normalisation */}
                          {normalizedPreview && normalizedPreview !== newTeamName && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs">
                              <p className="text-blue-700 dark:text-blue-300">
                                Sera normalisé en: "<span className="font-bold">{normalizedPreview}</span>"
                              </p>
                            </div>
                          )}
                          
                          {/* ✅ NOUVEAU: Équipe existante trouvée */}
                          {existingTeamMatch && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs flex items-start gap-1">
                              <Check className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <p className="text-green-700 dark:text-green-300">
                                Équipe existante: "<span className="font-bold">{existingTeamMatch.name}</span>" ({existingTeamMatch.validatedScore || 0} pts)
                              </p>
                            </div>
                          )}
                          
                          {/* ✅ NOUVEAU: Erreur validation */}
                          {validationError && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs flex items-start gap-1">
                              <X className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <p className="text-red-700 dark:text-red-300">{validationError}</p>
                            </div>
                          )}
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleChangeTeam(participant)}
                              disabled={!!validationError}
                              className={`flex-1 px-2 py-1 text-white text-xs rounded ${
                                validationError 
                                  ? 'bg-gray-400 cursor-not-allowed' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              ✓ OK
                            </button>
                            <button
                              onClick={() => {
                                setEditingParticipant(null);
                                setNewTeamName('');
                              }}
                              className="flex-1 px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                              ✗ Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => {
                              setEditingParticipant(participant);
                              setNewTeamName(participant.teamName);
                            }}
                            className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Changer
                          </button>
                          <button
                            onClick={() => handleRemoveFromTeam(participant)}
                            className="flex-1 px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 flex items-center justify-center gap-1"
                          >
                            <UserMinus className="w-3 h-3" />
                            Retirer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Participants sans équipe */}
        {(noTeamParticipants.length > 0 || filterTeam === 'NO_TEAM') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-900/50 rounded-full p-2">
                  <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Sans Équipe</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {noTeamParticipants.length} participant{noTeamParticipants.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {noTeamParticipants.map(participant => (
                  <div 
                    key={participant.id}
                    className="border-2 border-orange-200 dark:border-orange-600 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-bold dark:text-white">{participant.pseudo}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {participant.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>

                    {editingParticipant?.id === participant.id ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Nom de l'équipe"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          onKeyPress={(e) => e.key === 'Enter' && !validationError && handleChangeTeam(participant)}
                        />
                        
                        {/* Feedback normalisation (même code que ci-dessus) */}
                        {normalizedPreview && normalizedPreview !== newTeamName && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs">
                            <p className="text-blue-700 dark:text-blue-300">
                              Sera normalisé en: "<span className="font-bold">{normalizedPreview}</span>"
                            </p>
                          </div>
                        )}
                        
                        {existingTeamMatch && (
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs flex items-start gap-1">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <p className="text-green-700 dark:text-green-300">
                              Équipe existante: "<span className="font-bold">{existingTeamMatch.name}</span>"
                            </p>
                          </div>
                        )}
                        
                        {validationError && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs flex items-start gap-1">
                            <X className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 dark:text-red-300">{validationError}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleChangeTeam(participant)}
                            disabled={!!validationError}
                            className={`flex-1 px-2 py-1 text-white text-xs rounded ${
                              validationError 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            ✓ Assigner
                          </button>
                          <button
                            onClick={() => {
                              setEditingParticipant(null);
                              setNewTeamName('');
                            }}
                            className="flex-1 px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            ✗ Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingParticipant(participant);
                          setNewTeamName('');
                        }}
                        className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center justify-center gap-1 mt-2"
                      >
                        <UserPlus className="w-3 h-3" />
                        Assigner à une équipe
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Aucun résultat */}
        {Object.keys(participantsByTeam).length === 0 && noTeamParticipants.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {searchTerm || filterTeam ? 'Aucun résultat trouvé' : 'Aucun participant'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantManager;