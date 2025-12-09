import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music, ListChecks, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const QuestionBank = ({ questions, onSave }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // ✅ NOUVEAU: Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;
  
  // ✅ NOUVEAU: Mode édition inline
  const [inlineEditId, setInlineEditId] = useState(null);

  const [formData, setFormData] = useState({
    text: '',
    answer: '',
    type: 'text',
    media: '',
    points: 1,
    timer: 0,
    category: '',
    choices: ['', '', '', ''],
    correctChoice: 0
  });

  const resetForm = () => {
    setFormData({
      text: '',
      answer: '',
      type: 'text',
      media: '',
      points: 1,
      timer: 0,
      category: '',
      choices: ['', '', '', ''],
      correctChoice: 0
    });
    setEditingQuestion(null);
    setInlineEditId(null);
  };

  const handleSave = () => {
    if (!formData.text.trim()) {
      alert('Le texte de la question est requis');
      return;
    }

    if (formData.type === 'qcm') {
      const filledChoices = formData.choices.filter(c => c.trim());
      if (filledChoices.length < 2) {
        alert('Un QCM doit avoir au moins 2 choix');
        return;
      }
      if (!formData.choices[formData.correctChoice]?.trim()) {
        alert('Le choix correct ne peut pas être vide');
        return;
      }
      formData.answer = formData.choices[formData.correctChoice];
    } else {
      if (!formData.answer.trim()) {
        alert('La réponse est requise');
        return;
      }
    }

    let updatedQuestions;
    if (editingQuestion) {
      updatedQuestions = localQuestions.map(q =>
        q.id === editingQuestion.id ? { ...formData, id: q.id } : q
      );
    } else {
      const newQuestion = { ...formData, id: Date.now().toString() };
      updatedQuestions = [...localQuestions, newQuestion];
    }
    
    setLocalQuestions(updatedQuestions);
    onSave(updatedQuestions);
    resetForm();
  };

  // ✅ NOUVEAU: Édition inline rapide
  const handleInlineEdit = (question) => {
    setInlineEditId(question.id);
    setEditingQuestion(question);
    setFormData({
      ...question,
      choices: question.choices || ['', '', '', ''],
      correctChoice: question.correctChoice || 0
    });
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setInlineEditId(null);
    setFormData({
      ...question,
      choices: question.choices || ['', '', '', ''],
      correctChoice: question.correctChoice || 0
    });
    // Scroll vers le haut pour voir le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette question ?')) {
      const updatedQuestions = localQuestions.filter(q => q.id !== id);
      setLocalQuestions(updatedQuestions);
      onSave(updatedQuestions);
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
      alert('Un QCM doit avoir au moins 2 choix');
      return;
    }
    const newChoices = formData.choices.filter((_, i) => i !== index);
    setFormData({ 
      ...formData, 
      choices: newChoices,
      correctChoice: formData.correctChoice >= newChoices.length ? 0 : formData.correctChoice
    });
  };

  // ✅ AMÉLIORATION: Filtres avancés
  const filteredQuestions = localQuestions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.answer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || q.category === categoryFilter;
    const matchesType = !typeFilter || q.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  // ✅ NOUVEAU: Pagination
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = filteredQuestions.slice(startIndex, endIndex);

  // Reset à la page 1 si changement de filtre
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, typeFilter]);

  const allCategories = [...new Set(localQuestions.map(q => q.category).filter(Boolean))].sort();
  const allTypes = ['text', 'qcm', 'image', 'video', 'audio'];

  const getTypeIcon = (type) => {
    switch(type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'qcm': return <ListChecks className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      text: 'Texte',
      qcm: 'QCM',
      image: 'Image',
      video: 'Vidéo',
      audio: 'Audio'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">Banque de Questions</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredQuestions.length} question{filteredQuestions.length > 1 ? 's' : ''} 
            {filteredQuestions.length !== localQuestions.length && ` (sur ${localQuestions.length})`}
          </div>
        </div>

        {/* ✅ AMÉLIORATION: Formulaire compact quand pas en édition */}
        {!editingQuestion && !inlineEditId ? (
          <button
            onClick={() => setEditingQuestion({})}
            className="w-full py-3 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg text-purple-600 dark:text-purple-400 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Ajouter une nouvelle question</span>
          </button>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-bold mb-3 dark:text-white">{editingQuestion?.id ? 'Modifier' : 'Nouvelle'} Question</h3>
            
            <div className="space-y-3">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="text">Texte</option>
                <option value="qcm">QCM (Choix Multiple)</option>
                <option value="image">Image</option>
                <option value="video">Vidéo</option>
                <option value="audio">Audio</option>
              </select>

              <input
                type="text"
                placeholder="Catégorie (ex: Musique, Cinéma, Sport...)"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />

              <textarea
                placeholder="Question"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows="3"
              />

              {formData.type !== 'text' && formData.type !== 'qcm' && (
                <input
                  type="text"
                  placeholder="URL du média"
                  value={formData.media}
                  onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              )}

              {formData.type === 'qcm' ? (
                <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <p className="font-semibold text-sm dark:text-white flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Choix de réponses
                  </p>
                  {formData.choices.map((choice, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="radio"
                        name="correctChoice"
                        checked={formData.correctChoice === index}
                        onChange={() => setFormData({ ...formData, correctChoice: index })}
                        className="mt-3"
                        title="Bonne réponse"
                      />
                      <input
                        type="text"
                        placeholder={`Choix ${index + 1}`}
                        value={choice}
                        onChange={(e) => updateChoice(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      {formData.choices.length > 2 && (
                        <button
                          onClick={() => removeChoice(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.choices.length < 6 && (
                    <button
                      onClick={addChoice}
                      className="w-full py-2 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg text-blue-600 dark:text-blue-400 hover:border-blue-500 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un choix
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Réponse correcte"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Points"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  min="1"
                />
                <input
                  type="number"
                  placeholder="Timer (secondes)"
                  value={formData.timer}
                  onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  min="0"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingQuestion?.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ AMÉLIORATION: Filtres avancés */}
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Toutes catégories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Tous types</option>
            {allTypes.map(type => (
              <option key={type} value={type}>{getTypeLabel(type)}</option>
            ))}
          </select>
        </div>

        {/* ✅ NOUVEAU: Pagination en haut */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-1 px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>

            <span className="text-sm font-semibold dark:text-white">
              Page {currentPage} / {totalPages}
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                ({startIndex + 1}-{Math.min(endIndex, filteredQuestions.length)} sur {filteredQuestions.length})
              </span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-1 px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ✅ AMÉLIORATION: Liste paginée */}
        <div className="space-y-3">
          {currentQuestions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition bg-white dark:bg-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded font-bold">
                      #{startIndex + index + 1}
                    </span>
                    {getTypeIcon(question.type)}
                    {question.category && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded">
                        {question.category}
                      </span>
                    )}
                    {question.type === 'qcm' && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded">
                        QCM
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{question.points} pts</span>
                    {question.timer > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{question.timer}s</span>
                    )}
                  </div>
                  <p className="font-semibold mb-1 dark:text-white">{question.text}</p>
                  {question.type === 'qcm' ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-semibold">Choix :</p>
                      <ul className="ml-4">
                        {question.choices?.map((choice, idx) => (
                          <li key={idx} className={idx === question.correctChoice ? 'text-green-600 dark:text-green-400 font-bold' : ''}>
                            {idx === question.correctChoice ? '✓ ' : '• '}{choice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Réponse: <span className="font-bold">{question.answer}</span>
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(question)}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Éditer (scroll en haut)"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ NOUVEAU: Pagination en bas */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-1 px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>

            <div className="flex gap-1 flex-wrap justify-center">
              {/* Première page */}
              <button
                onClick={() => setCurrentPage(1)}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === 1
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                1
              </button>

              {/* Ellipsis gauche */}
              {currentPage > 3 && totalPages > 5 && (
                <span className="px-2 py-1 text-gray-500 dark:text-gray-400">...</span>
              )}

              {/* Pages autour de la page actuelle */}
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Afficher seulement les pages proches de la page actuelle
                if (pageNum === 1 || pageNum === totalPages) return null;
                if (Math.abs(pageNum - currentPage) > 1) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded text-sm ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Ellipsis droite */}
              {currentPage < totalPages - 2 && totalPages > 5 && (
                <span className="px-2 py-1 text-gray-500 dark:text-gray-400">...</span>
              )}

              {/* Dernière page */}
              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === totalPages
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-1 px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {localQuestions.length === 0 ? 'Aucune question' : 'Aucun résultat trouvé'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;