import React, { useState, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music, ListChecks, Eye, EyeOff, Upload, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from './ToastProvider';

const QuestionBank = ({ questions, onSave }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const fileInputRef = useRef(null);
  const questionsPerPage = 10;
  const toast = useToast();

  const [formData, setFormData] = useState({
    text: '',
    answer: '',
    type: 'text',
    media: '',
    mediaType: '',
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
      mediaType: '',
      points: 1,
      timer: 0,
      category: '',
      choices: ['', '', '', ''],
      correctChoice: 0
    });
    setEditingQuestion(null);
  };

  // ✅ EXPORT CSV avec choix du délimiteur
  const handleExportCSV = () => {
    if (localQuestions.length === 0) {
      toast.warning('Aucune question à exporter');
      return;
    }

    const delimiter = csvDelimiter;
    const headers = [
      'Type',
      'Catégorie',
      'Question',
      'Réponse',
      'Média (URL)',
      'Points',
      'Timer (secondes)',
      'Choix 1',
      'Choix 2',
      'Choix 3',
      'Choix 4',
      'Choix 5',
      'Choix 6',
      'Index Réponse Correcte'
    ];

    const rows = localQuestions.map(q => {
      const choices = q.type === 'qcm' ? (q.choices || []) : [];
      return [
        q.type || 'text',
        q.category || '',
        `"${(q.text || '').replace(/"/g, '""')}"`,
        `"${(q.answer || '').replace(/"/g, '""')}"`,
        q.media || '',
        q.points || 1,
        q.timer || 0,
        choices[0] ? `"${choices[0].replace(/"/g, '""')}"` : '',
        choices[1] ? `"${choices[1].replace(/"/g, '""')}"` : '',
        choices[2] ? `"${choices[2].replace(/"/g, '""')}"` : '',
        choices[3] ? `"${choices[3].replace(/"/g, '""')}"` : '',
        choices[4] ? `"${choices[4].replace(/"/g, '""')}"` : '',
        choices[5] ? `"${choices[5].replace(/"/g, '""')}"` : '',
        q.type === 'qcm' ? (q.correctChoice || 0) : ''
      ].join(delimiter);
    });

    const csvContent = [headers.join(delimiter), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `questions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${localQuestions.length} question(s) exportée(s) avec le délimiteur "${delimiter}" !`);
  };

  // ✅ IMPORT CSV avec détection automatique du délimiteur
  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('Le fichier CSV est vide ou invalide');
          return;
        }

        // Détecter le délimiteur automatiquement
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const detectedDelimiter = semicolonCount > commaCount ? ';' : ',';
        
        console.log(`Délimiteur détecté: "${detectedDelimiter}"`);

        const dataLines = lines.slice(1);
        const importedQuestions = [];
        let errors = [];

        dataLines.forEach((line, index) => {
          try {
            const values = parseCSVLine(line, detectedDelimiter);
            
            if (values.length < 7) {
              errors.push(`Ligne ${index + 2}: Nombre de colonnes insuffisant`);
              return;
            }

            const [
              type,
              category,
              text,
              answer,
              media,
              points,
              timer,
              choice1,
              choice2,
              choice3,
              choice4,
              choice5,
              choice6,
              correctChoiceIndex
            ] = values;

            if (!text || !text.trim()) {
              errors.push(`Ligne ${index + 2}: Question vide`);
              return;
            }

            const question = {
              id: `import-${Date.now()}-${index}`,
              type: type || 'text',
              category: category || '',
              text: text.trim(),
              answer: answer?.trim() || '',
              media: media || '',
              points: parseInt(points) || 1,
              timer: parseInt(timer) || 0
            };

            if (question.type === 'qcm') {
              const choices = [choice1, choice2, choice3, choice4, choice5, choice6]
                .filter(c => c && c.trim())
                .map(c => c.trim());
              
              if (choices.length < 2) {
                errors.push(`Ligne ${index + 2}: QCM doit avoir au moins 2 choix`);
                return;
              }

              question.choices = choices;
              question.correctChoice = parseInt(correctChoiceIndex) || 0;
              
              if (question.correctChoice >= choices.length) {
                question.correctChoice = 0;
              }
              
              question.answer = choices[question.correctChoice];
            }

            importedQuestions.push(question);
          } catch (err) {
            errors.push(`Ligne ${index + 2}: ${err.message}`);
          }
        });

        if (errors.length > 0) {
          console.error('Erreurs d\'import:', errors);
          toast.success(`Import terminé avec ${errors.length} erreur(s):\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
        }

        if (importedQuestions.length > 0) {
          const confirmMessage = `Voulez-vous importer ${importedQuestions.length} question(s) ?\n\n` +
            `Mode d'import :\n` +
            `- AJOUTER : Ajoute les questions à la banque existante\n` +
            `- REMPLACER : Supprime toutes les questions et importe uniquement les nouvelles\n\n` +
            `Cliquez sur OK pour AJOUTER, Annuler pour REMPLACER`;

          const shouldAdd = window.confirm(confirmMessage);
          
          let finalQuestions;
          if (shouldAdd) {
            finalQuestions = [...localQuestions, ...importedQuestions];
            toast.success(`${importedQuestions.length} question(s) ajoutée(s) avec succès !`);
          } else {
            finalQuestions = importedQuestions;
            toast.success(`${importedQuestions.length} question(s) importée(s) (anciennes questions supprimées) !`);
          }

          setLocalQuestions(finalQuestions);
          onSave(finalQuestions);
        } else {
          toast.warning('Aucune question valide trouvée dans le fichier');
        }

      } catch (error) {
        console.error('Erreur import CSV:', error);
        toast.error('Erreur lors de l\'import du fichier CSV');
      }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  // ✅ Parser CSV avec délimiteur spécifique
  const parseCSVLine = (line, delimiter = ',') => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  // ✅ Télécharger template CSV
  const handleDownloadTemplate = () => {
    const delimiter = csvDelimiter;
    const headers = [
      'Type',
      'Catégorie',
      'Question',
      'Réponse',
      'Média (URL)',
      'Points',
      'Timer (secondes)',
      'Choix 1',
      'Choix 2',
      'Choix 3',
      'Choix 4',
      'Choix 5',
      'Choix 6',
      'Index Réponse Correcte'
    ];

    const examples = [
      [
        'text',
        'Géographie',
        '"Quelle est la capitale de la France ?"',
        '"Paris"',
        '',
        '1',
        '30',
        '', '', '', '', '', '',
        ''
      ].join(delimiter),
      [
        'qcm',
        'Histoire',
        '"En quelle année a eu lieu la Révolution française ?"',
        '"1789"',
        '',
        '2',
        '20',
        '"1789"',
        '"1792"',
        '"1804"',
        '"1815"',
        '', '',
        '0'
      ].join(delimiter),
      [
        'image',
        'Art',
        '"Qui a peint ce tableau ?"',
        '"Leonardo da Vinci"',
        '"https://example.com/mona-lisa.jpg"',
        '1',
        '0',
        '', '', '', '', '', '',
        ''
      ].join(delimiter),
      [
        'audio',
        'Musique',
        '"Qui interprète cette chanson ?"',
        '"The Beatles"',
        '"https://example.com/song.mp3"',
        '1',
        '15',
        '', '', '', '', '', '',
        ''
      ].join(delimiter)
    ];

    const csvContent = [headers.join(delimiter), ...examples].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `template_questions_${delimiter === ',' ? 'comma' : 'semicolon'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
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

  // ✅ FILTRAGE avec catégorie et type
  const filteredQuestions = localQuestions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || q.category === filterCategory;
    const matchesType = !filterType || q.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // ✅ PAGINATION
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + questionsPerPage);

  // Réinitialiser à la page 1 si on filtre
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterType]);

  // ✅ Pagination avec ellipsis
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    
    // Toujours afficher la première page
    pages.push(
      <button
        key={1}
        onClick={() => setCurrentPage(1)}
        className={`px-3 py-1 rounded ${
          currentPage === 1
            ? 'bg-purple-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        1
      </button>
    );

    // Ellipsis après la première page si nécessaire
    if (currentPage > 3 && totalPages > 5) {
      pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
    }

    // Pages autour de la page actuelle
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i > 1 && i < totalPages) {
        pages.push(
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`px-3 py-1 rounded ${
              currentPage === i
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {i}
          </button>
        );
      }
    }

    // Ellipsis avant la dernière page si nécessaire
    if (currentPage < totalPages - 2 && totalPages > 5) {
      pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
    }

    // Toujours afficher la dernière page
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`px-3 py-1 rounded ${
            currentPage === totalPages
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {pages}
        
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'qcm': return <ListChecks className="w-4 h-4" />;
      default: return null;
    }
  };

  const MediaPreview = useMemo(() => {
    return ({ type, url, id }) => {
      if (!url || !showPreview) return null;

      const containerClass = "mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-purple-200 dark:border-purple-600";
      const mediaKey = `${id || 'new'}-${url}`;

      switch(type) {
        case 'image':
          return (
            <div className={containerClass}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Aperçu de l'image
              </p>
              <img 
                key={mediaKey}
                src={url} 
                alt="Preview" 
                className="max-w-full max-h-64 rounded border border-gray-300 dark:border-gray-600"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-red-600 text-sm';
                  errorMsg.textContent = '❌ Impossible de charger l\'image';
                  e.target.parentElement.appendChild(errorMsg);
                }}
              />
            </div>
          );
        
        case 'video':
          return (
            <div className={containerClass}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Aperçu de la vidéo
              </p>
              <video 
                key={mediaKey}
                controls 
                preload="metadata"
                className="max-w-full max-h-64 rounded border border-gray-300 dark:border-gray-600"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-red-600 text-sm';
                  errorMsg.textContent = '❌ Impossible de charger la vidéo';
                  e.target.parentElement.appendChild(errorMsg);
                }}
              >
                <source src={url} />
                Votre navigateur ne supporte pas la vidéo.
              </video>
            </div>
          );
        
        case 'audio':
          return (
            <div className={containerClass}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Aperçu de l'audio
              </p>
              <audio 
                key={mediaKey}
                controls 
                preload="metadata"
                className="w-full"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-red-600 text-sm';
                  errorMsg.textContent = '❌ Impossible de charger l\'audio';
                  e.target.parentElement.appendChild(errorMsg);
                }}
              >
                <source src={url} />
                Votre navigateur ne supporte pas l'audio.
              </audio>
            </div>
          );
        
        default:
          return null;
      }
    };
  }, [showPreview]);

  // Obtenir les catégories uniques
  const categories = [...new Set(localQuestions.map(q => q.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">Banque de Questions</h2>
          
          <div className="flex gap-2 items-center">
            {/* Sélecteur de délimiteur CSV */}
            <select
              value={csvDelimiter}
              onChange={(e) => setCsvDelimiter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              title="Délimiteur CSV"
            >
              <option value=",">Délimiteur: , (virgule)</option>
              <option value=";">Délimiteur: ; (point-virgule)</option>
            </select>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
              title="Télécharger un fichier template CSV avec exemples"
            >
              <Download className="w-4 h-4" />
              Template CSV
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition"
              title="Importer des questions depuis un fichier CSV"
            >
              <Upload className="w-4 h-4" />
              Importer CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition"
              title="Exporter toutes les questions en CSV"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                showPreview 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showPreview ? 'Masquer' : 'Afficher'} aperçu
            </button>
          </div>
        </div>

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

            {/* ✅ NOUVEAU: Afficher sélection média pour TOUS les types sauf 'text' */}
            {formData.type !== 'text' && (
              <>
                {/* ✅ Pour QCM, permettre de choisir le type de média */}
                {formData.type === 'qcm' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Type de média (optionnel)
                    </label>
                    <select
                      value={formData.mediaType || 'none'}
                      onChange={(e) => {
                        const newMediaType = e.target.value === 'none' ? '' : e.target.value;
                        setFormData({ 
                          ...formData, 
                          mediaType: newMediaType,
                          media: newMediaType ? formData.media : '' 
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="none">Aucun média</option>
                      <option value="image">Image</option>
                      <option value="video">Vidéo</option>
                      <option value="audio">Audio</option>
                    </select>
                  </div>
                )}
                
                {/* ✅ Pour questions non-QCM, garder l'ancien comportement */}
                {formData.type !== 'qcm' && (
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="image">Question avec Image</option>
                    <option value="video">Question avec Vidéo</option>
                    <option value="audio">Question avec Audio</option>
                  </select>
                )}
                
                {/* ✅ Afficher input URL si un média est sélectionné */}
                {((formData.type === 'qcm' && formData.mediaType) || formData.type !== 'qcm') && (
                  <>
                    <input
                      type="text"
                      placeholder="URL du média (image, vidéo ou audio)"
                      value={formData.media}
                      onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    
                    <MediaPreview 
                      type={formData.type === 'qcm' ? formData.mediaType : formData.type} 
                      url={formData.media} 
                      id={editingQuestion?.id || 'new'} 
                    />
                  </>
                )}
              </>
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

        {/* Filtres et recherche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Tous les types</option>
            <option value="text">Texte</option>
            <option value="qcm">QCM</option>
            <option value="image">Image</option>
            <option value="video">Vidéo</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        {/* Liste des questions avec pagination */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredQuestions.length} question(s) trouvée(s) - Page {currentPage}/{totalPages}
          </p>
          
          {paginatedQuestions.map(question => (
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
                  
                  {question.media && showPreview && (
                    <MediaPreview type={question.type} url={question.media} id={question.id} />
                  )}
                  
                  {question.type === 'qcm' ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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

        {/* Pagination */}
        {renderPagination()}
      </div>
    </div>
  );
};

export default QuestionBank;