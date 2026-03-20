import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Send, Image, Video, Music, MessageSquare, Search,
  Volume2, Play, ChevronDown, ChevronUp, Users, Globe
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const BroadcastPanel = ({ 
  isOpen, 
  onClose, 
  currentLobbyId = null,
  currentLobbyType = 'mystery',
  gridId = null,
  senderId,
  senderPseudo,
  availableLobbies = []
}) => {
  const [activeTab, setActiveTab] = useState('message'); // message, grid, library
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [targetLobby, setTargetLobby] = useState(currentLobbyId || 'current');
  const [sending, setSending] = useState(false);
  
  // Options pour vidéo/audio
  const [options, setOptions] = useState({
    autoplay: true,
    volume: 80,
    loop: false
  });
  const [showOptions, setShowOptions] = useState(false);
  
  // Médias de la grille
  const [gridMedia, setGridMedia] = useState([]);
  const [gridMediaLoading, setGridMediaLoading] = useState(false);
  
  // Recherche dans la médiathèque
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryMedia, setLibraryMedia] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  
  const toast = useToast();

  // Charger les médias de la grille
  useEffect(() => {
    if (gridId && activeTab === 'grid') {
      loadGridMedia();
    }
  }, [gridId, activeTab]);

  const loadGridMedia = async () => {
    if (!gridId) return;
    setGridMediaLoading(true);
    try {
      const res = await fetch(`${API_URL}/media/grid/${gridId}`);
      const data = await res.json();
      if (data.success) {
        setGridMedia(data.media);
      }
    } catch (error) {
      console.error('Erreur chargement médias grille:', error);
    }
    setGridMediaLoading(false);
  };

  // Rechercher dans la médiathèque
  const searchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams({ search: librarySearch, limit: '20' });
      const res = await fetch(`${API_URL}/media?${params}`);
      const data = await res.json();
      if (data.success) {
        setLibraryMedia(data.media);
      }
    } catch (error) {
      console.error('Erreur recherche médias:', error);
    }
    setLibraryLoading(false);
  }, [librarySearch]);

  useEffect(() => {
    if (activeTab === 'library') {
      const timer = setTimeout(searchLibrary, 300);
      return () => clearTimeout(timer);
    }
  }, [librarySearch, activeTab, searchLibrary]);

  // Envoyer le broadcast
  const handleSend = async () => {
    if (!message.trim() && !selectedMedia) {
      toast.warning('Entrez un message ou sélectionnez un média');
      return;
    }

    setSending(true);
    try {
      const lobbyId = targetLobby === 'current' ? currentLobbyId : 
                      targetLobby === 'global' ? null : targetLobby;
      
      const res = await fetch(`${API_URL}/media/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId,
          lobbyType: targetLobby === 'global' ? 'global' : currentLobbyType,
          senderId,
          senderPseudo,
          message: message.trim() || null,
          mediaId: selectedMedia?.id || null,
          options: selectedMedia?.type !== 'image' ? options : {}
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Message envoyé !');
        setMessage('');
        setSelectedMedia(null);
        onClose();
      } else {
        toast.error(data.message || 'Erreur d\'envoi');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
    setSending(false);
  };

  // Icône selon le type de média
  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  // Carte média compacte
  const MediaCard = ({ item, selected, onSelect }) => (
    <div 
      onClick={() => onSelect(item)}
      className={`
        p-2 rounded-lg cursor-pointer border-2 transition-all
        ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
          {item.type === 'image' ? (
            <img src={item.thumbnail_url || item.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400">{getTypeIcon(item.type)}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate dark:text-white">{item.name}</p>
          <p className="text-xs text-gray-500">{item.type}</p>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Send className="w-5 h-5" />
          Broadcast
        </h2>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Cible du broadcast */}
      <div className="p-3 border-b dark:border-gray-700">
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Envoyer à</label>
        <select
          value={targetLobby}
          onChange={(e) => setTargetLobby(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {currentLobbyId && (
            <option value="current">Ce lobby (actuel)</option>
          )}
          <option value="global">🌍 Tous les participants</option>
          {availableLobbies.map(lobby => (
            <option key={lobby.id} value={lobby.id}>
              {lobby.name || `Lobby ${lobby.id.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Onglets */}
      <div className="flex border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('message')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'message' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          <MessageSquare className="w-4 h-4 mx-auto mb-1" />
          Message
        </button>
        {gridId && (
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'grid' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            <Image className="w-4 h-4 mx-auto mb-1" />
            Grille
          </button>
        )}
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'library' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          <Search className="w-4 h-4 mx-auto mb-1" />
          Rechercher
        </button>
      </div>

      {/* Contenu selon l'onglet */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'message' && (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="w-full h-32 px-3 py-2 border rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            
            {/* Média sélectionné */}
            {selectedMedia && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Média joint</span>
                  <button onClick={() => setSelectedMedia(null)} className="text-blue-600 hover:text-blue-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedMedia.type)}
                  <span className="text-sm truncate">{selectedMedia.name}</span>
                </div>
                
                {/* Options vidéo/audio */}
                {selectedMedia.type !== 'image' && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <button
                      onClick={() => setShowOptions(!showOptions)}
                      className="flex items-center gap-1 text-sm text-blue-600"
                    >
                      Options {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    {showOptions && (
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={options.autoplay}
                            onChange={(e) => setOptions({ ...options, autoplay: e.target.checked })}
                            className="rounded"
                          />
                          <Play className="w-4 h-4" />
                          <span className="text-sm">Lecture automatique</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={options.volume}
                            onChange={(e) => setOptions({ ...options, volume: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="text-sm w-8">{options.volume}%</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={options.loop}
                            onChange={(e) => setOptions({ ...options, loop: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Boucle</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'grid' && (
          <div className="space-y-2">
            {gridMediaLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : gridMedia.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun média dans cette grille</p>
            ) : (
              gridMedia.map(item => (
                <MediaCard 
                  key={item.id} 
                  item={item} 
                  selected={selectedMedia?.id === item.id}
                  onSelect={setSelectedMedia}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Rechercher un média..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              {libraryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : libraryMedia.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {librarySearch ? 'Aucun résultat' : 'Tapez pour rechercher'}
                </p>
              ) : (
                libraryMedia.map(item => (
                  <MediaCard 
                    key={item.id} 
                    item={item} 
                    selected={selectedMedia?.id === item.id}
                    onSelect={setSelectedMedia}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer avec bouton envoyer */}
      <div className="p-4 border-t dark:border-gray-700">
        <button
          onClick={handleSend}
          disabled={sending || (!message.trim() && !selectedMedia)}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
          {sending ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
};

export default BroadcastPanel;
