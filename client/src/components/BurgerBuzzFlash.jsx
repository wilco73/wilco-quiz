import React from 'react';

/** Flash plein écran de la couleur de l'équipe qui vient de buzzer (~0.6s, non bloquant). */
export default function BurgerBuzzFlash({ color }) {
  if (!color) return null;
  return (
    <div
      className="fixed inset-0 z-[90] pointer-events-none"
      style={{ backgroundColor: color, animation: 'burgerBuzzFlash 0.6s ease-out forwards' }}
    >
      <style>{`@keyframes burgerBuzzFlash { 0% { opacity: 0.85; } 100% { opacity: 0; } }`}</style>
    </div>
  );
}