import React, { useEffect, useRef } from 'react';

/**
 * BurgerTransitionOverlay - joue une vidéo de transition en plein écran,
 * puis appelle onEnd quand elle se termine (ou au clic pour passer).
 *
 * Props:
 * - video: nom du fichier (ex: 'nuggets-transition.mp4') ou null
 * - onEnd: () => void
 */
export default function BurgerTransitionOverlay({ video, onEnd }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!video || !ref.current) return;
    const el = ref.current;
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  }, [video]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={onEnd}
    >
      <video
        ref={ref}
        src={`/resources/burger/videos/${video}`}
        className="max-w-full max-h-full"
        autoPlay
        playsInline
        onEnded={onEnd}
      />
      <button
        onClick={onEnd}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm"
      >
        Passer ✕
      </button>
    </div>
  );
}
