import React from 'react';

/**
 * BurgerBuzzer - écran joueur quand la partie est lancée.
 * - Bandeau de score permanent en haut (suivi des scores, équipe du joueur mise en avant).
 * - Gros bouton buzzer, couleur de l'équipe, verrouillage, "qui a buzzé".
 */
export default function BurgerBuzzer({ lobby, currentUser, myPlayer, onBuzz, onBack }) {
  if (!lobby) return null;

  const myTeam = lobby.teams.find((t) => t.id === myPlayer?.team) || null;
  const locked = lobby.buzzerLocked;
  const first = lobby.firstBuzz;
  const iBuzzedFirst = first && first.odId === currentUser?.id;
  const firstTeam = first ? lobby.teams.find((t) => t.id === first.team) : null;

  const canBuzz = !!myTeam && !locked && !first;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white p-4 select-none">
      {/* Barre haute : quitter + bandeau de scores */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm shrink-0">← Quitter</button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {lobby.teams.map((t) => {
            const mine = t.id === myTeam?.id;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-full px-3 py-1 ${mine ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: t.color, color: '#111' }}
              >
                <span className="text-xs font-bold uppercase tracking-wide">{t.name}</span>
                <span className="text-lg font-black leading-none">{lobby.points?.[t.id] ?? 0}</span>
              </div>
            );
          })}
        </div>
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

          <p className="text-xs text-gray-500 h-4">
            {locked && !first ? "En attente du déverrouillage par l'animateur" : ''}
          </p>
        </div>
      )}
    </div>
  );
}
