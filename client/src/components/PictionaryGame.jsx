import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Users, Clock, Trophy, Eye, EyeOff, 
  SkipForward, StopCircle, Check, X, Send,
  Shuffle, AlertCircle
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';

// Écran de configuration avant de lancer le jeu
export const PictionaryConfig = ({ 
  words = [], 
  teams = [], 
  customWordsCount = 0,
  onStart, 
  onCancel 
}) => {
  const [config, setConfig] = useState({
    rounds: 2, // Tours complets (chaque équipe dessine une fois par tour)
    timePerRound: 180, // secondes par mot
    timePerDrawer: 0, // rotation toutes les X secondes (0 = pas de rotation)
    pointsFirstGuess: 3,
    pointsOtherGuess: 1,
    pointsDrawingTeam: 2, // si quelqu'un trouve
    useCustomWordsOnly: false, // N'utiliser que les mots customs
    selectedCategories: [],
    selectedDifficulties: []
  });
  
  // Catégories et difficultés disponibles
  const categories = [...new Set(words.map(w => w.category).filter(Boolean))].sort();
  const difficulties = ['facile', 'moyen', 'difficile'];
  
  // Nombre de mots nécessaires = tours × équipes
  const wordsNeeded = config.rounds * teams.length;
  
  // Filtrer les mots selon les critères (ne s'applique qu'aux mots de la DB)
  const filteredDbWordsCount = words.filter(w => {
    const catMatch = config.selectedCategories.length === 0 || config.selectedCategories.includes(w.category);
    const diffMatch = config.selectedDifficulties.length === 0 || config.selectedDifficulties.includes(w.difficulty);
    return catMatch && diffMatch;
  }).length;
  
  // Total des mots disponibles (DB filtrés + customs)
  const totalWordsAvailable = config.useCustomWordsOnly 
    ? customWordsCount 
    : filteredDbWordsCount + customWordsCount;
  
  const toggleCategory = (cat) => {
    setConfig(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(cat)
        ? prev.selectedCategories.filter(c => c !== cat)
        : [...prev.selectedCategories, cat]
    }));
  };
  
  const toggleDifficulty = (diff) => {
    setConfig(prev => ({
      ...prev,
      selectedDifficulties: prev.selectedDifficulties.includes(diff)
        ? prev.selectedDifficulties.filter(d => d !== diff)
        : [...prev.selectedDifficulties, diff]
    }));
  };
  
  const canStart = teams.length >= 2 && totalWordsAvailable >= wordsNeeded;
  
  // Transformer la config pour le serveur (rounds interne = tours × équipes)
  const handleStart = () => {
    const serverConfig = {
      ...config,
      rounds: config.rounds * teams.length, // Nombre total de passages
      actualRounds: config.rounds // Garder le vrai nombre de tours pour l'affichage
    };
    onStart(serverConfig);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-2">
        🎨 Configuration Pictionary
      </h2>
      
      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
          <Users className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{teams.length}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Équipes</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <Shuffle className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{filteredDbWordsCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Mots DB</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
          <span className="text-2xl">📝</span>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{customWordsCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Mots custom</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <Clock className="w-6 h-6 mx-auto text-green-600 dark:text-green-400 mb-1" />
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{wordsNeeded}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Requis</p>
        </div>
      </div>
      
      {/* Option mots customs uniquement */}
      {customWordsCount > 0 && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useCustomWordsOnly}
              onChange={(e) => setConfig(prev => ({ ...prev, useCustomWordsOnly: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <div>
              <span className="font-medium dark:text-white">N'utiliser que les mots personnalisés</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {customWordsCount} mot(s) disponible(s) - Ignorer les mots de la base de données
              </p>
            </div>
          </label>
          {config.useCustomWordsOnly && customWordsCount < wordsNeeded && (
            <p className="text-red-500 text-sm mt-2">
              ⚠️ Pas assez de mots customs ({customWordsCount}/{wordsNeeded})
            </p>
          )}
        </div>
      )}
      
      {/* Paramètres */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de tours
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.rounds}
              onChange={(e) => setConfig(prev => ({ ...prev, rounds: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              1 tour = chaque équipe dessine 1 fois ({config.rounds} tour{config.rounds > 1 ? 's' : ''} × {teams.length} équipes = {wordsNeeded} mots)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temps par mot (sec)
            </label>
            <input
              type="number"
              min="30"
              max="600"
              step="30"
              value={config.timePerRound}
              onChange={(e) => setConfig(prev => ({ ...prev, timePerRound: parseInt(e.target.value) || 60 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rotation dessinateur (sec) - 0 = pas de rotation
          </label>
          <input
            type="number"
            min="0"
            max="120"
            step="10"
            value={config.timePerDrawer}
            onChange={(e) => setConfig(prev => ({ ...prev, timePerDrawer: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Les membres de l'équipe qui dessine se relaient automatiquement
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Points 1er guess
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.pointsFirstGuess}
              onChange={(e) => setConfig(prev => ({ ...prev, pointsFirstGuess: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Points autres
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.pointsOtherGuess}
              onChange={(e) => setConfig(prev => ({ ...prev, pointsOtherGuess: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Points dessinateurs
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.pointsDrawingTeam}
              onChange={(e) => setConfig(prev => ({ ...prev, pointsDrawingTeam: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        
        {/* Filtres catégories */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégories (vide = toutes)
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
        
        {/* Filtres difficultés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficultés (vide = toutes)
          </label>
          <div className="flex flex-wrap gap-2">
            {difficulties.map(diff => (
              <button
                key={diff}
                onClick={() => toggleDifficulty(diff)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  config.selectedDifficulties.includes(diff)
                    ? diff === 'facile' ? 'bg-green-500 text-white' :
                      diff === 'difficile' ? 'bg-red-500 text-white' :
                      'bg-yellow-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Note sur les filtres et mots customs */}
      {!config.useCustomWordsOnly && customWordsCount > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          💡 Les filtres ci-dessus ne s'appliquent qu'aux mots de la base de données. 
          Les {customWordsCount} mot(s) personnalisé(s) seront toujours inclus.
        </p>
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
      
      {totalWordsAvailable < wordsNeeded && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <span className="text-orange-700 dark:text-orange-300 text-sm">
            Pas assez de mots ({totalWordsAvailable} disponibles) pour {config.rounds} tour(s) × {teams.length} équipes = {wordsNeeded} mots requis
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

// Vue du dessinateur (celui qui dessine)
export const PictionaryDrawerView = ({
  word,
  timeRemaining,
  totalTime,
  isMyTurn,
  currentDrawerName,
  nextDrawerName,
  teamMembers,
  socket,
  lobbyId,
  odId,
  teamId
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header avec mot et timer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mot à faire deviner :</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{word}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Clock className={`w-6 h-6 ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
              <span className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-500'}`}>
                {timeRemaining}s
              </span>
            </div>
            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${timeRemaining <= 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${(timeRemaining / totalTime) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Info rotation */}
        {nextDrawerName && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isMyTurn ? (
                <span className="text-green-600 dark:text-green-400 font-medium">✏️ C'est votre tour de dessiner !</span>
              ) : (
                <span>🎨 {currentDrawerName} dessine actuellement</span>
              )}
              {nextDrawerName && <span className="ml-2">→ Prochain: {nextDrawerName}</span>}
            </p>
          </div>
        )}
      </div>
      
      {/* Canvas */}
      <DrawingCanvas
        width={800}
        height={500}
        canDraw={isMyTurn}
        showTools={isMyTurn}
        collaborative={true}
        socket={socket}
        lobbyId={lobbyId}
        odId={odId}
        teamId={teamId}
      />
      
      {!isMyTurn && (
        <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-4 text-center">
          <p className="text-orange-700 dark:text-orange-300">
            ⏳ Attendez votre tour... {currentDrawerName} dessine actuellement
          </p>
        </div>
      )}
    </div>
  );
};

// Vue des équipes qui devinent
export const PictionaryGuesserView = ({
  drawingTeamName,
  timeRemaining,
  totalTime,
  guesses,
  hasGuessedCorrectly,
  onGuess,
  socket,
  lobbyId
}) => {
  const [guess, setGuess] = useState('');
  const [externalStrokes, setExternalStrokes] = useState([]);
  const inputRef = useRef(null);
  
  // Écouter les strokes du canvas
  useEffect(() => {
    if (!socket) return;
    
    const handleStroke = (data) => {
      if (data.lobbyId === lobbyId) {
        setExternalStrokes(prev => [...prev, data]);
      }
    };
    
    const handleClear = (data) => {
      if (data.lobbyId === lobbyId) {
        setExternalStrokes([]);
      }
    };
    
    socket.on('drawing:stroke', handleStroke);
    socket.on('drawing:clear', handleClear);
    
    return () => {
      socket.off('drawing:stroke', handleStroke);
      socket.off('drawing:clear', handleClear);
    };
  }, [socket, lobbyId]);
  
  const handleSubmitGuess = () => {
    if (guess.trim() && !hasGuessedCorrectly) {
      onGuess(guess.trim());
      setGuess('');
      inputRef.current?.focus();
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">L'équipe qui dessine :</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{drawingTeamName}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Clock className={`w-6 h-6 ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
              <span className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-500'}`}>
                {timeRemaining}s
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Canvas en lecture seule */}
      <DrawingCanvas
        width={800}
        height={500}
        canDraw={false}
        showTools={false}
        externalStrokes={externalStrokes}
      />
      
      {/* Zone de réponse */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        {hasGuessedCorrectly ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-lg p-4 text-center">
            <Check className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
            <p className="text-green-700 dark:text-green-300 font-medium">
              ✅ Bravo ! Vous avez trouvé !
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitGuess()}
              placeholder="Votre réponse..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleSubmitGuess}
              disabled={!guess.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Proposer
            </button>
          </div>
        )}
        
        {/* Historique des propositions */}
        {guesses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Vos propositions :</p>
            <div className="flex flex-wrap gap-2">
              {guesses.map((g, i) => (
                <span 
                  key={i} 
                  className={`px-3 py-1 rounded-full text-sm ${
                    g.correct 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  {g.correct ? '✓' : '✗'} {g.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Vue admin pour surveiller le jeu
export const PictionaryAdminView = ({
  currentWord,
  currentRound,
  totalRounds,
  timeRemaining,
  drawingTeam,
  scores,
  guesses,
  onNextRound,
  onEndGame,
  onRevealWord
}) => {
  const [showWord, setShowWord] = useState(false);
  
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">🎨 Pictionary - Admin</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Tour {currentRound} / {totalRounds}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <Clock className={`w-8 h-8 mx-auto ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
              <span className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-500'}`}>
                {timeRemaining}s
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onNextRound}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Tour suivant
              </button>
              <button
                onClick={onEndGame}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Terminer
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Mot secret */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold dark:text-white">Mot secret</h3>
            <button
              onClick={() => setShowWord(!showWord)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              {showWord ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className={`text-2xl font-bold ${showWord ? 'text-purple-600' : 'blur-sm select-none'}`}>
            {currentWord}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Équipe : {drawingTeam}
          </p>
        </div>
        
        {/* Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Scores
          </h3>
          <div className="space-y-2">
            {Object.entries(scores)
              .sort(([,a], [,b]) => b - a)
              .map(([team, score], idx) => (
                <div key={team} className="flex justify-between items-center">
                  <span className="dark:text-white">
                    {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'} {team}
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{score} pts</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* Propositions récentes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 className="font-bold dark:text-white mb-3">Propositions</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {guesses.slice(-10).reverse().map((g, i) => (
              <div key={i} className={`text-sm px-2 py-1 rounded ${
                g.correct 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                <span className="font-medium">{g.team}:</span> {g.text}
                {g.correct && ' ✓'}
              </div>
            ))}
            {guesses.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune proposition</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal exporté
const PictionaryGame = {
  Config: PictionaryConfig,
  DrawerView: PictionaryDrawerView,
  GuesserView: PictionaryGuesserView,
  AdminView: PictionaryAdminView
};

export default PictionaryGame;
