import React from 'react';

/**
 * BurgerScoreboard - écran principal de l'animateur (étape 3).
 * Deux burgers qui se construisent selon les points + scores + contrôles
 * (verrou, points, transitions vidéo, mauvaise réponse, reset) + bandeau "qui a buzzé".
 *
 * Les vidéos de transition et le flash de buzz sont affichés en overlay par le container.
 */

const IMG = '/resources/burger/images';

// Ingrédients du burger, du bas (point 1) vers le haut (point 10).
// Chaque ingrédient apparaît quand le score de l'équipe atteint son "p".
const BURGER = [
  { p: 1,  name: 'base-burger',  h: 34 },
  { p: 2,  name: 'salad',        h: 8 },
  { p: 3,  name: 'base-meat',    h: 14 },
  { p: 4,  name: 'base-tomato',  h: 14 },
  { p: 5,  name: 'middle-burger',h: 20 },
  { p: 6,  name: 'salad',        h: 8 },
  { p: 7,  name: 'cheese',       h: 14 },
  { p: 8,  name: 'top-meat',     h: 14 },
  { p: 9,  name: 'top-tomato',   h: 14 },
  { p: 10, name: 'top-bread',    h: 40 },
];

const TRANSITIONS = [
  { file: 'nuggets-transition.mp4',      label: 'Nuggets' },
  { file: 'selt-pepper-transition.mp4',  label: 'Sel ou Poivre' },
  { file: 'menus-transition.mp4',        label: 'Les menus' },
  { file: 'addition-transition.mp4',     label: "L'addition" },
  { file: 'death-burger-transition.mp4', label: 'Burger de la mort' },
];

function BurgerStack({ points }) {
  // On rend du haut (point 10) vers le bas (point 1)
  const layers = [...BURGER].reverse();
  return (
    <div className="flex flex-col items-center" style={{ width: 180 }}>
      {layers.map((ing, i) => {
        const filled = points >= ing.p;
        const file = `${filled ? '' : 'empty-'}${ing.name}.png`;
        return (
          <div
            key={i}
            style={{
              width: 180,
              height: ing.h,
              backgroundImage: `url('${IMG}/${file}')`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              transition: 'opacity .2s',
            }}
          />
        );
      })}
    </div>
  );
}

export default function BurgerScoreboard({
  lobby, onLock, onUnlock, onAddPoint, onTransition, onBadResponse, onReload, onBack,
}) {
  if (!lobby) return null;
  const locked = lobby.buzzerLocked;
  const first = lobby.firstBuzz;
  const firstTeam = first ? lobby.teams.find((t) => t.id === first.team) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <h1 className="text-xl font-extrabold">🍔 Burger Quiz</h1>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
      </div>

      {/* Bandeau qui a buzzé */}
      <div className="h-12 flex items-center justify-center">
        {first ? (
          <p className="text-2xl font-black" style={{ color: firstTeam?.color }}>
            🔔 {first.pseudo} — équipe {firstTeam?.name} !
          </p>
        ) : (
          <p className={`text-sm ${locked ? 'text-gray-500' : 'text-green-400 animate-pulse'}`}>
            {locked ? 'Buzzers verrouillés' : 'Buzzers ouverts…'}
          </p>
        )}
      </div>

      {/* Burgers + scores */}
      <div className="flex-1 flex items-end justify-center gap-8 sm:gap-16 px-4 pb-4">
        {lobby.teams.map((team) => (
          <div key={team.id} className="flex flex-col items-center">
            <div className="text-5xl sm:text-7xl font-black mb-2" style={{ color: team.color }}>
              {lobby.points?.[team.id] ?? 0}
            </div>
            <BurgerStack points={lobby.points?.[team.id] ?? 0} />
            <div className="mt-2 text-lg font-bold" style={{ color: team.color }}>{team.name}</div>
          </div>
        ))}
      </div>

      {/* Contrôles animateur */}
      <div className="bg-gray-950/80 border-t border-gray-800 p-3 space-y-3">
        {/* Verrou + points */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={onUnlock} className={`px-4 py-2 rounded-lg font-bold ${!locked ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600'}`}>🔓 Déverrouiller</button>
          <button onClick={onLock} className={`px-4 py-2 rounded-lg font-bold ${locked ? 'bg-red-600' : 'bg-red-700 hover:bg-red-600'}`}>🔒 Verrouiller</button>
          <span className="mx-2 h-6 w-px bg-gray-700" />
          {lobby.teams.map((team) => (
            <span key={team.id} className="inline-flex items-center gap-1">
              <span className="text-sm font-bold" style={{ color: team.color }}>{team.name}</span>
              <button onClick={() => onAddPoint(team.id, -1)} className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 font-bold">−</button>
              <button onClick={() => onAddPoint(team.id, 1)} className="w-8 h-8 rounded font-bold text-gray-900" style={{ backgroundColor: team.color }}>+</button>
            </span>
          ))}
        </div>

        {/* Transitions + actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TRANSITIONS.map((t) => (
            <button
              key={t.file}
              onClick={() => onTransition(t.file)}
              className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-sm font-semibold"
            >
              🎬 {t.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-gray-700" />
          <button onClick={onBadResponse} className="px-3 py-1.5 rounded-lg bg-orange-700 hover:bg-orange-600 text-sm font-semibold">❌ Mauvaise réponse</button>
          <button onClick={onReload} className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold">🔄 Reset partie</button>
        </div>
      </div>
    </div>
  );
}
