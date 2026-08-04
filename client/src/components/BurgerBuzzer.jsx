import React from 'react';

/**
 * BurgerBuzzer - écran joueur quand la partie est lancée.
 * Gros bouton buzzer, couleur de l'équipe, verrouillage, "qui a buzzé".
 */
export default function BurgerBuzzer({ lobby, currentUser, myPlayer, onBuzz, onBack }) {
  if (!lobby) return null;

  const myTeam = lobby.teams.find((t) => t.id === myPlayer?.team) || null;
  const locked = lobby.buzzerLocked;
  const first = lobby.firstBuzz;
  const iBuzzedFirst = first && first.odId === currentUser?.id;
  const firstTeam = first ? lobby.teams.find((t) => t.id === first.team) : null;

  // Le bouton est actif seulement si : dans une équipe, partie déverrouillée, personne n'a encore buzzé
  const canBuzz = !!myTeam && !locked && !first;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white p-4 select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        {myTeam && (
          <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: myTeam.color, color: '#111' }}>
            {myTeam.name}
          </span>
        )}
      </div>

      {!myTeam && (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-yellow-300">Vous n'avez pas d'équipe — revenez au lobby pour en choisir une.</p>
        </div>
      )}

      {myTeam && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Zone "qui a buzzé" */}
          <div className="h-16 flex items-center justify-center text-center">
            {first ? (
              <div>
                <p className="text-2xl font-extrabold" style={{ color: firstTeam?.color }}>
                  {iBuzzedFirst ? 'VOUS avez buzzé !' : `${first.pseudo} a buzzé !`}
                </p>
                <p className="text-sm text-gray-400">Équipe {firstTeam?.name}</p>
              </div>
            ) : locked ? (
              <p className="text-gray-500">Buzzers verrouillés — attendez le signal…</p>
            ) : (
              <p className="text-green-400 font-semibold animate-pulse">À vous de buzzer !</p>
            )}
          </div>

          {/* Gros bouton buzzer */}
          <button
            onClick={onBuzz}
            disabled={!canBuzz}
            className={`w-56 h-56 sm:w-64 sm:h-64 rounded-full text-3xl font-black shadow-2xl transition-all ${
              canBuzz ? 'active:scale-95 hover:brightness-110' : 'opacity-40 cursor-not-allowed'
            }`}
            style={{
              backgroundColor: myTeam.color,
              color: '#111',
              boxShadow: canBuzz ? `0 0 40px ${myTeam.color}` : 'none',
            }}
          >
            BUZZ
          </button>

          <p className="text-xs text-gray-500">
            {locked && !first ? 'En attente du déverrouillage par l\'animateur' : ''}
          </p>
        </div>
      )}

      {/* Mini scores */}
      <div className="flex justify-center gap-4 pt-2">
        {lobby.teams.map((t) => (
          <span key={t.id} className="text-sm font-bold" style={{ color: t.color }}>
            {t.name} : {lobby.points?.[t.id] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
