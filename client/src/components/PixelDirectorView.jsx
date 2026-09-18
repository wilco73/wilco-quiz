import React, { useState, useEffect, useRef } from 'react';
import PixelGrid from './PixelGrid';

function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

export default function PixelDirectorView({ lobby, isHost, onLaunch, onEndRound, onStopGame, onBack }) {
  const [remaining, setRemaining] = useState(lobby.roundRemainingMs ?? 0);
  const endRef = useRef(null);
  useEffect(() => { setRemaining(lobby.roundRemainingMs ?? 0); endRef.current = Date.now() + (lobby.roundRemainingMs ?? 0); }, [lobby.roundRemainingMs, lobby.phase]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endRef.current - Date.now())), 250); return () => clearInterval(t); }, []);

  const painting = lobby.phase === 'paint';
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <div className="text-center">
          <p className="text-xs text-cyan-300 font-bold">👑 Tu es le Directeur — Manche {lobby.currentRound}/{lobby.rounds}</p>
          {painting && <p className="text-2xl font-black font-mono tabular-nums">{fmt(remaining)}</p>}
        </div>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-3 overflow-auto">
        <p className="text-sm text-gray-300 text-center max-w-md">
          Guide les ouvriers <span className="font-bold">à la voix</span> pour reproduire cette image. Tu ne peins pas — ils ne voient pas la cible !
        </p>
        {lobby.target ? <PixelGrid grid={lobby.target.grid} size={lobby.gridSize} palette={lobby.palette} /> : <p className="text-gray-500">Chargement…</p>}
        {lobby.target?.name && painting && <p className="text-xs text-gray-500">(forme : {lobby.target.name})</p>}
      </div>

      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800 flex flex-wrap items-center justify-center gap-3">
        {!painting ? (
          <button onClick={onLaunch} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-lg">▶ Lancer la manche</button>
        ) : (
          <button onClick={onEndRound} className="px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 font-bold">⏹ Terminer la manche</button>
        )}
        {isHost && <button onClick={onStopGame} className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-red-300 font-semibold text-sm">Arrêter la partie</button>}
      </div>
    </div>
  );
}
