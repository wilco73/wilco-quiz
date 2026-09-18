import React from 'react';
export default function PixelGrid({ grid, size, palette, maxW = 'min(70vmin, 420px)' }) {
  return (
    <div className="grid border border-gray-700" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: maxW, aspectRatio: '1 / 1' }}>
      {(grid || []).map((c, i) => (
        <div key={i} style={{ backgroundColor: c === -1 ? '#1f2937' : palette[c], outline: '1px solid rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  );
}
