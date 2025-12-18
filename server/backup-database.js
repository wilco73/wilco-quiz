/**
 * Script de sauvegarde de la base de donnees SQLite
 * Cree une copie horodatee de la base
 * 
 * Usage: node backup-database.js
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'quiz.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

console.log('');
console.log('================================================================');
console.log('   SAUVEGARDE DE LA BASE DE DONNEES');
console.log('================================================================');
console.log('');

// Verifier si la base existe
if (!fs.existsSync(DB_FILE)) {
  console.log('[ERREUR] Base de donnees non trouvee:', DB_FILE);
  console.log('   Demarrez le serveur au moins une fois pour creer la base.');
  process.exit(1);
}

// Creer le dossier de backups s'il n'existe pas
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
  console.log('[OK] Dossier de backups cree:', BACKUP_DIR);
}

// Generer le nom du fichier de backup
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(BACKUP_DIR, `quiz-${timestamp}.db`);

// Copier la base
try {
  fs.copyFileSync(DB_FILE, backupFile);
  
  // Obtenir la taille du fichier
  const stats = fs.statSync(backupFile);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log('[OK] Sauvegarde creee avec succes!');
  console.log('');
  console.log('Fichier:', backupFile);
  console.log('Taille:', sizeKB, 'KB');
  console.log('');
  
  // Lister les backups existants
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();
  
  console.log('Sauvegardes disponibles:');
  backups.slice(0, 10).forEach((backup, index) => {
    const fullPath = path.join(BACKUP_DIR, backup);
    const fileStats = fs.statSync(fullPath);
    const size = (fileStats.size / 1024).toFixed(2);
    console.log(`   ${index + 1}. ${backup} (${size} KB)`);
  });
  
  if (backups.length > 10) {
    console.log(`   ... et ${backups.length - 10} autres`);
  }
  
  console.log('');
  console.log('Pour restaurer une sauvegarde:');
  console.log('   1. Arretez le serveur');
  console.log('   2. Copiez le fichier de backup vers quiz.db');
  console.log('   3. Redemarrez le serveur');
  console.log('');
  
} catch (error) {
  console.error('[ERREUR] Erreur lors de la sauvegarde:', error.message);
  process.exit(1);
}
