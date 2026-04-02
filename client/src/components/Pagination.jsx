import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Composant de pagination réutilisable
 * 
 * @param {number} currentPage - Page actuelle (commence à 1)
 * @param {number} totalItems - Nombre total d'éléments
 * @param {number} itemsPerPage - Éléments par page
 * @param {function} onPageChange - Callback quand la page change
 * @param {function} onItemsPerPageChange - Callback quand le nombre par page change
 * @param {number[]} itemsPerPageOptions - Options pour le sélecteur (défaut: [10, 25, 50, 100])
 * @param {boolean} showItemsPerPage - Afficher le sélecteur d'éléments par page
 * @param {boolean} compact - Mode compact (moins d'espace)
 */
const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  showItemsPerPage = true,
  compact = false
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Générer les numéros de page à afficher (moins sur mobile)
  const getPageNumbers = (isMobile = false) => {
    const pages = [];
    const maxVisible = isMobile ? 3 : (compact ? 3 : 5);
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  const pageNumbers = getPageNumbers();
  const mobilePageNumbers = getPageNumbers(true);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 ${compact ? 'py-2' : 'py-3'}`}>
      {/* Info et sélecteur d'éléments par page */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {startItem}-{endItem} sur {totalItems}
        </span>
        
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-gray-600 dark:text-gray-400">|</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(parseInt(e.target.value));
                onPageChange(1); // Retour à la première page
              }}
              className="px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option} / page</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Première page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Première page"
          >
            <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Page précédente */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Page précédente"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Numéros de page - version mobile */}
          <div className="flex sm:hidden items-center gap-0.5 mx-0.5">
            {mobilePageNumbers[0] > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  1
                </button>
                {mobilePageNumbers[0] > 2 && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs">…</span>
                )}
              </>
            )}
            
            {mobilePageNumbers.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                  page === currentPage
                    ? 'bg-purple-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {page}
              </button>
            ))}
            
            {mobilePageNumbers[mobilePageNumbers.length - 1] < totalPages && (
              <>
                {mobilePageNumbers[mobilePageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs">…</span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          {/* Numéros de page - version desktop */}
          <div className="hidden sm:flex items-center gap-1 mx-1">
            {pageNumbers[0] > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="px-2.5 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  1
                </button>
                {pageNumbers[0] > 2 && (
                  <span className="text-gray-400 dark:text-gray-500">...</span>
                )}
              </>
            )}
            
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-2.5 py-1 text-sm rounded transition-colors ${
                  page === currentPage
                    ? 'bg-purple-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {page}
              </button>
            ))}
            
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-gray-400 dark:text-gray-500">...</span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="px-2.5 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          {/* Page suivante */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Page suivante"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Dernière page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Dernière page"
          >
            <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
