import React, { useState } from 'react';
import Avatar from './Avatar';

/**
 * ReversePostLobbyView - lobby du Post-it inversé.
 * Chacun choisit SON propre mot / personnage (+ image optionnelle) que les autres devront deviner.
 */
export default function ReversePostLobbyView({ lobby, currentUser, isHost, onSetWord, onSetConfig, onStart, onStopGame, onBack }) {
  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const [word, setWord] = useState(me?.word || '');
  const [imageUrl, setImageUrl] = useState(me?.wordImage || '');

  const enoughPlayers = lobby.players.length >= lobby.minPlayers;
  const allHaveWords = lobby.players.every((p) => p.hasWord);
  const canStart = isHost && enoughPlayers && allHaveWords;
  const saveWord = () => { if (word.trim()) onSetWord(word.trim(), imageUrl.trim()); };

  return (
    <div className="min-h-full bg-gradient-to-br from-sky-900 via-gray-900 to-gray-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">🔄 Post-it inversé</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        <div className="bg-sky-900/30 border border-sky-500/30 rounded-xl p-3 mb-4 text-sm text-gray-200">
          <p>Choisis un <b>mot ou un personnage</b> : ce sont les <b>autres</b> qui devront le deviner. À ton tour, choisis un joueur et pose-lui une question à l'oral (il répond oui ou non), <b>ou</b> fais une proposition sur son mot. Mot trouvé = +1 point.</p>
        </div>

        {/* Joueurs */}
        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold mb-2">Joueurs ({lobby.players.length})</h2>
          <div className="space-y-1.5">
            {lobby.players.map((p) => (
              <div key={p.odId} className={`flex items-center gap-3 rounded-lg p-2 ${p.odId === currentUser?.id ? 'bg-sky-500/20 ring-1 ring-sky-400' : 'bg-gray-900/50'}`}>
                <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                <span className="flex-1 font-semibold text-sm truncate">{p.pseudo} {p.odId === lobby.hostId && <span className="text-xs text-sky-300">(hôte)</span>}</span>
                <span className={`text-xs ${p.hasWord ? 'text-green-400' : 'text-gray-500'}`}>{p.hasWord ? `✓ mot choisi${p.hasImage ? ' 🖼' : ''}` : '… en réflexion'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mon mot */}
        {me && (
          <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
            <h2 className="font-bold mb-1">Ton mot secret</h2>
            <p className="text-xs text-gray-400 mb-3">Personne d'autre ne le voit. Choisis quelque chose que les autres peuvent deviner avec des questions oui/non.</p>
            <div className="flex gap-2 mb-2">
              <input type="text" value={word} onChange={(e) => setWord(e.target.value)} onBlur={saveWord}
                onKeyDown={(e) => e.key === 'Enter' && saveWord()}
                placeholder="Ex : Pikachu, la tour Eiffel…" maxLength={60}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-sky-500 outline-none" />
              <button onClick={saveWord} className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold">Valider</button>
            </div>
            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onBlur={saveWord}
              placeholder="Image (URL, optionnel) — montrée à tout le monde quand ton mot sera trouvé"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-sky-500 outline-none text-sm" />
            {imageUrl.trim() && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Aperçu (si rien ne s'affiche, le lien est invalide) :</p>
                <img src={imageUrl.trim()} alt="aperçu" className="max-h-32 rounded-lg border border-gray-700"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} onLoad={(e) => { e.currentTarget.style.display = ''; }} />
              </div>
            )}
            {me.hasWord && <p className="text-xs text-green-400 mt-2">✓ Enregistré : <b>{me.word}</b>{me.hasImage ? ' (avec image)' : ''} — tu peux encore le modifier.</p>}
          </div>
        )}

        {isHost ? (
          <div className="bg-gray-800/60 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Temps par tour (secondes, 0 = pas de limite)</label>
            <input type="number" min="0" max="600" defaultValue={lobby.turnDuration}
              onBlur={(e) => { const v = parseInt(e.target.value, 10); onSetConfig({ turnDuration: Number.isNaN(v) ? 90 : v }); }}
              className="w-32 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none mb-4" />
            <button onClick={onStart} disabled={!canStart}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              {!enoughPlayers ? `Minimum ${lobby.minPlayers} joueurs` : (allHaveWords ? '▶ Démarrer la partie' : 'En attente des mots de tous les joueurs')}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">En attente que l'hôte démarre la partie…</p>
        )}
      </div>
    </div>
  );
}
