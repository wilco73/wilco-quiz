import React, { useState, useEffect, useCallback } from 'react';
import { 
  Image, Video, Music, Search, Plus, Trash2, Tag, X, 
  ChevronLeft, ChevronRight, Upload, Edit2, Check, Filter
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const MediaLibrary = ({ onSelectMedia, selectionMode = false, selectedMediaIds = [], compact = false }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  
  // Toast - appelé inconditionnellement
  const toast = useToast();

  // Charger les médias
  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { type: typeFilter })
      });
      
      const res = await fetch(`${API_URL}/media?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setMedia(data.media || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Erreur chargement médias:', err);
      setError(err.message || 'Erreur réseau');
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, searchTerm, typeFilter]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter]);

  // Supprimer un média
  const handleDelete = async (mediaId) => {
    if (!window.confirm('Supprimer ce média ?')) return;
    
    try {
      const res = await fetch(`${API_URL}/media/${mediaId}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast?.success?.('Média supprimé');
        loadMedia();
      } else {
        toast?.error?.(data.message || 'Erreur');
      }
    } catch (err) {
      toast?.error?.('Erreur lors de la suppression');
    }
  };

  // Icône selon le type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      default: return <Image className="w-5 h-5" />;
    }
  };

  // Couleur selon le type
  const getTypeColor = (type) => {
    switch (type) {
      case 'image': return 'bg-blue-500';
      case 'video': return 'bg-purple-500';
      case 'audio': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Rendu d'une carte média
  const MediaCard = ({ item }) => {
    const isSelected = selectedMediaIds.includes(item.id);
    
    return (
      <div 
        className={`
          group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden
          border-2 transition-all cursor-pointer
          ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}
        `}
        onClick={() => selectionMode && onSelectMedia?.(item)}
      >
        {/* Thumbnail */}
        <div className="h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {item.type === 'image' ? (
            <img 
              src={item.thumbnail_url || item.url} 
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className={`p-4 rounded-full ${getTypeColor(item.type)} text-white`}>
              {getTypeIcon(item.type)}
            </div>
          )}
        </div>
        
        {/* Badge type */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs text-white ${getTypeColor(item.type)}`}>
          {item.type}
        </div>
        
        {/* Checkbox sélection */}
        {selectionMode && (
          <div className={`
            absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center
            ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-300'}
          `}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}
        
        {/* Infos */}
        <div className="p-3">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate" title={item.name}>
            {item.name}
          </h3>
          
          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Actions (mode non-sélection) */}
        {!selectionMode && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingMedia(item); }}
              className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
              className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${compact ? '' : 'p-4'}`}>
      {/* Header */}
      {!compact && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Image className="w-6 h-6" />
            Médiathèque
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        </div>
      )}
      
      {/* Filtres */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Tous types</option>
          <option value="image">Images</option>
          <option value="video">Vidéos</option>
          <option value="audio">Audio</option>
        </select>
      </div>
      
      {/* Grille de médias */}
      {error ? (
        <div className="text-center py-12 text-red-500">
          <p className="font-medium">Erreur</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadMedia}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Réessayer
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun média trouvé</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {media.map(item => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-gray-600 dark:text-gray-400">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Modal Ajout */}
      {showAddModal && (
        <AddMediaModal 
          toast={toast}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); loadMedia(); }}
        />
      )}
      
      {/* Modal Édition */}
      {editingMedia && (
        <EditMediaModal 
          toast={toast}
          media={editingMedia}
          onClose={() => setEditingMedia(null)}
          onSave={() => { setEditingMedia(null); loadMedia(); }}
        />
      )}
    </div>
  );
};

// Modal d'ajout de média
const AddMediaModal = ({ onClose, onSave, toast }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'image',
    url: '',
    thumbnailUrl: '',
    tags: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Nom et URL requis');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          url: formData.url.trim(),
          thumbnailUrl: formData.thumbnailUrl.trim() || null,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Média ajouté !');
        onSave();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold dark:text-white">Ajouter un média</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Nom du média"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="image">Image</option>
              <option value="video">Vidéo</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">URL Miniature (optionnel)</label>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tags (séparés par virgules)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="tag1, tag2, tag3"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal d'édition de média
const EditMediaModal = ({ media, onClose, onSave, toast }) => {
  const [formData, setFormData] = useState({
    name: media.name,
    tags: (media.tags || []).join(', '),
    thumbnailUrl: media.thumbnail_url || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/media/${media.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          thumbnailUrl: formData.thumbnailUrl.trim() || null
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Média modifié !');
        onSave();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold dark:text-white">Modifier le média</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">URL Miniature</label>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MediaLibrary;
