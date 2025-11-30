import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

const ReconnectingScreen = ({ message = "Reconnexion en cours..." }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="relative inline-block">
            <Wifi className="w-20 h-20 text-purple-600 animate-pulse" />
            <RefreshCw className="w-10 h-10 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Reconnexion
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <div className="flex justify-center gap-1">
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          Restauration de votre session en cours...
        </p>
      </div>
    </div>
  );
};

export default ReconnectingScreen;