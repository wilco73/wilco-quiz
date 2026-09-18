import React, { useState, useEffect, useRef, useCallback } from 'react';

function fmt(ms) { const x = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; }

/**
 * PixelPaintView - grille de peinture (ouvriers). Outils : pinceau (taille 1/2/3), pot de zone, remplir le fond, gomme.
 */
export default function PixelPaintView({ lobby, currentUser, isHost, onPaintCell, onFillArea, onFillAll, onClearGrid, onStopGame, onBack }) {
  const size = lobby.gridSize;
  const [grid, setGrid] = useState(lobby.myGrid || new Array(size * size).fill(-1));
  const [selected, setSelected] = useState(0);
  const [tool, setTool] = useState('brush'); // 'brush' | 'fill'
  const [brush, setBrush] = useState(1);
  const [remaining, setRemaining] = useState(lobby.roundRemainingMs ?? 0);
  const endTimeRef = useRef(null);
  const paintingRef = useRef(false);

  useEffect(() => { setGrid(lobby.myGrid || new Array(size * size).fill(-1)); /* eslint-disable-next-line */ }, [lobby.currentRound, lobby.gridSize]);
  useEffect(() => { setRemaining(lobby.roundRemainingMs ?? 0); endTimeRef.current = Date.now() + (lobby.roundRemainingMs ?? 0); }, [lobby.roundRemainingMs, lobby.currentRound]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endTimeRef.current - Date.now())), 250); return () => clearInterval(t); }, []);
  useEffect(() => { const up = () => { paintingRef.current = false; }; window.addEventListener('mouseup', up); window.addEventListener('touchend', up); return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); }; }, []);

  const brushCells = useCallback((i) => {
    const cx = i % size, cy = Math.floor(i / size), out = [];
    const lo = -Math.floor((brush - 1) / 2), hi = Math.floor(brush / 2);
    for (let dy = lo; dy <= hi; dy++) for (let dx = lo; dx <= hi; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) out.push(y * size + x); }
    return out;
  }, [brush, size]);

  const paintBrush = useCallback((i) => {
    const cells = brushCells(i);
    setGrid((prev) => { const ng = [...prev]; let ch = false; cells.forEach((c) => { if (ng[c] !== selected) { ng[c] = selected; ch = true; } }); return ch ? ng : prev; });
    cells.forEach((c) => onPaintCell(c, selected));
  }, [brushCells, selected, onPaintCell]);

  const floodLocal = useCallback((start) => {
    setGrid((prev) => {
      const target = prev[start]; if (target === selected) return prev;
      const ng = [...prev]; const stack = [start];
      while (stack.length) { const idx = stack.pop(); if (ng[idx] !== target) continue; ng[idx] = selected; const x = idx % size, y = Math.floor(idx / size); if (x > 0) stack.push(idx - 1); if (x < size - 1) stack.push(idx + 1); if (y > 0) stack.push(idx - size); if (y < size - 1) stack.push(idx + size); }
      return ng;
    });
    onFillArea(start, selected);
  }, [selected, size, onFillArea]);

  const onDown = (i) => { if (tool === 'fill') { floodLocal(i); } else { paintingRef.current = true; paintBrush(i); } };
  const onEnter = (i) => { if (paintingRef.current && tool === 'brush') paintBrush(i); };
  const cellFromTouch = (t) => { const el = document.elementFromPoint(t.clientX, t.clientY); const idx = el?.getAttribute?.('data-idx'); if (idx != null) paintBrush(parseInt(idx, 10)); };

  const fillAll = () => { setGrid(new Array(size * size).fill(selected)); onFillAll(selected); };
  const clear = () => { setGrid(new Array(size * size).fill(-1)); onClearGrid(); };

  const btn = (active) => `px-2.5 h-8 rounded-md text-sm border ${active ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`;

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

      <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-auto">
        <div className="grid touch-none select-none border border-gray-700" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 'min(80vmin, 520px)', aspectRatio: '1 / 1' }}
          onTouchMove={(e) => { if (paintingRef.current && tool === 'brush') cellFromTouch(e.touches[0]); }}>
          {grid.map((c, i) => (
            <div key={i} data-idx={i}
              onMouseDown={() => onDown(i)} onMouseEnter={() => onEnter(i)}
              onTouchStart={() => onDown(i)}
              style={{ backgroundColor: c === -1 ? '#1f2937' : lobby.palette[c], outline: '1px solid rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {lobby.palette.map((hex, i) => (
            <button key={i} onClick={() => setSelected(i)} className={`w-8 h-8 rounded-md border-2 ${selected === i ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: hex }} />
          ))}
          <button onClick={() => setSelected(-1)} className={`w-8 h-8 rounded-md border-2 flex items-center justify-center ${selected === -1 ? 'border-white scale-110' : 'border-gray-600'} bg-gray-700`} title="Gomme">🧽</button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => setTool('brush')} className={btn(tool === 'brush')}>✏️ Pinceau</button>
          {tool === 'brush' && [1, 2, 3].map((b) => <button key={b} onClick={() => setBrush(b)} className={btn(brush === b)}>{b}×{b}</button>)}
          <button onClick={() => setTool('fill')} className={btn(tool === 'fill')}>🪣 Pot</button>
          <span className="mx-1 h-6 w-px bg-gray-700" />
          <button onClick={fillAll} className="px-2.5 h-8 rounded-md bg-gray-700 hover:bg-gray-600 text-sm">Remplir le fond</button>
          <button onClick={clear} className="px-2.5 h-8 rounded-md bg-gray-700 hover:bg-gray-600 text-sm">Tout effacer</button>
          {isHost && <button onClick={onStopGame} className="px-2.5 h-8 rounded-md bg-gray-800 hover:bg-gray-700 text-red-300 text-sm">⏹</button>}
        </div>
      </div>
    </div>
  );
}
