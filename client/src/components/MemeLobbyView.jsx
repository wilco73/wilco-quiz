import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, Play, LogOut, Crown, Clock, Hash, 
  RotateCcw, Undo2, Tag, ChevronDown, ChevronUp, Copy, Check,
  Lock, Globe
} from 'lucide-react';

/**
 * MemeLobbyView - Salle d'attente Make It Meme
 * 
 * CORRECTIONS v10:
 * - currentUser.id au lieu de currentUser.odId
 * - Affiche lobby.code (6 chars) au lieu de lobby.id (UUID)
 * - Toggle public/privé pour le créateur
 */
export default function MemeLobbyView({
  lobby,
  currentUser,
  availableTags = [],
  onStart,
  onLeave,
  onUpdateSettings,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    rounds: 3,
    creationTime: 120,
    voteTime: 30,
    maxRotations: 3,
    maxUndos: 1,
    tags: [],
    isPrivate: false,
  });

  // Sync settings from lobby
  useEffect(() => {
    if (lobby?.settings) {
      setLocalSettings(prev => ({
        ...prev,
        ...lobby.settings,
        isPrivate: lobby.is_private || false,
      }));
    }
  }, [lobby?.settings, lobby?.is_private]);

  // CORRIGÉ: Utiliser currentUser.id (pas odId)
  const isCreator = currentUser?.id === lobby?.creator_id;
  const participants = lobby?.participants || [];
  const canStart = participants.length >= 2 && isCreator;

  // Code court à afficher (6 caractères, pas l'UUID)
  const displayCode = lobby?.code || lobby?.id?.substring(0, 6).toUpperCase() || '------';

  // Copier le code du lobby
  const copyLobbyCode = () => {
    const codeToCopy = lobby?.code || lobby?.id || '';
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mettre à jour un setting
  const updateSetting = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onUpdateSettings?.(newSettings);
  };

  // Toggle public/privé
  const togglePrivacy = () => {
    const newIsPrivate = !localSettings.isPrivate;
    setLocalSettings(prev => ({ ...prev, isPrivate: newIsPrivate }));
    onUpdateSettings?.({ ...localSettings, isPrivate: newIsPrivate });
  };

  // Toggle un tag
  const toggleTag = (tag) => {
    const newTags = localSettings.tags.includes(tag)
      ? localSettings.tags.filter(t => t !== tag)
      : [...localSettings.tags, tag];
    updateSetting('tags', newTags);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            😂 Make It Meme
          </h1>
          <p className="text-gray-400">
            Créez les memes les plus drôles !
          </p>
        </div>

        {/* Code du lobby - CORRIGÉ: affiche le code court */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Code du lobby</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-mono font-bold text-yellow-400 tracking-wider">
                  #{displayCode}
                </p>
                {/* Badge public/privé */}
                {localSettings.isPrivate ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                    <Lock className="w-3 h-3" /> Privé
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-600/30 text-green-400 text-xs rounded-full">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={copyLobbyCode}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Copier le code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-300" />
              )}
            </button>
          </div>
          
          {/* Toggle privé (créateur uniquement) */}
          {isCreator && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button
                onClick={togglePrivacy}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  localSettings.isPrivate 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-green-600/20 hover:bg-green-600/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {localSettings.isPrivate ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-green-400" />
                  )}
                  <span className="text-sm text-white">
                    {localSettings.isPrivate ? 'Lobby privé' : 'Lobby public'}
                  </span>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  localSettings.isPrivate ? 'bg-gray-600' : 'bg-green-500'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.isPrivate ? 'translate-x-0' : 'translate-x-6'
                  }`} />
                </div>
              </button>
              <p className="text-xs text-gray-500 mt-1 px-1">
                {localSettings.isPrivate 
                  ? 'Seuls ceux avec le code peuvent rejoindre'
                  : 'Visible dans la liste des lobbies'
                }
              </p>
            </div>
          )}
        </div>

        {/* Participants - CORRIGÉ: utilise currentUser.id */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Joueurs ({participants.length})
            </h2>
            {participants.length < 2 && (
              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                Min. 2 joueurs requis
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {participants.map((p, index) => {
              // CORRIGÉ: comparer avec currentUser.id
              const isMe = p.odId === currentUser?.id;
              const isHost = p.odId === lobby?.creator_id;
              
              return (
                <div
                  key={p.odId || index}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    isMe
                      ? 'bg-purple-600/30 border border-purple-500' 
                      : 'bg-gray-700/50'
                  }`}
                >
                  {isHost && (
                    <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  )}
                  <span className="text-white truncate text-sm">
                    {p.pseudo}
                  </span>
                  {isMe && (
                    <span className="text-xs text-purple-300">(vous)</span>
                  )}
                </div>
              );
            })}
          </div>

          {participants.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              En attente de joueurs...
            </p>
          )}
        </div>

        {/* Settings (créateur uniquement) */}
        {isCreator && (
          <div className="bg-gray-800/50 rounded-xl mb-4 overflow-hidden">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </h2>
              {showSettings ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showSettings && (
              <div className="p-4 pt-0 space-y-4">
                {/* Nombre de manches */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <Hash className="w-4 h-4" />
                    Nombre de manches
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => updateSetting('rounds', n)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                          localSettings.rounds === n
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temps de création */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <Clock className="w-4 h-4" />
                    Temps de création (secondes)
                  </label>
                  <div className="flex gap-2">
                    {[60, 90, 120, 180, 300].map(t => (
                      <button
                        key={t}
                        onClick={() => updateSetting('creationTime', t)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-colors text-sm ${
                          localSettings.creationTime === t
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {t >= 60 ? `${t / 60}min` : `${t}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temps de vote */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <Clock className="w-4 h-4" />
                    Temps de vote par meme (secondes)
                  </label>
                  <div className="flex gap-2">
                    {[15, 20, 30, 45, 60].map(t => (
                      <button
                        key={t}
                        onClick={() => updateSetting('voteTime', t)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                          localSettings.voteTime === t
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rotations max */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <RotateCcw className="w-4 h-4" />
                    Changements d'image max
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => updateSetting('maxRotations', n)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                          localSettings.maxRotations === n
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Undos max */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <Undo2 className="w-4 h-4" />
                    Retours en arrière max
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => updateSetting('maxUndos', n)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                          localSettings.maxUndos === n
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                      <Tag className="w-4 h-4" />
                      Filtrer les templates par tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            localSettings.tags.includes(tag)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {localSettings.tags.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aucun filtre = tous les templates
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Résumé settings (non-créateur) */}
        {!isCreator && (
          <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5" />
              Configuration
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-2">
                <p className="text-gray-400">Manches</p>
                <p className="text-white font-semibold">{localSettings.rounds}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <p className="text-gray-400">Temps création</p>
                <p className="text-white font-semibold">{localSettings.creationTime}s</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <p className="text-gray-400">Temps vote</p>
                <p className="text-white font-semibold">{localSettings.voteTime}s</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <p className="text-gray-400">Rotations</p>
                <p className="text-white font-semibold">{localSettings.maxRotations}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onLeave}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Quitter
          </button>
          
          {isCreator && (
            <button
              onClick={onStart}
              disabled={!canStart}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                canStart
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5" />
              Lancer la partie
            </button>
          )}
        </div>

        {/* Message d'attente (non-créateur) */}
        {!isCreator && (
          <p className="text-center text-gray-400 mt-4">
            ⏳ En attente du lancement par l'hôte...
          </p>
        )}
      </div>
    </div>
  );
}
