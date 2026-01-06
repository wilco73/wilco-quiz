import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Search, Download, Upload, 
  Tag, Filter, X, Check, AlertCircle
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
  const filteredWords = words.filter(w => {
    const matchesSearch = 
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !filterCategory || w.category === filterCategory;
    const matchesDifficulty = !filterDifficulty || w.difficulty === filterDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });
  
  // Catégories uniques
  const categories = [...new Set(words.map(w => w.category).filter(Boolean))].sort();
  
  // Ouvrir le formulaire pour créer
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
  
  // Ouvrir le formulaire pour éditer
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
  
  // Sauvegarder
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
        toast.success('Mot modifié');
      } else {
        await fetch(`${API_URL}/drawing-words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        toast.success('Mot ajouté');
      }
      
      fetchWords();
      setShowForm(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };
  
  // Supprimer
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
  
  // Ajouter un tag
  const addTag = () => {
    const tag = formData.tagsInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagsInput: ''
      }));
    }
  };
  
  // Supprimer un tag
  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  // Export CSV
  const handleExport = () => {
    const headers = ['Mot', 'Catégorie', 'Difficulté', 'Tags'];
    const rows = words.map(w => [
      w.word,
      w.category || '',
      w.difficulty || 'moyen',
      (w.tags || []).join('|')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mots_pictionary.csv';
    link.click();
    
    toast.success(`${words.length} mots exportés`);
  };
  
  // Import CSV
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      const lines = text.split('\n').filter(l => l.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      const importedWords = dataLines.map(line => {
        const [word, category, difficulty, tags] = line.split(',');
        return {
          word: word?.trim(),
          category: category?.trim() || null,
          difficulty: difficulty?.trim() || 'moyen',
          tags: tags ? tags.split('|').map(t => t.trim()).filter(Boolean) : []
        };
      }).filter(w => w.word);
      
      try {
        const res = await fetch(`${API_URL}/drawing-words/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: importedWords, mode: 'add' })
        });
        const result = await res.json();
        
        if (result.success) {
          toast.success(`${result.added} mots importés`);
          fetchWords();
        } else {
          toast.error(result.message || 'Erreur d\'import');
        }
      } catch (error) {
        toast.error('Erreur lors de l\'import');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">🎨 Banque de Mots Pictionary</h2>
            <p className="text-gray-600 dark:text-gray-400">{words.length} mots disponibles</p>
          </div>
          <div className="flex gap-2">
            <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importer
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter
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
        
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Toutes les difficultés</option>
            {DIFFICULTIES.map(diff => (
              <option key={diff} value={diff}>{diff}</option>
            ))}
          </select>
        </div>
        
        {/* Liste des mots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
          {filteredWords.map(word => (
            <div 
              key={word.id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg dark:text-white">{word.word}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(word)}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(word.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 text-sm">
                {word.category && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">
                    {word.category}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded ${
                  word.difficulty === 'facile' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                  word.difficulty === 'difficile' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                  'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {word.difficulty || 'moyen'}
                </span>
              </div>
              
              {word.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {word.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {filteredWords.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun mot trouvé</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">
                {editingWord ? 'Modifier le mot' : 'Nouveau mot'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mot / Thème *
                </label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData(prev => ({ ...prev, word: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Éléphant, Tour Eiffel..."
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Animaux, Monuments..."
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
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {DIFFICULTIES.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.tagsInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagsInput: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ajouter un tag..."
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded flex items-center gap-1"
                      >
                        #{tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                {editingWord ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingWordBank;
