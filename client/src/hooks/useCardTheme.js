import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function useCardTheme() {
  const [theme, setTheme] = useState(null);
  useEffect(() => {
    (async () => {
      try { const r = await fetch(`${API_URL}/app-settings/auction_card_theme`); const d = await r.json(); if (d.value) setTheme(JSON.parse(d.value)); } catch (e) {}
    })();
  }, []);
  return theme;
}
