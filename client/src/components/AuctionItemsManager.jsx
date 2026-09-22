import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import TCGCard from './TCGCard';

const RARITY_OPTS = [['', 'Auto (selon PV)'], ['common', 'Commun'], ['rare', 'Rare'], ['epic', 'Épique'], ['legendary', 'Légendaire']];

export default function AuctionItemsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', imageUrl: '', pv: 5, rarity: '' });
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`${API_URL}/auction-items`); const d = await r.json(); setItems(d.items || []); } catch (e) {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name.trim()) return;
    const body = { name: form.name.trim(), imageUrl: form.imageUrl.trim() || null, pv: parseInt(form.pv) || 1, rarity: form.rarity || null };
    try {
      if (editingId) await fetch(`${API_URL}/auction-items/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      else await fetch(`${API_URL}/auction-items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setForm({ name: '', imageUrl: '', pv: 5, rarity: '' }); setEditingId(null); load();
    } catch (e) {}
  };
  const edit = (it) => { setEditingId(it.id); setForm({ name: it.name, imageUrl: it.imageUrl || '', pv: it.pv, rarity: it.rarity || '' }); };
  const remove = async (id) => { if (!window.confirm('Supprimer cet objet ?')) return; await fetch(`${API_URL}/auction-items/${id}`, { method: 'DELETE' }); load(); };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-1 dark:text-white">💰 Objets de l'Encan</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nom + image + points de victoire. La rareté est automatique selon les PV (1-3 commun, 4-6 rare, 7-9 épique, 10+ légendaire), ou forçable. S'il n'y a pas assez d'objets, des génériques complètent.</p>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Formulaire */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nom</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Vase Ming" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">URL de l'image (R2)</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <div className="w-24">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">PV</label>
              <input type="number" min="1" value={form.pv} onChange={(e) => setForm({ ...form, pv: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Rareté</label>
              <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                {RARITY_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold">{editingId ? 'Modifier' : 'Ajouter'}</button>
            {editingId && <button onClick={() => { setEditingId(null); setForm({ name: '', imageUrl: '', pv: 5, rarity: '' }); }} className="px-3 py-2 bg-gray-400 text-white rounded-lg">Annuler</button>}
          </div>
        </div>
        {/* Aperçu live */}
        <div className="flex flex-col items-center justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aperçu</p>
          <TCGCard name={form.name || 'Nom de l\'objet'} imageUrl={form.imageUrl || null} pv={parseInt(form.pv) || 0} rarity={form.rarity || null} kind="item" size="md" />
        </div>
      </div>

      {loading ? <p className="text-gray-500">Chargement…</p> : (
        <div className="flex flex-wrap gap-4">
          {items.map((it) => (
            <div key={it.id} className="flex flex-col items-center">
              <TCGCard name={it.name} imageUrl={it.imageUrl} pv={it.pv} rarity={it.rarity} kind="item" size="sm" />
              <div className="flex gap-2 mt-1">
                <button onClick={() => edit(it)} className="text-xs text-blue-500 hover:underline">Modifier</button>
                <button onClick={() => remove(it.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-gray-500 text-sm">Aucun objet — des objets génériques seront utilisés.</p>}
        </div>
      )}
    </div>
  );
}
