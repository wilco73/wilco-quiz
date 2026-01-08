import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Users, Clock, Trophy, Eye, EyeOff, 
  SkipForward, StopCircle, Image, ChevronLeft, ChevronRight,
  AlertCircle, Download, RefreshCw
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';

// Écran de configuration avant de lancer le jeu
export const RelayConfig = ({ 
  references = [], 
  teams = [], 
  onStart, 
  onCancel 
}) => {
  const [config, setConfig] = useState({
    passages: 3, // Nombre de fois que le dessin circule
    observationTime: 30, // secondes pour observer l'image
    drawingTime: 120, // secondes pour dessiner
    selectedCategories: []
  });
  
  // Catégories disponibles
  const categories = [...new Set(references.map(r => r.category).filter(Boolean))].sort();
  
  // Filtrer les références
  const filteredRefsCount = references.filter(r => {
    return config.selectedCategories.length === 0 || config.selectedCategories.includes(r.category);
  }).length;
  
  const toggleCategory = (cat) => {
    setConfig(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(cat)
        ? prev.selectedCategories.filter(c => c !== cat)
        : [...prev.selectedCategories, cat]
    }));
  };
  
  const canStart = teams.length >= 2 && filteredRefsCount >= teams.length;
  
  const handleStart = () => {
    // Filtrer les références selon les catégories sélectionnées
    const filteredRefs = references.filter(r => {
      return config.selectedCategories.length === 0 || config.selectedCategories.includes(r.category);
    });
    
    onStart(config, filteredRefs);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2">
        🎨 Configuration - Passe moi le relais
      </h2>
      
      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <Users className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{teams.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Équipes</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <Image className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredRefsCount}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Images disponibles</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{config.passages}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Passages</p>
        </div>
      </div>
      
      {/* Paramètres */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de passages
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.passages}
              onChange={(e) => setConfig(prev => ({ ...prev, passages: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Combien de fois le dessin circule
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temps d'observation (sec)
            </label>
            <input
              type="number"
              min="10"
              max="120"
              step="5"
              value={config.observationTime}
              onChange={(e) => setConfig(prev => ({ ...prev, observationTime: parseInt(e.target.value) || 30 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temps de dessin (sec)
            </label>
            <input
              type="number"
              min="30"
              max="300"
              step="30"
              value={config.drawingTime}
              onChange={(e) => setConfig(prev => ({ ...prev, drawingTime: parseInt(e.target.value) || 120 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>
      
      {/* Filtres catégories */}
      {categories.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filtrer par catégorie (optionnel)
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  config.selectedCategories.includes(cat)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Avertissements */}
      {teams.length < 2 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <span className="text-orange-700 dark:text-orange-300 text-sm">
            Il faut au moins 2 équipes pour jouer
          </span>
        </div>
      )}
      
      {filteredRefsCount < teams.length && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <span className="text-orange-700 dark:text-orange-300 text-sm">
            Il faut au moins {teams.length} images de référence (une par équipe)
          </span>
        </div>
      )}
      
      {/* Boutons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
        >
          Annuler
        </button>
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Lancer le jeu
        </button>
      </div>
    </div>
  );
};

// Vue du jeu pour les joueurs
export const RelayPlayerView = ({
  gameState,
  currentUser,
  socket,
  lobbyId,
  onGameEnd
}) => {
  const [clearSignal, setClearSignal] = useState(0);
  const [externalStrokes, setExternalStrokes] = useState([]);
  const canvasRef = useRef(null);
  const myTeam = currentUser?.teamName;
  
  // Trouver mon assignment actuel
  const myAssignment = gameState?.assignments?.find(a => a.team === myTeam);
  
  // Écouter les événements Socket
  useEffect(() => {
    if (!socket) return;
    
    const handleStroke = (data) => {
      if (data.lobbyId === lobbyId) {
        setExternalStrokes(prev => [...prev, data]);
      }
    };
    
    const handleFill = (data) => {
      if (data.lobbyId === lobbyId) {
        setExternalStrokes(prev => [...prev, { ...data, type: 'fill' }]);
      }
    };
    
    const handleClear = (data) => {
      if (data.lobbyId === lobbyId) {
        setExternalStrokes([]);
        setClearSignal(prev => prev + 1);
      }
    };
    
    socket.on('drawing:stroke', handleStroke);
    socket.on('drawing:fill', handleFill);
    socket.on('drawing:clear', handleClear);
    
    return () => {
      socket.off('drawing:stroke', handleStroke);
      socket.off('drawing:fill', handleFill);
      socket.off('drawing:clear', handleClear);
    };
  }, [socket, lobbyId]);
  
  // Sauvegarder le dessin quand le temps de dessin est terminé
  const saveMyDrawing = async () => {
    if (!canvasRef.current || gameState.phase !== 'drawing') return;
    
    // Seul le premier membre de l'équipe sauvegarde
    const lobby = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/drawing-lobbies/${lobbyId}`).then(r => r.json());
    const teamMembers = lobby?.participants?.filter(p => p.team_name === myTeam) || [];
    const firstMember = teamMembers[0];
    
    if (!firstMember || firstMember.participant_id !== currentUser?.id) return;
    
    const imageData = canvasRef.current.toDataURL('image/png');
    await socket.relaySaveDrawing(lobbyId, myTeam, imageData);
  };
  
  // Sauvegarder quand la phase de dessin se termine
  useEffect(() => {
    if (gameState?.phase === 'drawing' && gameState?.phaseTimeRemaining === 1) {
      saveMyDrawing();
    }
  }, [gameState?.phaseTimeRemaining]);
  
  // Formatage du temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }
  
  // Phase d'observation
  if (gameState.phase === 'observation') {
    const imageToShow = myAssignment?.referenceUrl || myAssignment?.sourceDrawingData;
    const isOriginal = gameState.currentRound === 0;
    
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold dark:text-white">
                  👀 Phase d'observation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Passage {gameState.currentRound + 1} / {gameState.totalRounds}
                </p>
              </div>
              <div className={`text-3xl font-bold ${
                gameState.phaseTimeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-6 h-6 inline mr-2" />
                {formatTime(gameState.phaseTimeRemaining)}
              </div>
            </div>
          </div>
          
          {/* Image à observer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {isOriginal 
                ? '📷 Mémorisez cette image !' 
                : `🖼️ Dessin de l'équipe ${myAssignment?.sourceTeam}`}
            </p>
            
            {imageToShow ? (
              <img 
                src={imageToShow}
                alt="Image à mémoriser"
                className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
              />
            ) : (
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-12">
                <Image className="w-16 h-16 mx-auto text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 mt-4">Image non disponible</p>
              </div>
            )}
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {myAssignment?.referenceName || 'Image'}
            </p>
          </div>
          
          <div className="mt-4 text-center text-gray-600 dark:text-gray-400">
            <p>Préparez-vous à dessiner de mémoire !</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Phase de dessin
  if (gameState.phase === 'drawing') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold dark:text-white">
                  ✏️ À vos crayons !
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Passage {gameState.currentRound + 1} / {gameState.totalRounds}
                  {' • '}
                  Dessinez : {myAssignment?.referenceName || 'Image'}
                </p>
              </div>
              <div className={`text-3xl font-bold ${
                gameState.phaseTimeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-green-600 dark:text-green-400'
              }`}>
                <Clock className="w-6 h-6 inline mr-2" />
                {formatTime(gameState.phaseTimeRemaining)}
              </div>
            </div>
          </div>
          
          {/* Canvas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-blue-700 dark:text-blue-300">
                🎨 Toute l'équipe peut dessiner en même temps !
              </p>
            </div>
            
            <DrawingCanvas
              width={700}
              height={450}
              canDraw={true}
              showTools={true}
              collaborative={true}
              socket={socket}
              lobbyId={lobbyId}
              odId={currentUser?.id}
              teamId={myTeam}
              externalStrokes={externalStrokes}
              clearSignal={clearSignal}
              externalCanvasRef={canvasRef}
            />
          </div>
        </div>
      </div>
    );
  }
  
  // État par défaut / transition
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="animate-pulse mb-4">
          <RefreshCw className="w-16 h-16 mx-auto text-purple-400" />
        </div>
        <p className="text-xl font-bold dark:text-white">
          Préparation du prochain passage...
        </p>
      </div>
    </div>
  );
};

// Vue des résultats finaux
export const RelayResults = ({
  chains = [],
  teams = [],
  totalRounds = 0,
  onBack
}) => {
  const [selectedChain, setSelectedChain] = useState(0);
  const [selectedDrawing, setSelectedDrawing] = useState(0);
  
  const currentChain = chains[selectedChain];
  
  const handleDownload = (imageData, name, passage) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `relay-${name}-passage-${passage + 1}.png`;
    link.click();
  };
  
  if (!chains || chains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Aucun résultat disponible</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Titre */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6 text-center">
          <h2 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Résultats - Passe moi le relais
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {teams.length} équipes • {totalRounds} passages
          </p>
        </div>
        
        {/* Sélection de la chaîne */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
          <h3 className="font-bold dark:text-white mb-4">Sélectionner une image :</h3>
          <div className="flex flex-wrap gap-3">
            {chains.map((chain, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedChain(idx); setSelectedDrawing(0); }}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedChain === idx
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {chain.referenceName}
              </button>
            ))}
          </div>
        </div>
        
        {/* Chaîne de dessins */}
        {currentChain && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-500" />
              Évolution : {currentChain.referenceName}
            </h3>
            
            {/* Barre de progression */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-4">
              {/* Image originale */}
              <button
                onClick={() => setSelectedDrawing(-1)}
                className={`flex-shrink-0 p-2 rounded-lg transition ${
                  selectedDrawing === -1 
                    ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="w-24 h-24 rounded overflow-hidden">
                  <img 
                    src={currentChain.referenceUrl} 
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-center mt-1 dark:text-white">Original</p>
              </button>
              
              <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
              
              {/* Dessins */}
              {currentChain.drawings.map((drawing, idx) => (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => setSelectedDrawing(idx)}
                    className={`flex-shrink-0 p-2 rounded-lg transition ${
                      selectedDrawing === idx 
                        ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-24 h-24 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {drawing.imageData ? (
                        <img 
                          src={drawing.imageData} 
                          alt={`Passage ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center mt-1 dark:text-white">{drawing.team}</p>
                  </button>
                  {idx < currentChain.drawings.length - 1 && (
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Image agrandie */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 text-center">
              {selectedDrawing === -1 ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    📷 Image originale : {currentChain.referenceName}
                  </p>
                  <img 
                    src={currentChain.referenceUrl}
                    alt="Original"
                    className="max-w-full max-h-80 mx-auto rounded-lg shadow-lg"
                  />
                </>
              ) : currentChain.drawings[selectedDrawing] ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    ✏️ Passage {selectedDrawing + 1} - Dessin de {currentChain.drawings[selectedDrawing].team}
                  </p>
                  {currentChain.drawings[selectedDrawing].imageData ? (
                    <>
                      <img 
                        src={currentChain.drawings[selectedDrawing].imageData}
                        alt={`Passage ${selectedDrawing + 1}`}
                        className="max-w-full max-h-80 mx-auto rounded-lg shadow-lg"
                      />
                      <button
                        onClick={() => handleDownload(
                          currentChain.drawings[selectedDrawing].imageData,
                          currentChain.referenceName,
                          selectedDrawing
                        )}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Dessin non disponible</p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
        
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="w-full py-3 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold shadow-lg"
        >
          Retour au menu
        </button>
      </div>
    </div>
  );
};

export default RelayConfig;
