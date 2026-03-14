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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex content-center item-center text-center mb-8">
          <div className="text-center m-auto">
            <img 
              src="/resources/images/aurore_question.png" 
              className="mx-auto icone text-purple-600 mb-4" 
              alt="Logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="text-center m-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Wilco Quiz</h1>
            <h3 className="text-3xl text-gray-800 dark:text-gray-200 mt-2">2e édition</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
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
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
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
