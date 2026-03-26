import React, { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';

/**
 * LoginView - Version 2.0
 * Login unifié - Plus de mode admin séparé
 * Le rôle est déterminé automatiquement par le serveur
 */
const LoginView = ({ onLogin, isLoading }) => {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!pseudo.trim()) {
      setError('Veuillez entrer votre pseudo');
      return;
    }
    
    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }
    
    // Login unifié - le serveur détermine le rôle
    onLogin(pseudo.trim(), password);
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="absolute top-4 right-4" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        <DarkModeToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 mb-6 sm:mb-8">
          <div className="flex-shrink-0">
            <img 
              src="/resources/images/aurore_question.png" 
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain" 
              alt="Logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Wilco Quiz</h1>
            <h3 className="text-xl sm:text-2xl text-gray-600 dark:text-gray-200 mt-1">2e édition</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Connectez-vous pour participer
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <input
            type="text"
            placeholder="Votre pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 text-base"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 text-base"
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Nouveau ? Entrez un pseudo et un mot de passe pour créer votre compte
          </p>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 dark:bg-purple-700 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
