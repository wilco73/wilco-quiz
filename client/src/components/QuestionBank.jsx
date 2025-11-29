import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music } from 'lucide-react';

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
    category: ''
  });

  const resetForm = () => {
    setFormData({
      text: '',
      answer: '',
      type: 'text',
      media: '',
      points: 1,
      timer: 0,
      category: ''
    });
    setEditingQuestion(null);
  };

  const handleSave = () => {
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
    setFormData(question);
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette question ?')) {
      const updatedQuestions = localQuestions.filter(q => q.id !== id);
      setLocalQuestions(updatedQuestions);
      onSave(updatedQuestions);
    }
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
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Banque de Questions</h2>
        
        {/* Formulaire d'ajout/édition */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-3">{editingQuestion ? 'Modifier' : 'Nouvelle'} Question</h3>
          
          <div className="space-y-3">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="text">Texte</option>
              <option value="image">Image</option>
              <option value="video">Vidéo</option>
              <option value="audio">Audio</option>
            </select>

            <input
              type="text"
              placeholder="Catégorie (ex: Musique, Cinéma, Sport...)"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            <textarea
              placeholder="Question"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="3"
            />

            {formData.type !== 'text' && (
              <input
                type="text"
                placeholder="URL du média"
                value={formData.media}
                onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}

            <input
              type="text"
              placeholder="Réponse correcte"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Points"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
              />
              <input
                type="number"
                placeholder="Timer (secondes)"
                value={formData.timer}
                onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingQuestion ? 'Mettre à jour' : 'Ajouter'}
              </button>
              {editingQuestion && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4"
        />

        {/* Liste des questions */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{filteredQuestions.length} question(s)</p>
          
          {filteredQuestions.map(question => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(question.type)}
                    {question.category && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        {question.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{question.points} pts</span>
                    {question.timer > 0 && (
                      <span className="text-xs text-gray-500">{question.timer}s</span>
                    )}
                  </div>
                  <p className="font-semibold mb-1">{question.text}</p>
                  <p className="text-sm text-gray-600">Réponse: <span className="font-bold">{question.answer}</span></p>
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