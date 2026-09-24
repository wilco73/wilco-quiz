import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import TCGCard, { DEFAULT_THEME } from './TCGCard';
import TCGCardZoom from './TCGCardZoom';

const RARITY_OPTS = [['', 'Auto (selon PV)'], ['common', 'Commun'], ['rare', 'Rare'], ['epic', 'Épique'], ['legendary', 'Légendaire']];
const RARITIES = [['common', 'Commun'], ['rare', 'Rare'], ['epic', 'Épique'], ['legendary', 'Légendaire']];
const FIELDS = [['c1', 'Cadre haut'], ['c2', 'Cadre bas'], ['band', 'Bandeau'], ['badge', 'Pastille']];
const SAMPLE_PV = { common: 2, rare: 5, epic: 8, legendary: 11 };

export default function AuctionItemsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', imageUrl: '', pv: 5, rarity: '' });
  const [editingId, setEditingId] = useState(null);
  // Thème (couleurs par rareté)
  const [rarityTheme, setRarityTheme] = useState(DEFAULT_THEME.rarity);
  const [savingTheme, setSavingTheme] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const theme = { rarity: rarityTheme };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`${API_URL}/auction-items`); const d = await r.json(); setItems(d.items || []); } catch (e) {}
    try { const r2 = await fetch(`${API_URL}/app-settings/auction_card_theme`); const d2 = await r2.json(); if (d2.value) { const t = JSON.parse(d2.value); if (t.rarity) setRarityTheme({ ...DEFAULT_THEME.rarity, ...t.rarity }); } } catch (e) {}
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

  const setColor = (rar, field, value) => setRarityTheme((prev) => ({ ...prev, [rar]: { ...prev[rar], [field]: value } }));
  const saveTheme = async () => {
    setSavingTheme(true);
    try { await fetch(`${API_URL}/app-settings/auction_card_theme`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: JSON.stringify({ rarity: rarityTheme }) }) }); } catch (e) {}
    setSavingTheme(false);
  };
  const resetTheme = () => setRarityTheme(DEFAULT_THEME.rarity);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* ===== Apparence des cartes ===== */}
      <div className="border dark:border-gray-700 rounded-lg">
        <button onClick={() => setShowAppearance((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 font-bold dark:text-white">
          <span>🎨 Apparence des cartes (couleurs par rareté)</span><span>{showAppearance ? '▲' : '▼'}</span>
        </button>
        {showAppearance && (
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex flex-wrap gap-6 justify-center">
              {RARITIES.map(([rar, label]) => (
                <div key={rar} className="flex flex-col items-center gap-2">
                  <TCGCardZoom name={label} pv={SAMPLE_PV[rar]} rarity={rar} kind="item" size="sm" theme={theme} />
                  <div className="grid grid-cols-2 gap-1">
                    {FIELDS.map(([f, flabel]) => (
                      <label key={f} className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                        <input type="color" value={rarityTheme[rar][f]} onChange={(e) => setColor(rar, f, e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                        {flabel}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={saveTheme} disabled={savingTheme} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50">{savingTheme ? 'Sauvegarde…' : 'Enregistrer l\'apparence'}</button>
              <button onClick={resetTheme} className="px-3 py-2 bg-gray-400 text-white rounded-lg text-sm">Réinitialiser</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Objets ===== */}
      <div>
        <h2 className="text-2xl font-bold mb-1 dark:text-white">💰 Objets de l'Encan</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nom + image + PV. Rareté auto selon PV (1-3/4-6/7-9/10+) ou forçable. Objets génériques en complément si besoin.</p>

        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-3">
            <div><label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nom</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Vase Ming" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">URL de l'image (R2)</label>
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>
            <div className="flex gap-3">
              <div className="w-24"><label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">PV</label>
                <input type="number" min="1" value={form.pv} onChange={(e) => setForm({ ...form, pv: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white" /></div>
              <div className="flex-1"><label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Rareté</label>
                <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} className="w-full px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  {RARITY_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div className="flex gap-2">
              <button onClick={submit} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold">{editingId ? 'Modifier' : 'Ajouter'}</button>
              {editingId && <button onClick={() => { setEditingId(null); setForm({ name: '', imageUrl: '', pv: 5, rarity: '' }); }} className="px-3 py-2 bg-gray-400 text-white rounded-lg">Annuler</button>}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aperçu</p>
            <TCGCard name={form.name || 'Nom de l\'objet'} imageUrl={form.imageUrl || null} pv={parseInt(form.pv) || 0} rarity={form.rarity || null} kind="item" size="md" theme={theme} />
          </div>
        </div>

        {loading ? <p className="text-gray-500">Chargement…</p> : (
          <div className="flex flex-wrap gap-4">
            {items.map((it) => (
              <div key={it.id} className="flex flex-col items-center">
                <TCGCardZoom name={it.name} imageUrl={it.imageUrl} pv={it.pv} rarity={it.rarity} kind="item" size="sm" theme={theme} />
                <div className="flex gap-2 mt-1"><button onClick={() => edit(it)} className="text-xs text-blue-500 hover:underline">Modifier</button><button onClick={() => remove(it.id)} className="text-xs text-red-500 hover:underline">Suppr.</button></div>
              </div>
            ))}
            {items.length === 0 && <p className="text-gray-500 text-sm">Aucun objet — des objets génériques seront utilisés.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
