import React from 'react';

/**
 * BurgerAnimatorControls - écran animateur quand la partie est lancée (étape 2).
 * Verrouiller/déverrouiller les buzzers, voir qui a buzzé, ajuster les points.
 * (Le scoreboard animé + vidéos de transition arrivent à l'étape 3.)
 */
export default function BurgerAnimatorControls({ lobby, onLock, onUnlock, onAddPoint, onBack }) {
  if (!lobby) return null;

  const locked = lobby.buzzerLocked;
  const first = lobby.firstBuzz;
  const firstTeam = first ? lobby.teams.find((t) => t.id === first.team) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
          <h1 className="text-xl font-extrabold">🍔 Animateur</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        {/* Qui a buzzé */}
        <div className="rounded-2xl border-2 p-5 mb-4 text-center"
          style={{ borderColor: first ? firstTeam?.color : '#374151' }}>
          {first ? (
            <>
              <p className="text-3xl font-black" style={{ color: firstTeam?.color }}>{first.pseudo}</p>
              <p className="text-gray-400">a buzzé en premier — équipe {firstTeam?.name}</p>
            </>
          ) : (
            <p className="text-gray-500 text-lg">{locked ? 'Buzzers verrouillés' : 'Buzzers ouverts — en attente d\'un buzz…'}</p>
          )}
        </div>

        {/* Verrou */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={onUnlock}
            className={`py-4 rounded-xl font-bold text-lg ${!locked ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600'}`}
          >
            🔓 Déverrouiller (nouvelle question)
          </button>
          <button
            onClick={onLock}
            className={`py-4 rounded-xl font-bold text-lg ${locked ? 'bg-red-600' : 'bg-red-700 hover:bg-red-600'}`}
          >
            🔒 Verrouiller
          </button>
        </div>

        {/* Scores + points */}
        <div className={`grid gap-4 ${lobby.teams.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {lobby.teams.map((team) => (
            <div key={team.id} className="rounded-2xl border-2 p-4" style={{ borderColor: team.color }}>
              <h2 className="text-lg font-bold mb-1" style={{ color: team.color }}>{team.name}</h2>
              <p className="text-4xl font-black text-center mb-3">{lobby.points?.[team.id] ?? 0}</p>
              <div className="flex gap-2">
                <button onClick={() => onAddPoint(team.id, -1)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 font-bold">−1</button>
                <button onClick={() => onAddPoint(team.id, 1)} className="flex-1 py-2 rounded-lg font-bold text-gray-900 hover:brightness-110" style={{ backgroundColor: team.color }}>+1</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {(lobby.players || []).filter((p) => p.team === team.id).map((p) => p.pseudo).join(', ') || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
