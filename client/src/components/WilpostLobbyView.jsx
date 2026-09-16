import React, { useState } from 'react';
import Avatar from './Avatar';

/**
 * WilpostLobbyView - lobby de Wilpost-it.
 * - Ordre des joueurs (chaîne des mots + rotation des tours), réordonnable en drag-and-drop par l'hôte.
 * - Saisie du mot pour sa cible (joueur suivant).
 * - Réglage de la durée de round + démarrage (hôte).
 */
export default function WilpostLobbyView({ lobby, currentUser, isHost, onSetOrder, onSetDuration, onSetWord, onStart, onStopGame, onBack }) {
  const [word, setWord] = useState('');
  const [dragIndex, setDragIndex] = useState(null);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const myIndex = lobby.order.indexOf(currentUser?.id);
  const targetId = myIndex >= 0 ? lobby.order[(myIndex + 1) % lobby.order.length] : null;
  const target = lobby.players.find((p) => p.odId === targetId);

  const enoughPlayers = lobby.players.length >= lobby.minPlayers;
  const allHaveWords = lobby.players.every((p) => p.hasWord);
  const canStart = isHost && enoughPlayers && allHaveWords;

  const saveWord = () => { if (word.trim()) onSetWord(word.trim()); };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); return; }
    const newOrder = [...lobby.order];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, moved);
    setDragIndex(null);
    onSetOrder(newOrder);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-yellow-900 via-gray-900 to-gray-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">📝 Wilpost-it</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        {/* Ordre des joueurs */}
        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold">Ordre de jeu {isHost && <span className="text-xs text-gray-400 font-normal">(glisse pour réordonner)</span>}</h2>
          <p className="text-xs text-gray-400 mb-3">Chacun donne son mot au joueur suivant ; les tours suivent cet ordre.</p>
          <div className="space-y-2">
            {lobby.order.map((id, index) => {
              const p = lobby.players.find((pl) => pl.odId === id);
              if (!p) return null;
              const next = lobby.players.find((pl) => pl.odId === lobby.order[(index + 1) % lobby.order.length]);
              const isMe = id === currentUser?.id;
              return (
                <div
                  key={id}
                  draggable={isHost}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className={`flex items-center gap-3 rounded-lg p-2 ${isHost ? 'cursor-move' : ''} ${isMe ? 'bg-yellow-500/20 ring-1 ring-yellow-400' : 'bg-gray-900/50'} ${dragIndex === index ? 'opacity-50' : ''}`}
                >
                  <span className="w-6 text-center text-gray-400 font-mono">{index + 1}</span>
                  <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {p.pseudo} {p.odId === lobby.hostId && <span className="text-xs text-yellow-400">(hôte)</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">donne à {next?.pseudo}</p>
                  </div>
                  <span className={`text-xs shrink-0 ${p.hasWord ? 'text-green-400' : 'text-gray-500'}`}>{p.hasWord ? '✓ mot' : '… mot'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mon mot pour ma cible */}
        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold mb-1">Ton mot pour {target?.pseudo || '…'}</h2>
          <p className="text-xs text-gray-400 mb-3">Choisis le mot / personnage que {target?.pseudo || 'ta cible'} devra faire deviner.</p>
          <div className="flex gap-2">
            <input
              type="text" value={word} onChange={(e) => setWord(e.target.value)} onBlur={saveWord}
              placeholder="Ex : Batman, une licorne…" maxLength={60}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-yellow-500 outline-none"
            />
            <button onClick={saveWord} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-semibold">Valider</button>
          </div>
          {me?.hasWord && <p className="text-xs text-green-400 mt-2">✓ Ton mot est enregistré (tu peux le modifier).</p>}
        </div>

        {/* Réglages hôte + démarrage */}
        {isHost ? (
          <div className="bg-gray-800/60 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Durée d'un round (secondes)</label>
            <input
              type="number" min="15" max="600" defaultValue={lobby.roundDuration}
              onBlur={(e) => onSetDuration(parseInt(e.target.value) || 60)}
              className="w-32 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none mb-4"
            />
            <button
              onClick={onStart} disabled={!canStart}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
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
