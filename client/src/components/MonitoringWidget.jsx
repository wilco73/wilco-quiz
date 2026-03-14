import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, EyeOff, Check, Clock, SkipForward, Users, Trophy, StopCircle, Clipboard,
  Minimize2, Maximize2, X, Move, ChevronDown, ChevronUp,
  Image as ImageIcon, Video as VideoIcon, Music
} from 'lucide-react';

/**
 * MonitoringWidget - Widget flottant pour le suivi en direct
 * Inspiré du mode Picture-in-Picture de YouTube
 * 
 * Features:
 * - Draggable
 * - Redimensionnable
 * - Mode mini / étendu / plein écran
 * - Sélecteur de partie si plusieurs en cours
 */
const MonitoringWidget = ({ 
  lobbies, 
  quizzes, 
  socket, 
  onNextQuestion, 
  onStopQuiz,
  isVisible,
  onClose,
  onToggleVisibility
}) => {
  // États du widget
  const [mode, setMode] = useState('mini'); // 'mini', 'expanded', 'fullscreen'
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 320 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(null);
  const [pastedParticipants, setPastedParticipants] = useState({});
  const [showLobbySelector, setShowLobbySelector] = useState(false);
  
  const widgetRef = useRef(null);
  const joinedLobbyRef = useRef(null);
  const audioRef = useRef(null);
  const adminVideoRef = useRef(null);
  const adminAudioRef = useRef(null);

  // Lobbies actifs (en cours de jeu)
  const activeLobbies = lobbies.filter(l => l.status === 'playing');
  
  // Sélectionner automatiquement le premier lobby actif
  useEffect(() => {
    if (activeLobbies.length > 0 && !selectedLobbyId) {
      setSelectedLobbyId(activeLobbies[0].id);
    } else if (activeLobbies.length === 0) {
      setSelectedLobbyId(null);
    }
  }, [activeLobbies, selectedLobbyId]);

  const activeLobby = lobbies.find(l => l.id === selectedLobbyId && l.status === 'playing');
  const quiz = activeLobby ? quizzes.find(q => q.id === activeLobby.quizId) : null;
  
  const questions = activeLobby?.shuffled && activeLobby?.shuffledQuestions 
    ? activeLobby.shuffledQuestions 
    : quiz?.questions || [];
  
  const currentQuestionIndex = activeLobby?.session?.currentQuestionIndex || 0;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = activeLobby?.participants?.filter(p => p.hasAnswered).length || 0;
  const totalParticipants = activeLobby?.participants?.length || 0;
  const allAnswered = activeLobby?.participants?.every(p => p.hasAnswered) && totalParticipants > 0;
  const hasTimer = currentQuestion?.timer > 0;

  // Rejoindre la room du lobby pour les events timer
  useEffect(() => {
    if (activeLobby && socket) {
      if (joinedLobbyRef.current !== activeLobby.id) {
        if (joinedLobbyRef.current) {
          socket.leaveMonitoring(joinedLobbyRef.current);
        }
        socket.joinMonitoring(activeLobby.id);
        joinedLobbyRef.current = activeLobby.id;
      }
    } else if (!activeLobby && joinedLobbyRef.current && socket) {
      socket.leaveMonitoring(joinedLobbyRef.current);
      joinedLobbyRef.current = null;
    }
    
    return () => {
      if (joinedLobbyRef.current && socket) {
        socket.leaveMonitoring(joinedLobbyRef.current);
        joinedLobbyRef.current = null;
      }
    };
  }, [activeLobby?.id, socket]);

  // Timer events
  useEffect(() => {
    if (!socket) return;
    
    const handleTimerTick = (data) => {
      if (activeLobby && data.lobbyId === activeLobby.id) {
        setLocalTimeRemaining(data.remaining);
      }
    };
    
    const handleTimerExpired = (data) => {
      if (activeLobby && data.lobbyId === activeLobby.id) {
        setLocalTimeRemaining(0);
      }
    };
    
    socket.on('timer:tick', handleTimerTick);
    socket.on('timer:expired', handleTimerExpired);
    
    return () => {
      socket.off('timer:tick', handleTimerTick);
      socket.off('timer:expired', handleTimerExpired);
    };
  }, [socket, activeLobby?.id]);

  // Paste detection events
  useEffect(() => {
    if (!socket) return;
    
    const handlePasteDetected = (data) => {
      const { odId, questionId } = data;
      setPastedParticipants(prev => ({
        ...prev,
        [odId]: { ...prev[odId], [questionId]: true }
      }));
    };
    
    socket.on('answer:pasteDetected', handlePasteDetected);
    return () => socket.off('answer:pasteDetected', handlePasteDetected);
  }, [socket]);

  // Reset showAnswers on new question
  useEffect(() => {
    setShowAnswers(false);
  }, [activeLobby?.session?.currentQuestionIndex]);

  // Init timer from lobby
  useEffect(() => {
    if (!activeLobby) {
      setLocalTimeRemaining(null);
      return;
    }
    if (localTimeRemaining === null && activeLobby.timeRemaining !== undefined) {
      setLocalTimeRemaining(activeLobby.timeRemaining);
    }
  }, [activeLobby?.timeRemaining, activeLobby?.id]);

  // Sound when all answered
  useEffect(() => {
    if (allAnswered && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [allAnswered]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.no-drag') || mode === 'fullscreen') return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position, mode]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    }
    if (isResizing) {
      const newWidth = Math.max(300, Math.min(800, e.clientX - position.x));
      const newHeight = Math.max(200, Math.min(600, e.clientY - position.y));
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragOffset, position, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Resize handler
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  if (!isVisible) return null;

  // Pas de lobby actif
  if (activeLobbies.length === 0) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-[9999] bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          width: 300,
          height: 100,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between p-3 bg-gray-900">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-white font-medium">Monitoring</span>
          </div>
          <button onClick={onClose} className="no-drag p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">Aucun quiz en cours</p>
        </div>
      </div>
    );
  }

  // Styles selon le mode
  const getWidgetStyles = () => {
    if (mode === 'fullscreen') {
      return {
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0
      };
    }
    return {
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height
    };
  };

  // Rendu du timer compact
  const renderTimer = () => {
    if (!hasTimer || localTimeRemaining === null) return null;
    const isLow = localTimeRemaining <= 5;
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded ${isLow ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
        <Clock className="w-4 h-4 text-white" />
        <span className="text-white font-bold text-sm">{localTimeRemaining}s</span>
      </div>
    );
  };

  // Rendu du média
  const renderMedia = (compact = false) => {
    if (!currentQuestion?.media) return null;
    const maxHeight = compact ? 'max-h-24' : 'max-h-48';
    
    return (
      <div className={`bg-gray-900 rounded overflow-hidden ${compact ? 'p-1' : 'p-2'}`}>
        {(currentQuestion.type === 'image' || currentQuestion.type === 'qcm') && (
          <img 
            src={currentQuestion.media} 
            alt="Question" 
            className={`${maxHeight} w-auto mx-auto rounded`}
          />
        )}
        {currentQuestion.type === 'video' && (
          <video 
            ref={adminVideoRef}
            controls 
            className={`w-full ${maxHeight} rounded`}
          >
            <source src={currentQuestion.media} />
          </video>
        )}
        {currentQuestion.type === 'audio' && (
          <audio ref={adminAudioRef} controls className="w-full">
            <source src={currentQuestion.media} />
          </audio>
        )}
      </div>
    );
  };

  // === MODE MINI ===
  const renderMiniMode = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 bg-gray-900 cursor-grab"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Move className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-white font-medium truncate">{quiz?.title}</span>
          {activeLobbies.length > 1 && (
            <button 
              onClick={() => setShowLobbySelector(!showLobbySelector)}
              className="no-drag p-1 hover:bg-gray-700 rounded"
            >
              {showLobbySelector ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {renderTimer()}
          <button onClick={() => setMode('expanded')} className="no-drag p-1 hover:bg-gray-700 rounded" title="Agrandir">
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onClose} className="no-drag p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Sélecteur de lobby */}
      {showLobbySelector && activeLobbies.length > 1 && (
        <div className="bg-gray-800 border-t border-gray-700 p-2">
          {activeLobbies.map(lobby => {
            const q = quizzes.find(quiz => quiz.id === lobby.quizId);
            return (
              <button
                key={lobby.id}
                onClick={() => { setSelectedLobbyId(lobby.id); setShowLobbySelector(false); }}
                className={`no-drag w-full text-left px-2 py-1 rounded text-sm ${
                  lobby.id === selectedLobbyId ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {q?.title} ({lobby.participants?.length || 0} joueurs)
              </button>
            );
          })}
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 p-2 overflow-hidden flex flex-col gap-2">
        {/* Question */}
        <div className="text-white text-sm line-clamp-2">{currentQuestion?.text}</div>
        
        {/* Média compact */}
        {renderMedia(true)}
        
        {/* Stats */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Q{currentQuestionIndex + 1}/{questions.length}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${allAnswered ? 'bg-green-600' : 'bg-purple-600'} text-white`}>
              {answeredCount}/{totalParticipants}
            </span>
          </div>
          <button
            onClick={() => onNextQuestion(activeLobby.id)}
            className="no-drag px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-500 flex items-center gap-1"
          >
            <SkipForward className="w-3 h-3" />
            Next
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-500" />
      </div>
    </div>
  );

  // === MODE EXPANDED ===
  const renderExpandedMode = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gray-900 cursor-grab"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Move className="w-4 h-4 text-gray-500" />
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-white font-bold truncate">{quiz?.title}</span>
          <span className="text-gray-400 text-sm">Q{currentQuestionIndex + 1}/{questions.length}</span>
          {activeLobbies.length > 1 && (
            <select
              value={selectedLobbyId || ''}
              onChange={(e) => setSelectedLobbyId(e.target.value)}
              className="no-drag ml-2 bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              {activeLobbies.map(lobby => {
                const q = quizzes.find(quiz => quiz.id === lobby.quizId);
                return <option key={lobby.id} value={lobby.id}>{q?.title}</option>;
              })}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {renderTimer()}
          <button onClick={() => setMode('mini')} className="no-drag p-1 hover:bg-gray-700 rounded" title="Réduire">
            <Minimize2 className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setMode('fullscreen')} className="no-drag p-1 hover:bg-gray-700 rounded" title="Plein écran">
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onClose} className="no-drag p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`no-drag flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${
              showAnswers ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'
            }`}
          >
            {showAnswers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showAnswers ? 'Masquer' : 'Afficher'}
          </button>
          <span className={`px-2 py-1 rounded text-sm ${allAnswered ? 'bg-green-600' : 'bg-purple-600'} text-white`}>
            {answeredCount}/{totalParticipants} réponses
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('Arrêter le quiz ?')) onStopQuiz(activeLobby.id);
            }}
            className="no-drag px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 flex items-center gap-1"
          >
            <StopCircle className="w-4 h-4" />
            Stop
          </button>
          <button
            onClick={() => onNextQuestion(activeLobby.id)}
            className="no-drag px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-500 flex items-center gap-1"
          >
            <SkipForward className="w-4 h-4" />
            Suivante
          </button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Question */}
        <div className="bg-purple-900/30 border border-purple-600 rounded p-3">
          <p className="text-white text-sm mb-2">{currentQuestion?.text}</p>
          {renderMedia(false)}
          {showAnswers && currentQuestion?.answer && (
            <div className="mt-2 pt-2 border-t border-purple-600">
              <p className="text-xs text-gray-400">Réponse attendue :</p>
              <p className="text-green-400 font-bold">{currentQuestion.answer}</p>
            </div>
          )}
          {!showAnswers && (
            <div className="mt-2 pt-2 border-t border-orange-600 bg-orange-900/20 rounded p-2">
              <p className="text-xs text-orange-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                Mode Anti-Triche : Réponse masquée
              </p>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="grid grid-cols-2 gap-2">
          {activeLobby?.participants?.map((p) => (
            <div 
              key={p.participantId}
              className={`rounded p-2 text-sm border ${
                p.hasAnswered 
                  ? 'bg-green-900/30 border-green-600' 
                  : 'bg-orange-900/30 border-orange-600 animate-pulse'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-medium truncate">{p.pseudo}</span>
                <div className="flex items-center gap-1">
                  {pastedParticipants[p.participantId]?.[currentQuestion?.id] && (
                    <Clipboard className="w-3 h-3 text-orange-400" title="Copier-coller" />
                  )}
                  {p.hasAnswered ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-orange-400 animate-spin" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 truncate">{p.teamName}</p>
              {p.hasAnswered && showAnswers && (
                <div className="mt-1 pt-1 border-t border-gray-600">
                  <p className="text-xs text-green-400 truncate">{p.currentAnswer || '(vide)'}</p>
                </div>
              )}
              {p.hasAnswered && !showAnswers && (
                <div className="mt-1 pt-1 border-t border-gray-600">
                  <p className="text-xs text-orange-400 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Masquée
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Resize handle */}
      {mode !== 'fullscreen' && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-500" />
        </div>
      )}
    </div>
  );

  // === MODE FULLSCREEN ===
  const renderFullscreenMode = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900">
        <div className="flex items-center gap-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold text-white">{quiz?.title}</h2>
            <p className="text-gray-400 text-sm">Question {currentQuestionIndex + 1} / {questions.length}</p>
          </div>
          {activeLobbies.length > 1 && (
            <select
              value={selectedLobbyId || ''}
              onChange={(e) => setSelectedLobbyId(e.target.value)}
              className="no-drag bg-gray-700 text-white rounded px-3 py-2"
            >
              {activeLobbies.map(lobby => {
                const q = quizzes.find(quiz => quiz.id === lobby.quizId);
                return <option key={lobby.id} value={lobby.id}>{q?.title}</option>;
              })}
            </select>
          )}
        </div>
        <div className="flex items-center gap-4">
          {hasTimer && localTimeRemaining !== null && (
            <div className={`text-3xl font-bold ${localTimeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
              {localTimeRemaining}s
            </div>
          )}
          <button onClick={() => setMode('expanded')} className="no-drag p-2 hover:bg-gray-700 rounded" title="Réduire">
            <Minimize2 className="w-6 h-6 text-gray-400" />
          </button>
          <button onClick={onClose} className="no-drag p-2 hover:bg-gray-700 rounded">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`no-drag flex items-center gap-2 px-4 py-2 rounded font-semibold ${
              showAnswers ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'
            }`}
          >
            {showAnswers ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            {showAnswers ? 'Masquer réponses' : 'Afficher réponses'}
          </button>
          <div className={`px-4 py-2 rounded font-semibold ${allAnswered ? 'bg-green-600' : 'bg-purple-600'} text-white`}>
            <Users className="w-5 h-5 inline mr-2" />
            {answeredCount}/{totalParticipants} réponses
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.confirm('Arrêter le quiz ?')) onStopQuiz(activeLobby.id);
            }}
            className="no-drag px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 flex items-center gap-2"
          >
            <StopCircle className="w-5 h-5" />
            Arrêter
          </button>
          <button
            onClick={() => onNextQuestion(activeLobby.id)}
            className="no-drag px-6 py-2 bg-orange-600 text-white rounded font-semibold hover:bg-orange-500 flex items-center gap-2"
          >
            <SkipForward className="w-5 h-5" />
            Question suivante
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Question & Média */}
        <div className="flex-1 bg-gray-800 rounded-lg p-6 overflow-auto">
          <div className="bg-purple-900/30 border-2 border-purple-600 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">📝 Question</h3>
            <p className="text-lg text-gray-200 mb-4">{currentQuestion?.text}</p>
            
            <div className="flex gap-4 mb-4">
              <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm">
                {currentQuestion?.points || 1} points
              </span>
              {currentQuestion?.category && (
                <span className="px-3 py-1 bg-gray-600 text-white rounded-full text-sm">
                  {currentQuestion.category}
                </span>
              )}
            </div>

            {currentQuestion?.media && (
              <div className="bg-black/50 rounded-lg p-4 mb-4">
                {(currentQuestion.type === 'image' || currentQuestion.type === 'qcm') && (
                  <img 
                    src={currentQuestion.media} 
                    alt="Question" 
                    className="max-h-64 w-auto mx-auto rounded"
                  />
                )}
                {currentQuestion.type === 'video' && (
                  <video controls className="w-full max-h-64 rounded">
                    <source src={currentQuestion.media} />
                  </video>
                )}
                {currentQuestion.type === 'audio' && (
                  <audio controls className="w-full">
                    <source src={currentQuestion.media} />
                  </audio>
                )}
              </div>
            )}

            {showAnswers ? (
              <div className="bg-green-900/30 border border-green-600 rounded p-4">
                <p className="text-sm text-gray-400 mb-1">Réponse attendue :</p>
                <p className="text-xl font-bold text-green-400">{currentQuestion?.answer}</p>
              </div>
            ) : (
              <div className="bg-orange-900/30 border border-orange-600 rounded p-4">
                <p className="text-orange-400 flex items-center gap-2">
                  <EyeOff className="w-5 h-5" />
                  <span className="font-semibold">Mode Anti-Triche :</span> Réponse masquée pour éviter le stream-hack
                </p>
              </div>
            )}
          </div>

          {/* Barre de progression */}
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${allAnswered ? 'bg-green-500' : 'bg-purple-500'}`}
              style={{ width: `${totalParticipants > 0 ? (answeredCount / totalParticipants) * 100 : 0}%` }}
            />
          </div>
          <p className="text-center text-gray-400 mt-2">
            {allAnswered ? '✅ Tous les participants ont répondu !' : `${answeredCount}/${totalParticipants} réponses`}
          </p>
        </div>

        {/* Participants */}
        <div className="w-96 bg-gray-800 rounded-lg p-4 overflow-auto">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants
          </h3>
          <div className="space-y-2">
            {activeLobby?.participants?.map((p) => (
              <div 
                key={p.participantId}
                className={`rounded-lg p-3 border-2 ${
                  p.hasAnswered 
                    ? 'bg-green-900/30 border-green-600' 
                    : 'bg-orange-900/30 border-orange-600 animate-pulse'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-white font-bold">{p.pseudo}</span>
                    <p className="text-sm text-gray-400">{p.teamName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pastedParticipants[p.participantId]?.[currentQuestion?.id] && (
                      <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded flex items-center gap-1">
                        <Clipboard className="w-3 h-3" /> Copié
                      </span>
                    )}
                    {p.hasAnswered ? (
                      <Check className="w-6 h-6 text-green-400" />
                    ) : (
                      <Clock className="w-6 h-6 text-orange-400 animate-spin" />
                    )}
                  </div>
                </div>
                {p.hasAnswered && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    {showAnswers ? (
                      <p className="text-green-400 font-medium">{p.currentAnswer || '(vide)'}</p>
                    ) : (
                      <p className="text-orange-400 text-sm flex items-center gap-1">
                        <EyeOff className="w-4 h-4" /> Réponse masquée
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerte tous ont répondu */}
      {allAnswered && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg animate-bounce">
          ✅ Tous ont répondu ! Cliquez sur "Question suivante"
        </div>
      )}
    </div>
  );

  return (
    <>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVq3n77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSJ1xe/glEILEly26+ujVRUJQZzd8sFuJAUuhM/z1YU2Bhxqvu7mnEgODVKq5O+2Yh0FO5LY88p1KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8FM4nU8tGAMQYfb8Tv45ZFDBFYr+fxsV8aBTqU2vPJdC0FKoHO8t2NOwgZabvt56FQEQtMpeLysGQcBTeQ1/POgTEGI3bG8OCWQQoSXbPq7KpYFAlBoN3zv2wiBTOJz/PWhTYGHWy+7+OaSQ4PVqzm8K9gHAU7kdj0yHUsBSh+zPDckD4IGmq97uit0xQLTqXk87BqIAU1kNf0zX4tBSN0yO/hlUMLElyw6+ypVhQJQZzd88FtIgU0iM/z1YU2BRxsu+7imUkNCVOq5O+wXx4FO5HX9MlzKgUqgcvz3I4+CRlpu+7knFIRC06k4fO0aB4FM4nU89GAMQYgccTv45VFCxJctuvqpVIVCUGc3vO+biMFMojO89aGNQYfbsLu4ppICglSrOPvr18dBTuR2fPJcSsFLIHL8t2OOgcZa7zq46hSEQxNpuLxt2smBTWP1vPQgCwGI3TH7+CVRQoSX7Xp66lUFglBoN3yvmwhBTOJzfPWhTUHHm3A7uKZSAgPU6vj769hHAU6j9jzx3QtBSiByvHejz0HGWm86+WhUhALTKPi8bZnIAU0jdXy0H4qBSF0xPDekkMJEl2y6uqnUxUJQJzd8sFsIQYzhc3z1YU1Bh1sw+7jm0kNDVKr5O+vYRwFOY/Y88lzKwcogMvx3I4+CRhr" />
      
      <div
        ref={widgetRef}
        className={`fixed z-[9999] bg-gray-800 shadow-2xl border border-gray-700 overflow-hidden ${
          mode === 'fullscreen' ? '' : 'rounded-lg'
        }`}
        style={getWidgetStyles()}
      >
        {mode === 'mini' && renderMiniMode()}
        {mode === 'expanded' && renderExpandedMode()}
        {mode === 'fullscreen' && renderFullscreenMode()}
      </div>
    </>
  );
};

export default MonitoringWidget;
