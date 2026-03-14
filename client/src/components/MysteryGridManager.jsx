import React, { useState, useEffect } from 'react';
import { 
  Grid, Plus, Edit, Trash2, Play, X, Save, Upload, Music, Image as ImageIcon,
  AlertTriangle, Check, ChevronDown, ChevronUp, Eye, Users
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * MysteryGridManager - Interface admin pour créer et gérer les grilles mystères
 */
const MysteryGridManager = ({ socket, onJoinLobby }) => {
  const [grids, setGrids] = useState([]);
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGrid, setEditingGrid] = useState(null);
  const [expandedGridId, setExpandedGridId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Formulaire nouvelle grille
  const [newGrid, setNewGrid] = useState({
    title: '',
    gridSize: 12,
    defaultSoundUrl: '',
    thumbnailDefault: ''
  });
  
  // Formulaire nouveau type
  const [newType, setNewType] = useState({
    name: '',
    imageUrl: '',
    thumbnailUrl: '',
    soundUrl: '',
    occurrence: 1
  });
  const [showAddType, setShowAddType] = useState(null); // gridId ou null
  
  const toast = useToast();

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  // Écouter les événements socket
  useEffect(() => {
    if (!socket?.on) return;
    
    const handleLobbyCreated = (lobby) => {
      setLobbies(prev => [lobby, ...prev]);
    };
    
    const handleLobbyUpdated = (lobby) => {
      setLobbies(prev => prev.map(l => l.id === lobby.id ? lobby : l));
    };
    
    const handleLobbyDeleted = ({ lobbyId }) => {
      setLobbies(prev => prev.filter(l => l.id !== lobbyId));
    };
    
    socket.on('mystery:lobbyCreated', handleLobbyCreated);
    socket.on('mystery:lobbyUpdated', handleLobbyUpdated);
    socket.on('mystery:lobbyDeleted', handleLobbyDeleted);
    
    return () => {
      if (socket?.off) {
        socket.off('mystery:lobbyCreated', handleLobbyCreated);
        socket.off('mystery:lobbyUpdated', handleLobbyUpdated);
        socket.off('mystery:lobbyDeleted', handleLobbyDeleted);
      }
    };
  }, [socket]);

  const loadData = async () => {
    try {
      const [gridsRes, lobbiesRes] = await Promise.all([
        fetch(`${API_URL}/mystery/grids`).catch(err => {
          console.error('Erreur fetch grids:', err);
          return null;
        }),
        fetch(`${API_URL}/mystery/lobbies`).catch(err => {
          console.error('Erreur fetch lobbies:', err);
          return null;
        })
      ]);
      
      if (gridsRes && gridsRes.ok) {
        try {
          const gridsData = await gridsRes.json();
          if (gridsData.success) setGrids(gridsData.grids || []);
        } catch (e) {
          console.error('Erreur parse grids:', e);
        }
      }
      
      if (lobbiesRes && lobbiesRes.ok) {
        try {
          const lobbiesData = await lobbiesRes.json();
          if (lobbiesData.success) setLobbies(lobbiesData.lobbies || []);
        } catch (e) {
          console.error('Erreur parse lobbies:', e);
        }
      }
    } catch (error) {
      console.error('Erreur chargement mystery:', error);
      if (toast?.error) toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // === GRILLES ===
  
  const handleCreateGrid = async () => {
    if (!newGrid.title.trim()) {
      toast.error('Titre requis');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/mystery/grids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGrid)
      });
      
      const data = await res.json();
      if (data.success) {
        setGrids(prev => [data.grid, ...prev]);
        setNewGrid({ title: '', gridSize: 12, defaultSoundUrl: '', thumbnailDefault: '' });
        setShowCreateForm(false);
        toast.success('Grille créée !');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur création');
    }
  };

  const handleUpdateGrid = async (gridId, updates) => {
    try {
      const res = await fetch(`${API_URL}/mystery/grids/${gridId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await res.json();
      if (data.success) {
        setGrids(prev => prev.map(g => g.id === gridId ? data.grid : g));
        setEditingGrid(null);
        toast.success('Grille mise à jour');
      }
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  const handleDeleteGrid = async (gridId) => {
    if (!window.confirm('Supprimer cette grille ?')) return;
    
    try {
      await fetch(`${API_URL}/mystery/grids/${gridId}`, { method: 'DELETE' });
      setGrids(prev => prev.filter(g => g.id !== gridId));
      toast.success('Grille supprimée');
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  // === TYPES ===
  
  const handleAddType = async (gridId) => {
    if (!newType.name.trim()) {
      toast.error('Nom requis');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/mystery/grids/${gridId}/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType)
      });
      
      const data = await res.json();
      if (data.success) {
        // Recharger la grille
        const gridRes = await fetch(`${API_URL}/mystery/grids/${gridId}`);
        const gridData = await gridRes.json();
        if (gridData.success) {
          setGrids(prev => prev.map(g => g.id === gridId ? gridData.grid : g));
        }
        
        setNewType({ name: '', imageUrl: '', thumbnailUrl: '', soundUrl: '', occurrence: 1 });
        setShowAddType(null);
        toast.success('Type ajouté');
      }
    } catch (error) {
      toast.error('Erreur ajout');
    }
  };

  const handleDeleteType = async (typeId, gridId) => {
    try {
      await fetch(`${API_URL}/mystery/types/${typeId}`, { method: 'DELETE' });
      
      // Recharger la grille
      const gridRes = await fetch(`${API_URL}/mystery/grids/${gridId}`);
      const gridData = await gridRes.json();
      if (gridData.success) {
        setGrids(prev => prev.map(g => g.id === gridId ? gridData.grid : g));
      }
      
      toast.success('Type supprimé');
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  // === LOBBIES ===
  
  const handleCreateLobby = async (gridId) => {
    if (!socket?.mysteryCreateLobby) {
      toast.error('Connexion non établie');
      return;
    }
    const response = await socket.mysteryCreateLobby(gridId);
    if (response.success) {
      toast.success('Lobby créé !');
    } else {
      toast.error(response.message || 'Erreur');
    }
  };

  const handleDeleteLobby = async (lobbyId) => {
    if (!window.confirm('Supprimer ce lobby ?')) return;
    if (!socket?.mysteryDeleteLobby) {
      toast.error('Connexion non établie');
      return;
    }
    const response = await socket.mysteryDeleteLobby(lobbyId);
    if (response.success) {
      toast.success('Lobby supprimé');
    } else {
      toast.error(response.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Grid className="w-6 h-6 text-purple-600" />
            Cases Mystères
          </h1>
          <p className="text-gray-500 text-sm mt-1">Créez et gérez vos grilles de cases mystères</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          Nouvelle grille
        </button>
      </div>

      {/* Formulaire création grille */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-green-500">
          <h3 className="text-lg font-bold mb-4 dark:text-white">Nouvelle grille</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Titre *</label>
              <input
                type="text"
                value={newGrid.title}
                onChange={(e) => setNewGrid({ ...newGrid, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ex: Cases Bonus Saison 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre de cases *</label>
              <input
                type="number"
                value={newGrid.gridSize}
                onChange={(e) => setNewGrid({ ...newGrid, gridSize: parseInt(e.target.value) || 1 })}
                min="1"
                max="100"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Son par défaut (URL)</label>
              <input
                type="url"
                value={newGrid.defaultSoundUrl}
                onChange={(e) => setNewGrid({ ...newGrid, defaultSoundUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Thumbnail par défaut (URL)</label>
              <input
                type="url"
                value={newGrid.thumbnailDefault}
                onChange={(e) => setNewGrid({ ...newGrid, thumbnailDefault: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateGrid}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="w-4 h-4" />
              Créer
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Lobbies en cours */}
      {lobbies.filter(l => l.status !== 'finished').length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
            <Play className="w-5 h-5" />
            Parties en cours
          </h3>
          <div className="space-y-2">
            {lobbies.filter(l => l.status !== 'finished').map(lobby => (
              <div key={lobby.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3">
                <div>
                  <span className="font-medium dark:text-white">{lobby.gridTitle}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({lobby.participants?.length || 0} joueurs)
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    lobby.status === 'waiting' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                  }`}>
                    {lobby.status === 'waiting' ? 'En attente' : 'En cours'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onJoinLobby?.(lobby)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLobby(lobby.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des grilles */}
      <div className="space-y-4">
        {grids.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Grid className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune grille créée</p>
          </div>
        ) : (
          grids.map(grid => (
            <div key={grid.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Header grille */}
              <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedGridId(expandedGridId === grid.id ? null : grid.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {expandedGridId === grid.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  <div>
                    <h3 className="font-bold dark:text-white">{grid.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{grid.gridSize} cases</span>
                      <span>•</span>
                      <span>{grid.types?.length || 0} types</span>
                      {!grid.isValid && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          {grid.totalOccurrences}/{grid.gridSize}
                        </span>
                      )}
                      {grid.isValid && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="w-4 h-4" />
                          Valide
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGrid(editingGrid?.id === grid.id ? null : grid)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCreateLobby(grid.id)}
                    disabled={!grid.isValid}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={grid.isValid ? 'Lancer une partie' : 'Grille incomplète'}
                  >
                    <Play className="w-4 h-4" />
                    Lancer
                  </button>
                  <button
                    onClick={() => handleDeleteGrid(grid.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Formulaire d'édition de la grille */}
              {editingGrid?.id === grid.id && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Modifier la grille</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Titre</label>
                      <input
                        type="text"
                        value={editingGrid.title}
                        onChange={(e) => setEditingGrid({ ...editingGrid, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Nombre de cases</label>
                      <input
                        type="number"
                        value={editingGrid.gridSize}
                        onChange={(e) => setEditingGrid({ ...editingGrid, gridSize: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Son par défaut (URL)</label>
                      <input
                        type="url"
                        value={editingGrid.defaultSoundUrl || ''}
                        onChange={(e) => setEditingGrid({ ...editingGrid, defaultSoundUrl: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Thumbnail par défaut (URL)</label>
                      <input
                        type="url"
                        value={editingGrid.thumbnailDefault || ''}
                        onChange={(e) => setEditingGrid({ ...editingGrid, thumbnailDefault: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleUpdateGrid(grid.id, {
                        title: editingGrid.title,
                        gridSize: editingGrid.gridSize,
                        defaultSoundUrl: editingGrid.defaultSoundUrl,
                        thumbnailDefault: editingGrid.thumbnailDefault
                      })}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingGrid(null)}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Détails grille (expanded) */}
              {expandedGridId === grid.id && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                  {/* Types de cases */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold dark:text-white">Types de cases</h4>
                      <button
                        onClick={() => setShowAddType(showAddType === grid.id ? null : grid.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter
                      </button>
                    </div>

                    {/* Formulaire ajout type */}
                    {showAddType === grid.id && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-300 mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Nom *</label>
                            <input
                              type="text"
                              value={newType.name}
                              onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Ex: Bonus x2"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Occurrences</label>
                            <input
                              type="number"
                              value={newType.occurrence}
                              onChange={(e) => setNewType({ ...newType, occurrence: parseInt(e.target.value) || 1 })}
                              min="1"
                              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Image URL</label>
                            <input
                              type="url"
                              value={newType.imageUrl}
                              onChange={(e) => setNewType({ ...newType, imageUrl: e.target.value })}
                              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Thumbnail URL</label>
                            <input
                              type="url"
                              value={newType.thumbnailUrl}
                              onChange={(e) => setNewType({ ...newType, thumbnailUrl: e.target.value })}
                              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Son URL</label>
                            <input
                              type="url"
                              value={newType.soundUrl}
                              onChange={(e) => setNewType({ ...newType, soundUrl: e.target.value })}
                              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="https://..."
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => handleAddType(grid.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Ajouter
                            </button>
                            <button
                              onClick={() => setShowAddType(null)}
                              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded text-sm"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Liste des types */}
                    {grid.types?.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4 text-center">Aucun type défini</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {grid.types?.map(type => (
                          <div key={type.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-700 flex items-center gap-3">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                              {(type.thumbnailUrl || type.imageUrl) ? (
                                <img 
                                  src={type.thumbnailUrl || type.imageUrl} 
                                  alt={type.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Infos */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium dark:text-white truncate">{type.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>×{type.occurrence}</span>
                                {type.soundUrl && <Music className="w-3 h-3" />}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <button
                              onClick={() => handleDeleteType(type.id, grid.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Récapitulatif */}
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total cases définies :</span>
                      <span className={`font-bold ${grid.isValid ? 'text-green-600' : 'text-orange-600'}`}>
                        {grid.totalOccurrences} / {grid.gridSize}
                      </span>
                    </div>
                    {!grid.isValid && (
                      <p className="text-orange-600 text-xs mt-1">
                        {grid.totalOccurrences < grid.gridSize 
                          ? `Il manque ${grid.gridSize - grid.totalOccurrences} case(s)`
                          : `${grid.totalOccurrences - grid.gridSize} case(s) en trop`
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MysteryGridManager;
