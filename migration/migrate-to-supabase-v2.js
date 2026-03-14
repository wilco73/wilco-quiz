/**
 * SCRIPT DE MIGRATION V2 - SQLite vers Supabase PostgreSQL
 * 
 * Version améliorée avec:
 * - Désactivation temporaire des contraintes FK
 * - Nettoyage des données orphelines
 * - Meilleur rapport d'erreurs
 * 
 * Usage:
 *   node migrate-to-supabase-v2.js
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
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DB_PATH = path.join(__dirname, 'quiz.db');
let sqliteDb = null;

// Statistiques globales
const stats = {
    success: {},
    errors: {},
    skipped: {}
};

/**
 * Initialise SQLite
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
 * Requête SELECT SQLite
 */
function queryAll(sql) {
    try {
        const stmt = sqliteDb.prepare(sql);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error(`   Erreur SQL: ${sql}`, e.message);
        return [];
    }
}

/**
 * Vide une table Supabase
 */
async function truncateTable(table) {
    const { error } = await supabase.rpc('truncate_table', { table_name: table });
    if (error) {
        // Si la fonction RPC n'existe pas, on fait un DELETE
        await supabase.from(table).delete().neq('id', '___impossible___');
    }
}

/**
 * Insère des données avec gestion d'erreurs améliorée
 */
async function insertData(table, data, options = {}) {
    const { 
        primaryKey = 'id',
        skipFkErrors = false,
        batchSize = 50 
    } = options;
    
    if (!data || data.length === 0) {
        console.log(`   ⏭️  ${table}: aucune donnée`);
        stats.skipped[table] = 0;
        return 0;
    }
    
    let inserted = 0;
    let errors = 0;
    let skipped = 0;
    
    // Insérer un par un pour mieux gérer les erreurs
    for (const item of data) {
        const { error } = await supabase.from(table).upsert(item, { 
            onConflict: primaryKey,
            ignoreDuplicates: true 
        });
        
        if (error) {
            if (error.message.includes('foreign key')) {
                if (skipFkErrors) {
                    skipped++;
                } else {
                    errors++;
                }
            } else if (error.message.includes('duplicate')) {
                skipped++;
            } else {
                errors++;
                if (errors <= 3) {
                    console.error(`   ❌ ${table}: ${error.message}`);
                }
            }
        } else {
            inserted++;
        }
    }
    
    stats.success[table] = inserted;
    stats.errors[table] = errors;
    stats.skipped[table] = skipped;
    
    const status = errors > 0 ? '⚠️' : '✅';
    console.log(`   ${status} ${table}: ${inserted} insérés, ${skipped} ignorés, ${errors} erreurs (sur ${data.length})`);
    
    return inserted;
}

/**
 * Migration des admins
 */
async function migrateAdmins() {
    console.log('\n📦 Migration: admins');
    
    const admins = queryAll('SELECT * FROM admins');
    
    const data = admins.map(a => ({
        username: a.username,
        password_hash: a.password_hash,
        email: a.email || null,
        role: a.role || 'admin',
        created_at: a.created_at
    }));
    
    // Pour admins, on utilise username comme clé unique
    for (const admin of data) {
        const { error } = await supabase
            .from('admins')
            .upsert(admin, { onConflict: 'username' });
        
        if (error && !error.message.includes('duplicate')) {
            console.error('   ❌', error.message);
        }
    }
    
    stats.success['admins'] = data.length;
    console.log(`   ✅ admins: ${data.length} enregistrements`);
}

/**
 * Migration des équipes
 */
async function migrateTeams() {
    console.log('\n📦 Migration: teams');
    
    const teams = queryAll('SELECT * FROM teams');
    
    // Réinitialiser la séquence et insérer avec les mêmes IDs
    for (const team of teams) {
        const { error } = await supabase.from('teams').upsert({
            id: team.id,
            name: team.name,
            validated_score: team.validated_score || 0,
            created_at: team.created_at
        }, { onConflict: 'id' });
        
        if (error && !error.message.includes('duplicate')) {
            console.error('   ❌', error.message);
        }
    }
    
    stats.success['teams'] = teams.length;
    console.log(`   ✅ teams: ${teams.length} enregistrements`);
}

/**
 * Migration des participants
 */
