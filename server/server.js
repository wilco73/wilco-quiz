/**
 * Serveur Wilco Quiz v4.0
 * 
 * Architecture modulaire :
 * - Express pour l'API REST
 * - Socket.IO pour la communication temps réel
 * - Supabase (PostgreSQL) pour la persistance
 * 
 * Structure :
 * - server.js         : Point d'entrée (ce fichier)
 * - database.js       : Module Supabase
 * - routes/           : Routes API REST
 * - sockets/          : Handlers Socket.IO
 * - utils/            : Fonctions utilitaires
 */

require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./database');
const socketHandler = require('./sockets');
const routes = require('./routes');
const { broadcastGlobalState } = require('./utils/broadcast');
const timers = require('./utils/timers');

// ==================== CONFIGURATION ====================

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Configuration CORS - adapter selon l'environnement
const corsOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, "http://localhost:3000"]
  : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];

// Configuration Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ==================== MIDDLEWARE EXPRESS ====================

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==================== INITIALISATION ====================

// Fonction de broadcast avec io inclus
async function broadcastGlobalStateWithIo() {
  return broadcastGlobalState(io);
}

// Configurer les routes
routes.setup(app, { 
  broadcastGlobalState: broadcastGlobalStateWithIo,
  io 
});

// Configurer Socket.IO
socketHandler.setup(io);

// ==================== PRODUCTION ====================

// En production, servir le client React buildé
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
    console.log('[OK] Client React statique configuré');
  }
}

// ==================== DÉMARRAGE ====================

function showStartupMessage() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('         🎮 WILCO QUIZ SERVER v4.0');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 Socket.IO actif`);
  console.log(`🗃️  Base de données: Supabase PostgreSQL`);
  console.log('');
  console.log('Fonctionnalités :');
  console.log('   ✅ Quiz en temps réel');
  console.log('   ✅ Pictionary');
  console.log('   ✅ Passe-moi le Relais');
  console.log('   ✅ Gestion des équipes');
  console.log('   ✅ Reconnexion automatique');
  console.log('');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('[MODE] PRODUCTION');
  } else {
    console.log('[MODE] DÉVELOPPEMENT');
    console.log(`       Client React attendu sur http://localhost:3000`);
  }
  
  console.log('');
  console.log('Appuyez sur Ctrl+C pour arrêter le serveur');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
}

async function startServer() {
  try {
    // Initialiser la base de données
    await db.initDatabase();
    
    // Démarrer le serveur HTTP
    httpServer.listen(PORT, () => showStartupMessage());
    
    // Gestion de l'arrêt propre
    process.on('SIGINT', () => {
      console.log('\n[STOP] Arrêt du serveur...');
      
      // Arrêter tous les timers
      timers.clearAllTimers();
      
      db.closeDatabase();
      httpServer.close(() => {
        console.log('[OK] Serveur arrêté proprement');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('\n[STOP] Arrêt du serveur...');
      db.closeDatabase();
      httpServer.close(() => {
        console.log('[OK] Serveur arrêté proprement');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('[ERREUR] Impossible de démarrer le serveur:', error);
    process.exit(1);
  }
}

// Démarrer !
startServer();
