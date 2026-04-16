import React, { useState, useEffect, useCallback } from 'react';
import MemeLobbyView from './MemeLobbyView';
import MemeGameView from './MemeGameView';

/**
 * MemeGameTest - Page de test pour le jeu Make It Meme
 * Permet de simuler toutes les phases sans backend
 */

// Templates de test
const TEST_TEMPLATES = [
  {
    id: 1,
    title: 'Drake Hotline Bling',
    image_url: 'https://i.imgflip.com/30b1gx.jpg',
    width: 717,
    height: 717,
    preset_zones: [
      { x: 360, y: 50, width: 340, height: 80, rotation: 0 },
      { x: 360, y: 400, width: 340, height: 80, rotation: 0 },
    ],
  },
  {
    id: 2,
    title: 'Distracted Boyfriend',
    image_url: 'https://i.imgflip.com/1ur9b0.jpg',
    width: 800,
    height: 533,
    preset_zones: [],
  },
  {
    id: 3,
    title: 'Two Buttons',
    image_url: 'https://i.imgflip.com/1g8my4.jpg',
    width: 600,
    height: 908,
    preset_zones: [],
  },
];

// Joueurs de test
const TEST_PLAYERS = [
  { odId: 'player1', pseudo: 'Alice', totalScore: 0, memes: [] },
  { odId: 'player2', pseudo: 'Bob', totalScore: 0, memes: [] },
  { odId: 'player3', pseudo: 'Charlie', totalScore: 0, memes: [] },
  { odId: 'player4', pseudo: 'Diana', totalScore: 0, memes: [] },
];

const PHASES = {
  LOBBY: 'lobby',
  WAITING: 'waiting',
  CREATING: 'creating',
  SUBMITTING: 'submitting',
  VOTING: 'voting',
  ROUND_RESULTS: 'round_results',
  FINAL_RESULTS: 'final_results',
};

