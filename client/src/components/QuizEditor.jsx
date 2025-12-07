import React, { useState } from 'react';
import { Save, X, Plus, Trash2, ChevronDown, ChevronUp, Shuffle, Filter } from 'lucide-react';

const QuizEditor = ({ quiz, questions, onSave, onCancel }) => {
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [selectedQuestions, setSelectedQuestions] = useState(quiz?.questions || []);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // ✅ NOUVEAU: États pour sélection aléatoire
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [randomCount, setRandomCount] = useState(5);
  const [randomCategory, setRandomCategory] = useState('');

  const availableQuestions = questions.filter(q => 
    !selectedQuestions.find(sq => sq.id === q.id)
  );

  const filteredQuestions = availableQuestions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || q.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ✅ NOUVEAU: Obtenir toutes les catégories uniques
  const allCategories = [...new Set(questions.map(q => q.category).filter(Boolean))].sort();

  const addQuestion = (question) => {
    setSelectedQuestions([...selectedQuestions, question]);
  };

  const removeQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...selectedQuestions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + direction];
    newQuestions[index + direction] = temp;
    setSelectedQuestions(newQuestions);
  };

  // ✅ NOUVEAU: Ajouter questions aléatoires
  const addRandomQuestions = () => {
    let pool = availableQuestions;
    
    // Filtrer par catégorie si spécifiée
    if (randomCategory) {
      pool = pool.filter(q => q.category === randomCategory);
    }
    
    if (pool.length === 0) {
      alert('Aucune question disponible avec ces critères');
      return;
    }
    
    // Limiter au nombre disponible
    const count = Math.min(randomCount, pool.length);
    
    // Mélanger et prendre les N premières
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const randomSelected = shuffled.slice(0, count);
    
    setSelectedQuestions([...selectedQuestions, ...randomSelected]);
    setShowRandomPicker(false);
    
    alert(`${count} question(s) ajoutée(s) aléatoirement`);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Le titre est requis');
      return;
    }
    if (selectedQuestions.length === 0) {
      alert('Ajoutez au moins une question');
      return;
    }
    onSave({
      id: quiz?.id,
      title,
      description,
      questions: selectedQuestions
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold mb-4 dark:text-white">{quiz?.id ? 'Modifier' : 'Nouveau'} Quiz</h3>
      
      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Titre du quiz"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
        />
      </div>

      {/* Questions sélectionnées */}
      <div className="mb-6">
        <h4 className="text-xl font-bold mb-3 dark:text-white">
          Questions du quiz ({selectedQuestions.length})
        </h4>
        
        {selectedQuestions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Aucune question ajoutée</p>
        ) : (
          <div className="space-y-2">
            {selectedQuestions.map((q, index) => (
              <div key={q.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-600 dark:text-purple-400 min-w-[30px]">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold dark:text-white">{q.text}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {q.category && <span className="text-purple-600 dark:text-purple-400">{q.category} • </span>}
                      {q.type === 'qcm' && <span className="text-blue-600 dark:text-blue-400">QCM • </span>}
                      {q.points} pts • {q.timer > 0 ? `${q.timer}s` : 'Pas de timer'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {index > 0 && (
                      <button
                        onClick={() => moveQuestion(index, -1)}
                        className="p-1 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                      >
                        <ChevronUp className="w-4 h-4 dark:text-white" />
                      </button>
                    )}
                    {index < selectedQuestions.length - 1 && (
                      <button
                        onClick={() => moveQuestion(index, 1)}
                        className="p-1 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                      >
                        <ChevronDown className="w-4 h-4 dark:text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Boutons d'ajout */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => {
            setShowQuestionPicker(!showQuestionPicker);
            setShowRandomPicker(false);
          }}
          className="py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-purple-500 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter manuellement
        </button>
        
        {/* ✅ NOUVEAU: Bouton sélection aléatoire */}
        <button
          onClick={() => {
            setShowRandomPicker(!showRandomPicker);
            setShowQuestionPicker(false);
          }}
          className="py-2 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg text-blue-600 dark:text-blue-400 hover:border-blue-500 hover:text-blue-700 dark:hover:border-blue-400 dark:hover:text-blue-300 flex items-center justify-center gap-2"
        >
          <Shuffle className="w-4 h-4" />
          Ajouter aléatoirement
        </button>
      </div>

      {/* ✅ NOUVEAU: Sélecteur aléatoire */}
      {showRandomPicker && (
        <div className="border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6 bg-blue-50 dark:bg-blue-900/20">
          <h4 className="font-bold mb-3 dark:text-white flex items-center gap-2">
            <Shuffle className="w-5 h-5" />
            Sélection Aléatoire
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-gray-300">
                Nombre de questions
              </label>
              <input
                type="number"
                min="1"
                max={availableQuestions.length}
                value={randomCount}
                onChange={(e) => setRandomCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {availableQuestions.length} question(s) disponible(s)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-gray-300">
                Catégorie (optionnel)
              </label>
              <select
                value={randomCategory}
                onChange={(e) => setRandomCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Toutes les catégories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={addRandomQuestions}
              className="w-full py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Ajouter {randomCount} question(s)
            </button>
          </div>
        </div>
      )}

      {/* Sélecteur manuel de questions */}
      {showQuestionPicker && (
        <div className="border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-6 bg-purple-50 dark:bg-purple-900/20">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Toutes catégories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                {availableQuestions.length === 0 
                  ? 'Toutes les questions sont déjà ajoutées' 
                  : 'Aucune question trouvée'}
              </p>
            ) : (
              filteredQuestions.map(question => (
                <div
                  key={question.id}
                  onClick={() => addQuestion(question)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {question.category && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded mr-2">
                          {question.category}
                        </span>
                      )}
                      {question.type === 'qcm' && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded mr-2">
                          QCM
                        </span>
                      )}
                      <p className="font-semibold dark:text-white">{question.text}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {question.points} pts • {question.timer > 0 ? `${question.timer}s` : 'Pas de timer'}
                      </p>
                    </div>
                    <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Enregistrer le quiz
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
      </div>
    </div>
  );
};

export default QuizEditor;