import React, { useState } from 'react';
import { X, FileUp, RefreshCw, PlusCircle, Replace, AlertTriangle } from 'lucide-react';

/**
 * ImportModal - Modale réutilisable pour les imports CSV
 * Utilisée pour les questions et les mots de dessin
 */
const ImportModal = ({ 
  isOpen, 
  onClose, 
  onImport, 
  itemCount, 
  itemType = 'question', // 'question' ou 'mot'
  isImporting = false,
  progress = 0 
}) => {
  const [confirmReplace, setConfirmReplace] = useState(false);

  if (!isOpen) return null;

  const itemLabel = itemType === 'question' ? 'question(s)' : 'mot(s)';
  const itemLabelSingular = itemType === 'question' ? 'questions' : 'mots';

  const handleImport = (mode) => {
    if (mode === 'replace' && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    setConfirmReplace(false);
    onImport(mode);
  };

  const handleClose = () => {
    setConfirmReplace(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileUp className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Import CSV</h2>
            </div>
            {!isImporting && (
              <button 
                onClick={handleClose}
                className="text-white/80 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          <p className="text-blue-100 text-sm mt-1">
            {itemCount} {itemLabel} prête(s) à importer
          </p>
        </div>

        {/* Contenu */}
        <div className="p-6">
          {isImporting ? (
            // Affichage pendant l'import
            <div className="text-center py-8">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * progress) / 100}
                    className="text-purple-600 transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600">{progress}%</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Import en cours...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Ne fermez pas cette fenêtre
              </p>
            </div>
          ) : confirmReplace ? (
            // Confirmation de remplacement
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
                Confirmer le remplacement
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Cette action va <strong>SUPPRIMER TOUTES</strong> les {itemLabelSingular} existantes 
                et les remplacer par celles du fichier CSV.
                <br /><br />
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Cette action est irréversible !
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmReplace(false)}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleImport('replace')}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Oui, tout remplacer
                </button>
              </div>
            </div>
          ) : (
            // Choix du mode d'import
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Choisissez comment importer vos {itemLabelSingular} :
              </p>

              {/* Option Fusionner */}
              <button
                onClick={() => handleImport('update')}
                className="w-full p-4 border-2 border-green-200 dark:border-green-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition">
                    <RefreshCw className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                      Fusionner
                      <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">Recommandé</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Met à jour les {itemLabelSingular} existantes (même ID) et ajoute les nouvelles.
                      Conserve les autres {itemLabelSingular}.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option Ajouter */}
              <button
                onClick={() => handleImport('add')}
                className="w-full p-4 border-2 border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition">
                    <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-700 dark:text-blue-400">Ajouter uniquement</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Ajoute uniquement les nouvelles {itemLabelSingular}.
                      Ignore les doublons (même ID).
                    </p>
                  </div>
                </div>
              </button>

              {/* Option Remplacer */}
              <button
                onClick={() => handleImport('replace')}
                className="w-full p-4 border-2 border-red-200 dark:border-red-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition">
                    <Replace className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                      Remplacer tout
                      <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">Dangereux</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Supprime TOUTES les {itemLabelSingular} existantes et importe uniquement le CSV.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isImporting && !confirmReplace && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
