import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, Trophy, Send, Check, Users, Eye, 
  AlertCircle, Loader, Crown
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';

const PictionaryPlayerView = ({
  gameState,
  currentUser,
  socket,
  onLeave
}) => {
  const [guess, setGuess] = useState('');
  const [myGuesses, setMyGuesses] = useState([]);
  const [hasFoundWord, setHasFoundWord] = useState(false);
  const [externalStrokes, setExternalStrokes] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  
  // Déterminer le rôle du joueur
  const myTeam = currentUser?.teamName;
  const isDrawingTeam = myTeam === gameState?.drawingTeam;
  const isMyTurnToDraw = isDrawingTeam && gameState?.currentDrawerId === currentUser?.id;
  
  // Membres de mon équipe (pour la rotation)
  const myTeamMembers = gameState?.teamMembers?.[myTeam] || [];
  const currentDrawerIndex = gameState?.currentDrawerIndex || 0;
  const currentDrawer = myTeamMembers[currentDrawerIndex % myTeamMembers.length];
  
  // Écouter les événements Socket
  useEffect(() => {
    if (!socket) return;
    
    // Recevoir les traits de dessin
    const handleStroke = (data) => {
      if (data.lobbyId === gameState?.lobbyId) {
        setExternalStrokes(prev => [...prev, data]);
      }
    };
    
    // Canvas effacé
    const handleClear = (data) => {
      if (data.lobbyId === gameState?.lobbyId) {
        setExternalStrokes([]);
      }
    };
    
    // Résultat d'une proposition
    const handleGuessResult = (data) => {
      if (data.correct && data.teamName === myTeam) {
        setHasFoundWord(true);
      }
    };
    
    // Nouveau tour
    const handleNewRound = () => {
      setExternalStrokes([]);
      setMyGuesses([]);
      setHasFoundWord(false);
      setGuess('');
    };
    
    // Temps écoulé
    const handleTimeUp = (data) => {
      // Afficher le mot pendant quelques secondes
    };
    
    // Fin de partie
    const handleEnded = (data) => {
      setFinalResults(data);
      setShowResults(true);
    };
    
    // Rotation dessinateur
    const handleDrawerRotation = (data) => {
      // La rotation est gérée via gameState
    };
    
    socket.on('drawing:stroke', handleStroke);
    socket.on('drawing:clear', handleClear);
    socket.on('pictionary:guessResult', handleGuessResult);
    socket.on('pictionary:newRound', handleNewRound);
    socket.on('pictionary:timeUp', handleTimeUp);
    socket.on('pictionary:ended', handleEnded);
    socket.on('pictionary:drawerRotation', handleDrawerRotation);
    
    return () => {
      socket.off('drawing:stroke', handleStroke);
      socket.off('drawing:clear', handleClear);
      socket.off('pictionary:guessResult', handleGuessResult);
      socket.off('pictionary:newRound', handleNewRound);
      socket.off('pictionary:timeUp', handleTimeUp);
      socket.off('pictionary:ended', handleEnded);
      socket.off('pictionary:drawerRotation', handleDrawerRotation);
    };
  }, [socket, gameState?.lobbyId, myTeam]);
  
  // Soumettre une proposition
  const handleSubmitGuess = async () => {
    if (!guess.trim() || hasFoundWord || isDrawingTeam) return;
    
    const result = await socket.pictionaryGuess(
      gameState.lobbyId,
      currentUser.id,
      myTeam,
      guess.trim()
    );
    
    setMyGuesses(prev => [...prev, { 
      text: guess.trim(), 
      correct: result.correct,
      timestamp: Date.now()
    }]);
    
    setGuess('');
    inputRef.current?.focus();
    
    if (result.correct) {
      setHasFoundWord(true);
    }
  };
  
  // Afficher les résultats finaux
  if (showResults && finalResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full">
          <h2 className="text-3xl font-bold text-center mb-6 dark:text-white">
            🏆 Partie terminée !
          </h2>
          
          <div className="space-y-3 mb-6">
            {finalResults.ranking?.map((entry, idx) => (
              <div 
                key={entry.team}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400' :
                  idx === 1 ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-400' :
                  idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400' :
                  'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </span>
                  <span className={`font-bold ${entry.team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                    {entry.team}
                    {entry.team === myTeam && ' (vous)'}
                  </span>
                </div>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {entry.score} pts
                </span>
              </div>
            ))}
          </div>
          
          <button
            onClick={onLeave}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }
  
  // Vue principale du jeu
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold dark:text-white">
                🎨 Pictionary - Tour {(gameState?.currentRound || 0) + 1}/{gameState?.totalRounds || 0}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDrawingTeam ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Votre équipe dessine !
                  </span>
                ) : (
                  <span>
                    L'équipe <strong className="text-purple-600 dark:text-purple-400">{gameState?.drawingTeam}</strong> dessine
                  </span>
                )}
              </p>
            </div>
            
            {/* Timer */}
            <div className="text-right">
              <div className={`flex items-center gap-2 ${
                gameState?.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-6 h-6" />
                <span className="text-3xl font-bold">
                  {gameState?.timeRemaining || 0}s
                </span>
              </div>
              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    gameState?.timeRemaining <= 10 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${((gameState?.timeRemaining || 0) / (gameState?.config?.timePerRound || 180)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Scores rapides */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 overflow-x-auto">
            {Object.entries(gameState?.scores || {})
              .sort(([,a], [,b]) => b - a)
              .map(([team, score], idx) => (
                <div 
                  key={team}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full whitespace-nowrap ${
                    team === myTeam 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {idx === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                  <span className="font-medium">{team}</span>
                  <span className="font-bold">{score}</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* Zone principale */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Canvas */}
          <div className="lg:col-span-3">
            {isDrawingTeam ? (
              // Vue dessinateur
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                {/* Mot à faire deviner */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 mb-4 text-center">
                  <p className="text-sm text-white/80">Mot à faire deviner :</p>
                  <p className="text-3xl font-bold text-white">
                    {gameState?.currentWord || '???'}
                  </p>
                </div>
                
                {/* Info rotation */}
                {gameState?.config?.timePerDrawer > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    {isMyTurnToDraw ? (
                      <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        C'est votre tour de dessiner ! ({gameState?.drawerRotationTime}s restantes)
                      </p>
                    ) : (
                      <p className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {currentDrawer?.pseudo || 'Un coéquipier'} dessine...
                        Votre tour dans {gameState?.drawerRotationTime}s
                      </p>
                    )}
                  </div>
                )}
                
                <DrawingCanvas
                  width={700}
                  height={450}
                  canDraw={isMyTurnToDraw || (isDrawingTeam && !gameState?.config?.timePerDrawer)}
                  showTools={isMyTurnToDraw || (isDrawingTeam && !gameState?.config?.timePerDrawer)}
                  collaborative={true}
                  socket={socket}
                  lobbyId={gameState?.lobbyId}
                  odId={currentUser?.id}
                  teamId={myTeam}
                  externalStrokes={externalStrokes}
                />
              </div>
            ) : (
              // Vue devineur
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <DrawingCanvas
                  width={700}
                  height={450}
                  canDraw={false}
                  showTools={false}
                  externalStrokes={externalStrokes}
                />
                
                {/* Zone de réponse */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {hasFoundWord ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4 text-center">
                      <Check className="w-10 h-10 mx-auto text-green-600 dark:text-green-400 mb-2" />
                      <p className="text-green-700 dark:text-green-300 font-bold text-lg">
                        🎉 Bravo ! Vous avez trouvé !
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
                        placeholder="Tapez votre réponse..."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:border-purple-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSubmitGuess}
                        disabled={!guess.trim()}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                      >
                        <Send className="w-5 h-5" />
                        Proposer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar - Propositions et infos */}
          <div className="space-y-4">
            {/* Équipes qui ont trouvé */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ont trouvé
              </h3>
              {gameState?.teamsFound?.length > 0 ? (
                <div className="space-y-2">
                  {gameState.teamsFound.map((team, idx) => (
                    <div 
                      key={team}
                      className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                      <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'text-green-700 dark:text-green-300'}`}>
                        {team}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Personne n'a encore trouvé...
                </p>
              )}
            </div>
            
            {/* Mes propositions */}
            {!isDrawingTeam && myGuesses.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <h3 className="font-bold dark:text-white mb-3">Vos propositions</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {myGuesses.slice().reverse().map((g, i) => (
                    <div 
                      key={i}
                      className={`text-sm px-2 py-1 rounded ${
                        g.correct 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {g.correct ? '✓' : '✗'} {g.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Info pour l'équipe qui dessine */}
            {isDrawingTeam && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <h3 className="font-bold dark:text-white mb-3">💡 Rappel</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Pas de lettres ni de chiffres</li>
                  <li>• Pas de mots dans le dessin</li>
                  <li>• Faites deviner avec des images !</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PictionaryPlayerView;
