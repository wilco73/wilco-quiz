import React, { useState } from 'react';
import { Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const QuizEditor = ({ quiz, questions, onSave, onCancel }) => {
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [selectedQuestions, setSelectedQuestions] = useState(quiz?.questions || []);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableQuestions = questions.filter(q => 
    !selectedQuestions.find(sq => sq.id === q.id)
  );

  const filteredQuestions = availableQuestions.filter(q =>
    q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold mb-4">{quiz?.id ? 'Modifier' : 'Nouveau'} Quiz</h3>
      
      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Titre du quiz"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          rows="2"
        />
      </div>

      {/* Questions sélectionnées */}
      <div className="mb-6">
        <h4 className="text-xl font-bold mb-3">
          Questions du quiz ({selectedQuestions.length})
        </h4>
        
        {selectedQuestions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune question ajoutée</p>
        ) : (
          <div className="space-y-2">
            {selectedQuestions.map((q, index) => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-600 min-w-[30px]">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{q.text}</p>
                    <p className="text-sm text-gray-600">
                      {q.category && <span className="text-purple-600">{q.category} • </span>}
                      {q.points} pts • {q.timer > 0 ? `${q.timer}s` : 'Pas de timer'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {index > 0 && (
                      <button
                        onClick={() => moveQuestion(index, -1)}
                        className="p-1 bg-gray-300 rounded hover:bg-gray-400"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    )}
                    {index < selectedQuestions.length - 1 && (
                      <button
                        onClick={() => moveQuestion(index, 1)}
                        className="p-1 bg-gray-300 rounded hover:bg-gray-400"
                      >
                        <ChevronDown className="w-4 h-4" />
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

      {/* Sélecteur de questions */}
      <button
        onClick={() => setShowQuestionPicker(!showQuestionPicker)}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 flex items-center justify-center gap-2 mb-4"
      >
        <Plus className="w-4 h-4" />
        Ajouter des questions depuis la banque
      </button>

      {showQuestionPicker && (
        <div className="border-2 border-purple-200 rounded-lg p-4 mb-6 bg-purple-50">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
          />
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                {availableQuestions.length === 0 
                  ? 'Toutes les questions sont déjà ajoutées' 
                  : 'Aucune question trouvée'}
              </p>
            ) : (
              filteredQuestions.map(question => (
                <div
                  key={question.id}
                  onClick={() => addQuestion(question)}
                  className="border border-gray-300 rounded-lg p-3 bg-white hover:bg-green-50 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {question.category && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded mr-2">
                          {question.category}
                        </span>
                      )}
                      <p className="font-semibold">{question.text}</p>
                      <p className="text-sm text-gray-600">
                        {question.points} pts • {question.timer > 0 ? `${question.timer}s` : 'Pas de timer'}
                      </p>
                    </div>
                    <Plus className="w-5 h-5 text-green-600" />
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
          className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Enregistrer le quiz
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
      </div>
    </div>
  );
};

export default QuizEditor;