import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, Trash2, Image, Video, Music, Eye, EyeOff, ListChecks, Tag } from 'lucide-react';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * QuestionEditor - Panneau latéral pour créer/éditer une question
 */
const QuestionEditor = ({ 
  question, 
  isOpen, 
  onClose, 
  onSave,
  categories = [],
  allTags = []
}) => {
  const toast = useToast();
  const [showPreview, setShowPreview] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    text: '',
    answer: '',
    type: 'text',
    media: '',
    mediaType: '',
    points: 1,
    timer: 0,
    category: '',
    tags: [],
    tagsInput: '',
    choices: ['', '', '', ''],
    correctChoice: 0
  });

  // Initialiser le formulaire quand une question est passée
  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text || '',
        answer: question.answer || '',
        type: question.type || 'text',
        media: question.media || '',
        mediaType: question.mediaType || '',
        points: question.points || 1,
        timer: question.timer || 0,
        category: question.category || '',
        tags: question.tags || [],
        tagsInput: '',
        choices: question.choices || ['', '', '', ''],
        correctChoice: parseInt(question.correctChoice, 10) || 0
      });
    } else {
      resetForm();
    }
  }, [question]);

  const resetForm = () => {
    setFormData({
      text: '',
      answer: '',
      type: 'text',
      media: '',
      mediaType: '',
      points: 1,
      timer: 0,
      category: '',
      tags: [],
      tagsInput: '',
      choices: ['', '', '', ''],
      correctChoice: 0
    });
  };

  const handleSave = async () => {
    if (!formData.text.trim()) {
      toast.warning('Le texte de la question est requis');
      return;
    }

    if (formData.type === 'qcm') {
      const filledChoices = formData.choices.filter(c => c.trim());
      if (filledChoices.length < 2) {
        toast.warning('Un QCM doit avoir au moins 2 choix');
        return;
      }
      if (!formData.choices[formData.correctChoice]?.trim()) {
        toast.warning('Le choix correct ne peut pas être vide');
        return;
      }
      formData.answer = formData.choices[formData.correctChoice];
    } else {
      if (!formData.answer.trim()) {
        toast.warning('La réponse est requise');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (question?.id) {
        // Mise à jour
        const response = await fetch(`${API_URL}/questions/${question.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, id: question.id })
        });

        if (!response.ok) throw new Error('Erreur lors de la mise à jour');
        const result = await response.json();
        toast.success('Question mise à jour !');
        onSave(result.question, 'update');
      } else {
        // Création
        const newQuestion = {
          ...formData,
          id: `q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        const response = await fetch(`${API_URL}/questions/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newQuestion)
        });

        if (!response.ok) throw new Error("Erreur lors de l'ajout");
        const result = await response.json();
        toast.success('Question ajoutée !');
        onSave(result.question, 'create');
      }

      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error(`Erreur : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateChoice = (index, value) => {
    const newChoices = [...formData.choices];
    newChoices[index] = value;
    setFormData({ ...formData, choices: newChoices });
  };

  const addChoice = () => {
    setFormData({ ...formData, choices: [...formData.choices, ''] });
  };

  const removeChoice = (index) => {
    if (formData.choices.length <= 2) {
      toast.warning('Un QCM doit avoir au moins 2 choix');
      return;
    }
    const newChoices = formData.choices.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      choices: newChoices,
      correctChoice: formData.correctChoice >= newChoices.length ? 0 : formData.correctChoice
    });
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && formData.tagsInput.trim()) {
      e.preventDefault();
      const newTag = formData.tagsInput.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, newTag],
          tagsInput: ''
        });
      } else {
        setFormData({ ...formData, tagsInput: '' });
      }
    }
  };

  const removeTag = (index) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  // Composant de prévisualisation média
  const MediaPreview = useMemo(() => {
    return ({ type, url }) => {
      if (!url || !showPreview) return null;

      const containerClass = "mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg";

      switch (type) {
        case 'image':
          return (
            <div className={containerClass}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aperçu
              </p>
              <img
                src={url}
                alt="Preview"
                className="max-w-full max-h-48 rounded"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          );
        case 'video':
          return (
            <div className={containerClass}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aperçu
              </p>
              <video
                src={url}
                controls
                className="max-w-full max-h-48 rounded"
              />
            </div>
          );
        case 'audio':
          return (
            <div className={containerClass}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aperçu
              </p>
              <audio src={url} controls className="w-full" />
            </div>
          );
        default:
          return null;
      }
    };
  }, [showPreview]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Panneau latéral */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-purple-600 text-white">
          <h2 className="text-xl font-bold">
            {question?.id ? 'Modifier la question' : 'Nouvelle question'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Type de question */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Type de question
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { type: 'text', label: 'Texte', icon: null },
                { type: 'qcm', label: 'QCM', icon: ListChecks },
                { type: 'image', label: 'Image', icon: Image },
                { type: 'video', label: 'Vidéo', icon: Video },
                { type: 'audio', label: 'Audio', icon: Music },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type, media: type === 'text' ? '' : formData.media })}
                  className={`p-2 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                    formData.type === type
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie et Points */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Catégorie
              </label>
              <input
                type="text"
                list="categories"
                placeholder="Ex: Histoire, Géographie..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <datalist id="categories">
                {categories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Points
              </label>
              <input
                type="number"
                min="1"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-sm rounded"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    className="text-green-500 hover:text-red-500 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Ajouter un tag (Entrée pour valider)"
              value={formData.tagsInput}
              onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
              onKeyDown={handleAddTag}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Timer */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Timer (secondes) - 0 = pas de limite
            </label>
            <input
              type="number"
              min="0"
              value={formData.timer}
              onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Question *
            </label>
            <textarea
              placeholder="Entrez votre question..."
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Média (pour types non-texte) */}
          {formData.type !== 'text' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  URL du média
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700"
                >
                  {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPreview ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              
              {/* Pour QCM, permettre de choisir le type de média */}
              {formData.type === 'qcm' && (
                <select
                  value={formData.mediaType || 'none'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mediaType: e.target.value === 'none' ? '' : e.target.value,
                    media: e.target.value === 'none' ? '' : formData.media
                  })}
                  className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="none">Aucun média</option>
                  <option value="image">Image</option>
                  <option value="video">Vidéo</option>
                  <option value="audio">Audio</option>
                </select>
              )}
              
              {(formData.type !== 'qcm' || formData.mediaType) && (
                <>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.media}
                    onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <MediaPreview 
                    type={formData.type === 'qcm' ? formData.mediaType : formData.type} 
                    url={formData.media} 
                  />
                </>
              )}
            </div>
          )}

          {/* Réponse (pour non-QCM) */}
          {formData.type !== 'qcm' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Réponse *
              </label>
              <input
                type="text"
                placeholder="La bonne réponse"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Choix QCM */}
          {formData.type === 'qcm' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Choix de réponse *
              </label>
              <div className="space-y-2">
                {formData.choices.map((choice, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, correctChoice: idx })}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                        formData.correctChoice === idx
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                      }`}
                      title="Marquer comme bonne réponse"
                    >
                      {formData.correctChoice === idx ? '✓' : idx + 1}
                    </button>
                    <input
                      type="text"
                      placeholder={`Choix ${idx + 1}`}
                      value={choice}
                      onChange={(e) => updateChoice(idx, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        formData.correctChoice === idx
                          ? 'border-green-500 dark:border-green-400'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {formData.choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeChoice(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addChoice}
                className="mt-2 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                <Plus className="w-4 h-4" />
                Ajouter un choix
              </button>
            </div>
          )}
        </div>

        {/* Footer avec boutons */}
        <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {question?.id ? 'Mettre à jour' : 'Créer'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default QuestionEditor;
