import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Stockage sûr : si localStorage est bloqué (antivirus/extension), on bascule en mémoire
// au lieu de faire planter l'app. La session ne survivra pas au rechargement, mais le site fonctionne.
const memoryStore = {};
const safeStorage = {
  getItem: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return k in memoryStore ? memoryStore[k] : null; } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { memoryStore[k] = String(v); } },
  removeItem: (k) => { try { window.localStorage.removeItem(k); } catch (e) { delete memoryStore[k]; } },
};

// Client utilisé UNIQUEMENT pour l'authentification (les données de jeu restent server-médiées).
export const supabase = createClient(url, anon, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: safeStorage,
  },
});