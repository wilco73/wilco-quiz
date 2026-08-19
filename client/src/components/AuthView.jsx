import React, { useState } from 'react';
import { supabase } from '../services/supabase';

/**
 * AuthView - écran d'authentification (Connexion / Inscription) via Supabase Auth.
 *
 * Props:
 * - onAuthed(accessToken): appelé après une auth Supabase réussie (le back résout/crée le profil).
 * - onLegacyLogin(identifier, password): fallback pour les comptes legacy (pseudo + mot de passe).
 *     Doit renvoyer une Promise<boolean> (true si connecté).
 * - onGuest(): optionnel, entrée invité (branché en sous-étape 4).
 */
export default function AuthView({ onAuthed, onLegacyLogin, onGuest }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [identifier, setIdentifier] = useState(''); // email OU pseudo (connexion)
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestPseudo, setGuestPseudo] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!identifier.trim() || !password) { setError('Renseignez vos identifiants'); return; }
    setLoading(true);
    try {
      if (identifier.includes('@')) {
        // Compte Supabase (email)
        const { data, error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
        if (error) { setError('Email ou mot de passe incorrect'); }
        else if (data?.session) { await onAuthed(data.session.access_token); }
      } else {
        // Compte legacy (pseudo)
        const ok = await onLegacyLogin(identifier.trim(), password);
        if (!ok) setError('Compte introuvable ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!email.trim() || !pseudo.trim() || !password) { setError('Tous les champs sont requis'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { pseudo: pseudo.trim() } },
      });
      if (error) {
        setError(error.message === 'User already registered' ? 'Cet email a déjà un compte' : error.message);
      } else if (data?.session) {
        // Pas de confirmation d'email requise -> session immédiate
        await onAuthed(data.session.access_token);
      } else {
        // Confirmation d'email requise
        setInfo('Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.');
        setMode('login');
      }
    } catch (err) {
      setError('Erreur lors de l\'inscription');
    }
    setLoading(false);
  };

  const handleTwitch = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: { redirectTo: window.location.origin + '/?auth=twitch' },
    });
  };

  const handleForgot = async () => {
    setError(null); setInfo(null);
    const target = identifier.includes('@') ? identifier.trim() : email.trim();
    if (!target) { setError('Entrez votre email pour réinitialiser le mot de passe'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setInfo('Si un compte existe, un email de réinitialisation a été envoyé.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-900 p-4">
      <div className="w-full max-w-sm bg-gray-800/80 rounded-2xl border border-gray-700 p-6 text-white">
        <h1 className="text-2xl font-extrabold text-center mb-1">Wilco Quiz</h1>
        <p className="text-center text-gray-400 text-sm mb-5">
          {mode === 'login' ? 'Connexion à votre compte' : 'Créer un compte'}
        </p>

        {/* Onglets */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => { setMode('login'); setError(null); setInfo(null); }}
            className={`py-2 rounded-lg font-semibold text-sm ${mode === 'login' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >Connexion</button>
          <button
            onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
            className={`py-2 rounded-lg font-semibold text-sm ${mode === 'signup' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >Inscription</button>
        </div>

        {error && <div className="mb-3 text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        {info && <div className="mb-3 text-sm text-green-300 bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-2">{info}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email ou pseudo" autoComplete="username"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe" autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold disabled:opacity-50">
              {loading ? '...' : 'Se connecter'}
            </button>
            <button type="button" onClick={handleForgot} className="w-full text-xs text-gray-400 hover:text-white">
              Mot de passe oublié ?
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" autoComplete="email"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <input
              type="text" value={pseudo} onChange={(e) => setPseudo(e.target.value)}
              placeholder="Pseudo (affiché en jeu)"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (6 caractères min.)" autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold disabled:opacity-50">
              {loading ? '...' : 'Créer mon compte'}
            </button>
          </form>
        )}

        <button
          onClick={handleTwitch}
          className="w-full mt-3 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#9146FF] hover:bg-[#772ce8] text-white font-bold text-sm transition-colors shadow"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M4.265 0L1.6 4.265v15.47h5.334V24h3.199l2.667-2.667h4l5.334-5.334V0H4.265zm2.4 2.4h14.669v11.733l-3.2 3.2h-4.267l-2.666 2.666v-2.666H6.665V2.4zm5.334 3.2v6.4h2.4v-6.4h-2.4zm5.333 0v6.4h2.4v-6.4h-2.4z"/>
          </svg>
          Se connecter avec Twitch
        </button>

        {onGuest && (
          <>
            <div className="my-4 flex items-center gap-3 text-gray-500 text-xs">
              <span className="flex-1 h-px bg-gray-700" /> ou <span className="flex-1 h-px bg-gray-700" />
            </div>
            {guestOpen ? (
              <div className="space-y-2">
                <input
                  type="text" value={guestPseudo} onChange={(e) => setGuestPseudo(e.target.value)}
                  placeholder="Votre pseudo (invité)" maxLength={20}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
                />
                <button
                  onClick={() => guestPseudo.trim() && onGuest(guestPseudo.trim())}
                  disabled={!guestPseudo.trim()}
                  className="w-full py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold text-sm disabled:opacity-50"
                >
                  Rejoindre en invité
                </button>
                <p className="text-[11px] text-gray-500 text-center">
                  Les invités ne sont pas classés et n'ont accès qu'à certains jeux.
                </p>
              </div>
            ) : (
              <button onClick={() => setGuestOpen(true)} className="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold text-sm">
                Jouer en invité
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
