# 🎮 Wilco Quiz - Application de Quiz et Blindtest

Application web multi-joueurs pour créer et jouer à des quiz et blindtest en temps réel.

## ✨ Fonctionnalités

### Pour les participants
- 🎯 Quiz multi-joueurs en temps réel
- 👥 Système d'équipes avec classement
- 🎨 Avatars personnalisables
- 📱 Interface responsive (mobile friendly)
- 📜 Historique des quiz joués
- 🔐 Compte sécurisé avec mot de passe hashé

### Pour les administrateurs
- 🎵 Support blindtest (audio, vidéo, images)
- 💾 Banque de questions réutilisables
- 📊 Validation manuelle des réponses par équipe
- 📈 Suivi en temps réel des participants
- 🗂️ Archivage des lobbies terminés
- 📤 Import/Export de questions via CSV

## 🛠️ Technologies

- **Frontend** : React, Tailwind CSS, Socket.IO Client
- **Backend** : Node.js, Express, Socket.IO
- **Base de données** : SQLite (better-sqlite3)
- **Sécurité** : bcrypt pour le hashage des mots de passe

---

## 🚀 Installation sur un nouveau PC

### Prérequis

1. **Node.js 18+** : Téléchargez sur [nodejs.org](https://nodejs.org/)
2. **Git** (optionnel) : Pour cloner le projet
3. **Visual Studio Build Tools** (Windows) : Nécessaire pour compiler bcrypt et SQLite
   - Téléchargez [Visual Studio Build Tools](https://visualstudio.microsoft.com/fr/visual-cpp-build-tools/)
   - Installez "Outils de build C++"

### Installation pas à pas (Windows)

#### Étape 1 : Télécharger le projet
- Téléchargez et décompressez le ZIP du projet
- Ou clonez avec Git : `git clone <url-du-repo>`

#### Étape 2 : Lancer le menu principal
Double-cliquez sur **`0-MASTER.bat`** pour ouvrir le menu principal.

#### Étape 3 : Installation (première fois uniquement)
Dans le menu, suivez cet ordre :

| Étape | Option | Description |
|-------|--------|-------------|
| 1 | `[1]` | Setup structure du projet |
| 2 | `[2]` | Créer les fichiers .env (entrez l'URL de votre serveur) |
| 3 | `[3]` | Installer les dépendances npm |

#### Étape 4 : Lancer l'application

**Mode développement** (pour tester/modifier) :
- Option `[4]` : Démarre 2 fenêtres (serveur + client React)
- Accès : http://localhost:3000

**Mode production** (pour utilisation réelle) :
- Option `[5]` : Build l'application
- Option `[6]` : Démarre le serveur de production
- Accès : http://localhost:3001 (ou votre IP)

---

## 📋 Récapitulatif des scripts .bat

| Script | Description |
|--------|-------------|
| **0-MASTER.bat** | Menu principal (utilisez celui-ci !) |
| 1-setup-structure.bat | Crée/vérifie la structure des dossiers |
| 2-create-env.bat | Crée les fichiers .env (configuration) |
| 3-install.bat | Installe les dépendances npm |
| 4-start-dev.bat | Démarre en mode développement |
| 5-deploy-prod.bat | Build pour la production |
| 6-start-prod.bat | Démarre en mode production |
| 7-check-structure.bat | Vérifie que tout est en place |
| 8-clean.bat | Nettoie node_modules et build |
| 9-create-missing-files.bat | Recrée les fichiers manquants |
| 10-fix-npm.bat | Répare les problèmes npm |
| 11-reset-database.bat | Réinitialise la base de données |
| 12-backup-database.bat | Sauvegarde la base de données |
| 13-check-database.bat | Vérifie l'état de la base |
| 14-migrate-to-sqlite.bat | Migre depuis l'ancien format JSON |
| start.bat | Raccourci pour démarrer en production |

---

## 🔄 Migration depuis l'ancienne version (JSON)

Si vous aviez une ancienne installation avec `db.json` :

1. Lancez `0-MASTER.bat`
2. Choisissez l'option `[14]` (Migrer JSON vers SQLite)

Ce script va :
- Créer une sauvegarde de `db.json`
- Migrer toutes les données vers SQLite
- **Hasher tous les mots de passe** (ils étaient en clair avant!)

---

## 🎯 Utilisation

### Mode Participant

1. Accédez à l'application via votre navigateur
2. Entrez votre pseudo et mot de passe (ou créez un compte)
3. Choisissez ou créez une équipe dans votre **Profil**
4. Personnalisez votre **Avatar**
5. Rejoignez une salle disponible
6. Attendez le démarrage du quiz par l'admin
7. Répondez aux questions !
8. Consultez votre **Historique** pour revoir vos résultats

### Mode Admin

1. Connexion : `admin` / `admin123`
2. **Banque de questions** : Créez vos questions (texte, image, audio, vidéo)
3. **Quiz** : Assemblez des quiz à partir des questions
4. **Lobbies** : Créez des salles de jeu
5. **Suivi en direct** : Suivez les réponses en temps réel
6. **Validation** : Validez/refusez les réponses par équipe
7. **Archivage** : Archivez les lobbies terminés

---

## 📂 Structure du projet

```
wilco-quiz/
├── 0-MASTER.bat            # Menu principal
├── *.bat                   # Scripts d'installation/maintenance
├── README.md               # Ce fichier
├── GUIDE_CSV.md            # Guide d'import de questions
├── template_questions_exemple.csv
│
├── client/                 # Application React
│   ├── public/
│   │   ├── avatars/       # Images des avatars
│   │   └── resources/     # Médias des questions
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── contexts/      # Contexts React (Socket, DarkMode)
│   │   ├── hooks/         # Hooks personnalisés
│   │   ├── services/      # API et storage
│   │   ├── utils/         # Fonctions utilitaires
│   │   └── App.js         # Composant principal
│   ├── .env.development   # Config développement
│   ├── .env.production    # Config production
│   └── package.json
│
└── server/                 # Serveur Express
    ├── server.js          # Serveur principal
    ├── database.js        # Module SQLite
    ├── quiz.db            # Base de données SQLite
    ├── migrate-to-sqlite.js
    ├── backup-database.js
    └── package.json
```

---

## ⚙️ Configuration

### URL du serveur

Le fichier `client/.env.production` contient l'URL de votre serveur :

```
REACT_APP_API_URL=http://votre-serveur:3001/api
```

Pour modifier, relancez `2-create-env.bat` ou éditez le fichier directement.

### Port du serveur

Par défaut, le serveur utilise le port **3001**. Pour changer, modifiez `server/server.js` :

```javascript
const PORT = process.env.PORT || 3001;
```

---

## 🗄️ Base de données

### Emplacement
La base SQLite est stockée dans `server/quiz.db`.

### Sauvegarde
```bash
# Via le menu
0-MASTER.bat → Option [12]

# Ou manuellement
cd server && npm run backup
```

### Réinitialisation
⚠️ **Attention : cela supprime toutes les données !**
```bash
# Via le menu
0-MASTER.bat → Option [11]
```

---

## 🔐 Sécurité

### Mots de passe
- ✅ Hashés avec **bcrypt** (cost factor 10)
- ✅ Jamais stockés en clair
- ✅ Jamais renvoyés par l'API

### Changer le mot de passe admin
Pour le moment, supprimez `server/quiz.db` pour recréer l'admin par défaut, ou modifiez directement la base.

⚠️ **Important** : Changez les identifiants admin par défaut en production !

---

## 🐛 Résolution de problèmes

### "npm install" échoue avec bcrypt/sqlite

1. Installez Visual Studio Build Tools avec "Outils de build C++"
2. Redémarrez votre terminal
3. Relancez l'installation

### Le serveur ne démarre pas

1. Vérifiez que le port 3001 n'est pas utilisé
2. Vérifiez les logs d'erreur dans la console
3. Essayez `10-fix-npm.bat`

### L'application ne se connecte pas au serveur

1. Vérifiez l'URL dans `.env.production`
2. Vérifiez que le serveur est bien démarré
3. Vérifiez votre firewall

### Les avatars ne s'affichent pas

Placez vos images PNG (256x256) dans `client/public/avatars/`.
Voir `client/public/avatars/README.md` pour la liste des fichiers.

---

## 📄 Licence

MIT

## 👤 Auteur

Gwenael Gevet - [@wilco73](https://github.com/wilco73)
