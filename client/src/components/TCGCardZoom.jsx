import React, { useState } from 'react';
import TCGCard from './TCGCard';

/**
 * TCGCardZoom - une TCGCard cliquable qui s'ouvre en grand dans une modale (responsive).
 * Mêmes props que TCGCard (name, imageUrl, kind, pv, rarity, effects, theme) + size (taille en jeu).
 */
export default function TCGCardZoom(props) {
  const { size = 'md', ...card } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="cursor-zoom-in transition-transform hover:scale-[1.03]" onClick={() => setOpen(true)} title="Cliquer pour agrandir">
        <TCGCard {...card} size={size} />
      </div>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl leading-none">✕</button>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(88vw, 60vh * 2.5 / 3.5)' }} className="max-w-[360px]">
            <TCGCard {...card} size="lg" />
          </div>
        </div>
      )}
    </>
  );
}
