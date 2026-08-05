import React, { useEffect, useRef, useState } from 'react';
import { TeamMenu } from './BurgerBits';

const TRANSITIONS = [
  { file: 'nuggets-transition.mp4',      label: 'Nuggets' },
  { file: 'selt-pepper-transition.mp4',  label: 'Sel ou Poivre' },
  { file: 'menus-transition.mp4',        label: 'Les menus' },
  { file: 'addition-transition.mp4',     label: "L'addition" },
  { file: 'death-burger-transition.mp4', label: 'Burger de la mort' },
];

// Réduit un contenu de taille fixe pour qu'il tienne dans l'espace dispo (pas de scroll)
function FitScale({ width, height, children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setScale(Math.min(r.width / width, r.height / height, 1.3));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'center' }} className="flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function BurgerScoreboard({
  lobby, onLock, onUnlock, onAddPoint, onTransition, onBadResponse, onReload, onEndGame, onBack,
}) {
  if (!lobby) return null;
  const locked = lobby.buzzerLocked;
  const first = lobby.firstBuzz;
  const firstTeam = first ? lobby.teams.find((t) => t.id === first.team) : null;
  const winner = lobby.winner ? lobby.teams.find((t) => t.id === lobby.winner) : null;
  const wide = lobby.teams.length >= 3;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-gray-900 to-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <h1 className="text-base sm:text-xl font-extrabold">🍔 Burger Quiz</h1>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      {/* Bandeau : victoire OU qui a buzzé */}
      <div className="h-9 flex items-center justify-center shrink-0">
        {winner ? (
          <p className="text-xl sm:text-2xl font-black" style={{ color: winner.color }}>🏆 {winner.name} a rempli son menu !</p>
        ) : first ? (
          <p className="text-lg sm:text-2xl font-black" style={{ color: firstTeam?.color }}>🔔 {first.pseudo} — {firstTeam?.name} !</p>
        ) : (
          <p className={`text-xs sm:text-sm ${locked ? 'text-gray-500' : 'text-green-400 animate-pulse'}`}>{locked ? 'Buzzers verrouillés' : 'Buzzers ouverts…'}</p>
        )}
      </div>

      {/* Menus (mise à l'échelle auto) */}
      <div className="flex-1 min-h-0 px-2">
        <FitScale width={wide ? 1260 : 860} height={420}>
          <div className={`flex items-end justify-center ${wide ? 'gap-10' : 'gap-16'}`}>
            {lobby.teams.map((team) => {
              const pts = lobby.points?.[team.id] ?? 0;
              return (
                <div key={team.id} className="flex flex-col items-center">
                  <div className="text-5xl font-black mb-1" style={{ color: team.color }}>{pts}</div>
                  <TeamMenu points={pts} burgerW={130} />
                  <div className="mt-2 text-lg font-bold" style={{ color: team.color }}>{team.name}</div>
                </div>
              );
            })}
          </div>
        </FitScale>
      </div>

      {/* Contrôles */}
      <div className="bg-gray-950/85 border-t border-gray-800 p-2 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={onUnlock} className={`px-3 py-2 rounded-lg font-bold text-sm ${!locked ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600'}`}>🔓 Déverrouiller</button>
          <button onClick={onLock} className={`px-3 py-2 rounded-lg font-bold text-sm ${locked ? 'bg-red-600' : 'bg-red-700 hover:bg-red-600'}`}>🔒 Verrouiller</button>
          <span className="mx-1 h-6 w-px bg-gray-700" />
          {lobby.teams.map((team) => (
            <span key={team.id} className="inline-flex items-center gap-1">
              <span className="text-xs font-bold" style={{ color: team.color }}>{team.name}</span>
              <button onClick={() => onAddPoint(team.id, -1)} className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 font-bold">−</button>
              <button onClick={() => onAddPoint(team.id, 1)} className="w-8 h-8 rounded font-bold text-gray-900" style={{ backgroundColor: team.color }}>+</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TRANSITIONS.map((t) => (
            <button key={t.file} onClick={() => onTransition(t.file)} className="px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-xs sm:text-sm font-semibold">🎬 {t.label}</button>
          ))}
          <span className="mx-1 h-6 w-px bg-gray-700" />
          <button onClick={onBadResponse} className="px-2.5 py-1.5 rounded-lg bg-orange-700 hover:bg-orange-600 text-xs sm:text-sm font-semibold">❌ Mauvaise réponse</button>
          <button onClick={onReload} className="px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs sm:text-sm font-semibold">🔄 Reset</button>
          <button onClick={onEndGame} className="px-2.5 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-xs sm:text-sm font-bold">🏁 Fin de partie</button>
        </div>
      </div>
    </div>
  );
}
