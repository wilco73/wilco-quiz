import React, { useState, useMemo, useRef } from 'react';
import QuestionEditor from './QuestionEditor';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music, ListChecks, Eye, EyeOff, Upload, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from './ToastProvider';

const QuestionBank = ({ questions, onSave }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const fileInputRef = useRef(null);
  const questionsPerPage = 10;
  const toast = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

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
      'ID',
      'Type',
      'Catégorie',
      'Tags',
      'Question',
      'Réponse',
      'Média (URL)',
      'Type Média',
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
      const tagsStr = (q.tags || []).join('|');
      return [
        q.id || '',
        q.type || 'text',
        q.category || '',
        tagsStr,
        `"${(q.text || '').replace(/"/g, '""')}"`,
        `"${(q.answer || '').replace(/"/g, '""')}"`,
        q.media || '',
        q.mediaType || '',
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

  // ✅ IMPORT CSV avec merge intelligent + batch hybride
  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
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

        // ========== ÉTAPE 1 : PARSER TOUTES LES QUESTIONS ==========
        dataLines.forEach((line, index) => {
          try {
            const values = parseCSVLine(line, detectedDelimiter);

            if (values.length < 7) {
              errors.push(`Ligne ${index + 2}: Nombre de colonnes insuffisant`);
              return;
            }

            const [
              id, type, category, tagsStr, text, answer, media, mediaType,
              points, timer,
              choice1, choice2, choice3, choice4, choice5, choice6,
              correctChoiceIndex
            ] = values;

            if (!text || !text.trim()) {
              errors.push(`Ligne ${index + 2}: Question vide`);
              return;
            }

            // Parser les tags (séparés par |)
            const tags = tagsStr ? tagsStr.split('|').map(t => t.trim()).filter(Boolean) : [];

            const question = {
              id: id && id.trim() ? id.trim() : `import-${Date.now()}-${index}`,
              type: type || 'text',
              category: category || '',
              tags: tags,
              text: text.trim(),
              answer: answer ?.trim() || '',
              media: media || '',
              mediaType: mediaType || '',
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

        // Afficher les erreurs de parsing s'il y en a
        if (errors.length > 0) {
          console.error('Erreurs d\'import:', errors);
          toast.warning(`Import terminé avec ${errors.length} erreur(s)`);
        }

        if (importedQuestions.length === 0) {
          toast.warning('Aucune question valide trouvée dans le fichier');
          return;
        }

        // ========== ÉTAPE 2 : CHOISIR LE MODE D'IMPORT ==========
        const confirmMessage =
          `Importer ${importedQuestions.length} question(s) ?\n\n` +
          `Choisissez le mode d'import :\n\n` +
          `1. FUSIONNER (recommandé)\n` +
          `   → Met à jour les questions existantes (même ID)\n` +
          `   → Ajoute les nouvelles questions\n` +
          `   → Conserve les autres questions\n\n` +
          `2. AJOUTER\n` +
          `   → Ajoute uniquement les nouvelles\n` +
          `   → Ignore les doublons (même ID)\n\n` +
          `3. REMPLACER\n` +
          `   → Supprime TOUT et importe uniquement le CSV\n\n` +
          `Cliquez :\n` +
          `- OK pour FUSIONNER\n` +
          `- Annuler pour choisir`;

        const primaryChoice = window.confirm(confirmMessage);

        let mode;
        if (primaryChoice) {
          // Choix 1 : FUSIONNER
          mode = 'update';
        } else {
          // Demander entre AJOUTER ou REMPLACER
          const secondChoice = window.confirm(
            'Choisissez :\n\n' +
            '- OK pour AJOUTER (ignore doublons)\n' +
            '- Annuler pour REMPLACER (supprime tout)'
          );
          mode = secondChoice ? 'add' : 'replace';
        }

        // ========== ÉTAPE 3 : DÉCIDER BATCH OU PAS ==========
        const BATCH_SIZE = 200; // Seuil pour batch
        const needsBatch = importedQuestions.length > BATCH_SIZE;

        try {
          if (needsBatch) {
            // ========== GROS CSV : IMPORT PAR BATCH ==========
            console.log(`📦 Import par batch: ${importedQuestions.length} questions`);

            // Désactiver le bouton d'import pendant le traitement
            const importButton = document.querySelector('input[type="file"][accept=".csv"]');
            if (importButton) importButton.disabled = true;

            // Découper en batches
            const batches = [];
            for (let i = 0; i < importedQuestions.length; i += BATCH_SIZE) {
              batches.push(importedQuestions.slice(i, i + BATCH_SIZE));
            }

            let totalAdded = 0;
            let totalUpdated = 0;

            // Envoyer chaque batch
            for (let i = 0; i < batches.length; i++) {
              const batch = batches[i];
              const isFirstBatch = i === 0;

              toast.info(`📦 Import batch ${i + 1}/${batches.length} (${batch.length} questions)...`);

              const response = await fetch(
                `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/questions/merge`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    questions: batch,
                    // Premier batch : mode choisi, batches suivants : toujours 'add'
                    mode: isFirstBatch ? mode : 'add'
                  })
                }
              );

              if (!response.ok) {
                throw new Error(`Erreur batch ${i + 1}: ${response.statusText}`);
              }

              const result = await response.json();
              totalAdded += result.stats.added || 0;
              totalUpdated += result.stats.updated || 0;
            }

            // Message de succès détaillé
            let successMessage;
            if (mode === 'update') {
              successMessage =
                `✅ Import terminé !\n\n` +
                `• ${totalAdded} ajoutée(s)\n` +
                `• ${totalUpdated} mise(s) à jour\n` +
                `• Total : ${totalAdded + totalUpdated} questions importées`;
            } else if (mode === 'add') {
              successMessage =
                `✅ ${totalAdded} question(s) ajoutée(s)\n` +
                `• ${importedQuestions.length - totalAdded} ignorée(s) (doublons)`;
            } else {
              successMessage =
                `✅ ${importedQuestions.length} question(s) importée(s)\n` +
                `• Anciennes questions supprimées`;
            }

            toast.success(successMessage);

            // Rafraîchir pour obtenir les données du serveur
            setTimeout(() => {
              window.location.reload();
            }, 1500);

            // Réactiver le bouton
            if (importButton) importButton.disabled = false;

          } else {
            // ========== PETIT CSV : IMPORT DIRECT ==========
            console.log(`⚡ Import direct: ${importedQuestions.length} questions`);

            const response = await fetch(
              `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/questions/merge`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questions: importedQuestions,
                  mode: mode
                })
              }
            );

            if (!response.ok) {
              throw new Error(`Erreur lors de l'import: ${response.statusText}`);
            }

            const result = await response.json();

            // Message de succès détaillé
            let successMessage;
            if (mode === 'update') {
              successMessage =
                `✅ Import terminé !\n\n` +
                `• ${result.stats.added} ajoutée(s)\n` +
                `• ${result.stats.updated} mise(s) à jour\n` +
                `• Total : ${result.stats.total} questions`;
            } else if (mode === 'add') {
              successMessage =
                `✅ ${result.stats.added} question(s) ajoutée(s)\n` +
                `• ${importedQuestions.length - result.stats.added} ignorée(s) (doublons)\n` +
                `• Total : ${result.stats.total} questions`;
            } else {
              successMessage =
                `✅ ${importedQuestions.length} question(s) importée(s)\n` +
                `• Anciennes questions supprimées\n` +
                `• Total : ${result.stats.total} questions`;
            }

            toast.success(successMessage);

            // Rafraîchir pour obtenir les données du serveur
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }

        } catch (error) {
          console.error('Erreur import CSV:', error);
          toast.error(`Erreur lors de l'import: ${error.message}`);

          // Réactiver le bouton en cas d'erreur
          const importButton = document.querySelector('input[type="file"][accept=".csv"]');
          if (importButton) importButton.disabled = false;
        }

      } catch (error) {
        console.error('Erreur import CSV:', error);
        toast.error('Erreur lors de l\'import du fichier CSV');
      }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = ''; // Reset input pour permettre de réimporter le même fichier
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
      'ID',
      'Type',
      'Catégorie',
      'Question',
      'Réponse',
      'Média (URL)',
      'Type Média',
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
        '',
        'text',
        'Géographie',
        '"Quelle est la capitale de la France ?"',
        '"Paris"',
        '',
        '',
        '1',
        '30',
        '', '', '', '', '', '',
        ''
      ].join(delimiter),
      [
        '',
        'qcm',
        'Histoire',
        '"En quelle année a eu lieu la Révolution française ?"',
        '"1789"',
        '',
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
        '',
        'image',
        'Art',
        '"Qui a peint ce tableau ?"',
        '"Leonardo da Vinci"',
        '"https://example.com/mona-lisa.jpg"',
        '',
        '1',
        '0',
        '', '', '', '', '', '',
        ''
      ].join(delimiter),
      [
        '',
        'audio',
        'Musique',
        '"Qui interprète cette chanson ?"',
        '"The Beatles"',
        '"https://example.com/song.mp3"',
        '',
        '1',
        '15',
        '', '', '', '', '', '',
        ''
      ].join(delimiter),
      // ✅ NOUVEL EXEMPLE : QCM avec média audio
      [
        '',
        'qcm',
        'Musique',
        '"Quel est cet instrument ?"',
        '"Violon"',
        '"https://example.com/violon.mp3"',
        'audio',         // ✅ Type Média pour QCM !
        '2',
        '30',
        '"Violon"',
        '"Piano"',
        '"Guitare"',
        '"Batterie"',
        '', '',
        '0'
      ].join(delimiter),

      // ✅ NOUVEL EXEMPLE : QCM avec média image
      [
        '',
        'qcm',
        'Géographie',
        '"Quelle est cette ville ?"',
        '"Paris"',
        '"https://example.com/tour-eiffel.jpg"',
        'image',         // ✅ Type Média pour QCM !
        '1',
        '20',
        '"Paris"',
        '"Londres"',
        '"Rome"',
        '"Berlin"',
        '', '',
        '0'
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
      if (!formData.choices[formData.correctChoice] ?.trim()) {
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

    try {
      if (editingQuestion) {
        // ✅ Mettre à jour UNE question existante
        const updatedQuestion = { ...formData, id: editingQuestion.id };

        const response = await fetch(
          `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/questions/${editingQuestion.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedQuestion)
          }
        );

        if (!response.ok) throw new Error('Erreur lors de la mise à jour');

        const result = await response.json();

        // Mettre à jour le state local
        const updatedQuestions = localQuestions.map(q =>
          q.id === editingQuestion.id ? result.question : q
        );
        setLocalQuestions(updatedQuestions);
        toast.success('Question mise à jour !');

      } else {
        // ✅ Ajouter UNE nouvelle question
        const newQuestion = {
          ...formData,
          id: `q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        const response = await fetch(
          `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/questions/add`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newQuestion)
          }
        );

        if (!response.ok) throw new Error('Erreur lors de l\'ajout');

        const result = await response.json();

        // Mettre à jour le state local
        setLocalQuestions([...localQuestions, result.question]);
        toast.success('Question ajoutée !');
      }

      resetForm();

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error(`Erreur : ${error.message}`);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette question ?')) return;

    try {
      const response = await fetch(
        `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/questions/${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      const result = await response.json();

      // Mettre à jour le state local
      const updatedQuestions = localQuestions.filter(q => q.id !== id);
      setLocalQuestions(updatedQuestions);

      toast.success(`Question supprimée ! (${result.total} restantes)`);

    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error(`Erreur : ${error.message}`);
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

  const handleNewQuestion = () => {
    setEditingQuestion(null);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingQuestion(null);
  };

  const handleEditorSave = (savedQuestion, action) => {
    if (action === 'update') {
      setLocalQuestions(localQuestions.map(q => 
        q.id === savedQuestion.id ? savedQuestion : q
      ));
    } else {
      setLocalQuestions([...localQuestions, savedQuestion]);
    }
  };

  // ✅ FILTRAGE avec catégorie, type et tags
  const filteredQuestions = localQuestions.filter(q => {
    const qTags = q.tags || [];
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !filterCategory || q.category === filterCategory;
    const matchesType = !filterType || q.type === filterType;
    const matchesTag = !filterTag || qTags.includes(filterTag);
    return matchesSearch && matchesCategory && matchesType && matchesTag;
  });

  // ✅ PAGINATION
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + questionsPerPage);

  // Réinitialiser à la page 1 si on filtre
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterType, filterTag]);

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
    switch (type) {
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

      switch (type) {
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

                  // ✅ Vérifier si un message d'erreur existe déjà
                  const existingError = e.target.parentElement.querySelector('.media-error-message');
                  if (existingError) return; // Ne rien faire si déjà affiché

                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-red-600 text-sm media-error-message'; // ✅ Ajouter classe pour identification
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

                  // ✅ Vérifier si un message d'erreur existe déjà
                  const existingError = e.target.parentElement.querySelector('.media-error-message');
                  if (existingError) return;

                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-red-600 text-sm media-error-message';
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

                  // ✅ Vérifier si un message d'erreur existe déjà
                  const existingError = e.target.parentElement.querySelector('.media-error-message');
                  if (existingError) return;

                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-red-600 text-sm media-error-message';
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
  
  // Obtenir les tags uniques
  const allTags = [...new Set(localQuestions.flatMap(q => q.tags || []).filter(Boolean))].sort();

  return (
    <div className="space-y-6">

      <QuestionEditor
        question={editingQuestion}
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
        categories={categories}
        allTags={allTags}
      />
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
              onClick={() => fileInputRef.current ?.click()}
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
              onClick={handleNewQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Question
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

      {/* Filtres et recherche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Tous les tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
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
                  {question.tags && question.tags.length > 0 && question.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded">
                      #{tag}
                    </span>
                  ))}
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
                  <MediaPreview
                    type={question.type === 'qcm' ? (question.mediaType || '') : question.type}
                    url={question.media}
                    id={question.id}
                  />
                )}

                {question.type === 'qcm' ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <p className="font-semibold">Choix :</p>
                    <ul className="ml-4">
                      {question.choices ?.map((choice, idx) => (
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