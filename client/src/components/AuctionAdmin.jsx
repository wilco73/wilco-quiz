import React, { useState } from 'react';
import AuctionItemsManager from './AuctionItemsManager';
import AuctionCardsManager from './AuctionCardsManager';

/**
 * AuctionAdmin - écran d'administration unique de l'Encan, avec onglets internes.
 * Regroupe la gestion des objets (+ apparence des cartes) et des cartes bonus/malus.
 */
export default function AuctionAdmin() {
  const [tab, setTab] = useState('items');
  const tabs = [
    ['items', '💰 Objets & apparence'],
    ['cards', '🃏 Cartes bonus/malus'],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold dark:text-white">💰 Encan Clandestin — configuration</h1>
      <div className="flex gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === id ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'items' ? <AuctionItemsManager /> : <AuctionCardsManager />}
    </div>
  );
}
