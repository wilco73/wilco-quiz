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

## 🛠️ Technologies

- **Frontend** : React, Tailwind CSS
- **Backend** : Node.js, Express
- **Base de données** : JSON (db.json)

## 🚀 Installation

### Prérequis

- Node.js 14+ et npm

### Installation du serveur
```bash
cd server
npm install
npm start
```

Le serveur démarre sur `http://localhost:3001`

### Installation du client
```bash
cd client
npm install
npm start
```

Le client démarre sur `http://localhost:3000`

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

wilco-quiz/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── services/      # API calls
│   │   └── App.js         # Composant principal
│   └── package.json
├── server/                # Serveur Express
│   ├── server.js          # Code serveur
│   ├── db.json           # Base de données
│   └── package.json
└── README.md

## 🔐 Sécurité

⚠️ **Important** : Changez les identifiants admin par défaut en production !

Modifier dans `server/db.json` :
```json
"admins": [
  {
    "id": "1",
    "username": "votre_admin",
    "password": "votre_mot_de_passe_securise"
  }
]
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT

## 👤 Auteur

Gwenael Gevet - [@wilco73](https://github.com/wilco73)