import React, { useState, useEffect } from 'react';
import { User, Users, Key, Save, Plus, ChevronDown, Check, X, AlertCircle, Smile } from 'lucide-react';
import { useToast } from './ToastProvider';
import Avatar, { AvatarSelector, AVATARS } from './Avatar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ProfileView = ({ currentUser, teams, onUpdateProfile, onClose }) => {
  const [selectedTeam, setSelectedTeam] = useState(currentUser?.teamName || '');
  const [newTeamName, setNewTeamName] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || 'default');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const toast = useToast();

  // Mettre a jour le champ quand l'utilisateur change
  useEffect(() => {
    setSelectedTeam(currentUser?.teamName || '');
    setSelectedAvatar(currentUser?.avatar || 'default');
  }, [currentUser?.teamName, currentUser?.avatar]);

  const handleChangeAvatar = async (avatarId) => {
    setSelectedAvatar(avatarId);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/participants/${currentUser.id}/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarId })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Avatar mis a jour !');
        onUpdateProfile({ ...currentUser, avatar: avatarId });
        setShowAvatarSelector(false);
      } else {
        toast.error(data.message || 'Erreur');
        setSelectedAvatar(currentUser?.avatar || 'default');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
      setSelectedAvatar(currentUser?.avatar || 'default');
    }
    setIsLoading(false);
  };

  const handleChangeTeam = async () => {
    if (!selectedTeam && !showCreateTeam) {
      // Quitter l'equipe actuelle
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/participants/${currentUser.id}/team`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName: null })
        });
        const data = await response.json();
        
        if (data.success) {
          toast.success('Vous avez quitte votre equipe');
          onUpdateProfile({ ...currentUser, teamName: null });
        } else {
          toast.error(data.message || 'Erreur');
        }
      } catch (error) {
        toast.error('Erreur de connexion');
      }
      setIsLoading(false);
      return;
    }

    const teamToJoin = showCreateTeam ? newTeamName.trim() : selectedTeam;
    
    if (!teamToJoin) {
      toast.error('Veuillez selectionner ou creer une equipe');
      return;
    }

    setIsLoading(true);
    try {
      // Verifier si l'equipe existe deja
      const existingTeam = teams.find(t => t.name.toLowerCase() === teamToJoin.toLowerCase());
      
      if (showCreateTeam && existingTeam) {
        toast.error('Cette equipe existe deja, selectionnez-la dans la liste');
        setIsLoading(false);
        return;
      }

      // Si creation d'une nouvelle equipe
      if (showCreateTeam && !existingTeam) {
        const createResponse = await fetch(`${API_URL}/teams/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: teamToJoin, score: 0 })
        });
        const createData = await createResponse.json();
        
        if (!createData.success) {
          toast.error(createData.message || 'Erreur lors de la creation');
          setIsLoading(false);
          return;
        }
      }

      // Mettre a jour l'equipe du participant
      const response = await fetch(`${API_URL}/participants/${currentUser.id}/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: teamToJoin })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(showCreateTeam 
          ? `Equipe "${teamToJoin}" creee et rejointe !` 
          : `Vous avez rejoint l'equipe "${teamToJoin}"`
        );
        onUpdateProfile({ ...currentUser, teamName: teamToJoin });
        setShowCreateTeam(false);
        setNewTeamName('');
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Entrez votre mot de passe actuel');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error('Le nouveau mot de passe doit faire au moins 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/participants/${currentUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword,
          newPassword 
        })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Mot de passe modifie avec succes');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.message || 'Erreur lors du changement');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header avec Avatar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                className="relative group"
                title="Changer d'avatar"
              >
                <Avatar avatarId={selectedAvatar} size="xl" />
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Smile className="w-6 h-6 text-white" />
                </div>
              </button>
              <div>
                <h2 className="text-2xl font-bold dark:text-white">{currentUser?.pseudo}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentUser?.teamName ? (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {currentUser.teamName}
                    </span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400">Sans equipe</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Cliquez sur l'avatar pour le changer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Sélecteur d'avatar */}
        {showAvatarSelector && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <Smile className="w-5 h-5 text-purple-600" />
                Choisir un avatar
              </h3>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <AvatarSelector 
              selectedAvatar={selectedAvatar} 
              onSelect={handleChangeAvatar}
            />
          </div>
        )}

        {/* Gestion equipe */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
          <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Mon equipe
          </h3>

          {!showCreateTeam ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Choisir une equipe existante
                </label>
                <div className="relative">
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- Sans equipe --</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>
                        {team.name} ({team.validatedScore || 0} pts)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleChangeTeam}
                  disabled={isLoading || selectedTeam === currentUser?.teamName}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-5 h-5" />
                  {selectedTeam ? 'Rejoindre' : 'Quitter mon equipe'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">ou</span>
                </div>
              </div>

              <button
                onClick={() => setShowCreateTeam(true)}
                className="w-full mt-4 py-3 border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                Creer une nouvelle equipe
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de la nouvelle equipe
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ex: Les Champions"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    La nouvelle equipe sera creee avec 0 points. Vous la rejoindrez automatiquement.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleChangeTeam}
                  disabled={isLoading || !newTeamName.trim()}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-5 h-5" />
                  Creer et rejoindre
                </button>
                <button
                  onClick={() => { setShowCreateTeam(false); setNewTeamName(''); }}
                  className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>

        {/* Changement de mot de passe */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            Changer mon mot de passe
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 4 caracteres"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              <Save className="w-5 h-5" />
              Modifier le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
