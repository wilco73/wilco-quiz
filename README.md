# 🎮 Wilco Quiz - Application de Quiz et Blindtest

Application web multi-joueurs pour créer et jouer à des quiz et blindtest en temps réel.

## ✨ Fonctionnalités

- 🎯 Quiz multi-joueurs en temps réel
- 🎵 Support blindtest (audio, vidéo, images)
- 👥 Système d'équipes et classement
- 🎨 Interface admin complète
- 📊 Validation manuelle des réponses
- 💾 Banque de questions réutilisables
- 📱 Interface responsive
- 🔐 Mots de passe hashés (bcrypt)
- 🗄️ Base de données SQLite (plus de race conditions!)

## 🛠️ Technologies

- **Frontend** : React, Tailwind CSS
- **Backend** : Node.js, Express
- **Base de données** : SQLite (better-sqlite3)
- **Sécurité** : bcrypt pour le hashage des mots de passe

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- Python (pour compiler bcrypt/better-sqlite3)
- Sur Windows : Visual Studio Build Tools

### Installation rapide (Windows)

1. Exécutez `3-install.bat` pour installer les dépendances
2. Si vous avez un ancien `db.json`, exécutez `14-migrate-to-sqlite.bat`
3. Lancez `4-start-dev.bat` (développement) ou `6-start-prod.bat` (production)

### Installation manuelle

#### Serveur
```bash
cd server
npm install
npm start
```

Le serveur démarre sur `http://localhost:3001`

#### Client
```bash
cd client
npm install
npm start
```

Le client démarre sur `http://localhost:3000`

## 🔄 Migration depuis l'ancienne version (JSON)

Si vous aviez une ancienne installation avec `db.json` :

```bash
cd server
npm run migrate
```

Ce script va :
- Créer une sauvegarde de `db.json`
- Migrer toutes les données vers SQLite
- **Hasher tous les mots de passe** (ils étaient en clair avant!)

## 📝 Configuration

Modifier l'URL de l'API dans `client/src/config.js` :
```javascript
export const API_URL = 'http://votre-serveur:3001/api';
```

## 🎯 Utilisation

### Mode Participant

1. Entrez votre nom d'équipe et votre pseudo
2. Rejoignez une salle disponible
3. Attendez le démarrage du quiz par l'admin
4. Répondez aux questions !

### Mode Admin

1. Connexion : `admin` / `admin123`
2. Créez des questions dans la banque
3. Créez des quiz à partir des questions
4. Créez des salles et démarrez les quiz
5. Suivez en direct et validez les réponses

## 📂 Structure du projet

```
wilco-quiz/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── services/      # API calls
│   │   └── App.js         # Composant principal
│   └── package.json
├── server/                 # Serveur Express
│   ├── server.js          # Code serveur
│   ├── database.js        # Module SQLite
│   ├── quiz.db            # Base de données SQLite
│   ├── migrate-to-sqlite.js  # Script de migration
│   └── package.json
└── README.md
```

## 🗄️ Base de données

### SQLite (v2.0+)

La base de données est stockée dans `server/quiz.db`. Elle gère automatiquement :
- Les transactions pour éviter les race conditions
- Les contraintes d'intégrité référentielle
- Les index pour de meilleures performances

### Sauvegarde

```bash
# Windows
12-backup-database.bat

# Ou manuellement
cd server
npm run backup
```

### Réinitialisation

```bash
# Windows
11-reset-database.bat
```

## 🔐 Sécurité

### Mots de passe

- ✅ Les mots de passe sont **hashés avec bcrypt** (cost factor 10)
- ✅ Les mots de passe ne sont jamais stockés en clair
- ✅ Les mots de passe ne sont jamais renvoyés par l'API

### Changer le mot de passe admin

Pour le moment, il faut modifier directement la base de données ou supprimer `quiz.db` pour recréer l'admin par défaut.

⚠️ **Important** : Changez les identifiants admin par défaut en production !

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT

## 👤 Auteur

Gwenael Gevet - [@wilco73](https://github.com/wilco73)