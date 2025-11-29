import React, { useState } from 'react';
import { Trophy } from 'lucide-react';

const LoginView = ({ onLogin }) => {
  const [teamName, setTeamName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(teamName, pseudo, password, isAdminMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 mx-auto text-purple-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Quiz & Blindtest</h1>
          <p className="text-gray-600 mt-2">
            {isAdminMode ? 'Connexion Admin' : 'Connexion Participant'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdminMode && (
            <input
              type="text"
              placeholder="Nom d'équipe"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required={!isAdminMode}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          )}
          <input
            type="text"
            placeholder={isAdminMode ? "Nom admin" : "Votre pseudo"}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setIsAdminMode(!isAdminMode)}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300"
          >
            {isAdminMode ? '← Mode Participant' : 'Mode Admin'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          {isAdminMode ? 'admin / admin123' : 'Première connexion = création'}
        </p>
      </div>
    </div>
  );
};

export default LoginView;