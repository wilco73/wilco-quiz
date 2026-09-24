import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import TCGCard from './TCGCard';
import TCGCardZoom from './TCGCardZoom';
import { EFFECTS, effectLabel, effectGood, cardKind } from './auctionEffects';

const EFFECT_ENTRIES = Object.entries(EFFECTS);
const emptyForm = { name: '', imageUrl: '', effects: [], bonusCount: 1, malusCount: 0 };

export default function AuctionCardsManager() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [newEff, setNewEff] = useState({ type: 'gain_coins', value: 5 });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`${API_URL}/auction-cards`); const d = await r.json(); setCards(d.cards || []); } catch (e) {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const previewEffects = (form.effects || []).map((e) => ({ good: effectGood(e), label: effectLabel(e) }));
  const kind = cardKind(form.effects);

  const addEffect = () => {
    const def = EFFECTS[newEff.type];
    setForm((f) => ({ ...f, effects: [...f.effects, { type: newEff.type, value: def.hasValue ? (parseInt(newEff.value) || 1) : 0 }] }));
  };
  const removeEffect = (i) => setForm((f) => ({ ...f, effects: f.effects.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.name.trim() || form.effects.length === 0) return;
    const body = { name: form.name.trim(), imageUrl: form.imageUrl.trim() || null, effects: form.effects, bonusCount: parseInt(form.bonusCount) || 0, malusCount: parseInt(form.malusCount) || 0 };
    if (body.bonusCount === 0 && body.malusCount === 0) { alert('La carte doit être dans au moins un paquet (copies bonus ou malus ≥ 1).'); return; }
    try {
      if (editingId) await fetch(`${API_URL}/auction-cards/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      else await fetch(`${API_URL}/auction-cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setForm({ ...emptyForm }); setEditingId(null); load();
    } catch (e) {}
  };
  const edit = (c) => { setEditingId(c.id); setForm({ name: c.name, imageUrl: c.imageUrl || '', effects: c.effects || [], bonusCount: c.bonusCount, malusCount: c.malusCount }); };
  const remove = async (id) => { if (!window.confirm('Supprimer cette carte ?')) return; await fetch(`${API_URL}/auction-cards/${id}`, { method: 'DELETE' }); load(); };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-1 dark:text-white">🃏 Cartes Bonus / Malus</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Le paquet <b>bonus</b> est pioché par ceux qui misent 0 ; le paquet <b>malus</b> par le 2e enchérisseur. Une carte peut être dans les deux paquets (copies bonus + copies malus).</p>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Formulaire */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nom</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Coup de chance" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Image (URL R2, optionnel)</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>

          {/* Effets */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Effets (1 à 3)</label>
            <div className="flex gap-2 mb-2">
              <select value={newEff.type} onChange={(e) => setNewEff({ ...newEff, type: e.target.value })} className="flex-1 px-2 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm">
                {EFFECT_ENTRIES.map(([k, d]) => <option key={k} value={k}>{d.good ? '🟢' : '🔴'} {d.label}</option>)}
              </select>
              {EFFECTS[newEff.type].hasValue && <input type="number" min="1" value={newEff.value} onChange={(e) => setNewEff({ ...newEff, value: e.target.value })} className="w-20 px-2 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" />}
              <button onClick={addEffect} disabled={form.effects.length >= 3} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-40">+</button>
            </div>
            <div className="space-y-1">
              {form.effects.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded px-2 py-1">
                  <span className={effectGood(e) ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>{effectGood(e) ? '🟢' : '🔴'} {effectLabel(e)}</span>
                  <button onClick={() => removeEffect(i)} className="text-red-500 text-xs">✕</button>
                </div>
              ))}
              {form.effects.length === 0 && <p className="text-xs text-gray-500">Ajoute au moins un effet.</p>}
            </div>
          </div>

          {/* Copies par paquet */}
          <div className="flex gap-3">
            <div className="w-28"><label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-300 mb-1">Copies bonus</label>
              <input type="number" min="0" value={form.bonusCount} onChange={(e) => setForm({ ...form, bonusCount: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>
            <div className="w-28"><label className="block text-xs font-semibold text-rose-600 dark:text-rose-300 mb-1">Copies malus</label>
              <input type="number" min="0" value={form.malusCount} onChange={(e) => setForm({ ...form, malusCount: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>
          </div>

          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">{editingId ? 'Modifier' : 'Ajouter la carte'}</button>
            {editingId && <button onClick={() => { setEditingId(null); setForm({ ...emptyForm }); }} className="px-3 py-2 bg-gray-400 text-white rounded-lg">Annuler</button>}
          </div>
        </div>

        {/* Aperçu */}
        <div className="flex flex-col items-center justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aperçu</p>
          <TCGCard name={form.name || 'Nom de la carte'} imageUrl={form.imageUrl || null} kind={kind} effects={previewEffects} size="md" />
        </div>
      </div>

      {loading ? <p className="text-gray-500">Chargement…</p> : (
        <div className="flex flex-wrap gap-4">
          {cards.map((c) => (
            <div key={c.id} className="flex flex-col items-center">
              <TCGCardZoom name={c.name} imageUrl={c.imageUrl} kind={cardKind(c.effects)} effects={(c.effects || []).map((e) => ({ good: effectGood(e), label: effectLabel(e) }))} size="sm" />
              <p className="text-[11px] text-gray-500 mt-1">🟢×{c.bonusCount} · 🔴×{c.malusCount}</p>
              <div className="flex gap-2"><button onClick={() => edit(c)} className="text-xs text-blue-500 hover:underline">Modifier</button><button onClick={() => remove(c.id)} className="text-xs text-red-500 hover:underline">Suppr.</button></div>
            </div>
          ))}
          {cards.length === 0 && <p className="text-gray-500 text-sm">Aucune carte. Les paquets seront vides tant que tu n'en ajoutes pas.</p>}
        </div>
      )}
    </div>
  );
}
