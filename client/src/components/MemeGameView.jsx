import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Hash, Users, Loader2, FastForward } from 'lucide-react';
import MemeEditor from './MemeEditor';
import MemeVoteView from './MemeVoteView';
import MemeResultsView from './MemeResultsView';

/**
 * MemeGameView - Composant principal du jeu Make It Meme
 * Gère les différentes phases : création, vote, résultats
 *
 * v3 :
 * - Anti-spam : les boutons d'action affichent un état "en cours" et sont désactivés
 *   pendant la requête serveur (évite le double-clic qui déclenchait l'action 2x).
 * - Bouton "Forcer l'étape" pour le créateur / admin (débloque une phase coincée).
 */

const PHASES = {
  WAITING: 'waiting',
  CREATING: 'creating',
  SUBMITTING: 'submitting',
  VOTING: 'voting',
  ROUND_RESULTS: 'round_results',
  FINAL_RESULTS: 'final_results',
};

export default function MemeGameView({
  lobby,
  currentUser,
  gamePhase,
  template,
  currentMeme,
  allMemes = [],
  roundMemes = [],
  players = [],
  timeRemaining = 0,
  currentVoteIndex = 0,
  hasSuperVote = true,
  hasSuperDownvote = true,
  hasSubmitted = false,
  isUploading = false,
  isCreator = false,
  canForceAdvance = false,
  rotationsUsed = 0,
  undosUsed = 0,
  maxRotations = 3,
  maxUndos = 1,
  canRotate = true,
  canUndo = false,
  templatesHistory = [],
  votesCount = 0,
  totalVoters = 0,
  hasVoted = false,
  onSubmitCreation,
  onCancelSubmission,
  onVote,
  onRotateTemplate,
  onUndoTemplate,
  onPlayAgain,
  onSkipToNextRound,
  onForceAdvance,
  onBackToLobby,
  onSetGetCurrentCreation,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const phase = gamePhase || lobby?.phase || PHASES.WAITING;
  const currentRound = lobby?.current_round || 1;
  const totalRounds = lobby?.settings?.rounds || 3;
  const settings = lobby?.settings || {};

  useEffect(() => {
    setIsSubmitting(false);
  }, [currentRound]);

  const handleSubmitCreation = async (textLayers, finalImageBase64) => {
    if (hasSubmitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitCreation(textLayers, finalImageBase64);
    } catch (error) {
      console.error('Erreur soumission:', error);
      alert('Erreur lors de l\'envoi du meme');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmission = async () => {
    if (!hasSubmitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCancelSubmission();
    } catch (error) {
      console.error('Erreur annulation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anti-spam : on verrouille pendant que le serveur traite la transition
  const handleSkipNext = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      await onSkipToNextRound?.();
    } finally {
      setAdvancing(false);
    }
  };

  const handleForce = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      await onForceAdvance?.();
    } finally {
      setAdvancing(false);
    }
  };

  const isOwnMeme = currentMeme?.player_id === currentUser?.id;
  const isCritical = timeRemaining <= 10;

  const renderPhaseContent = () => {
    switch (phase) {
      case PHASES.WAITING:
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Préparation de la partie...
              </h2>
              <p className="text-gray-400">
                La manche {currentRound} va bientôt commencer
              </p>
            </div>
          </div>
        );

      case PHASES.CREATING:
        return (
          <div className="h-screen flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white">
                  <Hash className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold">Manche {currentRound}/{totalRounds}</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>
                    {lobby?.participants?.filter(p => p.hasSubmitted).length || 0}/{lobby?.participants?.length || 0} prêts
                  </span>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-gray-700'
                }`}>
                <Clock className={`w-5 h-5 ${isCritical ? 'text-white' : 'text-gray-400'}`} />
                <span className={`text-xl font-mono font-bold ${isCritical ? 'text-white' : 'text-yellow-400'
                  }`}>
                  {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex-1 relative">
              {template ? (
                <>
                  <div className={hasSubmitted ? 'pointer-events-none opacity-60' : ''}>
                    <MemeEditor
                      template={template}
                      onSave={handleSubmitCreation}
                      onCancel={null}
                      maxRotations={maxRotations}
                      maxUndos={maxUndos}
                      rotationsUsed={rotationsUsed}
                      undosUsed={undosUsed}
                      canRotate={canRotate && !hasSubmitted}
                      canUndo={canUndo && !hasSubmitted}
                      onRotate={onRotateTemplate}
                      onUndo={onUndoTemplate}
                      disabled={hasSubmitted}
                      onRegisterGetter={onSetGetCurrentCreation}
                    />
                  </div>

                  {isUploading && !hasSubmitted && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/70">
                      <div className="bg-gray-900/95 rounded-2xl p-8 text-center shadow-2xl border border-yellow-500/30">
                        <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          Temps écoulé !
                        </h3>
                        <p className="text-yellow-300">
                          Envoi de votre meme en cours...
                        </p>
                      </div>
                    </div>
                  )}

                  {hasSubmitted && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                      <div className="bg-gray-900/90 rounded-2xl p-8 text-center shadow-2xl border border-green-500/30 pointer-events-auto">
                        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">✓</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          Meme envoyé !
                        </h3>
                        <p className="text-gray-400 mb-4">
                          En attente des autres joueurs...
                        </p>
                        <div className="flex items-center justify-center gap-2 text-purple-300 mb-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>
                            {lobby?.participants?.filter(p => p.hasSubmitted).length || 0}/{lobby?.participants?.length || 0} ont terminé
                          </span>
                        </div>
                        <button
                          onClick={handleCancelSubmission}
                          disabled={isSubmitting}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        >
                          {isSubmitting ? 'Annulation...' : 'Annuler et modifier'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                </div>
              )}
            </div>
          </div>
        );

      case PHASES.SUBMITTING:
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              {hasSubmitted ? (
                <>
                  <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">✓</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Meme envoyé !
                  </h2>
                  <p className="text-gray-400">
                    En attente des autres joueurs...
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-purple-300">
                      {lobby?.participants?.filter(p => p.hasSubmitted).length || 0} / {lobby?.participants?.length || 0} ont terminé
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Temps écoulé !
                  </h2>
                  <p className="text-gray-400">
                    Envoi automatique en cours...
                  </p>
                </>
              )}
            </div>
          </div>
        );

      case PHASES.VOTING:
        return (
          <MemeVoteView
            meme={currentMeme}
            currentUser={currentUser}
            timeRemaining={timeRemaining}
            currentIndex={currentVoteIndex}
            totalMemes={allMemes.length}
            canVote={!isOwnMeme}
            hasSuperVote={hasSuperVote}
            hasSuperDownvote={hasSuperDownvote}
            onVote={onVote}
            roundNumber={currentRound}
            totalRounds={totalRounds}
            votesCount={votesCount}
            totalVoters={totalVoters}
            hasVoted={hasVoted}
          />
        );

      case PHASES.ROUND_RESULTS:
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 p-4 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white text-center mb-6">
                🎉 Fin de la manche {currentRound} !
              </h2>

              {roundMemes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">
                    Les créations de cette manche
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...roundMemes]
                      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
                      .map((meme, index) => (
                        <div
                          key={meme.id || index}
                          className="bg-gray-800/50 rounded-xl p-2 text-center"
                        >
                          {meme.final_image_base64 ? (
                            <img
                              src={meme.final_image_base64}
                              alt={`Meme de ${meme.player_pseudo}`}
                              className="w-full h-auto rounded-lg mb-2"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                              <span className="text-gray-500">Pas d'image</span>
                            </div>
                          )}
                          <p className="text-white text-sm font-medium">{meme.player_pseudo}</p>
                          <p className={`text-sm font-bold ${meme.total_score > 0 ? 'text-green-400' :
                              meme.total_score < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                            {meme.total_score > 0 ? '+' : ''}{meme.total_score || 0} pts
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-800/50 rounded-xl p-4 mb-6 max-w-lg mx-auto">
                <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">
                  Classement actuel
                </h3>
                <div className="space-y-2">
                  {[...players]
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .slice(0, 5)
                    .map((player, index) => (
                      <div
                        key={player.odId}
                        className={`flex items-center justify-between p-2 rounded-lg ${player.odId === currentUser?.id
                            ? 'bg-purple-600/30 border border-purple-500'
                            : 'bg-gray-700/50'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                                index === 2 ? 'bg-orange-500 text-white' :
                                  'bg-gray-600 text-white'
                            }`}>
                            {index + 1}
                          </span>
                          <span className="text-white">{player.pseudo}</span>
                        </div>
                        <span className="text-yellow-400 font-bold">
                          {player.totalScore} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Actions (anti double-clic) */}
              <div className="text-center">
                {currentRound < totalRounds ? (
                  (isCreator || canForceAdvance) ? (
                    <button
                      onClick={isCreator ? handleSkipNext : handleForce}
                      disabled={advancing}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-wait text-white rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      {advancing ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Passage en cours...</>
                      ) : 'Passer à la manche suivante →'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-purple-300">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>En attente de l'hôte...</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-300">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Calcul des résultats finaux...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case PHASES.FINAL_RESULTS:
        return (
          <MemeResultsView
            players={players}
            allMemes={allMemes}
            currentUser={currentUser}
            onPlayAgain={onPlayAgain}
            onBackToLobby={onBackToLobby}
            isCreator={isCreator}
            lobbyId={lobby?.id}
          />
        );

      default:
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <p className="text-gray-400">Phase inconnue: {phase}</p>
          </div>
        );
    }
  };

  return (
    <>
      {renderPhaseContent()}

      {/* Bouton "Forcer l'étape" : créateur / admin, pendant création et vote */}
      {canForceAdvance && (phase === PHASES.CREATING || phase === PHASES.VOTING) && (
        <button
          onClick={handleForce}
          disabled={advancing}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-wait text-white rounded-lg font-semibold shadow-lg flex items-center gap-2 text-sm"
          title="Forcer le passage à l'étape suivante (créateur / admin)"
        >
          {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
          Forcer l'étape
        </button>
      )}
    </>
  );
}