export default function MemeGameTest() {
  const [currentPhase, setCurrentPhase] = useState(PHASES.LOBBY);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [hasSuperVote, setHasSuperVote] = useState(true);
  const [rotationsUsed, setRotationsUsed] = useState(0);
  const [undosUsed, setUndosUsed] = useState(0);
  const [templateHistory, setTemplateHistory] = useState([TEST_TEMPLATES[0]]);
  const [currentTemplate, setCurrentTemplate] = useState(TEST_TEMPLATES[0]);
  const [players, setPlayers] = useState(TEST_PLAYERS);
  const [submittedMemes, setSubmittedMemes] = useState([]);
  const [lobbySettings, setLobbySettings] = useState({
    rounds: 3,
    creationTime: 120,
    voteTime: 30,
    maxRotations: 3,
    maxUndos: 1,
    tags: [],
  });

  const currentUser = { odId: 'player1', pseudo: 'Alice', role: 'user' };

  // État des votes pour le meme actuel
  const [votesReceived, setVotesReceived] = useState({});
  const [hasCurrentUserVoted, setHasCurrentUserVoted] = useState(false);

  // Calculer combien de joueurs doivent voter (tous sauf le créateur du meme)
  const getCurrentMemeCreatorId = () => {
    if (submittedMemes.length === 0) return null;
    return submittedMemes[currentVoteIndex]?.player_id;
  };

  const getVotersCount = () => {
    const creatorId = getCurrentMemeCreatorId();
    return TEST_PLAYERS.filter(p => p.odId !== creatorId).length;
  };

  const getVotesCount = () => {
    return Object.keys(votesReceived).length;
  };

  const allVotesReceived = () => {
    return getVotesCount() >= getVotersCount();
  };

  // Fonction pour passer au meme/round suivant
  const advanceVoting = useCallback(() => {
    // Reset des votes pour le prochain meme
    setVotesReceived({});
    setHasCurrentUserVoted(false);

    if (currentVoteIndex < submittedMemes.length - 1) {
      // Meme suivant
      setCurrentVoteIndex(prev => prev + 1);
      setTimeRemaining(lobbySettings.voteTime);
    } else {
      // Fin du vote pour ce round
      if (currentRound < lobbySettings.rounds) {
        setCurrentPhase(PHASES.ROUND_RESULTS);
        // Simuler scores
        setPlayers(prev => prev.map(p => ({
          ...p,
          totalScore: p.totalScore + Math.floor(Math.random() * 200),
          memes: [...(p.memes || []), submittedMemes.find(m => m.player_id === p.odId)].filter(Boolean),
        })));
        
        // Prochaine manche après délai
        setTimeout(() => {
          setCurrentRound(prev => prev + 1);
          setHasSuperVote(true);
          setRotationsUsed(0);
          setUndosUsed(0);
          setCurrentVoteIndex(0);
          setCurrentTemplate(TEST_TEMPLATES[(currentRound) % TEST_TEMPLATES.length]);
          setTimeRemaining(lobbySettings.creationTime);
          setCurrentPhase(PHASES.CREATING);
        }, 3000);
      } else {
        // Fin de partie
        setPlayers(prev => prev.map(p => ({
          ...p,
          totalScore: p.totalScore + Math.floor(Math.random() * 200),
          memes: submittedMemes.filter(m => m.player_id === p.odId),
        })));
        setCurrentPhase(PHASES.FINAL_RESULTS);
      }
    }
  }, [currentVoteIndex, submittedMemes, currentRound, lobbySettings]);

  // Timer simulation
  useEffect(() => {
    if (currentPhase === PHASES.CREATING || currentPhase === PHASES.VOTING) {
      const timer = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 1) {
            if (currentPhase === PHASES.CREATING) {
              setCurrentPhase(PHASES.SUBMITTING);
            } else if (currentPhase === PHASES.VOTING) {
              // Timer expiré en vote = passer au suivant
              advanceVoting();
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentPhase, advanceVoting]);

  // Vérifier si tous ont voté (simuler les autres joueurs)
  useEffect(() => {
    if (currentPhase === PHASES.VOTING && hasCurrentUserVoted) {
      // Simuler que les autres joueurs votent après un délai aléatoire
      const creatorId = getCurrentMemeCreatorId();
      const otherVoters = TEST_PLAYERS.filter(p => 
        p.odId !== currentUser.odId && p.odId !== creatorId
      );
      
      otherVoters.forEach((voter, index) => {
        setTimeout(() => {
          setVotesReceived(prev => {
            const newVotes = { ...prev, [voter.odId]: true };
            return newVotes;
          });
        }, (index + 1) * 500 + Math.random() * 1000);
      });
    }
  }, [hasCurrentUserVoted, currentPhase, currentVoteIndex]);

  // Passer au suivant quand tous ont voté
  useEffect(() => {
    if (currentPhase === PHASES.VOTING && allVotesReceived() && hasCurrentUserVoted) {
      // Petit délai pour montrer que tout le monde a voté
      setTimeout(() => {
        advanceVoting();
      }, 500);
    }
  }, [votesReceived, currentPhase, hasCurrentUserVoted]);
    }
  }, [currentPhase]);

  // Handlers
  const handleStartGame = () => {
    setCurrentPhase(PHASES.WAITING);
    setTimeout(() => {
      setTimeRemaining(lobbySettings.creationTime);
      setCurrentPhase(PHASES.CREATING);
    }, 2000);
  };

  const handleSubmitCreation = (textLayers, finalImageBase64) => {
    console.log('Meme soumis:', { textLayers });
    
    // Ajouter le meme à la liste
    const newMeme = {
      id: `meme-${Date.now()}`,
      player_id: currentUser.odId,
      pseudo: currentUser.pseudo,
      final_image_base64: finalImageBase64,
      text_layers: textLayers,
      votes: { up: 0, down: 0, neutral: 0, super: 0 },
      total_score: 0,
    };
    
    // Simuler les memes des autres joueurs
    const otherMemes = TEST_PLAYERS
      .filter(p => p.odId !== currentUser.odId)
      .map(p => ({
        id: `meme-${Date.now()}-${p.odId}`,
        player_id: p.odId,
        pseudo: p.pseudo,
        final_image_base64: finalImageBase64, // On réutilise la même image pour le test
        text_layers: [],
        votes: { up: Math.floor(Math.random() * 3), down: Math.floor(Math.random() * 2), neutral: 0, super: Math.random() > 0.7 ? 1 : 0 },
        total_score: Math.floor(Math.random() * 300),
      }));

    setSubmittedMemes([newMeme, ...otherMemes]);
    setCurrentPhase(PHASES.SUBMITTING);

    // Passer au vote après 2s
    setTimeout(() => {
      setCurrentVoteIndex(0);
      setTimeRemaining(lobbySettings.voteTime);
      setCurrentPhase(PHASES.VOTING);
    }, 2000);
  };

  const handleVote = (voteType, isSuper) => {
    console.log('Vote:', voteType, isSuper ? '(SUPER)' : '');
    
    if (isSuper) {
      setHasSuperVote(false);
    }

    // Marquer que l'utilisateur a voté
    setHasCurrentUserVoted(true);
    setVotesReceived(prev => ({ ...prev, [currentUser.odId]: true }));
    
    // Le passage au meme suivant se fait automatiquement via useEffect
    // quand tous ont voté ou quand le timer expire
  };

  const handleRotateTemplate = () => {
    if (rotationsUsed >= lobbySettings.maxRotations) return;
    
    setTemplateHistory([...templateHistory, currentTemplate]);
    const nextIndex = (TEST_TEMPLATES.indexOf(currentTemplate) + 1) % TEST_TEMPLATES.length;
    setCurrentTemplate(TEST_TEMPLATES[nextIndex]);
    setRotationsUsed(rotationsUsed + 1);
  };

  const handleUndoTemplate = () => {
    if (templateHistory.length <= 1 || undosUsed >= lobbySettings.maxUndos) return;
    
    const newHistory = [...templateHistory];
    const previousTemplate = newHistory.pop();
    setTemplateHistory(newHistory);
    setCurrentTemplate(previousTemplate);
    setUndosUsed(undosUsed + 1);
  };

  const handlePlayAgain = () => {
    setCurrentRound(1);
    setCurrentPhase(PHASES.LOBBY);
    setPlayers(TEST_PLAYERS);
    setSubmittedMemes([]);
    setHasSuperVote(true);
    setRotationsUsed(0);
    setUndosUsed(0);
  };

  const handleBackToLobby = () => {
    setCurrentPhase(PHASES.LOBBY);
    setCurrentRound(1);
    setPlayers(TEST_PLAYERS);
    setSubmittedMemes([]);
  };

  // Render
  if (currentPhase === PHASES.LOBBY) {
    return (
      <div className="relative">
        <MemeLobbyView
          lobby={{
            id: 'TEST-1234',
            creator_id: currentUser.odId,
            settings: lobbySettings,
            participants: TEST_PLAYERS,
            status: 'waiting',
          }}
          currentUser={currentUser}
          availableTags={['drôle', 'absurde', 'classique', 'pop culture', 'animaux']}
          onStart={handleStartGame}
          onLeave={() => alert('Quitter le lobby')}
          onUpdateSettings={(settings) => setLobbySettings(settings)}
        />
        
        {/* Debug panel */}
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-xs">
          <p className="font-bold mb-2">🧪 Mode Test</p>
          <p>Phase: {currentPhase}</p>
          <p>Round: {currentRound}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {Object.values(PHASES).map(phase => (
              <button
                key={phase}
                onClick={() => setCurrentPhase(phase)}
                className={`px-2 py-1 rounded text-xs ${
                  currentPhase === phase ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <MemeGameView
        lobby={{
          id: 'TEST-1234',
          settings: lobbySettings,
          participants: TEST_PLAYERS,
          current_round: currentRound,
          phase: currentPhase,
        }}
        currentUser={currentUser}
        template={currentTemplate}
        currentMeme={submittedMemes[currentVoteIndex]}
        allMemes={submittedMemes}
        players={players}
        timeRemaining={timeRemaining}
        currentVoteIndex={currentVoteIndex}
        hasSuperVote={hasSuperVote}
        rotationsUsed={rotationsUsed}
        undosUsed={undosUsed}
        canUndo={templateHistory.length > 1}
        templatesHistory={templateHistory}
        votesCount={getVotesCount()}
        totalVoters={getVotersCount()}
        hasVoted={hasCurrentUserVoted}
        onSubmitCreation={handleSubmitCreation}
        onVote={handleVote}
        onRotateTemplate={handleRotateTemplate}
        onUndoTemplate={handleUndoTemplate}
        onPlayAgain={handlePlayAgain}
        onBackToLobby={handleBackToLobby}
      />
      
      {/* Debug panel */}
      <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-xs z-50">
        <p className="font-bold mb-2">🧪 Mode Test</p>
        <p>Phase: {currentPhase}</p>
        <p>Round: {currentRound}/{lobbySettings.rounds}</p>
        <p>Timer: {timeRemaining}s</p>
        <p>Vote: {currentVoteIndex + 1}/{submittedMemes.length}</p>
        <div className="flex gap-1 mt-2 flex-wrap">
          {Object.values(PHASES).map(phase => (
            <button
              key={phase}
              onClick={() => {
                setCurrentPhase(phase);
                if (phase === PHASES.CREATING) setTimeRemaining(120);
                if (phase === PHASES.VOTING) setTimeRemaining(30);
              }}
              className={`px-2 py-1 rounded text-xs ${
                currentPhase === phase ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
