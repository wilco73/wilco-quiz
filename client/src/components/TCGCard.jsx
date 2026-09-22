import React from 'react';

/**
 * TCGCard - carte façon trading card (CSS pur), réutilisable pour les objets et (plus tard) les cartes bonus/malus.
 *
 * Props :
 * - name        : nom affiché en haut
 * - imageUrl    : image (R2) cadrée dans la fenêtre ; sinon placeholder
 * - kind        : 'item' | 'bonus' | 'malus' | 'mixed'  (thème de base)
 * - pv          : points de victoire (objets) — affiché en pastille + détermine la rareté auto
 * - rarity      : 'common'|'rare'|'epic'|'legendary'|null (null = auto selon pv, objets uniquement)
 * - effects     : [{ good:boolean, label:string }] pour les cartes bonus/malus (liste dans le cadre du bas)
 * - size        : 'sm' | 'md' | 'lg'
 */

const RARITY = {
  common:    { label: 'Commun',     frame: 'from-gray-400 to-gray-600',     glow: 'shadow-gray-500/20',   badge: 'bg-gray-500' },
  rare:      { label: 'Rare',       frame: 'from-sky-400 to-blue-700',      glow: 'shadow-blue-500/40',   badge: 'bg-blue-500' },
  epic:      { label: 'Épique',     frame: 'from-fuchsia-400 to-purple-800', glow: 'shadow-purple-500/50', badge: 'bg-purple-500' },
  legendary: { label: 'Légendaire', frame: 'from-amber-300 to-yellow-600',  glow: 'shadow-amber-400/60',  badge: 'bg-amber-500' },
};
const KIND = {
  item:  { frame: null,                       accent: 'text-amber-200',  head: 'from-amber-700 to-amber-900',  box: 'bg-amber-950/40' },
  bonus: { frame: 'from-emerald-400 to-green-700', accent: 'text-emerald-200', head: 'from-emerald-700 to-green-900', box: 'bg-emerald-950/40' },
  malus: { frame: 'from-rose-400 to-red-800',  accent: 'text-rose-200',   head: 'from-rose-700 to-red-900',    box: 'bg-rose-950/40' },
  mixed: { frame: 'from-fuchsia-400 to-indigo-700', accent: 'text-fuchsia-200', head: 'from-fuchsia-700 to-indigo-900', box: 'bg-indigo-950/40' },
};
const SIZES = {
  sm: { w: 150, name: 'text-[11px]', pv: 'text-xs', eff: 'text-[10px]' },
  md: { w: 210, name: 'text-sm',     pv: 'text-sm', eff: 'text-xs' },
  lg: { w: 280, name: 'text-lg',     pv: 'text-base', eff: 'text-sm' },
};

function rarityFromPv(pv) {
  if (pv >= 10) return 'legendary';
  if (pv >= 7) return 'epic';
  if (pv >= 4) return 'rare';
  return 'common';
}

export default function TCGCard({ name, imageUrl, kind = 'item', pv = null, rarity = null, effects = null, size = 'md' }) {
  const S = SIZES[size] || SIZES.md;
  const isItem = kind === 'item';
  const rar = isItem ? (rarity || rarityFromPv(pv || 0)) : null;
  const R = rar ? RARITY[rar] : null;
  const K = KIND[kind] || KIND.item;
  // Le cadre extérieur suit la rareté (objets) ou le type (bonus/malus/mixte)
  const frameGrad = R ? R.frame : (K.frame || 'from-gray-500 to-gray-700');
  const glow = R ? R.glow : 'shadow-black/40';

  return (
    <div
      className={`bg-gradient-to-br ${frameGrad} rounded-2xl p-1.5 shadow-xl ${glow} select-none`}
      style={{ width: S.w, aspectRatio: '2.5 / 3.5' }}
    >
      <div className="h-full w-full rounded-xl bg-gray-900 flex flex-col overflow-hidden border border-black/30">
        {/* Bandeau nom + PV */}
        <div className={`bg-gradient-to-r ${K.head} px-2 py-1 flex items-center justify-between gap-1`}>
          <span className={`font-extrabold text-white truncate ${S.name}`}>{name || '—'}</span>
          {isItem && pv != null && <span className={`shrink-0 ${R?.badge || 'bg-amber-500'} text-white font-black rounded-full px-2 py-0.5 ${S.pv}`}>{pv}</span>}
        </div>

        {/* Fenêtre image */}
        <div className="mx-2 mt-2 rounded-lg overflow-hidden border-2 border-black/40" style={{ height: '48%' }}>
          {imageUrl
            ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-700 to-gray-800">{isItem ? '🏺' : kind === 'bonus' ? '✨' : kind === 'malus' ? '💀' : '🎲'}</div>}
        </div>

        {/* Cadre effets */}
        <div className={`m-2 flex-1 rounded-lg ${K.box} border border-white/10 p-2 overflow-y-auto`}>
          {isItem ? (
            <p className={`${K.accent} font-semibold ${S.eff}`}>Objet à collectionner — <span className="font-black">{pv} point{pv > 1 ? 's' : ''} de victoire</span>.</p>
          ) : (
            <ul className="space-y-1">
              {(effects || []).map((e, i) => (
                <li key={i} className={`flex items-start gap-1 ${S.eff}`}>
                  <span>{e.good ? '🟢' : '🔴'}</span>
                  <span className={e.good ? 'text-emerald-200' : 'text-rose-200'}>{e.label}</span>
                </li>
              ))}
              {(!effects || effects.length === 0) && <li className={`text-gray-500 ${S.eff}`}>Aucun effet.</li>}
            </ul>
          )}
        </div>

        {/* Bas : label de rareté (objets) */}
        {isItem && R && (
          <div className="px-2 pb-1.5 -mt-1">
            <span className={`inline-block ${R.badge} text-white/90 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide`}>{R.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
