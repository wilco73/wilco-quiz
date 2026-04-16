import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

/**
 * GameSettingsManager - Interface superadmin pour gérer les jeux visibles
 */
export default function GameSettingsManager() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/game-settings`);
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de chargement des jeux');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateGame = async (gameId, updates) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/game-settings/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setGames(games.map(g => g.id === gameId ? data.game : g));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de mise à jour');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const moveGame = async (index, direction) => {
    const newGames = [...games];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newGames.length) return;
    
    [newGames[index], newGames[targetIndex]] = [newGames[targetIndex], newGames[index]];
    setGames(newGames);
    
    // Sauvegarder le nouvel ordre
    try {
      const orderedIds = newGames.map(g => g.id);
      await fetch(`${API_URL}/game-settings/order/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) {
      console.error('Erreur sauvegarde ordre:', err);
      fetchGames(); // Recharger en cas d'erreur
    }
  };

  const permissionLabels = {
    'all': 'Tout le monde',
    'admin': 'Admins',
    'superadmin': 'Superadmin'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
        <span>⚙️</span>
        Configuration des jeux
      </h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="float-right text-red-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <p className="text-gray-400 text-sm mb-6">
        Activez ou désactivez les jeux visibles pour les joueurs. 
        Vous pouvez aussi définir qui peut créer des lobbies pour chaque jeu.
      </p>

      <div className="space-y-4">
        {games.map((game, index) => (
          <div 
            key={game.id}
            className={`bg-gray-800 rounded-lg p-4 border transition-all ${
              game.is_enabled 
                ? 'border-green-500/50' 
                : 'border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icône */}
              <div className="text-3xl">{game.icon}</div>
              
              {/* Infos */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">{game.name}</h3>
                  {game.is_beta && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                      BETA
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{game.description}</p>
                
                {/* Permissions */}
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Création :</span>
                    <select
                      value={game.create_permission}
                      onChange={(e) => updateGame(game.id, { create_permission: e.target.value })}
                      className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                      disabled={saving}
                    >
                      <option value="all">Tout le monde</option>
                      <option value="admin">Admins</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={game.is_beta}
                      onChange={(e) => updateGame(game.id, { is_beta: e.target.checked })}
                      className="rounded bg-gray-700 border-gray-600"
                      disabled={saving}
                    />
                    <span className="text-gray-400">Badge Beta</span>
                  </label>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col items-center gap-2">
                {/* Toggle actif */}
                <button
                  onClick={() => updateGame(game.id, { is_enabled: !game.is_enabled })}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    game.is_enabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                  disabled={saving}
                  title={game.is_enabled ? 'Désactiver' : 'Activer'}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    game.is_enabled ? 'left-8' : 'left-1'
                  }`}></div>
                </button>
                <span className="text-xs text-gray-500">
                  {game.is_enabled ? 'Actif' : 'Inactif'}
                </span>
                
                {/* Ordre */}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => moveGame(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Monter"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveGame(index, 'down')}
                    disabled={index === games.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Descendre"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Permissions de création</h4>
        <ul className="text-sm text-gray-500 space-y-1">
          <li><strong>Tout le monde</strong> : N'importe quel joueur connecté peut créer un lobby</li>
          <li><strong>Admins</strong> : Seuls les admins et superadmins peuvent créer un lobby</li>
          <li><strong>Superadmin</strong> : Seul le superadmin peut créer un lobby (utile pour les tests)</li>
        </ul>
      </div>
    </div>
  );
}