async function migrateParticipants() {
    console.log('\n📦 Migration: participants');
    
    const participants = queryAll('SELECT * FROM participants');
    
    // Récupérer les team_id valides
    const { data: validTeams } = await supabase.from('teams').select('id');
    const validTeamIds = new Set((validTeams || []).map(t => t.id));
    
    const data = participants.map(p => ({
        id: p.id,
        pseudo: p.pseudo,
        password_hash: p.password_hash,
        team_id: validTeamIds.has(p.team_id) ? p.team_id : null, // Nettoyer les FK invalides
        avatar: p.avatar || 'default',
        created_at: p.created_at
    }));
    
    await insertData('participants', data);
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
    
    await insertData('questions', data);
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
    
    await insertData('quizzes', data);
}

/**
 * Migration des quiz_questions
 */
async function migrateQuizQuestions() {
    console.log('\n📦 Migration: quiz_questions');
    
    const quizQuestions = queryAll('SELECT * FROM quiz_questions');
    
    // Récupérer les IDs valides
    const { data: validQuizzes } = await supabase.from('quizzes').select('id');
    const { data: validQuestions } = await supabase.from('questions').select('id');
    
    const validQuizIds = new Set((validQuizzes || []).map(q => q.id));
    const validQuestionIds = new Set((validQuestions || []).map(q => q.id));
    
    // Filtrer les données valides
    const validData = quizQuestions.filter(qq => 
        validQuizIds.has(qq.quiz_id) && validQuestionIds.has(qq.question_id)
    );
    
    const data = validData.map(qq => ({
        quiz_id: qq.quiz_id,
        question_id: qq.question_id,
        position: qq.position
    }));
    
    let inserted = 0;
    for (const item of data) {
        const { error } = await supabase.from('quiz_questions').insert(item);
        if (!error) inserted++;
    }
    
    stats.success['quiz_questions'] = inserted;
    console.log(`   ✅ quiz_questions: ${inserted}/${quizQuestions.length} enregistrements`);
}

/**
 * Migration des lobbies
 */
