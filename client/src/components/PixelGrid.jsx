import React from 'react';

// Ligne de grille adaptée à la couleur de la case (sombre sur couleur claire, claire sur couleur sombre).
export function gridLineColor(hex) {
  if (!hex) return 'rgba(255,255,255,0.14)';
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6 ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.16)';
}

export default function PixelGrid({ grid, size, palette, maxW = 'min(70vmin, 420px)' }) {
  return (
    <div className="grid rounded-sm overflow-hidden" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: maxW, aspectRatio: '1 / 1', background: '#4b5563', padding: '1px' }}>
      {(grid || []).map((c, i) => {
        const bg = c === -1 ? '#1f2937' : palette[c];
        return <div key={i} style={{ backgroundColor: bg, boxShadow: `inset 0 0 0 1px ${gridLineColor(bg)}` }} />;
      })}
    </div>
  );
}
