import React, { useState, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, Image, Video, Music, ListChecks, Eye, EyeOff, Upload, Download } from 'lucide-react';

const QuestionBank = ({ questions, onSave }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const fileInputRef = useRef(null);

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
  };

  // ✅ AMÉLIORÉ: Exporter en CSV avec point-virgule pour Excel européen
  const handleExportCSV = () => {
    if (localQuestions.length === 0) {
      alert('Aucune question à exporter');
      return;
    }

    // En-têtes CSV
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

    // Convertir les questions en lignes CSV
    const rows = localQuestions.map(q => {
      const choices = q.type === 'qcm' ? (q.choices || []) : [];
      return [
        q.type || 'text',
        q.category || '',
        `"${(q.text || '').replace(/"/g, '""')}"`, // Échapper les guillemets
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
      ].join(';'); // ✅ Point-virgule au lieu de virgule
    });

    // Créer le contenu CSV
    const csvContent = [headers.join(';'), ...rows].join('\n'); // ✅ Point-virgule
    
    // Créer un Blob et télécharger
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM pour Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `questions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✅ ${localQuestions.length} question(s) exportée(s) avec succès !\n\n📝 Format : Point-virgule (;) - Compatible Excel Europe`);
  };

  // ✅ AMÉLIORÉ: Détecter automatiquement le délimiteur (virgule ou point-virgule)
  const detectDelimiter = (text) => {
    const firstLine = text.split('\n')[0];
    
    // Compter les virgules et points-virgules hors guillemets
    let commas = 0;
    let semicolons = 0;
    let inQuotes = false;
    
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === ',') commas++;
        if (char === ';') semicolons++;
      }
    }
    
    // Retourner le délimiteur le plus fréquent
    return semicolons > commas ? ';' : ',';
  };

  // ✅ AMÉLIORÉ: Importer depuis CSV avec détection automatique du délimiteur
  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('Le fichier CSV est vide ou invalide');
          return;
        }

        // ✅ NOUVEAU: Détecter automatiquement le délimiteur
        const delimiter = detectDelimiter(text);
        console.log(`📊 Délimiteur détecté: "${delimiter}" (${delimiter === ';' ? 'Point-virgule' : 'Virgule'})`);

        // Ignorer la ligne d'en-tête
        const dataLines = lines.slice(1);
        
        const importedQuestions = [];
        let errors = [];

        dataLines.forEach((line, index) => {
          try {
            // Parser le CSV avec le délimiteur détecté
            const values = parseCSVLine(line, delimiter);
            
            if (values.length < 7) {
              errors.push(`Ligne ${index + 2}: Nombre de colonnes insuffisant (${values.length}/14)`);
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

            // Validation
            if (!text || !text.trim()) {
              errors.push(`Ligne ${index + 2}: Question vide`);
              return;
            }

            // Créer la question
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

            // Si c'est un QCM, ajouter les choix
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
              
              // Pour les QCM, la réponse est le texte du choix correct
              question.answer = choices[question.correctChoice];
            }

            importedQuestions.push(question);
          } catch (err) {
            errors.push(`Ligne ${index + 2}: ${err.message}`);
          }
        });

        if (errors.length > 0) {
          console.error('Erreurs d\'import:', errors);
          const errorMessage = errors.length > 5 
            ? `${errors.slice(0, 5).join('\n')}\n... et ${errors.length - 5} autre(s) erreur(s)`
            : errors.join('\n');
          
          alert(`⚠️ Import terminé avec ${errors.length} erreur(s):\n\n${errorMessage}`);
        }

        if (importedQuestions.length > 0) {
          const confirmMessage = `Voulez-vous importer ${importedQuestions.length} question(s) ?\n\n` +
            `📊 Délimiteur détecté : ${delimiter === ';' ? 'Point-virgule (;)' : 'Virgule (,)'}\n\n` +
            `Mode d'import :\n` +
            `• OK = AJOUTER aux questions existantes\n` +
            `• Annuler = REMPLACER toutes les questions\n\n` +
            `Questions actuelles : ${localQuestions.length}`;

          const shouldAdd = window.confirm(confirmMessage);
          
          let finalQuestions;
          if (shouldAdd) {
            // Ajouter aux questions existantes
            finalQuestions = [...localQuestions, ...importedQuestions];
            alert(`✅ ${importedQuestions.length} question(s) ajoutée(s) !\n\nTotal : ${finalQuestions.length} questions`);
          } else {
            // Remplacer toutes les questions
            finalQuestions = importedQuestions;
            alert(`✅ ${importedQuestions.length} question(s) importée(s) !\n\n⚠️ ${localQuestions.length} ancienne(s) question(s) supprimée(s)`);
          }

          setLocalQuestions(finalQuestions);
          onSave(finalQuestions);
        } else {
          alert('❌ Aucune question valide trouvée dans le fichier');
        }

      } catch (error) {
        console.error('Erreur import CSV:', error);
        alert('❌ Erreur lors de l\'import du fichier CSV:\n' + error.message);
      }
    };

    reader.readAsText(file, 'UTF-8');
    // Réinitialiser l'input pour permettre de réimporter le même fichier
    event.target.value = '';
  };

  // ✅ AMÉLIORÉ: Parser une ligne CSV avec délimiteur configurable
  const parseCSVLine = (line, delimiter = ';') => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Double guillemet = guillemet échappé
          current += '"';
          i++; // Sauter le prochain guillemet
        } else {
          // Début ou fin de zone quotée
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // Délimiteur hors guillemets = séparateur
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Ajouter le dernier champ
    result.push(current);

    return result;
  };

  // ✅ AMÉLIORÉ: Télécharger le template CSV avec point-virgule
  const handleDownloadTemplate = () => {
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
      // Exemple question texte
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
      ].join(';'), // ✅ Point-virgule
      // Exemple QCM
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
      ].join(';'),
      // Exemple avec image
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
      ].join(';'),
      // Exemple avec audio
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
      ].join(';'),
      // Exemple avec vidéo
      [
        'video',
        'Cinéma',
        '"De quel film est extraite cette scène ?"',
        '"Star Wars"',
        '"https://example.com/scene.mp4"',
        '2',
        '0',
        '', '', '', '', '', '',
        ''
      ].join(';')
    ];

    const csvContent = [headers.join(';'), ...examples].join('\n'); // ✅ Point-virgule
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_questions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('✅ Template téléchargé !\n\n📝 Format : Point-virgule (;)\n💡 S\'ouvre directement dans Excel');
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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">Banque de Questions</h2>
          
          <div className="flex gap-2">
            {/* ✅ NOUVEAU: Boutons Import/Export */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
              title="Télécharger un fichier template CSV avec exemples (Point-virgule)"
            >
              <Download className="w-4 h-4" />
              Template CSV
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition"
              title="Importer des questions depuis un fichier CSV (détection auto ; ou ,)"
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
              title="Exporter toutes les questions en CSV (Point-virgule pour Excel)"
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

            {formData.type !== 'text' && formData.type !== 'qcm' && (
              <>
                <input
                  type="text"
                  placeholder="URL du média"
                  value={formData.media}
                  onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                
                <MediaPreview type={formData.type} url={formData.media} id={editingQuestion?.id || 'new'} />
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
      </div>
    </div>
  );
};

export default QuestionBank;