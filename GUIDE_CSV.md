# 📊 Guide d'Import/Export CSV - Banque de Questions

## 🎯 Vue d'ensemble

Le système permet d'**importer** et **exporter** vos questions au format CSV pour faciliter :
- ✅ La création massive de questions via Excel
- ✅ La sauvegarde de vos questions
- ✅ Le partage de banques de questions
- ✅ L'édition en masse dans un tableur

---

## 📥 **IMPORT CSV**

### Format du fichier

Votre fichier CSV doit contenir **17 colonnes** dans cet ordre :

| # | Colonne | Description | Requis | Exemple |
|---|---------|-------------|--------|---------|
| 1 | ID | Identifiant unique (auto-généré si vide) | ❌ Non | `q123456` |
| 2 | Type | Type de question | ✅ Oui | `text`, `qcm`, `image`, `video`, `audio` |
| 3 | Catégorie | Catégorie de la question | ❌ Non | `Géographie`, `Histoire`, `Sport` |
| 4 | Tags | Tags séparés par `\|` | ❌ Non | `facile\|culture\|france` |
| 5 | Question | Texte de la question | ✅ Oui | `Quelle est la capitale de la France ?` |
| 6 | Réponse | Réponse correcte | ✅ Oui | `Paris` |
| 7 | Média (URL) | URL du média (image/video/audio) | ❌ Non | `https://example.com/image.jpg` |
| 8 | Type Média | Type du média pour QCM | ❌ Non | `image`, `video`, `audio` |
| 9 | Points | Nombre de points | ✅ Oui | `1`, `2`, `5` |
| 10 | Timer (secondes) | Temps limite (0 = illimité) | ✅ Oui | `30`, `0` |
| 11 | Choix 1 | Premier choix (QCM uniquement) | ❌ Non | `Paris` |
| 12 | Choix 2 | Deuxième choix (QCM uniquement) | ❌ Non | `Londres` |
| 13 | Choix 3 | Troisième choix (QCM uniquement) | ❌ Non | `Berlin` |
| 14 | Choix 4 | Quatrième choix (QCM uniquement) | ❌ Non | `Madrid` |
| 15 | Choix 5 | Cinquième choix (optionnel) | ❌ Non | `Rome` |
| 16 | Choix 6 | Sixième choix (optionnel) | ❌ Non | `Lisbonne` |
| 17 | Index Réponse Correcte | Index du bon choix (QCM) | ❌ Non | `0` (= Choix 1) |

---

## 🏷️ **Système de Tags**

### Qu'est-ce que les tags ?

Les tags permettent de **classer et filtrer** vos questions de manière plus fine que les catégories :

- **Catégorie** = Classification principale (ex: `Histoire`)
- **Tags** = Attributs multiples (ex: `facile`, `XIXe siècle`, `France`)

### Format des tags dans le CSV

Les tags sont séparés par le caractère **pipe** `|` :

```csv
facile|culture|france
difficile|sport|mondial
blindtest|années80|rock
```

### Exemples d'utilisation

| Catégorie | Tags | Utilisation |
|-----------|------|-------------|
| Histoire | `facile\|France\|Révolution` | Question facile sur la Révolution française |
| Musique | `blindtest\|années80\|rock` | Blindtest rock des années 80 |
| Sport | `difficile\|football\|coupe du monde` | Question difficile sur le foot mondial |

---

## 📝 **Exemples par type de question**

### 1️⃣ Question Texte Simple avec Tags

```csv
ID,Type,Catégorie,Tags,Question,Réponse,Média (URL),Type Média,Points,Timer (secondes),Choix 1,Choix 2,Choix 3,Choix 4,Choix 5,Choix 6,Index Réponse Correcte
,text,Géographie,facile|europe|capitales,"Quelle est la capitale de la France ?","Paris",,,1,30,,,,,,,
```

### 2️⃣ Question QCM avec Tags

```csv
ID,Type,Catégorie,Tags,Question,Réponse,Média (URL),Type Média,Points,Timer (secondes),Choix 1,Choix 2,Choix 3,Choix 4,Choix 5,Choix 6,Index Réponse Correcte
,qcm,Histoire,moyen|révolution|dates,"En quelle année a eu lieu la Révolution française ?","1789",,,2,20,"1789","1792","1804","1815",,,0
```

**Notes QCM** :
- `Index Réponse Correcte` : `0` = Choix 1, `1` = Choix 2, `2` = Choix 3, etc.
- Minimum 2 choix requis
- La colonne `Réponse` sera automatiquement remplie avec le texte du bon choix

### 3️⃣ Question avec Image et Tags

```csv
ID,Type,Catégorie,Tags,Question,Réponse,Média (URL),Type Média,Points,Timer (secondes),Choix 1,Choix 2,Choix 3,Choix 4,Choix 5,Choix 6,Index Réponse Correcte
,image,Art,difficile|renaissance|peinture,"Qui a peint ce tableau ?","Leonardo da Vinci","https://example.com/mona-lisa.jpg",,1,0,,,,,,,
```

### 4️⃣ Question Audio (Blindtest) avec Tags

```csv
ID,Type,Catégorie,Tags,Question,Réponse,Média (URL),Type Média,Points,Timer (secondes),Choix 1,Choix 2,Choix 3,Choix 4,Choix 5,Choix 6,Index Réponse Correcte
,audio,Musique,blindtest|années60|rock,"Qui interprète cette chanson ?","The Beatles","https://example.com/song.mp3",,1,15,,,,,,,
```