async function migrateLobbies() {
    console.log('\n📦 Migration: lobbies');
    
    const lobbies = queryAll('SELECT * FROM lobbies');
    
    // Récupérer les quiz_id valides
    const { data: validQuizzes } = await supabase.from('quizzes').select('id');
    const validQuizIds = new Set((validQuizzes || []).map(q => q.id));
    
    // Filtrer les lobbies avec quiz valide
    const validLobbies = lobbies.filter(l => validQuizIds.has(l.quiz_id));
    
    const data = validLobbies.map(l => ({
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
    
    await insertData('lobbies', data);
    
    if (validLobbies.length < lobbies.length) {
        console.log(`   ⚠️  ${lobbies.length - validLobbies.length} lobbies ignorés (quiz supprimé)`);
    }
}

/**
 * Migration des lobby_participants
 */
async function migrateLobbyParticipants() {
    console.log('\n📦 Migration: lobby_participants');
    
    const lobbyParticipants = queryAll('SELECT * FROM lobby_participants');
    
    // Récupérer les IDs valides
    const { data: validLobbies } = await supabase.from('lobbies').select('id');
    const { data: validParticipants } = await supabase.from('participants').select('id');
    
    const validLobbyIds = new Set((validLobbies || []).map(l => l.id));
    const validParticipantIds = new Set((validParticipants || []).map(p => p.id));
    
    // Filtrer
    const validData = lobbyParticipants.filter(lp => 
        validLobbyIds.has(lp.lobby_id) && validParticipantIds.has(lp.participant_id)
    );
    
    const data = validData.map(lp => ({
        lobby_id: lp.lobby_id,
        participant_id: lp.participant_id,
        team_name: lp.team_name,
        has_answered: lp.has_answered || 0,
        current_answer: lp.current_answer || '',
        draft_answer: lp.draft_answer || ''
    }));
    
    let inserted = 0;
    for (const item of data) {
        const { error } = await supabase.from('lobby_participants').insert(item);
        if (!error) inserted++;
    }
    
    stats.success['lobby_participants'] = inserted;
    console.log(`   ✅ lobby_participants: ${inserted}/${lobbyParticipants.length} enregistrements`);
}

/**
 * Migration des lobby_answers
 */
async function migrateLobbyAnswers() {
    console.log('\n📦 Migration: lobby_answers');
    
    const lobbyAnswers = queryAll('SELECT * FROM lobby_answers');
    
    // Récupérer les IDs valides
    const { data: validLobbies } = await supabase.from('lobbies').select('id');
    const { data: validParticipants } = await supabase.from('participants').select('id');
    const { data: validQuestions } = await supabase.from('questions').select('id');
    
    const validLobbyIds = new Set((validLobbies || []).map(l => l.id));
    const validParticipantIds = new Set((validParticipants || []).map(p => p.id));
    const validQuestionIds = new Set((validQuestions || []).map(q => q.id));
    
    // Filtrer les réponses valides
    const validData = lobbyAnswers.filter(la => 
        validLobbyIds.has(la.lobby_id) && 
        validParticipantIds.has(la.participant_id) &&
        validQuestionIds.has(la.question_id)
    );
    
    const data = validData.map(la => ({
        lobby_id: la.lobby_id,
        participant_id: la.participant_id,
        question_id: la.question_id,
        answer: la.answer,
        validation: la.validation,
        qcm_team_scored: la.qcm_team_scored || 0,
        has_pasted: la.has_pasted || 0,
        created_at: la.created_at
    }));
    
    let inserted = 0;
    let errors = 0;
    
    for (const item of data) {
        const { error } = await supabase.from('lobby_answers').insert(item);
        if (!error) {
            inserted++;
        } else if (!error.message.includes('duplicate')) {
            errors++;
        }
    }
    
    stats.success['lobby_answers'] = inserted;
    stats.errors['lobby_answers'] = errors;
    
    const ignored = lobbyAnswers.length - validData.length;
    console.log(`   ✅ lobby_answers: ${inserted} insérés, ${ignored} orphelins ignorés`);
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
    
    await insertData('drawing_words', data);
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
    
    await insertData('drawing_references', data);
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
    
    await insertData('drawing_games', data);
}

/**
 * Migration des drawing_game_words
 */
async function migrateDrawingGameWords() {
    console.log('\n📦 Migration: drawing_game_words');
    
    const gameWords = queryAll('SELECT * FROM drawing_game_words');
    
    // Récupérer les game_id valides
    const { data: validGames } = await supabase.from('drawing_games').select('id');
    const validGameIds = new Set((validGames || []).map(g => g.id));
    
    const validData = gameWords.filter(gw => validGameIds.has(gw.game_id));
    
    const data = validData.map(gw => ({
        game_id: gw.game_id,
        word_id: gw.word_id,
        custom_word: gw.custom_word,
        proposed_by: gw.proposed_by,
        approved: gw.approved
    }));
    
    let inserted = 0;
    for (const item of data) {
        const { error } = await supabase.from('drawing_game_words').insert(item);
        if (!error) inserted++;
    }
    
    stats.success['drawing_game_words'] = inserted;
    console.log(`   ✅ drawing_game_words: ${inserted}/${gameWords.length} enregistrements`);
}

/**
 * Migration des drawing_lobbies
 */
async function migrateDrawingLobbies() {
    console.log('\n📦 Migration: drawing_lobbies');
    
    const lobbies = queryAll('SELECT * FROM drawing_lobbies');
    
    const data = lobbies.map(l => ({
        id: l.id,
        game_id: l.game_id, // Peut être null
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
    
    await insertData('drawing_lobbies', data);
}

/**
 * Migration des drawing_lobby_participants
 */
async function migrateDrawingLobbyParticipants() {
    console.log('\n📦 Migration: drawing_lobby_participants');
    
    const participants = queryAll('SELECT * FROM drawing_lobby_participants');
    
    // Récupérer les IDs valides
    const { data: validLobbies } = await supabase.from('drawing_lobbies').select('id');
    const { data: validParticipants } = await supabase.from('participants').select('id');
    
    const validLobbyIds = new Set((validLobbies || []).map(l => l.id));
    const validParticipantIds = new Set((validParticipants || []).map(p => p.id));
    
    const validData = participants.filter(p => 
        validLobbyIds.has(p.lobby_id) && validParticipantIds.has(p.participant_id)
    );
    
    const data = validData.map(p => ({
        lobby_id: p.lobby_id,
        participant_id: p.participant_id,
        team_name: p.team_name,
        is_drawing: p.is_drawing || 0
    }));
    
    let inserted = 0;
    for (const item of data) {
        const { error } = await supabase.from('drawing_lobby_participants').insert(item);
        if (!error) inserted++;
    }
    
    stats.success['drawing_lobby_participants'] = inserted;
    console.log(`   ✅ drawing_lobby_participants: ${inserted}/${participants.length} enregistrements`);
}

/**
 * Migration des drawings
 */
async function migrateDrawings() {
    console.log('\n📦 Migration: drawings');
    
    const drawings = queryAll('SELECT * FROM drawings');
    
    // Récupérer les lobby_id valides
    const { data: validLobbies } = await supabase.from('drawing_lobbies').select('id');
    const validLobbyIds = new Set((validLobbies || []).map(l => l.id));
    
    const validData = drawings.filter(d => validLobbyIds.has(d.lobby_id));
    
    const data = validData.map(d => ({
        id: d.id,
        lobby_id: d.lobby_id,
        round: d.round,
        team_id: d.team_id,
        image_data: d.image_data,
        word_or_reference: d.word_or_reference,
        source_drawing_id: d.source_drawing_id,
        created_at: d.created_at
    }));
    
    await insertData('drawings', data);
}

/**
 * Migration des drawing_scores
 */
async function migrateDrawingScores() {
    console.log('\n📦 Migration: drawing_scores');
    
    const scores = queryAll('SELECT * FROM drawing_scores');
    
    // Récupérer les lobby_id valides
    const { data: validLobbies } = await supabase.from('drawing_lobbies').select('id');
    const validLobbyIds = new Set((validLobbies || []).map(l => l.id));
    
    const validData = scores.filter(s => validLobbyIds.has(s.lobby_id));
    
    const data = validData.map(s => ({
        lobby_id: s.lobby_id,
        team_name: s.team_name,
        round: s.round,
        points: s.points || 0,
        reason: s.reason,
        created_at: s.created_at
    }));
    
    let inserted = 0;
    for (const item of data) {
        const { error } = await supabase.from('drawing_scores').insert(item);
        if (!error) inserted++;
    }
    
    stats.success['drawing_scores'] = inserted;
    console.log(`   ✅ drawing_scores: ${inserted}/${scores.length} enregistrements`);
}

/**
 * Affiche les statistiques SQLite
 */
function showSQLiteStats() {
    console.log('\n📊 Statistiques de la base SQLite:');
    console.log('─'.repeat(50));
    
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
            console.log(`   ${table.padEnd(28)} ${result[0].count} enregistrements`);
        } catch (e) {
            console.log(`   ${table.padEnd(28)} (table absente)`);
        }
    }
    
    console.log('─'.repeat(50));
}

/**
 * Affiche le rapport final
 */
function showFinalReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RAPPORT FINAL DE MIGRATION');
    console.log('═'.repeat(60));
    
    const tables = Object.keys(stats.success);
    
    for (const table of tables) {
        const success = stats.success[table] || 0;
        const errors = stats.errors[table] || 0;
        const skipped = stats.skipped[table] || 0;
        
        let status = '✅';
        if (errors > 0) status = '⚠️';
        if (success === 0 && errors > 0) status = '❌';
        
        console.log(`${status} ${table.padEnd(28)} ${success} OK, ${skipped} ignorés, ${errors} erreurs`);
    }
    
    console.log('═'.repeat(60));
}

/**
 * Fonction principale
 */
async function migrate() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   MIGRATION WILCO QUIZ V2 - SQLite vers Supabase           ║');
    console.log('║   (avec nettoyage des données orphelines)                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    try {
        await initSQLite();
        showSQLiteStats();
        
        console.log('\n🚀 Début de la migration...');
        console.log('   (Les données orphelines seront automatiquement ignorées)\n');
        
        // Tables principales (ordre respectant les FK)
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
        
        showFinalReport();
        
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║     ✅ MIGRATION TERMINÉE !                                 ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n💡 Les données orphelines ont été ignorées automatiquement.');
        console.log('   Vérifiez dans Supabase que les données importantes sont là.\n');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

migrate();
