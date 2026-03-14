import React, { useState } from 'react';
import { 
  Menu, X, Home, Trophy, User, History, Settings, LogOut, 
  ChevronLeft, Users, Star, Crown
} from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import Avatar from './Avatar';

/**
 * MainLayout - Layout principal avec menu burger et sidebar
 * 
 * Props:
 * - currentUser: utilisateur connecté
 * - teams: liste des équipes
 * - children: contenu principal
 * - onNavigate: fonction de navigation (view) => void
 * - currentView: vue actuelle
 * - onLogout: fonction de déconnexion
 */
const MainLayout = ({ 
  currentUser, 
  teams, 
  participants,
  children, 
  onNavigate, 
  currentView,
  onLogout 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Infos équipe
  const userTeam = teams.find(t => t.name === currentUser?.teamName);
  const sortedTeams = [...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0));
  const teamRank = userTeam ? sortedTeams.findIndex(t => t.name === userTeam.name) + 1 : null;
  
  // Coéquipiers
  const teamMembers = currentUser?.teamName 
    ? participants.filter(p => p.teamName === currentUser.teamName && p.id !== currentUser.id)
    : [];

  // Items du menu
  const menuItems = [
    { id: 'lobby-list', label: 'Accueil', icon: Home },
    { id: 'scoreboard', label: 'Classement', icon: Trophy },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'profile', label: 'Profil', icon: User },
  ];
  
  // Ajouter Admin si droits
  if (currentUser?.isAdmin || currentUser?.isSuperAdmin) {
    menuItems.push({ id: 'admin', label: 'Administration', icon: Settings, className: 'text-red-500' });
  }

  const handleNavigate = (viewId) => {
    onNavigate(viewId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Overlay pour mobile quand sidebar ouverte */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-white dark:bg-gray-800 shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header sidebar */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-purple-600 dark:text-purple-400">
              Wilco Quiz
            </h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Profil utilisateur */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <Avatar avatarId={currentUser?.avatar} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 dark:text-white truncate">
                  {currentUser?.pseudo}
                </h2>
                {currentUser?.isSuperAdmin && (
                  <Crown className="w-4 h-4 text-yellow-500" title="Super Admin" />
                )}
                {currentUser?.isAdmin && !currentUser?.isSuperAdmin && (
                  <Settings className="w-4 h-4 text-red-500" title="Admin" />
                )}
              </div>
              {currentUser?.teamName ? (
                <p className="text-sm text-purple-600 dark:text-purple-400 truncate">
                  {currentUser.teamName}
                </p>
              ) : (
                <p className="text-sm text-orange-500">Pas d'équipe</p>
              )}
            </div>
          </div>
          
          {/* Stats équipe */}
          {userTeam && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {userTeam.validatedScore || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Points</p>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  #{teamRank || '-'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rang</p>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {teamMembers.length + 1}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Membres</p>
              </div>
            </div>
          )}
          
          {/* Coéquipiers */}
          {teamMembers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Coéquipiers
              </p>
              <div className="flex flex-wrap gap-1">
                {teamMembers.slice(0, 5).map(member => (
                  <span 
                    key={member.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                  >
                    <Star className="w-3 h-3 text-purple-500" />
                    {member.pseudo}
                  </span>
                ))}
                {teamMembers.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500">
                    +{teamMembers.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }
                      ${item.className || ''}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer sidebar */}
        <div className="p-4 border-t dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <DarkModeToggle />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Contenu principal */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          
          <h1 className="text-lg font-bold text-purple-600 dark:text-purple-400">
            Wilco Quiz
          </h1>
          
          <div className="flex items-center gap-2">
            <Avatar avatarId={currentUser?.avatar} size="sm" />
          </div>
        </header>
        
        {/* Contenu */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
