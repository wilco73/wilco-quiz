import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

/**
 * ResetPasswordView - page atterrissage du lien "mot de passe oublié".
 * Supabase établit une session de récupération à partir du token dans l'URL
 * (grâce à detectSessionInUrl). On peut alors changer le mot de passe.
 */
export default function ResetPasswordView() {
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;
    const markReady = () => { settled = true; setReady(true); };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) markReady();
    });
    supabase.auth.getSession().then(({ data }) => { if (data?.session) markReady(); });

    // Si aucune session de récupération après quelques secondes -> lien invalide/expiré
    const t = setTimeout(() => { if (!settled) setInvalid(true); }, 4000);

    return () => { clearTimeout(t); sub?.subscription?.unsubscribe(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    // On coupe la session de récupération et on renvoie vers la connexion
    await supabase.auth.signOut();
    setDone(true);
  };

  const goToLogin = () => { window.location.href = '/'; };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-900 p-4">
      <div className="w-full max-w-sm bg-gray-800/80 rounded-2xl border border-gray-700 p-6 text-white">
        <h1 className="text-xl font-extrabold text-center mb-4">Réinitialiser le mot de passe</h1>

        {done ? (
          <div className="text-center space-y-4">
            <p className="text-green-300">✅ Mot de passe mis à jour !</p>
            <button onClick={goToLogin} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold">
              Aller à la connexion
            </button>
          </div>
        ) : invalid && !ready ? (
          <div className="text-center space-y-4">
            <p className="text-red-300 text-sm">Lien invalide ou expiré. Refaites une demande depuis la page de connexion.</p>
            <button onClick={goToLogin} className="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold">
              Retour à la connexion
            </button>
          </div>
        ) : !ready ? (
          <p className="text-center text-gray-400 animate-pulse">Vérification du lien…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe" autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <input
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmer le mot de passe" autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold disabled:opacity-50">
              {loading ? '...' : 'Changer mon mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
