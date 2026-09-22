// Catalogue des effets de cartes (partagé). type -> { label, good, hasValue, fmt(v) }
const EFFECTS = {
  gain_coins:    { label: 'Gagner des pièces',        good: true,  hasValue: true,  fmt: (v) => `+${v} pièces` },
  lose_coins:    { label: 'Perdre des pièces',        good: false, hasValue: true,  fmt: (v) => `−${v} pièces` },
  gain_pv:       { label: 'Gagner des PV',            good: true,  hasValue: true,  fmt: (v) => `+${v} PV` },
  lose_pv:       { label: 'Perdre des PV',            good: false, hasValue: true,  fmt: (v) => `−${v} PV` },
  steal_coins:   { label: 'Voler des pièces',         good: true,  hasValue: true,  fmt: (v) => `Vole ${v} pièces au + riche` },
  discount_next: { label: 'Réduc. prochaine enchère', good: true,  hasValue: true,  fmt: (v) => `Prochaine enchère gagnée −${v}%` },
  overpay_next:  { label: 'Surcoût prochaine enchère', good: false, hasValue: true, fmt: (v) => `Prochaine enchère gagnée +${v}%` },
  skip_next:     { label: "Interdit d'enchérir",      good: false, hasValue: false, fmt: () => `Interdit d'enchérir au prochain objet` },
};
function effectLabel(e) { const d = EFFECTS[e.type]; return d ? d.fmt(e.value) : e.type; }
function effectGood(e) { const d = EFFECTS[e.type]; return d ? d.good : true; }
function cardKind(effects) {
  const g = (effects || []).some((e) => effectGood(e));
  const b = (effects || []).some((e) => !effectGood(e));
  return g && b ? 'mixed' : b ? 'malus' : 'bonus';
}
module.exports = { EFFECTS, effectLabel, effectGood, cardKind };
