import React from 'react';

/**
 * ImageOrderDisplay - affiche une réponse de type "classement d'images" sous forme d'images
 * (au lieu de la chaîne d'index "0|1|2|3" qui n'est pas parlante).
 *
 * Props:
 * - images: string[]   -> les URLs, stockées dans le BON ordre (question.choices)
 * - answer: string     -> ordre à afficher, ex "3|1|0|2" (indices d'origine).
 *                          Si absent/vide -> affiche l'ordre correct (identité 0,1,2,...).
 * - size: 'xs' | 'sm' | 'lg'
 */
export default function ImageOrderDisplay({ images = [], answer, size = 'sm' }) {
  if (!images || images.length === 0) {
    return <span className="text-gray-400 text-xs">(pas d'images)</span>;
  }

  let seq = [];
  if (typeof answer === 'string' && answer.trim()) {
    seq = answer
      .split('|')
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < images.length);
  }
  if (seq.length === 0) {
    seq = images.map((_, i) => i); // ordre correct par défaut
  }

  const dim =
    size === 'xs' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-11 h-11';

  return (
    <span className="inline-flex flex-wrap gap-1 items-end align-middle">
      {seq.map((idx, pos) => (
        <span key={pos} className="inline-flex flex-col items-center">
          <img
            src={images[idx]}
            alt={`position ${pos + 1}`}
            className={`${dim} object-cover rounded border border-gray-300 dark:border-gray-600`}
            onError={(e) => { e.target.style.visibility = 'hidden'; }}
          />
          <span className="text-[9px] leading-none font-bold text-gray-400 mt-0.5">
            {pos + 1}
          </span>
        </span>
      ))}
    </span>
  );
}
