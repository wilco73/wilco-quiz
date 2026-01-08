import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Edit, Search, Download, Upload, 
  X, Check, CheckSquare, Square, Image
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DrawingReferenceBank = () => {
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [csvDelimiter, setCsvDelimiter] = useState(';');
  
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [formData, setFormData] = useState({
    name: '', imageUrl: '', category: '', tags: [], tagsInput: ''
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);
  
  const toast = useToast();
  
  useEffect(() => { fetchReferences(); }, []);
  
  const fetchReferences = async () => {
    try {
      const res = await fetch(`${API_URL}/drawing-references`);
      setReferences(await res.json());
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredReferences = useMemo(() => {
    return references.filter(r => {
      const matchesSearch = 
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || r.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [references, searchTerm, filterCategory]);
  
  const categories = useMemo(() => {
    return [...new Set(references.map(r => r.category).filter(Boolean))].sort();
  }, [references]);
  
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };
  
  const resetForm = () => {
    setFormData({ name: '', imageUrl: '', category: '', tags: [], tagsInput: '' });
    setEditingRef(null);
    setShowForm(false);
    setImagePreview(null);
  };
  
  const handleEdit = (ref) => {
    setEditingRef(ref);
    setFormData({
      name: ref.name, imageUrl: ref.imageUrl || '',
      category: ref.category || '', tags: ref.tags || [], tagsInput: ''
    });
    setImagePreview(ref.imageUrl);
    setShowForm(true);
  };
  
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Le fichier doit être une image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('L\'image ne doit pas dépasser 5 Mo'); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, imageUrl: e.target.result }));
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleAddTag = () => {
    const tag = formData.tagsInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag], tagsInput: '' }));
    }
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };
  
  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast.error('Le nom est requis'); return; }
    if (!formData.imageUrl) { toast.error('L\'image est requise'); return; }
    
    try {
      const payload = {
        name: formData.name.trim(), imageUrl: formData.imageUrl,
        category: formData.category.trim() || null, tags: formData.tags
      };
      
      const url = editingRef 
        ? `${API_URL}/drawing-references/${editingRef.id}`
        : `${API_URL}/drawing-references`;
      
      const res = await fetch(url, {
        method: editingRef ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success(editingRef ? 'Image mise à jour' : 'Image ajoutée');
        fetchReferences();
        resetForm();
      } else {
        toast.error(result.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await fetch(`${API_URL}/drawing-references/${id}`, { method: 'DELETE' });
      toast.success('Image supprimée');
      fetchReferences();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
  };
  
  const selectAll = () => {
    setSelectedIds(selectedIds.size === filteredReferences.length 
      ? new Set() 
      : new Set(filteredReferences.map(r => r.id)));
  };
  
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedIds.size} image(s) ?`)) return;
    try {
      for (const id of selectedIds) {
        await fetch(`${API_URL}/drawing-references/${id}`, { method: 'DELETE' });
      }
      toast.success(`${selectedIds.size} image(s) supprimée(s)`);
      setSelectedIds(new Set());
      fetchReferences();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  const parseCSVLine = (line, delimiter = ',') => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim()); current = '';
      } else { current += char; }
    }
    result.push(current.trim());
    return result;
  };
  
  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let content = e.target.result;
        if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
        
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) { toast.error('Fichier vide ou invalide'); return; }
        
        const firstLine = lines[0];
        let delimiter = csvDelimiter;
        if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
        else if (firstLine.includes(',') && !firstLine.includes(';')) delimiter = ',';
        
        const headers = parseCSVLine(lines[0], delimiter).map(h => 
          h.toLowerCase().replace(/['"]/g, '').trim()
        );
        
        const nameIdx = headers.findIndex(h => ['nom', 'name', 'titre', 'title'].includes(h));
        const urlIdx = headers.findIndex(h => ['url', 'image', 'imageurl', 'image_url', 'lien'].includes(h));
        const catIdx = headers.findIndex(h => ['catégorie', 'categorie', 'category', 'cat'].includes(h));
        const tagsIdx = headers.findIndex(h => ['tags', 'tag', 'étiquettes', 'etiquettes'].includes(h));
        
        if (nameIdx === -1) { toast.error('Colonne "Nom" non trouvée'); return; }
        if (urlIdx === -1) { toast.error('Colonne "URL" non trouvée'); return; }
        
        const existingNormalized = new Set(references.map(r => normalizeText(r.name)));
        const importedRefs = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i], delimiter);
          const name = values[nameIdx]?.replace(/^["']|["']$/g, '').trim();
          const url = values[urlIdx]?.replace(/^["']|["']$/g, '').trim();
          const category = catIdx !== -1 ? values[catIdx]?.replace(/^["']|["']$/g, '').trim() : '';
          const tagsStr = tagsIdx !== -1 ? values[tagsIdx]?.replace(/^["']|["']$/g, '').trim() : '';
          
          if (!name || !url) continue;
          
          const tags = tagsStr ? tagsStr.split(/[|,;]/).map(t => t.trim()).filter(Boolean) : [];
          importedRefs.push({ name, imageUrl: url, category: category || null, tags });
        }
        
        if (importedRefs.length === 0) { toast.error('Aucune image valide trouvée'); return; }
        
        const mode = window.prompt(
          `Importer ${importedRefs.length} image(s) ?\n\n1 = AJOUTER\n2 = REMPLACER\n\nTapez 1 ou 2 :`, '1'
        );
        
        if (!mode || !['1', '2'].includes(mode)) { toast.info('Import annulé'); return; }
        
        let refsToImport = importedRefs;
        let duplicatesIgnored = 0;
        
        if (mode === '1') {
          refsToImport = importedRefs.filter(r => {
            const normalized = normalizeText(r.name);
            if (existingNormalized.has(normalized)) { duplicatesIgnored++; return false; }
            existingNormalized.add(normalized);
            return true;
          });
        }
        
        if (refsToImport.length === 0 && duplicatesIgnored > 0) {
          toast.info(`Toutes les images (${duplicatesIgnored}) sont déjà présentes`);
          return;
        }
        
        const res = await fetch(`${API_URL}/drawing-references/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ references: refsToImport, mode: mode === '2' ? 'replace' : 'add' })
        });
        
        const result = await res.json();
        if (result.success) {
          let message = `✅ ${result.added} image(s) importée(s)`;
          if (result.skipped > 0) message += ` • ${result.skipped} doublon(s)`;
          if (duplicatesIgnored > 0) message += ` • ${duplicatesIgnored} ignoré(s)`;
          toast.success(message);
          fetchReferences();
        } else {
          toast.error(result.message || 'Erreur import');
        }
      } catch (error) {
        console.error('Erreur import:', error);
        toast.error('Erreur lors de l\'import');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };
  
  const handleExport = () => {
    const delimiter = csvDelimiter;
    const headers = ['Nom', 'URL', 'Catégorie', 'Tags'];
    const rows = filteredReferences.map(r => [
      r.name, r.imageUrl || '', r.category || '', r.tags?.join('|') || ''
    ]);
    
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(delimiter), ...rows.map(row => 
      row.map(cell => cell.includes(delimiter) || cell.includes('"') 
        ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(delimiter)
    )].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `images-references-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`${filteredReferences.length} image(s) exportée(s)`);
  };
  
  const handleDownloadTemplate = () => {
    const delimiter = csvDelimiter;
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      ['Nom', 'URL', 'Catégorie', 'Tags'].join(delimiter),
      ['Mona Lisa', 'https://example.com/mona-lisa.jpg', 'Art', 'peinture|célèbre'].join(delimiter),
      ['Tour Eiffel', 'https://example.com/tour-eiffel.jpg', 'Monuments', 'paris|france'].join(delimiter)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template-images-references.csv';
    link.click();
    toast.success('Template téléchargé');
  };
  
  if (loading) {
    return <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
              <Image className="w-6 h-6 text-green-600" />
              Banque d'images de référence
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {references.length} image(s) • Pour "Passe moi le relais"
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSelectMode(!selectMode)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 ${selectMode ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              <CheckSquare className="w-4 h-4" /> Sélection
            </button>
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white">
            <option value="">Toutes catégories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Délimiteur:</span>
            <select value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white text-sm">
              <option value=";">Point-virgule (;)</option>
              <option value=",">Virgule (,)</option>
            </select>
          </div>
          <button onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Template
          </button>
          <button onClick={() => csvInputRef.current?.click()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Importer CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleImportCSV} className="hidden" />
          <button onClick={handleExport}
            className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exporter
          </button>
          {selectMode && selectedIds.size > 0 && (
            <button onClick={deleteSelected}
              className="px-3 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" /> Supprimer ({selectedIds.size})
            </button>
          )}
        </div>
        
        {selectMode && (
          <div className="mt-4 flex items-center gap-2">
            <button onClick={selectAll} className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
              {selectedIds.size === filteredReferences.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <span className="text-sm text-gray-500">({selectedIds.size} sélectionné(s))</span>
          </div>
        )}
      </div>
      
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-bold dark:text-white mb-4">
            {editingRef ? 'Modifier l\'image' : 'Ajouter une image'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
              <input type="text" value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                placeholder="Ex: Tour Eiffel" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
              <input type="text" value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                placeholder="Ex: Monuments" list="categories" />
              <datalist id="categories">
                {categories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image * (URL ou upload)</label>
              <div className="flex gap-2">
                <input type="text"
                  value={formData.imageUrl.startsWith('data:') ? '(Image uploadée)' : formData.imageUrl}
                  onChange={(e) => { setFormData(prev => ({ ...prev, imageUrl: e.target.value })); setImagePreview(e.target.value); }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                  disabled={formData.imageUrl.startsWith('data:')} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                  <Upload className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              {formData.imageUrl.startsWith('data:') && (
                <button onClick={() => { setFormData(prev => ({ ...prev, imageUrl: '' })); setImagePreview(null); }}
                  className="mt-1 text-sm text-red-600 hover:underline">Supprimer l'image</button>
              )}
            </div>
            {imagePreview && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aperçu</label>
                <img src={imagePreview} alt="Aperçu" className="max-h-48 rounded-lg shadow" onError={() => setImagePreview(null)} />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <div className="flex gap-2">
                <input type="text" value={formData.tagsInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagsInput: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Ajouter un tag..." />
                <button onClick={handleAddTag} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm flex items-center gap-1">
                      {tag} <button onClick={() => handleRemoveTag(tag)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white">Annuler</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4" /> {editingRef ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-bold dark:text-white mb-4">Images ({filteredReferences.length})</h3>
        {filteredReferences.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune image de référence</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredReferences.map(ref => (
              <div key={ref.id} className={`border rounded-lg overflow-hidden transition ${
                selectMode && selectedIds.has(ref.id) ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative cursor-pointer"
                  onClick={() => selectMode ? toggleSelect(ref.id) : handleEdit(ref)}>
                  {ref.imageUrl ? (
                    <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  {selectMode && (
                    <div className="absolute top-2 left-2">
                      {selectedIds.has(ref.id) ? <CheckSquare className="w-6 h-6 text-purple-600 bg-white rounded" /> : <Square className="w-6 h-6 text-gray-400 bg-white rounded" />}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-medium dark:text-white truncate">{ref.name}</h4>
                  {ref.category && <p className="text-sm text-gray-500 dark:text-gray-400">{ref.category}</p>}
                  {!selectMode && (
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => handleEdit(ref)} className="flex-1 px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm">
                        <Edit className="w-3 h-3 inline mr-1" /> Éditer
                      </button>
                      <button onClick={() => handleDelete(ref.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingReferenceBank;
