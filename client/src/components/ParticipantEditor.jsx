import React, { useState, useEffect } from 'react';
import { X, User, Users, Lock, Shield, Save, AlertTriangle } from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * ParticipantEditor - Panneau latéral pour éditer un participant
 */
const ParticipantEditor = ({ 
  participant, 
  isOpen, 
  onClose, 
  onSave,
  teams = [],
  isSuperAdmin = false
}) => {
  const [formData, setFormData] = useState({
    pseudo: '',
    teamName: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setSaving] = useState(false);
  const [pseudoError, setPseudoError] = useState('');
  const [checkingPseudo, setCheckingPseudo] = useState(false);
  const toast = useToast();

  // Initialiser le formulaire quand le participant change
  useEffect(() => {
    if (participant) {
      setFormData({
        pseudo: participant.pseudo || '',
        teamName: participant.teamName || '',
        newPassword: '',
        confirmPassword: ''
      });
      setPseudoError('');
    }
  }, [participant]);

  // Vérifier si le pseudo existe déjà (avec debounce)
  useEffect(() => {
    if (!isSuperAdmin || !formData.pseudo || formData.pseudo === participant?.pseudo) {
      setPseudoError('');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingPseudo(true);
      try {
        const res = await fetch(`${API_URL}/participants/check-pseudo?pseudo=${encodeURIComponent(formData.pseudo)}`);
        const data = await res.json();
        if (data.exists) {
          setPseudoError('Ce pseudo est déjà utilisé');
        } else {
          setPseudoError('');
        }
      } catch (error) {
        console.error('Erreur vérification pseudo:', error);
      } finally {
        setCheckingPseudo(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.pseudo, participant?.pseudo, isSuperAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 4) {
      toast.error('Le mot de passe doit faire au moins 4 caractères');
      return;
    }

    if (pseudoError) {
      toast.error(pseudoError);
      return;
    }

    setSaving(true);

    try {
      const updates = {
        teamName: formData.teamName
      };

      // Seul le superadmin peut changer le pseudo
      if (isSuperAdmin && formData.pseudo !== participant.pseudo) {
        updates.pseudo = formData.pseudo;
      }

      // Mettre à jour le participant
      const res = await fetch(`${API_URL}/participants/${participant.odId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erreur mise à jour');
      }

      // Changer le mot de passe si fourni
      if (formData.newPassword) {
        const pwRes = await fetch(`${API_URL}/participants/${participant.odId}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: formData.newPassword })
        });

        if (!pwRes.ok) {
          const error = await pwRes.json();
          throw new Error(error.message || 'Erreur changement mot de passe');
        }
      }

      toast.success('Participant mis à jour !');
      onSave?.();
      onClose();

    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Panneau latéral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Modifier le participant</h2>
              <p className="text-blue-100 text-sm">{participant?.pseudo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Pseudo (superadmin uniquement) */}
          {isSuperAdmin && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Shield className="w-4 h-4 text-yellow-500" />
                Pseudo
                <span className="text-xs text-yellow-600 dark:text-yellow-400">(SuperAdmin)</span>
              </label>
              <input
                type="text"
                value={formData.pseudo}
                onChange={(e) => setFormData({ ...formData, pseudo: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white transition ${
                  pseudoError 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
                } focus:outline-none focus:ring-2`}
              />
              {checkingPseudo && (
                <p className="text-sm text-gray-500 mt-1">Vérification...</p>
              )}
              {pseudoError && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {pseudoError}
                </p>
              )}
            </div>
          )}

          {/* Équipe */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4" />
              Équipe
            </label>
            <select
              value={formData.teamName}
              onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Aucune équipe</option>
              {teams.map(team => (
                <option key={team.name} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Séparateur */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Changer le mot de passe
            </h3>

            {/* Nouveau mot de passe */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Laisser vide pour ne pas changer"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Confirmer mot de passe */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirmer le nouveau mot de passe"
                  className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 transition ${
                    formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
                  }`}
                />
                {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
            </div>
          </div>

          {/* Infos supplémentaires */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID:</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{participant?.odId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rôle:</span>
              <span className="text-gray-700 dark:text-gray-300">{participant?.role || 'user'}</span>
            </div>
            {participant?.createdAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Inscrit le:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(participant.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !!pseudoError}
              className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ParticipantEditor;
