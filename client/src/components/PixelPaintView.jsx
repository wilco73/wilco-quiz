import React, { useState, useEffect, useRef, useCallback } from 'react';

function fmt(ms){const x=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`;}

/**
 * PixelPaintView - grille de peinture (mode B : ta grille privée).
 * Palette + gomme, clic/glisser (souris + tactile), mise à jour optimiste + envoi au serveur.
 */
export default function PixelPaintView({ lobby, currentUser, isHost, onPaintCell, onClearGrid, onStopGame, onBack }) {
  const size = lobby.gridSize;
  const [grid, setGrid] = useState(lobby.myGrid || new Array(size * size).fill(-1));
  const [selected, setSelected] = useState(0);
  const [remaining, setRemaining] = useState(lobby.roundRemainingMs ?? 0);
  const endTimeRef = useRef(null);
  const paintingRef = useRef(false);

  // reset au changement de manche / taille (repart d'une grille vierge côté serveur)
  useEffect(() => { setGrid(lobby.myGrid || new Array(size * size).fill(-1)); /* eslint-disable-next-line */ }, [lobby.currentRound, lobby.gridSize]);

  useEffect(() => { setRemaining(lobby.roundRemainingMs ?? 0); endTimeRef.current = Date.now() + (lobby.roundRemainingMs ?? 0); }, [lobby.roundRemainingMs, lobby.currentRound]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endTimeRef.current - Date.now())), 250); return () => clearInterval(t); }, []);

  const paint = useCallback((i) => {
    setGrid((prev) => { if (prev[i] === selected) return prev; const ng = [...prev]; ng[i] = selected; return ng; });
    onPaintCell(i, selected);
  }, [selected, onPaintCell]);

  useEffect(() => {
    const up = () => { paintingRef.current = false; };
    window.addEventListener('mouseup', up); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); };
  }, []);

  const cellFromTouch = (t) => {
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const idx = el?.getAttribute?.('data-idx');
    if (idx != null) paint(parseInt(idx, 10));
  };

  const clear = () => { setGrid(new Array(size * size).fill(-1)); onClearGrid(); };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <div className="text-center">
          <p className="text-xs text-gray-400">Manche {lobby.currentRound}/{lobby.rounds}</p>
          <p className="text-xl font-black font-mono tabular-nums">{fmt(remaining)}</p>
        </div>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      <p className="text-center text-xs text-gray-400 shrink-0 pb-1">🎧 Suis les consignes de <span className="text-cyan-300 font-semibold">{lobby.directorPseudo}</span> — tu ne vois que ta grille.</p>

      {/* Grille */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-auto">
        <div
          className="grid touch-none select-none border border-gray-700"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 'min(80vmin, 520px)', aspectRatio: '1 / 1' }}
          onTouchMove={(e) => { if (paintingRef.current) cellFromTouch(e.touches[0]); }}
        >
          {grid.map((c, i) => (
            <div
              key={i}
              data-idx={i}
              onMouseDown={() => { paintingRef.current = true; paint(i); }}
              onMouseEnter={() => { if (paintingRef.current) paint(i); }}
              onTouchStart={() => { paintingRef.current = true; paint(i); }}
              style={{ backgroundColor: c === -1 ? '#1f2937' : lobby.palette[c], outline: '1px solid rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
      </div>

      {/* Palette + outils */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {lobby.palette.map((hex, i) => (
            <button key={i} onClick={() => setSelected(i)} title={`Couleur ${i + 1}`}
              className={`w-8 h-8 rounded-md border-2 ${selected === i ? 'border-white scale-110' : 'border-gray-600'}`}
              style={{ backgroundColor: hex }} />
          ))}
          <button onClick={() => setSelected(-1)} title="Gomme"
            className={`w-8 h-8 rounded-md border-2 flex items-center justify-center text-xs ${selected === -1 ? 'border-white scale-110' : 'border-gray-600'} bg-gray-700`}>🧽</button>
          <span className="mx-1 h-6 w-px bg-gray-700" />
          <button onClick={clear} className="px-3 h-8 rounded-md bg-gray-700 hover:bg-gray-600 text-sm">Tout effacer</button>
          {isHost && <button onClick={onStopGame} className="px-3 h-8 rounded-md bg-gray-800 hover:bg-gray-700 text-red-300 text-sm">⏹ Arrêter</button>}
        </div>
      </div>
    </div>
  );
}
