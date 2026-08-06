import React, { useEffect } from 'react';
import { TeamMenu } from './BurgerBits';

/**
 * BurgerBuzzer - écran joueur (plein écran).
 * - En haut : mini-burgers qui se remplissent + scores (suivi visuel pour tous).
 * - Gros bouton buzzer, verrouillage, "qui a buzzé", bannière de victoire.
 */
export default function BurgerBuzzer({ lobby, currentUser, myPlayer, onBuzz, onBack }) {
  const myTeam = lobby?.teams.find((t) => t.id === myPlayer?.team) || null;
  const locked = lobby?.buzzerLocked;
  const first = lobby?.firstBuzz;
  const iBuzzedFirst = first && first.odId === currentUser?.id;
  const firstTeam = first ? lobby?.teams.find((t) => t.id === first.team) : null;
  const winner = lobby?.winner ? lobby.teams.find((t) => t.id === lobby.winner) : null;

  const canBuzz = !!myTeam && !locked && !first && !winner;

  // PC : la barre espace buzze (quand c'est autorisé)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      // ne pas interférer si on tape dans un champ
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      e.preventDefault();
      if (canBuzz) onBuzz();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canBuzz, onBuzz]);

   if (!lobby) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-900 text-white p-3 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        {myTeam && (
          <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: myTeam.color, color: '#111' }}>{myTeam.name}</span>
        )}
      </div>

      {/* Mini burgers + scores */}
      <div className="flex items-start justify-center gap-6 mt-2 shrink-0">
        {lobby.teams.map((t) => {
          const mine = t.id === myTeam?.id;
          return (
            <div key={t.id} className={`flex flex-col items-center rounded-xl px-3 py-1 ${mine ? 'ring-2 ring-white/70' : ''}`}>
              <div className="text-2xl font-black leading-none" style={{ color: t.color }}>{lobby.points?.[t.id] ?? 0}</div>
              <div style={{ transform: 'scale(1)' }}>
                <div className="my-1">
                  <TeamMenu points={lobby.points?.[t.id] ?? 0} burgerW={32} />
                </div>
              </div>
              <div className="text-xs font-bold" style={{ color: t.color }}>{t.name}</div>
            </div>
          );
        })}
      </div>

      {/* Zone buzz */}
      {!myTeam ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-yellow-300">Vous n'avez pas d'équipe — revenez au lobby pour en choisir une.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
          <div className="h-14 flex items-center justify-center text-center">
            {winner ? (
              <p className="text-2xl font-black" style={{ color: winner.color }}>🏆 {winner.name} a gagné !</p>
            ) : first ? (
              <div>
                <p className="text-2xl font-extrabold" style={{ color: firstTeam?.color }}>{iBuzzedFirst ? 'VOUS avez buzzé !' : `${first.pseudo} a buzzé !`}</p>
                <p className="text-sm text-gray-400">Équipe {firstTeam?.name}</p>
              </div>
            ) : locked ? (
              <p className="text-gray-500">Buzzers verrouillés — attendez le signal…</p>
            ) : (
              <p className="text-green-400 font-semibold animate-pulse">À vous de buzzer !</p>
            )}
          </div>

          <button
            onClick={onBuzz}
            disabled={!canBuzz}
            className={`w-48 h-48 sm:w-60 sm:h-60 rounded-full text-3xl font-black shadow-2xl transition-all ${canBuzz ? 'active:scale-95 hover:brightness-110' : 'opacity-40 cursor-not-allowed'}`}
            style={{ backgroundColor: myTeam.color, color: '#111', boxShadow: canBuzz ? `0 0 40px ${myTeam.color}` : 'none' }}
          >
            BUZZ
          </button>
          <p className="text-xs text-gray-500 h-4 hidden sm:block">
            {canBuzz ? 'Astuce : appuie sur Espace pour buzzer' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
