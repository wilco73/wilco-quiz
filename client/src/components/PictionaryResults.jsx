import React, { useState, useEffect } from 'react';
import { 
  Trophy, ChevronLeft, ChevronRight, Download, 
  Image, Archive, ArrowLeft, Palette
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const PictionaryResults = ({ 
  lobbyId, 
  onBack,
  onArchive 
}) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/drawing-lobbies/${lobbyId}/results`);
        if (!res.ok) throw new Error('Erreur chargement résultats');
        const data = await res.json();
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [lobbyId]);
  
  const handleDownload = (drawing) => {
    if (!drawing?.image_data) return;
    
    const link = document.createElement('a');
    link.href = drawing.image_data;
    link.download = `dessin-${drawing.team_name}-tour${drawing.round + 1}-${drawing.word}.png`;
    link.click();
  };
  
  const handleDownloadAll = () => {
    if (!results?.drawings) return;
    
    results.drawings.forEach((drawing, index) => {
      setTimeout(() => {
        handleDownload(drawing);
      }, index * 500);
    });
  };
  
  const handleArchive = async () => {
    if (!window.confirm('Archiver ce lobby ? Il ne sera plus visible dans la liste principale.')) return;
    
    try {
      const res = await fetch(`${API_URL}/drawing-lobbies/${lobbyId}/archive`, {
        method: 'POST'
      });
      if (res.ok) {
        onArchive && onArchive();
      }
    } catch (err) {
      console.error('Erreur archivage:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg p-4 text-center">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
        >
          Retour
        </button>
      </div>
    );
  }
  
  const currentDrawing = results?.drawings?.[currentDrawingIndex];
  const hasDrawings = results?.drawings?.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
        
        <div className="flex gap-2">
          {results?.lobby?.status === 'finished' && (
            <button
              onClick={handleArchive}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archiver
            </button>
          )}
        </div>
      </div>
      
      {/* Titre */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Résultats Pictionary
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {results?.drawings?.length || 0} dessin(s) • {results?.ranking?.length || 0} équipe(s)
        </p>
      </div>
      
      {/* Classement */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Classement final
        </h3>
        
        <div className="space-y-3">
          {results?.ranking?.map((entry, idx) => (
            <div 
              key={entry.team}
              className={`flex items-center justify-between p-4 rounded-lg ${
                idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400' :
                idx === 1 ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-400' :
                idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400' :
                'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </span>
                <span className="font-bold text-lg dark:text-white">{entry.team}</span>
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {entry.score} pts
              </span>
            </div>
          ))}
          
          {(!results?.ranking || results.ranking.length === 0) && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Aucun score enregistré
            </p>
          )}
        </div>
      </div>
      
      {/* Galerie des dessins */}
      {hasDrawings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-500" />
              Galerie des dessins
            </h3>
            
            <button
              onClick={handleDownloadAll}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Tout télécharger
            </button>
          </div>
          
          {/* Dessin actuel */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
            {currentDrawing?.image_data ? (
              <div className="text-center">
                <img 
                  src={currentDrawing.image_data} 
                  alt={`Dessin de ${currentDrawing.team_name}`}
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
                
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Équipe</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400">
                      {currentDrawing.team_name}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mot</p>
                    <p className="font-bold dark:text-white">{currentDrawing.word}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tour</p>
                    <p className="font-bold dark:text-white">{currentDrawing.round + 1}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDownload(currentDrawing)}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
                >
                  <Download className="w-4 h-4" />
                  Télécharger ce dessin
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Aucune image disponible</p>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentDrawingIndex(prev => Math.max(0, prev - 1))}
              disabled={currentDrawingIndex === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>
            
            <span className="text-gray-600 dark:text-gray-400">
              {currentDrawingIndex + 1} / {results.drawings.length}
            </span>
            
            <button
              onClick={() => setCurrentDrawingIndex(prev => Math.min(results.drawings.length - 1, prev + 1))}
              disabled={currentDrawingIndex === results.drawings.length - 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Miniatures */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {results.drawings.map((drawing, idx) => (
              <button
                key={drawing.id}
                onClick={() => setCurrentDrawingIndex(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                  idx === currentDrawingIndex 
                    ? 'border-purple-500 ring-2 ring-purple-300' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                }`}
              >
                {drawing.image_data ? (
                  <img 
                    src={drawing.image_data} 
                    alt={`Miniature ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Palette className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Message si pas de dessins */}
      {!hasDrawings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <Palette className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold dark:text-white mb-2">Aucun dessin sauvegardé</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Les dessins n'ont pas été enregistrés pour cette partie.
          </p>
        </div>
      )}
    </div>
  );
};

export default PictionaryResults;
