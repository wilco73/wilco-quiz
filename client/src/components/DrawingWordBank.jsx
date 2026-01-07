import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit, Search, Download, Upload, 
  Tag, Filter, X, Check, AlertCircle, CheckSquare, Square
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DIFFICULTIES = ['facile', 'moyen', 'difficile'];

const DrawingWordBank = () => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [csvDelimiter, setCsvDelimiter] = useState(';');
  
  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [formData, setFormData] = useState({
    word: '',
    category: '',
    difficulty: 'moyen',
    tags: [],
    tagsInput: ''
  });
  
  const toast = useToast();
  
  // Charger les mots
  useEffect(() => {
    fetchWords();
  }, []);
  
  const fetchWords = async () => {
    try {
      const res = await fetch(`${API_URL}/drawing-words`);
      const data = await res.json();
      setWords(data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrer les mots
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const matchesSearch = 
        w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = !filterCategory || w.category === filterCategory;
      const matchesDifficulty = !filterDifficulty || w.difficulty === filterDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [words, searchTerm, filterCategory, filterDifficulty]);
  
  // Catégories uniques
  const categories = useMemo(() => {
    return [...new Set(words.map(w => w.category).filter(Boolean))].sort();
  }, [words]);
  
  // Parser une ligne CSV avec gestion des guillemets
  const parseCSVLine = (line, delimiter = ',') => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  // Normaliser les accents pour comparaison
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };
  
  // ========== SÉLECTION MULTIPLE ==========
  
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedIds(new Set());
    }
  };
  
  const toggleSelectWord = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const selectAll = () => {
    const allIds = new Set(filteredWords.map(w => w.id));
    setSelectedIds(allIds);
  };
  
  const selectNone = () => {
    setSelectedIds(new Set());
  };
  
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmMsg = `Supprimer ${selectedIds.size} mot(s) sélectionné(s) ?\n\nCette action est irréversible.`;
    if (!window.confirm(confirmMsg)) return;
    
    try {
      let deleted = 0;
      for (const id of selectedIds) {
        const res = await fetch(`${API_URL}/drawing-words/${id}`, { method: 'DELETE' });
        if (res.ok) deleted++;
      }
      
      toast.success(`${deleted} mot(s) supprimé(s)`);
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchWords();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  // ========== FORMULAIRE ==========
  
  const handleCreate = () => {
    setEditingWord(null);
    setFormData({
      word: '',
      category: '',
      difficulty: 'moyen',
      tags: [],
      tagsInput: ''
    });
    setShowForm(true);
  };
  
  const handleEdit = (word) => {
    setEditingWord(word);
    setFormData({
      word: word.word,
      category: word.category || '',
      difficulty: word.difficulty || 'moyen',
      tags: word.tags || [],
      tagsInput: ''
    });
    setShowForm(true);
  };
  
  const handleSave = async () => {
    if (!formData.word.trim()) {
      toast.warning('Le mot est requis');
      return;
    }
    
    try {
      const payload = {
        word: formData.word.trim(),
        category: formData.category.trim() || null,
        difficulty: formData.difficulty,
        tags: formData.tags
      };
      
      if (editingWord) {
        await fetch(`${API_URL}/drawing-words/${editingWord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        toast.success('Mot mis à jour');
      } else {
        await fetch(`${API_URL}/drawing-words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        toast.success('Mot créé');
      }
      
      setShowForm(false);
      fetchWords();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce mot ?')) return;
    
    try {
      await fetch(`${API_URL}/drawing-words/${id}`, { method: 'DELETE' });
      toast.success('Mot supprimé');
      fetchWords();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  const handleAddTag = () => {
    if (formData.tagsInput.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagsInput.trim()],
        tagsInput: ''
      }));
    }
  };
  
  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };
  
  // ========== EXPORT CSV ==========
  
  const handleExport = () => {
    const delimiter = csvDelimiter;
    const headers = ['Mot', 'Catégorie', 'Difficulté', 'Tags'];
    
    const escapeCSV = (value) => {
      if (!value) return '';
      const str = String(value);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const rows = words.map(w => [
      escapeCSV(w.word),
      escapeCSV(w.category || ''),
      escapeCSV(w.difficulty || 'moyen'),
      escapeCSV((w.tags || []).join('|'))
    ].join(delimiter));
    
    // BOM UTF-8 pour Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(delimiter), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mots_pictionary_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success(`${words.length} mot(s) exporté(s)`);
  };
  
  // ========== IMPORT CSV ==========
  
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let content = e.target.result;
        
        // Supprimer BOM si présent
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
        }
        
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('Le fichier CSV est vide ou invalide');
          return;
        }
        
        // Détecter le délimiteur automatiquement
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const detectedDelimiter = semicolonCount > commaCount ? ';' : ',';
        
        console.log(`Délimiteur détecté: "${detectedDelimiter}"`);
        
        const dataLines = lines.slice(1);
        const importedWords = [];
        const errors = [];
        
        // Créer un Set des mots existants normalisés pour détecter les doublons
        const existingNormalized = new Set(words.map(w => normalizeText(w.word)));
        
        dataLines.forEach((line, index) => {
          try {
            const values = parseCSVLine(line, detectedDelimiter);
            
            if (values.length < 1 || !values[0].trim()) {
              return; // Ligne vide, ignorer
            }
            
            const [wordText, category, difficulty, tagsStr] = values;
            
            const word = {
              word: wordText.trim(),
              category: category?.trim() || '',
              difficulty: DIFFICULTIES.includes(difficulty?.toLowerCase()) 
                ? difficulty.toLowerCase() 
                : 'moyen',
              tags: tagsStr ? tagsStr.split('|').map(t => t.trim()).filter(Boolean) : []
            };
            
            importedWords.push(word);
          } catch (err) {
            errors.push(`Ligne ${index + 2}: Erreur de parsing`);
          }
        });
        
        if (errors.length > 0) {
          console.warn('Erreurs d\'import:', errors);
        }
        
        if (importedWords.length === 0) {
          toast.error('Aucun mot valide trouvé dans le fichier');
          return;
        }
        
        // Demander le mode d'import
        const mode = window.prompt(
          `Importer ${importedWords.length} mot(s) ?\n\n` +
          `Choisissez le mode d'import :\n\n` +
          `1 = AJOUTER (garde les existants, ignore les doublons)\n` +
          `2 = REMPLACER (supprime tout et importe)\n\n` +
          `Tapez 1 ou 2 :`,
          '1'
        );
        
        if (!mode || !['1', '2'].includes(mode)) {
          toast.info('Import annulé');
          return;
        }
        
        let wordsToImport = importedWords;
        let duplicatesIgnored = 0;
        
        if (mode === '1') {
          // Mode AJOUTER : filtrer les doublons
          wordsToImport = importedWords.filter(w => {
            const normalized = normalizeText(w.word);
            if (existingNormalized.has(normalized)) {
              duplicatesIgnored++;
              return false;
            }
            existingNormalized.add(normalized); // Éviter les doublons dans le fichier lui-même
            return true;
          });
        }
        
        if (wordsToImport.length === 0 && duplicatesIgnored > 0) {
          toast.info(`Tous les mots (${duplicatesIgnored}) sont déjà présents`);
          return;
        }
        
        // Envoyer au serveur
        const res = await fetch(`${API_URL}/drawing-words/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            words: wordsToImport,
            mode: mode === '2' ? 'replace' : 'add'
          })
        });
        
        const result = await res.json();
        
        if (result.success) {
          let message = `✅ ${result.added} mot(s) importé(s)`;
          if (duplicatesIgnored > 0) {
            message += `\n• ${duplicatesIgnored} doublon(s) ignoré(s)`;
          }
          message += `\n• Total : ${result.total} mot(s)`;
          toast.success(message);
          fetchWords();
        } else {
          toast.error(result.message || 'Erreur lors de l\'import');
        }
        
      } catch (error) {
        console.error('Erreur import CSV:', error);
        toast.error('Erreur lors de l\'import du fichier');
      }
    };
    
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };
  
  // ========== TEMPLATE CSV ==========
  
  const handleDownloadTemplate = () => {
    const delimiter = csvDelimiter;
    const headers = ['Mot', 'Catégorie', 'Difficulté', 'Tags'];
    
    const examples = [
      ['Chat', 'Animaux', 'facile', 'animal|domestique'],
      ['Avion', 'Véhicules', 'facile', 'transport|volant'],
      ['Pizza', 'Nourriture', 'facile', 'italien|fast-food'],
      ['Parapluie', 'Objets', 'moyen', 'pluie|accessoire'],
      ['Éléphant', 'Animaux', 'moyen', 'animal|savane|gros'],
      ['Photosynthèse', 'Science', 'difficile', 'biologie|plante']
    ];
    
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(delimiter),
      ...examples.map(row => row.join(delimiter))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_mots_pictionary.csv`;
    link.click();
    
    toast.success('Template téléchargé');
  };
  
  // ========== RENDU ==========
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">📝 Banque de mots Pictionary</h2>
          <p className="text-gray-600 dark:text-gray-400">{words.length} mot(s)</p>
        </div>
        
        <div className="flex gap-2">
          {/* Délimiteur CSV */}
          <select
            value={csvDelimiter}
            onChange={(e) => setCsvDelimiter(e.target.value)}
            className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm"
            title="Délimiteur CSV"
          >
            <option value=";">Point-virgule (;)</option>
            <option value=",">Virgule (,)</option>
          </select>
          
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            title="Télécharger un template"
          >
            Template
          </button>
          
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          
          <label className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer flex items-center gap-1">
            <Upload className="w-4 h-4" />
            Importer
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          
          <button
            onClick={toggleSelectMode}
            className={`px-3 py-2 rounded-lg flex items-center gap-1 ${
              selectMode 
                ? 'bg-orange-500 text-white' 
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? 'Annuler' : 'Sélectionner'}
          </button>
          
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau mot
          </button>
        </div>
      </div>
      
      {/* Barre de sélection multiple */}
      {selectMode && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-orange-700 dark:text-orange-300 font-medium">
              {selectedIds.size} sélectionné(s)
            </span>
            <button
              onClick={selectAll}
              className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
            >
              Tout sélectionner ({filteredWords.length})
            </button>
            <button
              onClick={selectNone}
              className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
            >
              Désélectionner tout
            </button>
          </div>
          <button
            onClick={deleteSelected}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer ({selectedIds.size})
          </button>
        </div>
      )}
      
      {/* Filtres */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value="">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value="">Toutes difficultés</option>
          {DIFFICULTIES.map(diff => (
            <option key={diff} value={diff}>{diff}</option>
          ))}
        </select>
      </div>
      
      {/* Liste des mots */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun mot trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWords.map(word => (
            <div
              key={word.id}
              onClick={() => selectMode && toggleSelectWord(word.id)}
              className={`border rounded-lg p-4 transition cursor-pointer ${
                selectMode && selectedIds.has(word.id)
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-400'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {selectMode && (
                    selectedIds.has(word.id) 
                      ? <CheckSquare className="w-5 h-5 text-orange-500" />
                      : <Square className="w-5 h-5 text-gray-400" />
                  )}
                  <h3 className="font-bold text-lg dark:text-white">{word.word}</h3>
                </div>
                {!selectMode && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(word); }}
                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(word.id); }}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {word.category && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {word.category}
                </p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  word.difficulty === 'facile' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  word.difficulty === 'difficile' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {word.difficulty || 'moyen'}
                </span>
                
                {word.tags?.slice(0, 2).map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                    {tag}
                  </span>
                ))}
                {word.tags?.length > 2 && (
                  <span className="text-xs text-gray-400">+{word.tags.length - 2}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold dark:text-white mb-4">
              {editingWord ? 'Modifier le mot' : 'Nouveau mot'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mot *
                </label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData(prev => ({ ...prev, word: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Parapluie"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Objets"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulté
                </label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(diff => (
                    <button
                      key={diff}
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: diff }))}
                      className={`flex-1 px-3 py-2 rounded-lg border transition ${
                        formData.difficulty === diff
                          ? diff === 'facile' ? 'bg-green-500 text-white border-green-500' :
                            diff === 'difficile' ? 'bg-red-500 text-white border-red-500' :
                            'bg-yellow-500 text-white border-yellow-500'
                          : 'border-gray-300 dark:border-gray-600 dark:text-white hover:border-gray-400'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.tagsInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagsInput: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Ajouter un tag"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded flex items-center gap-1 text-sm">
                      {tag}
                      <button onClick={() => handleRemoveTag(i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingWord ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingWordBank;
