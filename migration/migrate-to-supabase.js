/**
 * SCRIPT DE MIGRATION - SQLite vers Supabase PostgreSQL
 * 
 * Ce script lit toutes les données de quiz.db (SQLite)
 * et les insère dans Supabase (PostgreSQL)
 * 
 * Usage:
 *   1. Configurer SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env
 *   2. node migrate-to-supabase.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orkkqdfrutbwrkrvhyfk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY non définie !');
    console.error('   Créez un fichier .env avec:');
    console.error('   SUPABASE_SERVICE_KEY=votre_clé_service_role');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Chemin de la base SQLite
const DB_PATH = path.join(__dirname, 'quiz.db');

let sqliteDb = null;

/**
 * Initialise la connexion SQLite
 */
async function initSQLite() {
    const SQL = await initSqlJs();
    
    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Fichier quiz.db introuvable !');
        process.exit(1);
    }
    
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(fileBuffer);
    console.log('✅ Base SQLite chargée');
    
    return sqliteDb;
}

/**
 * Exécute une requête SELECT sur SQLite
 */
function queryAll(sql) {
    const stmt = sqliteDb.prepare(sql);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Insère des données dans Supabase avec gestion des erreurs
 */
async function insertBatch(table, data, batchSize = 100) {
    if (!data || data.length === 0) {
        console.log(`   ⏭️  ${table}: aucune donnée`);
        return 0;
    }
    
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await supabase
            .from(table)
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
        
        if (error) {
            console.error(`   ❌ Erreur ${table}:`, error.message);
            // Essayer un par un pour identifier le problème
            for (const item of batch) {
                const { error: singleError } = await supabase.from(table).upsert(item);
                if (singleError) {
                    console.error(`      Item problématique:`, JSON.stringify(item).substring(0, 100));
                } else {
                    inserted++;
                }
            }
        } else {
            inserted += batch.length;
        }
    }
    
    console.log(`   ✅ ${table}: ${inserted}/${data.length} enregistrements`);
    return inserted;
}

/**
 * Insère des données avec une clé primaire différente (SERIAL)
 */
async function insertBatchSerial(table, data, conflictColumns = null) {
    if (!data || data.length === 0) {
        console.log(`   ⏭️  ${table}: aucune donnée`);
        return 0;
    }
    
    let inserted = 0;
    
    for (const item of data) {
        // Supprimer l'id pour les tables SERIAL
        const { id, ...itemWithoutId } = item;
        
        const { error } = await supabase
            .from(table)
            .insert(itemWithoutId);
        
        if (error) {
            if (!error.message.includes('duplicate')) {
                console.error(`   ⚠️ ${table}:`, error.message);
            }
        } else {
            inserted++;
        }
    }
    
    console.log(`   ✅ ${table}: ${inserted}/${data.length} enregistrements`);
    return inserted;
}

/**
 * Migration des admins
 */
async function migrateAdmins() {
    console.log('\n📦 Migration: admins');
    
    const admins = queryAll('SELECT * FROM admins');
    
    // Transformer pour PostgreSQL
    const data = admins.map(a => ({
        id: a.id,
        username: a.username,
        password_hash: a.password_hash,
        email: a.email || null,
        role: a.role || 'admin',
        created_at: a.created_at
    }));
    
    // Pour les admins, on utilise SERIAL donc on doit gérer différemment
    for (const admin of data) {
        const { error } = await supabase
            .from('admins')
            .upsert({ 
                username: admin.username,
                password_hash: admin.password_hash,
                email: admin.email,
                role: admin.role,
                created_at: admin.created_at
            }, { onConflict: 'username' });
        
        if (error && !error.message.includes('duplicate')) {
            console.error('   ❌', error.message);
        }
    }
    
    console.log(`   ✅ admins: ${data.length} enregistrements`);
}

/**
 * Migration des équipes
 */
async function migrateTeams() {
    console.log('\n📦 Migration: teams');
    
    const teams = queryAll('SELECT * FROM teams');
    
    for (const team of teams) {
        const { error } = await supabase
            .from('teams')
            .upsert({
                id: team.id,
                name: team.name,
                validated_score: team.validated_score || 0,
                created_at: team.created_at
            }, { onConflict: 'id' });
        
        if (error && !error.message.includes('duplicate')) {
            console.error('   ❌', error.message);
        }
    }
    
    console.log(`   ✅ teams: ${teams.length} enregistrements`);
}

