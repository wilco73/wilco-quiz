import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Search, Download, Upload, 
  Image as ImageIcon, X, Check, AlertCircle, Eye
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DrawingReferenceBank = () => {
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [formData, setFormData] = useState({
    name: '', imageUrl: '', category: '', tags: [], tagsInput: ''
  });
  const [previewImage, setPreviewImage] = useState(null);
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
  
  const filteredRefs = references.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch && (!filterCategory || r.category === filterCategory);
  });
  
  const categories = [...new Set(references.map(r => r.category).filter(Boolean))].sort();
  
  const handleCreate = () => {
    setEditingRef(null);
    setFormData({ name: '', imageUrl: '', category: '', tags: [], tagsInput: '' });
    setShowForm(true);
  };
  
  const handleEdit = (ref) => {
    setEditingRef(ref);
    setFormData({ name: ref.name, imageUrl: ref.imageUrl, category: ref.category || '', tags: ref.tags || [], tagsInput: '' });
    setShowForm(true);
  };
  
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.imageUrl.trim()) {
      toast.warning('Le nom et l\'URL sont requis');
      return;
    }
    try {
      const payload = { name: formData.name.trim(), imageUrl: formData.imageUrl.trim(), category: formData.category.trim() || null, tags: formData.tags };
      const url = editingRef ? `${API_URL}/drawing-references/${editingRef.id}` : `${API_URL}/drawing-references`;
      await fetch(url, { method: editingRef ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      toast.success(editingRef ? 'Image modifiée' : 'Image ajoutée');
      fetchReferences();
      setShowForm(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
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
  
  const addTag = () => {
    const tag = formData.tagsInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag], tagsInput: '' }));
    }
  };
  
  const removeTag = (tag) => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  
  const handleExport = () => {
    const csv = [['Nom', 'URL', 'Catégorie', 'Tags'], ...references.map(r => [r.name, r.imageUrl, r.category || '', (r.tags || []).join('|')])].map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'images_reference.csv';
    link.click();
    toast.success(`${references.length} images exportées`);
  };
  
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = event.target?.result.split('\n').filter(l => l.trim()).slice(1);
      const refs = lines.map(line => {
        const [name, imageUrl, category, tags] = line.split(',');
        return { name: name?.trim(), imageUrl: imageUrl?.trim(), category: category?.trim() || null, tags: tags ? tags.split('|').map(t => t.trim()).filter(Boolean) : [] };
      }).filter(r => r.name && r.imageUrl);
      try {
        const result = await (await fetch(`${API_URL}/drawing-references/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ references: refs, mode: 'add' }) })).json();
        if (result.success) { toast.success(`${result.added} images importées`); fetchReferences(); }
        else toast.error(result.message || 'Erreur d\'import');
      } catch (error) { toast.error('Erreur lors de l\'import'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">🖼️ Images de Référence</h2>
            <p className="text-gray-600 dark:text-gray-400">{references.length} images disponibles</p>
          </div>
          <div className="flex gap-2">
            <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" />Importer
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2">
              <Download className="w-4 h-4" />Exporter
            </button>
            <button onClick={handleCreate} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />Nouvelle image
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Toutes les catégories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
          {filteredRefs.map(ref => (
            <div key={ref.id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition group">
              <div className="aspect-square bg-gray-200 dark:bg-gray-600 relative overflow-hidden cursor-pointer" onClick={() => setPreviewImage(ref)}>
                <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold dark:text-white truncate flex-1">{ref.name}</h3>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => handleEdit(ref)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(ref.id)} className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {ref.category && <span className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs mb-2">{ref.category}</span>}
                {ref.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ref.tags.slice(0, 3).map(tag => <span key={tag} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">#{tag}</span>)}
                    {ref.tags.length > 3 && <span className="text-xs text-gray-500">+{ref.tags.length - 3}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredRefs.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Aucune image trouvée</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">{editingRef ? 'Modifier' : 'Nouvelle'} image</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Ex: Mona Lisa..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de l'image *</label>
                <input type="text" value={formData.imageUrl} onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="https://..." />
                {formData.imageUrl && <div className="mt-2 p-2 border rounded-lg"><img src={formData.imageUrl} alt="Aperçu" className="max-h-32 mx-auto rounded" onError={(e) => e.target.style.display = 'none'} /></div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Ex: Art, Animaux..." list="ref-cat" />
                <datalist id="ref-cat">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <div className="flex gap-2">
                  <input type="text" value={formData.tagsInput} onChange={(e) => setFormData(prev => ({ ...prev, tagsInput: e.target.value }))} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Ajouter..." />
                  <button onClick={addTag} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg"><Plus className="w-4 h-4" /></button>
                </div>
                {formData.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{formData.tags.map(tag => <span key={tag} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded flex items-center gap-1">#{tag}<button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button></span>)}</div>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">Annuler</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"><Check className="w-4 h-4" />{editingRef ? 'Modifier' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Preview */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-w-4xl max-h-[90vh] relative">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X className="w-8 h-8" /></button>
            <img src={previewImage.imageUrl} alt={previewImage.name} className="max-w-full max-h-[80vh] rounded-lg" />
            <p className="text-white text-center mt-4 text-lg">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingReferenceBank;
