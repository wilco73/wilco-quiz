import React, { useEffect, useRef, useState } from 'react';

/**
 * BurgerScoreboard - écran animateur (étape 3, v2).
 * - Menu complet qui se remplit selon les points : burger (1-10), boisson (11-13),
 *   sauces + sel/poivre (14-16), frites + barquette (17-25).
 * - Mise à l'échelle automatique (FitScale) : tout tient dans l'écran, sans scroll,
 *   responsive desktop et mobile.
 */

const IMG = '/resources/burger/images';

// --- Données du menu (point d'apparition -> ingrédient) ---
const BURGER = [ // bas (1) -> haut (10), rendu inversé
  { p: 1,  name: 'base-burger',   h: 30 },
  { p: 2,  name: 'salad',         h: 7 },
  { p: 3,  name: 'base-meat',     h: 12 },
  { p: 4,  name: 'base-tomato',   h: 12 },
  { p: 5,  name: 'middle-burger', h: 18 },
  { p: 6,  name: 'salad',         h: 7 },
  { p: 7,  name: 'cheese',        h: 12 },
  { p: 8,  name: 'top-meat',      h: 12 },
  { p: 9,  name: 'top-tomato',    h: 12 },
  { p: 10, name: 'top-bread',     h: 34 },
];

const TRANSITIONS = [
  { file: 'nuggets-transition.mp4',      label: 'Nuggets' },
  { file: 'selt-pepper-transition.mp4',  label: 'Sel ou Poivre' },
  { file: 'menus-transition.mp4',        label: 'Les menus' },
  { file: 'addition-transition.mp4',     label: "L'addition" },
  { file: 'death-burger-transition.mp4', label: 'Burger de la mort' },
];

// Image "outline si pas encore gagné, pleine sinon"
function Reveal({ name, filled, w }) {
  const src = `${IMG}/${filled ? '' : 'empty-'}${name}.png`;
  return <img src={src} alt="" style={{ width: w, height: 'auto', display: 'block' }} />;
}
// Pour mayo/ketchup : pas de "empty-" individuel -> on grise l'image pleine
function Dim({ name, filled, w }) {
  return (
    <img
      src={`${IMG}/${name}.png`}
      alt=""
      style={{ width: w, height: 'auto', display: 'block', filter: filled ? 'none' : 'grayscale(1) brightness(0.35)', opacity: filled ? 1 : 0.6 }}
    />
  );
}

function BurgerStack({ points }) {
  const layers = [...BURGER].reverse();
  return (
    <div className="flex flex-col items-center justify-end" style={{ width: 150 }}>
      {layers.map((ing, i) => (
        <div
          key={i}
          style={{
            width: 150, height: ing.h,
            backgroundImage: `url('${IMG}/${points >= ing.p ? '' : 'empty-'}${ing.name}.png')`,
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
          }}
        />
      ))}
    </div>
  );
}

function Drink({ points }) {
  return (
    <div className="flex flex-col items-center justify-end">
      <Reveal name="straw" filled={points >= 13} w={12} />
      <Reveal name="top-cup" filled={points >= 12} w={68} />
      <Reveal name="cup" filled={points >= 11} w={72} />
    </div>
  );
}

function Condiments({ points }) {
  return (
    <div className="flex flex-col items-center justify-end gap-1">
      <div className="flex items-end gap-1">
        <Dim name="tube-mayo" filled={points >= 15} w={16} />
        <Dim name="tube-ketchup" filled={points >= 16} w={16} />
      </div>
      <Reveal name="salt-pepper" filled={points >= 14} w={40} />
    </div>
  );
}

function Fries({ points }) {
  const fries = Array.from({ length: 8 }, (_, i) => ({ name: `frie-${(i % 4) + 1}`, p: 18 + i }));
  const row = (arr) => (
    <div className="flex items-end justify-center gap-0.5">
      {arr.map((f, i) => <Reveal key={i} name={f.name} filled={points >= f.p} w={12} />)}
    </div>
  );
  return (
    <div className="flex flex-col items-center justify-end">
      {row(fries.slice(4, 8))}
      {row(fries.slice(0, 4))}
      <Reveal name="bucket" filled={points >= 17} w={95} />
    </div>
  );
}

function TeamMenu({ team, points }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-5xl font-black mb-1" style={{ color: team.color }}>{points}</div>
      <div className="flex items-end gap-3">
        <BurgerStack points={points} />
        <Drink points={points} />
        <Condiments points={points} />
        <Fries points={points} />
      </div>
      <div className="mt-2 text-lg font-bold" style={{ color: team.color }}>{team.name}</div>
    </div>
  );
}

// Réduit un contenu de taille fixe pour qu'il tienne dans l'espace dispo
function FitScale({ width, height, children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / width, r.height / height, 1.2));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'center' }}
        className="flex items-center justify-center">
        {children}
      </div>
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
  const wide = lobby.teams.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <h1 className="text-lg sm:text-xl font-extrabold">🍔 Burger Quiz</h1>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      {/* Bandeau qui a buzzé */}
      <div className="h-10 flex items-center justify-center shrink-0">
        {first ? (
          <p className="text-xl sm:text-2xl font-black" style={{ color: firstTeam?.color }}>🔔 {first.pseudo} — {firstTeam?.name} !</p>
        ) : (
          <p className={`text-sm ${locked ? 'text-gray-500' : 'text-green-400 animate-pulse'}`}>{locked ? 'Buzzers verrouillés' : 'Buzzers ouverts…'}</p>
        )}
      </div>

      {/* Zone menus (mise à l'échelle auto) */}
      <div className="flex-1 min-h-0 px-2">
        <FitScale width={wide ? 1320 : 900} height={340}>
          <div className={`flex items-end justify-center ${wide ? 'gap-8' : 'gap-16'}`}>
            {lobby.teams.map((team) => (
              <TeamMenu key={team.id} team={team} points={lobby.points?.[team.id] ?? 0} />
            ))}
          </div>
        </FitScale>
      </div>

      {/* Contrôles */}
      <div className="bg-gray-950/80 border-t border-gray-800 p-2 sm:p-3 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={onUnlock} className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-sm ${!locked ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600'}`}>🔓 Déverrouiller</button>
          <button onClick={onLock} className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-sm ${locked ? 'bg-red-600' : 'bg-red-700 hover:bg-red-600'}`}>🔒 Verrouiller</button>
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
        </div>
      </div>
    </div>
  );
}