### 5️⃣ Question Vidéo avec Tags

```csv
ID,Type,Catégorie,Tags,Question,Réponse,Média (URL),Type Média,Points,Timer (secondes),Choix 1,Choix 2,Choix 3,Choix 4,Choix 5,Choix 6,Index Réponse Correcte
,video,Cinéma,facile|sf|classique,"De quel film est extraite cette scène ?","Star Wars","https://example.com/scene.mp4",,2,0,,,,,,,
```

---

## ⚙️ **Utilisation dans Excel**

### Étape 1 : Télécharger le template
1. Cliquez sur **"Template CSV"** dans l'interface
2. Ouvrez le fichier avec Excel

### Étape 2 : Remplir vos questions
1. **Ne modifiez pas** la ligne d'en-tête
2. Remplissez une ligne par question
3. Pour les guillemets dans le texte, doublez-les : `"Il a dit ""Bonjour"""`
4. Laissez les cellules vides pour les colonnes optionnelles
5. **Tags** : séparez par `|` (ex: `facile|culture|france`)

### Étape 3 : Sauvegarder
1. **Fichier → Enregistrer sous**
2. Choisir **"CSV UTF-8 (délimité par des virgules)"**
3. Donner un nom explicite : `questions_histoire.csv`

### Étape 4 : Importer
1. Cliquez sur **"Importer CSV"** dans l'interface
2. Sélectionnez votre fichier
3. Choisissez le mode :
   - **FUSIONNER** = Met à jour les existantes + ajoute les nouvelles
   - **AJOUTER** = Ajoute uniquement les nouvelles (ignore doublons)
   - **REMPLACER** = Supprime tout et importe le CSV

---

## 📤 **EXPORT CSV**

### Pourquoi exporter ?

✅ **Sauvegarde** : Conservez vos questions hors de la base de données  
✅ **Édition** : Modifiez en masse dans Excel  
✅ **Partage** : Envoyez vos questions à d'autres organisateurs  
✅ **Archive** : Gardez des versions datées de vos banques  

### Comment exporter ?

1. Cliquez sur **"Exporter CSV"**
2. Le fichier se télécharge automatiquement : `questions_AAAA-MM-JJ.csv`
3. Ouvrez-le avec Excel pour l'éditer

**Note** : Les tags seront exportés au format `tag1|tag2|tag3`

---

## ⚠️ **Règles importantes**

### Guillemets dans le texte
Si votre question contient des guillemets, doublez-les :

❌ Incorrect : `"Il a dit "Bonjour""`  
✅ Correct : `"Il a dit ""Bonjour"""`

### Types valides
- `text` : Question texte simple
- `qcm` : Question à choix multiples
- `image` : Question avec image
- `video` : Question avec vidéo
- `audio` : Question avec audio (blindtest)

### Points et Timer
- Points : minimum 1
- Timer : `0` = pas de limite de temps

### QCM
- Minimum 2 choix
- Maximum 6 choix
- Index commence à 0 (0 = premier choix)

### Tags
- Séparés par `|` (pipe)
- Pas de limite de nombre
- Insensibles à la casse pour la recherche

---

## 🔧 **Dépannage**

### "Nombre de colonnes insuffisant"
➡️ Votre fichier n'a pas 17 colonnes. Vérifiez qu'il y a bien toutes les colonnes même si elles sont vides.

### "Question vide"
➡️ La colonne "Question" est vide sur cette ligne.

### "QCM doit avoir au moins 2 choix"
➡️ Pour un type `qcm`, remplissez au minimum les colonnes "Choix 1" et "Choix 2".

### Caractères bizarres (é, è, à)
➡️ Enregistrez le CSV en **UTF-8** dans Excel :
- Fichier → Enregistrer sous → CSV UTF-8 (délimité par des virgules)

### Import ne fonctionne pas
➡️ Vérifiez que :
1. La première ligne est bien l'en-tête
2. Il n'y a pas de lignes vides au milieu
3. Le séparateur est bien la virgule `,`

---

## 💡 **Astuces Pro**

### Créer rapidement 100 questions
1. Téléchargez le template
2. Dupliquez une ligne exemple
3. Modifiez en masse dans Excel
4. Importez !

### Organiser avec Catégories ET Tags
- **Catégorie** = Le thème principal (1 seul par question)
- **Tags** = Attributs supplémentaires (plusieurs possibles)

Exemple :
- Catégorie : `Histoire`
- Tags : `facile|France|XXe siècle|Guerre`

### Filtrer efficacement
1. Utilisez le filtre "Catégorie" pour le thème
2. Utilisez le filtre "Tag" pour affiner
3. Utilisez la recherche pour trouver un mot-clé

### Sauvegardes régulières
Exportez votre banque après chaque grosse session de création !

### Partage entre organisateurs
1. Exportez vos questions
2. Envoyez le CSV
3. L'autre importe avec "FUSIONNER" ou "AJOUTER"

---

## 📋 **Checklist avant import**

- [ ] La première ligne contient les 17 en-têtes
- [ ] Chaque question a : Type, Question, Réponse, Points, Timer
- [ ] Les QCM ont au moins 2 choix
- [ ] Les index de réponses correctes sont valides (0-5)
- [ ] Les URLs de médias sont complètes
- [ ] Les tags sont séparés par `|`
- [ ] Le fichier est en UTF-8
- [ ] Pas de lignes vides au milieu

---

**Besoin d'aide ?** Utilisez le bouton **"Template CSV"** pour voir des exemples concrets !
