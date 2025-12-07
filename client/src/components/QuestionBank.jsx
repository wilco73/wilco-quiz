import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music, ListChecks } from 'lucide-react';

const QuestionBank = ({ questions, onSave }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    text: '',
    answer: '',
    type: 'text',
    media: '',
    points: 1,
    timer: 0,
    category: '',
    // ✅ NOUVEAU: Champs pour QCM
    choices: ['', '', '', ''], // 4 choix par défaut
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
  };

  const handleSave = () => {
    // Validation
    if (!formData.text.trim()) {
      alert('Le texte de la question est requis');
      return;
    }

    // ✅ NOUVEAU: Validation spécifique pour QCM
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
      // Pour les QCM, la réponse est le texte du choix correct
      formData.answer = formData.choices[formData.correctChoice];
    } else {
      // Pour les autres types, vérifier qu'il y a une réponse
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

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      ...question,
      // ✅ NOUVEAU: Charger les choix QCM ou initialiser
      choices: question.choices || ['', '', '', ''],
      correctChoice: question.correctChoice || 0
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette question ?')) {
      const updatedQuestions = localQuestions.filter(q => q.id !== id);
      setLocalQuestions(updatedQuestions);
      onSave(updatedQuestions);
    }
  };

  // ✅ NOUVEAU: Gérer les choix QCM
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

  const filteredQuestions = localQuestions.filter(q =>
    q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type) => {
    switch(type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'qcm': return <ListChecks className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Banque de Questions</h2>
        
        {/* Formulaire d'ajout/édition */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-3 dark:text-white">{editingQuestion ? 'Modifier' : 'Nouvelle'} Question</h3>
          
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

            {/* ✅ NOUVEAU: Interface QCM */}
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
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ℹ️ Cochez le bouton radio pour indiquer la bonne réponse
                </p>
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
                {editingQuestion ? 'Mettre à jour' : 'Ajouter'}
              </button>
              {editingQuestion && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher une question..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        {/* Liste des questions */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">{filteredQuestions.length} question(s)</p>
          
          {filteredQuestions.map(question => (
            <div key={question.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition bg-white dark:bg-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
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
      </div>
    </div>
  );
};

export default QuestionBank;