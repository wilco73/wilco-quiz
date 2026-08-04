import React from 'react';

/**
 * BurgerTeamChoice - écran de lobby + choix d'équipe (étape 1).
 *
 * Props:
 * - lobby: état public du lobby (code, teams, players, teamCounts, maxPerTeam, animator)
 * - currentUser: { id, pseudo }
 * - isAnimator: bool
 * - myPlayer: { team } | null
 * - onChooseTeam: (teamId) => void
 * - onBack: () => void
 */
export default function BurgerTeamChoice({ lobby, currentUser, isAnimator, myPlayer, onChooseTeam, onBack }) {
  if (!lobby) return null;

  const playersByTeam = (teamId) => (lobby.players || []).filter((p) => p.team === teamId);
  const unassigned = (lobby.players || []).filter((p) => !p.team);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-yellow-900 p-4 text-white">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">
            ← Quitter
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-wide">🍔 Burger Quiz</h1>
            <p className="text-xs text-gray-300">Animateur : {lobby.animator?.pseudo}</p>
          </div>
          <div className="bg-gray-900/70 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[10px] text-gray-400 leading-none">CODE</p>
            <p className="text-xl font-mono font-bold tracking-widest">{lobby.code}</p>
          </div>
        </div>

        {isAnimator && (
          <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3 mb-4 text-center text-sm text-gray-300">
            Vous êtes l'animateur. Partagez le code <span className="font-mono font-bold text-white">{lobby.code}</span> aux joueurs.
            La partie se lance à l'étape suivante.
          </div>
        )}

        {/* Équipes */}
        <div className={`grid gap-4 ${lobby.teams.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {lobby.teams.map((team) => {
            const members = playersByTeam(team.id);
            const count = lobby.teamCounts?.[team.id] ?? members.length;
            const full = count >= lobby.maxPerTeam;
            const isMine = myPlayer?.team === team.id;
            return (
              <div key={team.id} className="rounded-2xl border-2 p-4 bg-gray-900/50"
                style={{ borderColor: team.color }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold" style={{ color: team.color }}>{team.name}</h2>
                  <span className="text-xs text-gray-400">{count}/{lobby.maxPerTeam}</span>
                </div>

                <ul className="space-y-1 mb-3 min-h-[3rem]">
                  {members.map((p) => (
                    <li key={p.odId} className={`text-sm px-2 py-1 rounded ${p.odId === currentUser?.id ? 'bg-white/10 font-semibold' : ''}`}>
                      {p.pseudo}{p.odId === currentUser?.id ? ' (vous)' : ''}
                    </li>
                  ))}
                  {members.length === 0 && <li className="text-xs text-gray-500 italic px-2">Personne pour l'instant</li>}
                </ul>

                {!isAnimator && (
                  <button
                    onClick={() => onChooseTeam(team.id)}
                    disabled={full && !isMine}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
                      isMine
                        ? 'bg-white text-gray-900'
                        : full
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'text-gray-900 hover:brightness-110'
                    }`}
                    style={!isMine && !full ? { backgroundColor: team.color } : undefined}
                  >
                    {isMine ? '✓ Votre équipe' : full ? 'Complète' : `Rejoindre ${team.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Sans équipe */}
        {unassigned.length > 0 && (
          <div className="mt-4 bg-gray-900/40 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">En attente de choix ({unassigned.length}) :</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((p) => (
                <span key={p.odId} className="text-sm px-2 py-0.5 rounded bg-gray-800">{p.pseudo}</span>
              ))}
            </div>
          </div>
        )}

        {!isAnimator && !myPlayer?.team && (
          <p className="text-center text-yellow-300 text-sm mt-4">Choisissez votre équipe pour rejoindre la partie.</p>
        )}
      </div>
    </div>
  );
}
