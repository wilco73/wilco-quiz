import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

/**
 * MemeTemplateManager - Interface admin pour gérer les images meme
 */
export default function MemeTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showZoneEditor, setShowZoneEditor] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchTags();
  }, [showInactive]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/meme-templates?includeInactive=${showInactive}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de chargement des templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch(`${API_URL}/api/meme-templates/tags`);
      const data = await res.json();
      if (data.success) {
        setAllTags(data.tags);
      }
    } catch (err) {
      console.error('Erreur chargement tags:', err);
    }
  };

  const createTemplate = async (templateData) => {
    try {
      const res = await fetch(`${API_URL}/api/meme-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      const data = await res.json();
      if (data.success) {
        setTemplates([data.template, ...templates]);
        setShowEditor(false);
        setEditingTemplate(null);
        fetchTags();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de création');
      console.error(err);
    }
  };

  const updateTemplate = async (id, updates) => {
    try {
      const res = await fetch(`${API_URL}/api/meme-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(templates.map(t => t.id === id ? data.template : t));
        setShowEditor(false);
        setEditingTemplate(null);
        fetchTags();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de mise à jour');
      console.error(err);
    }
  };

  const deleteTemplate = async (id, hard = false) => {
    const confirmMsg = hard 
      ? 'Supprimer définitivement ce template ? Cette action est irréversible.'
      : 'Désactiver ce template ? Il ne sera plus disponible dans les parties.';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const url = hard 
        ? `${API_URL}/api/meme-templates/${id}/hard`
        : `${API_URL}/api/meme-templates/${id}`;
      
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        if (hard) {
          setTemplates(templates.filter(t => t.id !== id));
        } else {
          setTemplates(templates.map(t => t.id === id ? { ...t, is_active: false } : t));
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de suppression');
      console.error(err);
    }
  };

  const reactivateTemplate = async (id) => {
    await updateTemplate(id, { is_active: true });
  };

  // Filtrage
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => (t.tags || []).includes(tag));
    
    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>😂</span>
          Templates Meme
          <span className="text-sm font-normal text-gray-400">
            ({filteredTemplates.length} / {templates.length})
          </span>
        </h2>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setShowEditor(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <span>+</span>
          Ajouter un template
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">✕</button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1 rounded-full text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Toggle inactifs */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="text-gray-400">Afficher inactifs</span>
          </label>
        </div>
      </div>

      {/* Grille de templates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`bg-gray-800 rounded-lg overflow-hidden border transition-all hover:border-purple-500 ${
              template.is_active ? 'border-gray-700' : 'border-red-500/50 opacity-60'
            }`}
          >
            {/* Image */}
            <div className="relative aspect-square bg-gray-900">
              <img
                src={template.image_url}
                alt={template.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {!template.is_active && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-red-400 font-bold">INACTIF</span>
                </div>
              )}
              {template.preset_zones && template.preset_zones.length > 0 && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  {template.preset_zones.length} zone(s)
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="p-3">
              <h3 className="font-semibold text-white truncate" title={template.title}>
                {template.title}
              </h3>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {(template.tags || []).slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {(template.tags || []).length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                    +{template.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                    setShowEditor(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 rounded"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                    setShowZoneEditor(true);
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 rounded"
                  title="Zones de texte"
                >
                  📝
                </button>
                {template.is_active ? (
                  <button
                    onClick={() => deleteTemplate(template.id, false)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1 rounded"
                    title="Désactiver"
                  >
                    🚫
                  </button>
                ) : (
                  <button
                    onClick={() => reactivateTemplate(template.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1 rounded"
                    title="Réactiver"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">😕</p>
          <p>Aucun template trouvé</p>
          {searchQuery || selectedTags.length > 0 ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
              }}
              className="mt-4 text-purple-400 hover:text-purple-300"
            >
              Effacer les filtres
            </button>
          ) : (
            <button
              onClick={() => setShowEditor(true)}
              className="mt-4 text-purple-400 hover:text-purple-300"
            >
              Ajouter le premier template
            </button>
          )}
        </div>
      )}

      {/* Modal Éditeur */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          allTags={allTags}
          onSave={(data) => {
            if (editingTemplate) {
              updateTemplate(editingTemplate.id, data);
            } else {
              createTemplate(data);
            }
          }}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Modal Zones de texte */}
      {showZoneEditor && editingTemplate && (
        <ZoneEditor
          template={editingTemplate}
          onSave={(zones) => {
            updateTemplate(editingTemplate.id, { preset_zones: zones });
            setShowZoneEditor(false);
            setEditingTemplate(null);
          }}
          onClose={() => {
            setShowZoneEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}


/**
 * Modal d'édition d'un template
 */
function TemplateEditor({ template, allTags, onSave, onClose }) {
  const [title, setTitle] = useState(template?.title || '');
  const [imageUrl, setImageUrl] = useState(template?.image_url || '');
  const [tags, setTags] = useState(template?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [width, setWidth] = useState(template?.width || 800);
  const [height, setHeight] = useState(template?.height || 800);
  const [previewError, setPreviewError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title,
      image_url: imageUrl,
      tags,
      width: parseInt(width),
      height: parseInt(height)
    });
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              {template ? 'Modifier le template' : 'Nouveau template'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Titre */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Drake Hotline Bling"
                className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-700"
                required
              />
            </div>

            {/* URL Image */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL de l'image *</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewError(false);
                }}
                placeholder="https://..."
                className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-700"
                required
              />
            </div>

            {/* Preview */}
            {imageUrl && (
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Aperçu :</p>
                {previewError ? (
                  <div className="text-red-400 text-sm">
                    Impossible de charger l'image. Vérifiez l'URL.
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded"
                    onError={() => setPreviewError(true)}
                    onLoad={(e) => {
                      setWidth(e.target.naturalWidth);
                      setHeight(e.target.naturalHeight);
                    }}
                  />
                )}
              </div>
            )}

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Largeur (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hauteur (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-700"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Ajouter un tag..."
                  className="flex-1 bg-gray-800 text-white rounded px-3 py-2 border border-gray-700"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded"
                >
                  +
                </button>
              </div>
              
              {/* Tags existants (suggestions) */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {allTags.filter(t => !tags.includes(t)).slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags([...tags, tag])}
                      className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded hover:bg-gray-600"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Tags sélectionnés */}
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!title || !imageUrl}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg"
              >
                {template ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


/**
 * Modal d'édition des zones de texte prédéfinies
 */
function ZoneEditor({ template, onSave, onClose }) {
  const [zones, setZones] = useState(template.preset_zones || []);
  const [selectedZone, setSelectedZone] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const addZone = () => {
    const newZone = {
      id: `zone-${Date.now()}`,
      x: 50,
      y: 50,
      width: 200,
      height: 60,
      rotation: 0,
      defaultFont: 'Impact',
      defaultSize: 32
    };
    setZones([...zones, newZone]);
    setSelectedZone(newZone.id);
  };

  const updateZone = (zoneId, updates) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, ...updates } : z));
  };

  const deleteZone = (zoneId) => {
    setZones(zones.filter(z => z.id !== zoneId));
    if (selectedZone === zoneId) setSelectedZone(null);
  };

  const handleSave = () => {
    onSave(zones);
  };

  const selectedZoneData = zones.find(z => z.id === selectedZone);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            Zones de texte - {template.title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div 
            ref={containerRef}
            className="flex-1 bg-gray-800 p-4 overflow-auto flex items-center justify-center"
          >
            <div className="relative inline-block">
              <img
                src={template.image_url}
                alt={template.title}
                className="max-w-full max-h-[60vh]"
                ref={canvasRef}
              />
              
              {/* Zones overlay */}
              {zones.map(zone => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className={`absolute border-2 cursor-move flex items-center justify-center transition-colors ${
                    selectedZone === zone.id 
                      ? 'border-yellow-400 bg-yellow-400/20' 
                      : 'border-blue-400 bg-blue-400/10 hover:bg-blue-400/20'
                  }`}
                  style={{
                    left: `${(zone.x / template.width) * 100}%`,
                    top: `${(zone.y / template.height) * 100}%`,
                    width: `${(zone.width / template.width) * 100}%`,
                    height: `${(zone.height / template.height) * 100}%`,
                    transform: `rotate(${zone.rotation}deg)`
                  }}
                >
                  <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                    Zone {zones.indexOf(zone) + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel */}
          <div className="w-72 bg-gray-850 border-l border-gray-700 p-4 overflow-y-auto">
            <button
              onClick={addZone}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg mb-4"
            >
              + Ajouter une zone
            </button>

            {/* Liste des zones */}
            <div className="space-y-2 mb-4">
              {zones.map((zone, index) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                    selectedZone === zone.id 
                      ? 'bg-purple-600' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <span>Zone {index + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteZone(zone.id);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* Édition de la zone sélectionnée */}
            {selectedZoneData && (
              <div className="space-y-3 border-t border-gray-700 pt-4">
                <h4 className="font-semibold text-white">Propriétés</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">X</label>
                    <input
                      type="number"
                      value={selectedZoneData.x}
                      onChange={(e) => updateZone(selectedZone, { x: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Y</label>
                    <input
                      type="number"
                      value={selectedZoneData.y}
                      onChange={(e) => updateZone(selectedZone, { y: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Largeur</label>
                    <input
                      type="number"
                      value={selectedZoneData.width}
                      onChange={(e) => updateZone(selectedZone, { width: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Hauteur</label>
                    <input
                      type="number"
                      value={selectedZoneData.height}
                      onChange={(e) => updateZone(selectedZone, { height: parseInt(e.target.value) })}
                      className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Rotation (°)</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedZoneData.rotation}
                    onChange={(e) => updateZone(selectedZone, { rotation: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-400">
                    {selectedZoneData.rotation}°
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Police par défaut</label>
                  <select
                    value={selectedZoneData.defaultFont}
                    onChange={(e) => updateZone(selectedZone, { defaultFont: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="Impact">Impact</option>
                    <option value="Arial">Arial</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Times New Roman">Times New Roman</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Taille par défaut</label>
                  <input
                    type="number"
                    value={selectedZoneData.defaultSize}
                    onChange={(e) => updateZone(selectedZone, { defaultSize: parseInt(e.target.value) })}
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button
                onClick={handleSave}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
              >
                Enregistrer
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
