import React, { useState, useEffect } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { normalizeTeamName, validateTeamName } from '../utils/helpers';

const LoginView = ({ onLogin }) => {
  const [teamName, setTeamName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // ✅ NOUVEAU: Feedback sur la normalisation
  const [normalizedTeamName, setNormalizedTeamName] = useState('');
  const [teamNameWarning, setTeamNameWarning] = useState('');

  // ✅ NOUVEAU: Mettre à jour la normalisation en temps réel
  useEffect(() => {
    if (!isAdminMode && teamName) {
      const normalized = normalizeTeamName(teamName);
      setNormalizedTeamName(normalized);
      
      // Vérifier si différent de l'original
      if (normalized !== teamName) {
        if (teamName.trim() !== teamName) {
          setTeamNameWarning('⚠️ Espaces en début/fin détectés - ils seront supprimés');
        } else if (teamName.replace(/\s+/g, ' ') !== teamName) {
          setTeamNameWarning('⚠️ Espaces multiples détectés - ils seront réduits à un seul');
        } else {
          setTeamNameWarning('⚠️ Caractères invisibles détectés - ils seront supprimés');
        }
      } else {
        setTeamNameWarning('');
      }
    } else {
      setNormalizedTeamName('');
      setTeamNameWarning('');
    }
  }, [teamName, isAdminMode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isAdminMode) {
      // ✅ AMÉLIORATION: Valider le nom d'équipe
      const validation = validateTeamName(teamName);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }
    
    // ✅ AMÉLIORATION: Normaliser avant d'envoyer
    const finalTeamName = isAdminMode ? '' : normalizeTeamName(teamName);
    
    onLogin(finalTeamName, pseudo, password, isAdminMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex content-center item-center text-center mb-8">
          <div className="text-center m-auto">
            <img src="/resources/images/aurore_question.png" className="mx-auto icone text-purple-600 mb-4" alt="Logo"/>
          </div>
          <div className="text-center m-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Wilco Quiz</h1>
            <h3 className="text-3xl text-gray-800 dark:text-gray-200 mt-2">2e édition</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isAdminMode ? 'Connexion Admin' : 'Connexion Participant'}
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdminMode && (
            <div>
              <input
                type="text"
                placeholder="Nom d'équipe"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required={!isAdminMode}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              {/* ✅ NOUVEAU: Feedback visuel sur la normalisation */}
              {normalizedTeamName && normalizedTeamName !== teamName && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-1">
                        {teamNameWarning}
                      </p>
                      <div className="text-xs text-blue-700 dark:text-blue-400">
                        <p className="mb-1">Nom corrigé automatiquement :</p>
                        <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 font-mono">
                          "{teamName}" → "<span className="text-green-600 dark:text-green-400 font-bold">{normalizedTeamName}</span>"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* ✅ NOUVEAU: Message informatif */}
              {!teamName && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  💡 Astuce : Les espaces en début/fin et multiples sont automatiquement nettoyés
                </p>
              )}
            </div>
          )}
          
          <input
            type="text"
            placeholder={isAdminMode ? "Nom admin" : "Votre pseudo"}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="w-full bg-purple-600 dark:bg-purple-700 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition"
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setIsAdminMode(!isAdminMode)}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {isAdminMode ? '← Mode Participant' : 'Mode Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;