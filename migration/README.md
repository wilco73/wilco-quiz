# 🔄 Migration Wilco Quiz - SQLite vers Supabase

Ce dossier contient tous les scripts nécessaires pour migrer Wilco Quiz de SQLite vers Supabase (PostgreSQL).

## 📋 Prérequis

1. Un compte Supabase avec un projet créé
2. Node.js 18+ installé
3. Le fichier `quiz.db` (base SQLite actuelle)
4. Un bucket Cloudflare R2 configuré (pour les médias)

## 🚀 Étapes de migration

### Étape 1 : Créer les tables dans Supabase

1. Connectez-vous à [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez le contenu de `01_schema.sql`
5. Exécutez le script

### Étape 2 : Préparer l'environnement

```bash
cd migration
npm install
```

Créez le fichier `.env` :
```bash
cp .env.example .env
```

Éditez `.env` avec vos clés :
```
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=eyJ...votre_clé_service_role
R2_PUBLIC_URL=https://votre-bucket.r2.dev
```

### Étape 3 : Copier la base SQLite

Copiez votre fichier `quiz.db` dans ce dossier :
```bash
cp ../server/quiz.db ./
```

### Étape 4 : Lancer la migration

```bash
npm run migrate
```

Le script va :
- Lire toutes les données de `quiz.db`
- Les insérer dans Supabase
- Afficher un rapport de progression

### Étape 5 : Mettre à jour les URLs des médias

**Prévisualisation** (sans modification) :
```bash
node update-media-urls.js --preview
```

**Appliquer les changements** :
```bash
node update-media-urls.js --confirm
```

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `01_schema.sql` | Schéma PostgreSQL pour Supabase |
| `migrate-to-supabase.js` | Script de migration des données |
| `update-media-urls.js` | Script de mise à jour des URLs |
| `package.json` | Dépendances npm |
| `.env.example` | Exemple de configuration |

## 🗂️ Structure des URLs médias

### Avant (local)
```
/resources/quiz/images/affiche001.png
/resources/quiz/musique/blindtest/series/bt_serie01.mp3
/resources/quiz/videos/bigard.mp4
```

### Après (Cloudflare R2)
```
https://votre-bucket.r2.dev/images/affiche001.png
https://votre-bucket.r2.dev/musique/blindtest/series/bt_serie01.mp3
https://votre-bucket.r2.dev/videos/bigard.mp4
```

## ⚠️ Important

1. **Sauvegardez** votre `quiz.db` avant de commencer
2. **Testez** d'abord dans un projet Supabase de test
3. Les **médias** doivent être uploadés sur R2 AVANT de mettre à jour les URLs

## 🐛 Résolution de problèmes

### "duplicate key"
Normal si vous relancez la migration. Les données existantes sont préservées.

### "foreign key violation"
Les tables doivent être migrées dans l'ordre. Le script gère cela automatiquement.

### Les médias ne s'affichent pas
1. Vérifiez que les fichiers sont bien sur R2
2. Vérifiez que le bucket est public
3. Vérifiez l'URL R2 dans `.env`
