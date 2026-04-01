import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music, ListChecks, Eye, EyeOff, Upload, Download, ZoomIn } from 'lucide-react';
import { useToast } from './ToastProvider';
import QuestionEditor from './QuestionEditor';
import ImportModal from './ImportModal';
import Pagination from './Pagination';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const QuestionBank = ({ questions, onSave }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(25);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [zoomedImage, setZoomedImage] = useState(null); // Zoom image
  const fileInputRef = useRef(null);
  const toast = useToast();
  
  // État pour la modale d'import CSV
  const [importModal, setImportModal] = useState({
    isOpen: false,
    questions: [],
    isImporting: false,
    progress: 0
  });

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
      'Silhouette',
      'Rotation',
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
      
      // Pour les QCM, calculer l'index de la bonne réponse à partir de answer et choices
      let correctChoiceIndex = '';
      if (q.type === 'qcm' && choices.length > 0 && q.answer) {
        const idx = choices.findIndex(c => c === q.answer);
        correctChoiceIndex = idx >= 0 ? idx : 0;
      }
      
      return [
        q.id || '',
        q.type || 'text',
        q.category || '',
        tagsStr,
        `"${(q.text || '').replace(/"/g, '""')}"`,
        `"${(q.answer || '').replace(/"/g, '""')}"`,
        q.media || '',
        q.mediaType || '',
        q.silhouetteMode ? 'oui' : '',
        q.silhouetteRotation ? 'oui' : '',
        q.points || 1,
        q.timer || 0,
        choices[0] ? `"${choices[0].replace(/"/g, '""')}"` : '',
        choices[1] ? `"${choices[1].replace(/"/g, '""')}"` : '',
        choices[2] ? `"${choices[2].replace(/"/g, '""')}"` : '',
        choices[3] ? `"${choices[3].replace(/"/g, '""')}"` : '',
        choices[4] ? `"${choices[4].replace(/"/g, '""')}"` : '',
        choices[5] ? `"${choices[5].replace(/"/g, '""')}"` : '',
        correctChoiceIndex
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

        // Parser les headers pour déterminer l'ordre des colonnes
        const headers = parseCSVLine(firstLine, detectedDelimiter).map(h => h.toLowerCase().trim());
        console.log('Headers détectés:', headers);

        // Mapper les colonnes par nom (insensible à la casse)
        const getColumnIndex = (possibleNames) => {
          for (const name of possibleNames) {
            const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const colMap = {
          id: getColumnIndex(['id']),
          type: getColumnIndex(['type']),
          category: getColumnIndex(['catégorie', 'categorie', 'category']),
          tags: getColumnIndex(['tags', 'tag']),
          text: getColumnIndex(['question', 'text', 'texte']),
          answer: getColumnIndex(['réponse', 'reponse', 'answer']),
          media: getColumnIndex(['média', 'media', 'url']),
          mediaType: getColumnIndex(['type média', 'type media', 'mediatype']),
          silhouette: getColumnIndex(['silhouette', 'silhouette mode', 'mode silhouette']),
          rotation: getColumnIndex(['rotation', 'silhouette rotation', 'rotation aléatoire']),
          points: getColumnIndex(['points', 'point']),
          timer: getColumnIndex(['timer', 'temps', 'secondes']),
          choice1: getColumnIndex(['choix 1', 'choice 1', 'choix1']),
          choice2: getColumnIndex(['choix 2', 'choice 2', 'choix2']),
          choice3: getColumnIndex(['choix 3', 'choice 3', 'choix3']),
          choice4: getColumnIndex(['choix 4', 'choice 4', 'choix4']),
          choice5: getColumnIndex(['choix 5', 'choice 5', 'choix5']),
          choice6: getColumnIndex(['choix 6', 'choice 6', 'choix6']),
          correctChoice: getColumnIndex(['index réponse', 'index reponse', 'correct', 'correctchoice'])
        };

        console.log('Mapping colonnes:', colMap);

        // Vérifier que les colonnes essentielles sont présentes
        if (colMap.text === -1) {
          toast.error('Colonne "Question" introuvable dans le fichier');
          return;
        }

        const dataLines = lines.slice(1);
        const importedQuestions = [];
        let errors = [];

        // Parser toutes les questions
        dataLines.forEach((line, index) => {
          try {
            const values = parseCSVLine(line, detectedDelimiter);

            // Extraire les valeurs selon le mapping
            const getValue = (key) => {
              const idx = colMap[key];
              return idx !== -1 && values[idx] ? values[idx].trim() : '';
            };

            const text = getValue('text');
            if (!text) {
              errors.push(`Ligne ${index + 2}: Question vide`);
              return;
            }

            const tagsStr = getValue('tags');
            const tags = tagsStr ? tagsStr.split('|').map(t => t.trim()).filter(Boolean) : [];

            // Parser le mode silhouette (oui, yes, true, 1 = activé)
            const silhouetteValue = getValue('silhouette').toLowerCase();
            const silhouetteMode = ['oui', 'yes', 'true', '1', 'vrai'].includes(silhouetteValue);

            // Parser le mode rotation (oui, yes, true, 1 = activé)
            const rotationValue = getValue('rotation').toLowerCase();
            const silhouetteRotation = ['oui', 'yes', 'true', '1', 'vrai'].includes(rotationValue);

            const question = {
              id: getValue('id') || `import-${Date.now()}-${index}`,
              type: getValue('type') || 'text',
              category: getValue('category') || '',
              tags: tags,
              text: text,
              answer: getValue('answer') || '',
              media: getValue('media') || '',
              mediaType: getValue('mediaType') || '',
              silhouetteMode: silhouetteMode,
              silhouetteRotation: silhouetteRotation,
              points: parseInt(getValue('points')) || 1,
              timer: parseInt(getValue('timer')) || 0
            };

            if (question.type === 'qcm') {
              const choices = [
                getValue('choice1'),
                getValue('choice2'),
                getValue('choice3'),
                getValue('choice4'),
                getValue('choice5'),
                getValue('choice6')
              ].filter(c => c && c.trim()).map(c => c.trim());

              if (choices.length < 2) {
                errors.push(`Ligne ${index + 2}: QCM doit avoir au moins 2 choix`);
                return;
              }

              question.choices = choices;
              question.correctChoice = parseInt(getValue('correctChoice')) || 0;

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
          toast.warning(`Parsing terminé avec ${errors.length} erreur(s)`);
        }

        if (importedQuestions.length === 0) {
          toast.warning('Aucune question valide trouvée dans le fichier');
          return;
        }

        // Ouvrir la modale pour choisir le mode d'import
        setImportModal({
          isOpen: true,
          questions: importedQuestions,
          isImporting: false,
          progress: 0
        });

        // Reset le champ file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } catch (error) {
        console.error('Erreur parsing CSV:', error);
        toast.error('Erreur lors de la lecture du fichier CSV');
      }
    };

    reader.readAsText(file);
  };

  // ✅ Exécuter l'import avec le mode choisi
  const executeImport = async (mode) => {
    const importedQuestions = importModal.questions;
    
    setImportModal(prev => ({ ...prev, isImporting: true, progress: 0 }));

    const BATCH_SIZE = 200;
    const needsBatch = importedQuestions.length > BATCH_SIZE;

    try {
      if (needsBatch) {
        // Import par batch
        console.log(`📦 Import par batch: ${importedQuestions.length} questions`);

        const batches = [];
        for (let i = 0; i < importedQuestions.length; i += BATCH_SIZE) {
          batches.push(importedQuestions.slice(i, i + BATCH_SIZE));
        }

        let totalAdded = 0;
        let totalUpdated = 0;

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const isFirstBatch = i === 0;
          
          setImportModal(prev => ({ 
            ...prev, 
            progress: Math.round((i / batches.length) * 100) 
          }));

          // Pour le mode 'replace', seul le premier batch efface tout
          // Pour les modes 'update' et 'add', tous les batches utilisent le même mode
          let batchMode = mode;
          if (mode === 'replace' && !isFirstBatch) {
            batchMode = 'add'; // Après le premier batch qui a tout effacé, on ajoute
          }

          const response = await fetch(`${API_URL}/questions/merge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questions: batch,
              mode: batchMode
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erreur batch ${i + 1}: ${response.statusText}`);
          }

          const result = await response.json();
          totalAdded += result.stats?.added || 0;
          totalUpdated += result.stats?.updated || 0;
        }

        setImportModal(prev => ({ ...prev, progress: 100 }));

        // Message de succès
        if (mode === 'update') {
          toast.success(`✅ Import terminé ! ${totalAdded} ajoutée(s), ${totalUpdated} mise(s) à jour`);
        } else if (mode === 'add') {
          toast.success(`✅ ${totalAdded} question(s) ajoutée(s)`);
        } else {
          toast.success(`✅ ${importedQuestions.length} question(s) importée(s) (remplacement)`);
        }

      } else {
        // Import direct
        console.log(`⚡ Import direct: ${importedQuestions.length} questions`);

        const response = await fetch(`${API_URL}/questions/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: importedQuestions,
            mode: mode
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erreur: ${response.statusText}`);
        }

        const result = await response.json();
        setImportModal(prev => ({ ...prev, progress: 100 }));

        if (mode === 'update') {
          toast.success(`✅ Import terminé ! ${result.stats?.added || 0} ajoutée(s), ${result.stats?.updated || 0} mise(s) à jour`);
        } else if (mode === 'add') {
          toast.success(`✅ ${result.stats?.added || 0} question(s) ajoutée(s)`);
        } else {
          toast.success(`✅ ${importedQuestions.length} question(s) importée(s) (remplacement)`);
        }
      }

      // Fermer la modale et rafraîchir les données localement
      setImportModal({ isOpen: false, questions: [], isImporting: false, progress: 0 });
      
      // Récupérer les questions mises à jour depuis le serveur
      try {
        const response = await fetch(`${API_URL}/questions`);
        if (response.ok) {
          const updatedQuestions = await response.json();
          setLocalQuestions(updatedQuestions);
          console.log(`[IMPORT] Questions rafraîchies: ${updatedQuestions.length}`);
        }
      } catch (err) {
        console.error('Erreur rafraîchissement questions:', err);
      }

    } catch (error) {
      console.error('Erreur import CSV:', error);
      toast.error(`Erreur: ${error.message}`);
      setImportModal(prev => ({ ...prev, isImporting: false }));
    }
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

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setIsEditorOpen(true);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette question ?')) return;

    try {
      const response = await fetch(
        `${API_URL}/questions/${id}`,
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
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterType, filterTag]);

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
                <span className="text-purple-500 ml-auto flex items-center gap-1">
                  <ZoomIn className="w-3 h-3" /> Cliquer pour agrandir
                </span>
              </p>
              <img
                key={mediaKey}
                src={url}
                alt="Preview"
                className="max-w-full max-h-64 rounded border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-80 transition"
                onClick={() => setZoomedImage(url)}
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
      {/* Panneau d'édition latéral */}
      <QuestionEditor
        question={editingQuestion}
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
        categories={categories}
        allTags={allTags}
      />

      {/* Modale d'import CSV */}
      <ImportModal
        isOpen={importModal.isOpen}
        onClose={() => setImportModal({ isOpen: false, questions: [], isImporting: false, progress: 0 })}
        onImport={executeImport}
        itemCount={importModal.questions.length}
        itemType="question"
        isImporting={importModal.isImporting}
        progress={importModal.progress}
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">Banque de Questions</h2>

          <div className="flex gap-2 items-center">
            {/* Bouton Nouvelle Question */}
            <button
              onClick={handleNewQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Question
            </button>

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
        {/* Pagination en haut */}
        {filteredQuestions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredQuestions.length}
            itemsPerPage={questionsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setQuestionsPerPage}
          />
        )}

        {paginatedQuestions.map(question => (
          <div key={question.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition bg-white dark:bg-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                  {question.silhouetteMode && (
                    <span className="px-2 py-1 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded flex items-center gap-1">
                      🎭 Silhouette
                      {question.silhouetteRotation && <span className="text-orange-400">🔄</span>}
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
                    <p className="font-semibold mb-1">Choix :</p>
                    <ul className="ml-4 space-y-1">
                      {question.choices?.map((choice, idx) => {
                        // La bonne réponse est celle qui correspond au champ answer
                        const isCorrect = choice === question.answer;
                        return (
                          <li 
                            key={idx} 
                            className={`flex items-center gap-2 ${
                              isCorrect 
                                ? 'text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded -ml-2' 
                                : ''
                            }`}
                          >
                            {isCorrect ? (
                              <span className="text-green-500">✓</span>
                            ) : (
                              <span className="text-gray-400">○</span>
                            )}
                            {choice}
                            {isCorrect && (
                              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded ml-2">
                                Bonne réponse
                              </span>
                            )}
                          </li>
                        );
                      })}
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
        
        {/* Pagination en bas */}
        {filteredQuestions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredQuestions.length}
            itemsPerPage={questionsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setQuestionsPerPage}
          />
        )}
      </div>
      </div>
      
      {/* Modale de zoom image */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={zoomedImage}
              alt="Zoom"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;