/**
 * Migration des participants
 */
async function migrateParticipants() {
    console.log('\n📦 Migration: participants');
    
    const participants = queryAll('SELECT * FROM participants');
    
    const data = participants.map(p => ({
        id: p.id,
        pseudo: p.pseudo,
        password_hash: p.password_hash,
        team_id: p.team_id,
        avatar: p.avatar || 'default',
        created_at: p.created_at
    }));
    
    await insertBatch('participants', data);
}

/**
 * Migration des questions
 */
async function migrateQuestions() {
    console.log('\n📦 Migration: questions');
    
    const questions = queryAll('SELECT * FROM questions');
    
    const data = questions.map(q => ({
        id: q.id,
        text: q.text,
        answer: q.answer,
        type: q.type || 'text',
        category: q.category,
        tags: q.tags,
        points: q.points || 1,
        timer: q.timer || 0,
        media: q.media,
        media_type: q.media_type,
        choices: q.choices,
        created_at: q.created_at
    }));
    
    await insertBatch('questions', data);
}

/**
 * Migration des quizzes
 */
async function migrateQuizzes() {
    console.log('\n📦 Migration: quizzes');
    
    const quizzes = queryAll('SELECT * FROM quizzes');
    
    const data = quizzes.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        group_name: q.group_name,
        created_at: q.created_at
    }));
    
    await insertBatch('quizzes', data);
}

/**
 * Migration des quiz_questions
 */
async function migrateQuizQuestions() {
    console.log('\n📦 Migration: quiz_questions');
    
    const quizQuestions = queryAll('SELECT * FROM quiz_questions');
    
    await insertBatchSerial('quiz_questions', quizQuestions);
}

/**
 * Migration des lobbies
 */
async function migrateLobbies() {
    console.log('\n📦 Migration: lobbies');
    
    const lobbies = queryAll('SELECT * FROM lobbies');
    
    const data = lobbies.map(l => ({
        id: l.id,
        quiz_id: l.quiz_id,
        status: l.status || 'waiting',
        current_question_index: l.current_question_index || 0,
        shuffled: l.shuffled || 0,
        shuffled_questions: l.shuffled_questions,
        start_time: l.start_time,
        archived: l.archived || 0,
        created_at: l.created_at
    }));
    
    await insertBatch('lobbies', data);
}

/**
 * Migration des lobby_participants
 */
async function migrateLobbyParticipants() {
    console.log('\n📦 Migration: lobby_participants');
    
    const lobbyParticipants = queryAll('SELECT * FROM lobby_participants');
    
    await insertBatchSerial('lobby_participants', lobbyParticipants);
}

/**
 * Migration des lobby_answers
 */
async function migrateLobbyAnswers() {
    console.log('\n📦 Migration: lobby_answers');
    
    const lobbyAnswers = queryAll('SELECT * FROM lobby_answers');
    
    await insertBatchSerial('lobby_answers', lobbyAnswers);
}

/**
 * Migration des drawing_words
 */
async function migrateDrawingWords() {
    console.log('\n📦 Migration: drawing_words');
    
    const words = queryAll('SELECT * FROM drawing_words');
    
    const data = words.map(w => ({
        id: w.id,
        word: w.word,
        category: w.category,
        difficulty: w.difficulty || 'moyen',
        tags: w.tags,
        created_at: w.created_at
    }));
    
    await insertBatch('drawing_words', data);
}

/**
 * Migration des drawing_references
 */
async function migrateDrawingReferences() {
    console.log('\n📦 Migration: drawing_references');
    
    const refs = queryAll('SELECT * FROM drawing_references');
    
    const data = refs.map(r => ({
        id: r.id,
        name: r.name,
        image_url: r.image_url,
        category: r.category,
        tags: r.tags,
        created_at: r.created_at
    }));
    
    await insertBatch('drawing_references', data);
}

/**
 * Migration des drawing_games
 */
async function migrateDrawingGames() {
    console.log('\n📦 Migration: drawing_games');
    
    const games = queryAll('SELECT * FROM drawing_games');
    
    const data = games.map(g => ({
        id: g.id,
        title: g.title,
        game_type: g.game_type,
        config: g.config,
        created_at: g.created_at
    }));
    
    await insertBatch('drawing_games', data);
}

