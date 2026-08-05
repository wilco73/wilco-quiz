import React, { useState } from 'react';

/**
 * BurgerCreateConfig - écran de configuration à la création (animateur).
 * Choix du nombre d'équipes (2 ou 3 pour l'instant) et du nombre de joueurs par équipe.
 *
 * Extensible : pour ajouter des équipes/couleurs, il suffit d'étendre PRESETS
 * (garder les mêmes ids/couleurs que TEAM_PRESETS côté serveur).
 */

const PRESETS = [
  { id: 'mayo',    name: 'Mayo',    color: '#E0C800' },
  { id: 'ketchup', name: 'Ketchup', color: '#C71000' },
  { id: 'wasabi',  name: 'Wasabi',  color: '#3FA34D' },
];

export default function BurgerCreateConfig({ onCreate, onBack, loading = false }) {
  const [teamCount, setTeamCount] = useState(2);
  const [perTeam, setPerTeam] = useState(3);

  const teams = PRESETS.slice(0, teamCount);
  const totalPlayers = teamCount * perTeam;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-gradient-to-br from-red-900 via-gray-900 to-yellow-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/70 border border-gray-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Retour</button>
          <h1 className="text-xl font-extrabold">🍔 Nouvelle partie</h1>
          <span className="w-14" />
        </div>

        {/* Nombre d'équipes */}
        <label className="block text-sm font-semibold text-gray-300 mb-2">Nombre d'équipes</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setTeamCount(n)}
              className={`py-3 rounded-xl font-bold border-2 transition ${
                teamCount === n ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              {n} équipes
            </button>
          ))}
        </div>

        {/* Aperçu des équipes */}
        <div className="flex flex-wrap gap-2 mb-4">
          {teams.map((t) => (
            <span key={t.id} className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: t.color, color: '#111' }}>
              {t.name}
            </span>
          ))}
        </div>

        {/* Joueurs par équipe */}
        <label className="block text-sm font-semibold text-gray-300 mb-2">Joueurs par équipe</label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPerTeam(n)}
              className={`py-2.5 rounded-xl font-bold border-2 transition ${
                perTeam === n ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-5">
          {totalPlayers} joueurs max ({teamCount} × {perTeam}) + vous (animateur).
        </p>

        <button
          onClick={() => onCreate({ teams: teams.map((t) => t.id), maxPerTeam: perTeam })}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold disabled:opacity-50"
        >
          {loading ? 'Création…' : '▶ Créer la partie'}
        </button>
      </div>
    </div>
  );
}
