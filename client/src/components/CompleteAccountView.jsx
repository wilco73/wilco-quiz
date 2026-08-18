import React, { useState } from 'react';

/**
 * CompleteAccountView - écran bloquant de migration d'un compte legacy.
 * L'utilisateur ajoute un email + un mot de passe -> le serveur crée un compte Supabase Auth
 * lié à sa ligne participants existante (mêmes scores/historique).
 *
 * Props:
 * - user: currentUser (pour afficher le pseudo)
 * - onComplete(email, password): Promise<{success, message?}>
 * - onLogout(): se déconnecter (échappatoire)
 */
export default function CompleteAccountView({ user, onComplete, onLogout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Renseignez un email'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    const res = await onComplete(email.trim(), password);
    setLoading(false);
    if (!res?.success) setError(res?.message || 'Une erreur est survenue');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-900 p-4">
      <div className="w-full max-w-sm bg-gray-800/80 rounded-2xl border border-gray-700 p-6 text-white">
        <h1 className="text-xl font-extrabold text-center mb-1">Complétez votre compte</h1>
        <p className="text-center text-gray-400 text-sm mb-1">
          Bonjour <span className="font-semibold text-white">{user?.pseudo}</span> 👋
        </p>
        <p className="text-center text-gray-400 text-sm mb-5">
          Pour continuer, ajoutez un email et un mot de passe. Votre historique et vos scores sont conservés.
        </p>

        {error && <div className="mb-3 text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" autoComplete="email"
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe (6 caractères min.)" autoComplete="new-password"
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
          />
          <input
            type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmer le mot de passe" autoComplete="new-password"
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
          />
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold disabled:opacity-50">
            {loading ? '...' : 'Valider et continuer'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          La liaison avec Twitch sera disponible prochainement dans les réglages de votre compte.
        </p>
        <button onClick={onLogout} className="w-full mt-3 text-xs text-gray-400 hover:text-white">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
