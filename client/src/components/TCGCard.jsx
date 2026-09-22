import React from 'react';

/**
 * TCGCard - carte façon trading card (CSS pur), réutilisable objets + cartes bonus/malus.
 * Couleurs personnalisables par thème via la prop `theme` (sinon couleurs par défaut).
 *
 * Props :
 * - name, imageUrl, kind ('item'|'bonus'|'malus'|'mixed'), pv, rarity, effects, size
 * - theme : objet de config des couleurs (voir DEFAULT_THEME). Fusionné avec les défauts.
 */

// Couleurs par défaut (hex) — servent de fallback si rien n'est configuré en admin.
export const DEFAULT_THEME = {
  rarity: {
    common:    { c1: '#9ca3af', c2: '#4b5563', band: '#374151', badge: '#6b7280' },
    rare:      { c1: '#38bdf8', c2: '#1d4ed8', band: '#1e3a8a', badge: '#3b82f6' },
    epic:      { c1: '#e879f9', c2: '#6b21a8', band: '#581c87', badge: '#a855f7' },
    legendary: { c1: '#fcd34d', c2: '#ca8a04', band: '#854d0e', badge: '#f59e0b' },
  },
  kind: {
    item:  { c1: '#f59e0b', c2: '#78350f', band: '#78350f', box: '#451a03' },
    bonus: { c1: '#34d399', c2: '#15803d', band: '#14532d', box: '#052e16' },
    malus: { c1: '#fb7185', c2: '#991b1b', band: '#7f1d1d', box: '#450a0a' },
    mixed: { c1: '#e879f9', c2: '#4338ca', band: '#3730a3', box: '#1e1b4b' },
  },
};

const RARITY_LABEL = { common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };
const SIZES = {
  sm: { w: 150, name: 'text-[11px]', pv: 'text-xs', eff: 'text-[10px]' },
  md: { w: 210, name: 'text-sm', pv: 'text-sm', eff: 'text-xs' },
  lg: { w: 280, name: 'text-lg', pv: 'text-base', eff: 'text-sm' },
};
function rarityFromPv(pv) { if (pv >= 10) return 'legendary'; if (pv >= 7) return 'epic'; if (pv >= 4) return 'rare'; return 'common'; }
function merge(base, over) { const o = {}; for (const k in base) o[k] = { ...base[k], ...(over?.[k] || {}) }; return o; }

export default function TCGCard({ name, imageUrl, kind = 'item', pv = null, rarity = null, effects = null, size = 'md', theme = null }) {
  const S = SIZES[size] || SIZES.md;
  const isItem = kind === 'item';
  const rarityTheme = merge(DEFAULT_THEME.rarity, theme?.rarity);
  const kindTheme = merge(DEFAULT_THEME.kind, theme?.kind);
  const rar = isItem ? (rarity || rarityFromPv(pv || 0)) : null;

  // Palette effective : objets -> couleurs de la rareté ; cartes -> couleurs du type
  const pal = isItem ? rarityTheme[rar] : kindTheme[kind] || kindTheme.item;
  const boxColor = (kindTheme[kind] || kindTheme.item).box || '#111827';

  return (
    <div className="rounded-2xl p-1.5 shadow-xl select-none" style={{ width: S.w, aspectRatio: '2.5 / 3.5', background: `linear-gradient(135deg, ${pal.c1}, ${pal.c2})` }}>
      <div className="h-full w-full rounded-xl bg-gray-900 flex flex-col overflow-hidden border border-black/30">
        {/* Bandeau nom + PV */}
        <div className="px-2 py-1 flex items-center justify-between gap-1" style={{ background: `linear-gradient(90deg, ${pal.band}, ${pal.c2})` }}>
          <span className={`font-extrabold text-white truncate ${S.name}`}>{name || '—'}</span>
          {isItem && pv != null && <span className={`shrink-0 text-white font-black rounded-full px-2 py-0.5 ${S.pv}`} style={{ backgroundColor: pal.badge }}>{pv}</span>}
        </div>

        {/* Fenêtre image */}
        <div className="mx-2 mt-2 rounded-lg overflow-hidden border-2 border-black/40" style={{ height: '48%' }}>
          {imageUrl
            ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-700 to-gray-800">{isItem ? '🏺' : kind === 'bonus' ? '✨' : kind === 'malus' ? '💀' : '🎲'}</div>}
        </div>

        {/* Cadre effets */}
        <div className="m-2 flex-1 rounded-lg border border-white/10 p-2 overflow-y-auto" style={{ backgroundColor: boxColor + 'cc' }}>
          {isItem ? (
            <p className={`text-white/90 font-semibold ${S.eff}`}>Objet à collectionner — <span className="font-black">{pv} point{pv > 1 ? 's' : ''} de victoire</span>.</p>
          ) : (
            <ul className="space-y-1">
              {(effects || []).map((e, i) => (
                <li key={i} className={`flex items-start gap-1 ${S.eff}`}><span>{e.good ? '🟢' : '🔴'}</span><span className={e.good ? 'text-emerald-200' : 'text-rose-200'}>{e.label}</span></li>
              ))}
              {(!effects || effects.length === 0) && <li className={`text-gray-500 ${S.eff}`}>Aucun effet.</li>}
            </ul>
          )}
        </div>

        {/* Label de rareté (objets) */}
        {isItem && rar && (
          <div className="px-2 pb-1.5 -mt-1"><span className="inline-block text-white/90 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: pal.badge }}>{RARITY_LABEL[rar]}</span></div>
        )}
      </div>
    </div>
  );
}