/**
 * Migration des drawing_game_words
 */
async function migrateDrawingGameWords() {
    console.log('\n📦 Migration: drawing_game_words');
    
    const gameWords = queryAll('SELECT * FROM drawing_game_words');
    
    await insertBatchSerial('drawing_game_words', gameWords);
}

/**
 * Migration des drawing_lobbies
 */
async function migrateDrawingLobbies() {
    console.log('\n📦 Migration: drawing_lobbies');
    
    const lobbies = queryAll('SELECT * FROM drawing_lobbies');
    
    const data = lobbies.map(l => ({
        id: l.id,
        game_id: l.game_id,
        status: l.status || 'waiting',
        current_round: l.current_round || 0,
        current_drawer_index: l.current_drawer_index || 0,
        current_word: l.current_word,
        round_start_time: l.round_start_time,
        drawer_rotation_order: l.drawer_rotation_order,
        config: l.config,
        creator_id: l.creator_id,
        creator_type: l.creator_type || 'admin',
        custom_words: l.custom_words,
        created_at: l.created_at
    }));
    
    await insertBatch('drawing_lobbies', data);
}

/**
 * Migration des drawing_lobby_participants
 */
async function migrateDrawingLobbyParticipants() {
    console.log('\n📦 Migration: drawing_lobby_participants');
    
    const participants = queryAll('SELECT * FROM drawing_lobby_participants');
    
    await insertBatchSerial('drawing_lobby_participants', participants);
}

/**
 * Migration des drawings
 */
async function migrateDrawings() {
    console.log('\n📦 Migration: drawings');
    
    const drawings = queryAll('SELECT * FROM drawings');
    
    const data = drawings.map(d => ({
        id: d.id,
        lobby_id: d.lobby_id,
        round: d.round,
        team_id: d.team_id,
        image_data: d.image_data,
        word_or_reference: d.word_or_reference,
        source_drawing_id: d.source_drawing_id,
        created_at: d.created_at
    }));
    
    await insertBatch('drawings', data);
}

/**
 * Migration des drawing_scores
 */
async function migrateDrawingScores() {
    console.log('\n📦 Migration: drawing_scores');
    
    const scores = queryAll('SELECT * FROM drawing_scores');
    
    await insertBatchSerial('drawing_scores', scores);
}

/**
 * Affiche les statistiques de la base SQLite
 */
function showStats() {
    console.log('\n📊 Statistiques de la base SQLite:');
    console.log('─'.repeat(40));
    
    const tables = [
        'admins', 'teams', 'participants', 'questions', 'quizzes',
        'quiz_questions', 'lobbies', 'lobby_participants', 'lobby_answers',
        'drawing_words', 'drawing_references', 'drawing_games',
        'drawing_game_words', 'drawing_lobbies', 'drawing_lobby_participants',
        'drawings', 'drawing_scores'
    ];
    
    for (const table of tables) {
        try {
            const result = queryAll(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   ${table}: ${result[0].count} enregistrements`);
        } catch (e) {
            console.log(`   ${table}: table non trouvée`);
        }
    }
    
    console.log('─'.repeat(40));
}

/**
 * Fonction principale de migration
 */
async function migrate() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     MIGRATION WILCO QUIZ - SQLite vers Supabase            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    try {
        // Initialiser SQLite
        await initSQLite();
        
        // Afficher les stats
        showStats();
        
        console.log('\n🚀 Début de la migration...');
        
        // Migration dans l'ordre (respect des clés étrangères)
        await migrateAdmins();
        await migrateTeams();
        await migrateParticipants();
        await migrateQuestions();
        await migrateQuizzes();
        await migrateQuizQuestions();
        await migrateLobbies();
        await migrateLobbyParticipants();
        await migrateLobbyAnswers();
        
        // Tables de dessin
        await migrateDrawingWords();
        await migrateDrawingReferences();
        await migrateDrawingGames();
        await migrateDrawingGameWords();
        await migrateDrawingLobbies();
        await migrateDrawingLobbyParticipants();
        await migrateDrawings();
        await migrateDrawingScores();
        
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║     ✅ MIGRATION TERMINÉE AVEC SUCCÈS !                     ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

// Lancer la migration
migrate();
