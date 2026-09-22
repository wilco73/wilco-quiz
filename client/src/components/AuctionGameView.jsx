import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

function fmt(ms) { const x = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; }

/**
 * AuctionGameView - phases 'bid' / 'tiebreak' / 'result'.
 */
export default function AuctionGameView({ lobby, currentUser, isHost, onBid, onTieBid, onContinue, onStopGame, onBack }) {
  const [amount, setAmount] = useState(0);
  const remMs = lobby.phase === 'bid' ? lobby.bidRemainingMs : lobby.tieRemainingMs;
  const [remaining, setRemaining] = useState(remMs ?? 0);
  const endRef = useRef(null);
  useEffect(() => { setRemaining(remMs ?? 0); endRef.current = Date.now() + (remMs ?? 0); }, [remMs, lobby.itemNumber, lobby.phase, lobby.tieRound]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endRef.current - Date.now())), 250); return () => clearInterval(t); }, []);
  useEffect(() => { setAmount(0); }, [lobby.itemNumber, lobby.phase, lobby.tieRound]);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const isSpectator = !me;
  const myCoins = me?.coins ?? 0;

  const Header = (
    <div className="flex items-center justify-between px-4 py-2 shrink-0">
      <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
      <div className="text-center">
        <p className="text-xs text-gray-400">Objet {lobby.itemNumber}/{lobby.totalItems}</p>
        {(lobby.phase === 'bid' || lobby.phase === 'tiebreak') && <p className="text-2xl font-black font-mono tabular-nums">{fmt(remaining)}</p>}
      </div>
      {me && <span className="bg-amber-900/40 rounded-lg px-3 py-1 text-sm font-bold">💰 {myCoins}</span>}
    </div>
  );

  const Item = lobby.item && (
    <div className="text-center mb-2">
      {lobby.item.imageUrl && <img src={lobby.item.imageUrl} alt="" className="max-h-32 mx-auto rounded-lg mb-2" />}
      <p className="text-2xl font-black">{lobby.item.name}</p>
      <p className="text-amber-300 font-bold">{lobby.item.pv} points de victoire</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      {Header}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col items-center justify-center text-center gap-3">
        {Item}

        {/* BID */}
        {lobby.phase === 'bid' && (
          isSpectator ? <p className="text-gray-500">👁 Enchère en cours — {lobby.bidSubmittedIds.length}/{lobby.players.length} ont misé</p>
          : lobby.myBid != null ? <p className="text-green-400">✅ Mise enregistrée ({lobby.myBid} 💰) — {lobby.bidSubmittedIds.length}/{lobby.players.length}</p>
          : (
            <div className="w-full max-w-xs">
              <input type="range" min="0" max={myCoins} value={amount} onChange={(e)=>setAmount(parseInt(e.target.value))} className="w-full" />
              <div className="flex items-center gap-2 my-2">
                <input type="number" min="0" max={myCoins} value={amount} onChange={(e)=>setAmount(Math.max(0, Math.min(myCoins, parseInt(e.target.value)||0)))} className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-center text-xl font-bold" />
                <span className="text-gray-400">/ {myCoins}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>onBid(0)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">Passer (0)</button>
                <button onClick={()=>onBid(amount)} className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold">Miser {amount}</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{lobby.bidSubmittedIds.length}/{lobby.players.length} ont misé</p>
            </div>
          )
        )}

        {/* TIEBREAK */}
        {lobby.phase === 'tiebreak' && (
          <div className="w-full max-w-xs">
            <p className="text-lg font-bold text-amber-300 mb-1">⚔️ Égalité ! Surenchère (manche {lobby.tieRound})</p>
            <p className="text-xs text-gray-400 mb-2">En lice : {lobby.tiedPlayers.map((p)=>p.pseudo).join(', ')}</p>
            {lobby.myTie ? (
              lobby.tieSubmittedIds.includes(currentUser?.id) ? <p className="text-green-400">✅ Surenchère envoyée…</p> : (
                <>
                  <p className="text-sm text-gray-300 mb-1">Ta mise actuelle : {lobby.myTie.current} 💰 — tu peux ajouter jusqu'à {lobby.myTie.maxAdd}.</p>
                  {lobby.myTie.maxAdd <= 0 ? (
                    <button onClick={()=>onTieBid(0)} className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Tu es à fond — valider (0)</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max={lobby.myTie.maxAdd} value={amount||1} onChange={(e)=>setAmount(Math.max(1, Math.min(lobby.myTie.maxAdd, parseInt(e.target.value)||1)))} className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-center font-bold" />
                      <button onClick={()=>onTieBid(Math.max(1, amount||1))} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold">Surenchérir</button>
                    </div>
                  )}
                </>
              )
            ) : <p className="text-gray-400">Surenchère en cours entre les ex æquo…</p>}
          </div>
        )}

        {/* RESULT */}
        {lobby.phase === 'result' && lobby.result && (
          <div className="w-full max-w-md">
            {lobby.result.winnerId ? (
              <p className="text-2xl font-black text-amber-300 mb-1">🏆 {lobby.result.winnerPseudo} remporte l'objet !</p>
            ) : <p className="text-2xl font-black text-gray-400 mb-1">Personne n'a misé — objet non vendu</p>}
            {lobby.result.winnerId && <p className="text-sm text-gray-300 mb-1">Payé <span className="font-bold">{lobby.result.paid} 💰</span> · +{lobby.result.item.pv} PV{lobby.result.byDraw ? ' (départagé au tirage)' : ''}</p>}
            <p className="text-sm text-gray-400 mt-3 mb-1">Mises révélées :</p>
            <div className="space-y-1">
              {lobby.result.bids.map((b) => (
                <div key={b.odId} className={`flex justify-between text-sm rounded px-2 py-1 ${b.odId === lobby.result.winnerId ? 'bg-amber-900/40' : 'bg-gray-800/50'}`}>
                  <span>{b.pseudo}</span><span className="font-bold">{b.amount} 💰</span>
                </div>
              ))}
            </div>
            {isHost ? <button onClick={onContinue} className="w-full mt-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold">{lobby.itemNumber >= lobby.totalItems ? '🏁 Classement final' : '▶ Objet suivant'}</button> : <p className="text-sm text-gray-400 animate-pulse mt-3">En attente de l'hôte…</p>}
          </div>
        )}
      </div>
      {isHost && <div className="shrink-0 p-2 text-center border-t border-gray-800"><button onClick={onStopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button></div>}
    </div>
  );
}
