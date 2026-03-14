/**
 * SCRIPT DE MISE À JOUR DES URLS MÉDIAS
 * 
 * Ce script met à jour les chemins relatifs des médias dans la base de données
 * pour les remplacer par les URLs Cloudflare R2
 * 
 * Usage:
 *   1. Configurer R2_PUBLIC_URL dans .env
 *   2. node update-media-urls.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orkkqdfrutbwrkrvhyfk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Ex: https://pub-xxxxx.r2.dev

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY non définie !');
    process.exit(1);
}

if (!R2_PUBLIC_URL) {
    console.error('❌ R2_PUBLIC_URL non définie !');
    console.error('   Ajoutez dans .env: R2_PUBLIC_URL=https://votre-bucket.r2.dev');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Transforme un chemin relatif en URL R2
 * 
 * Exemples:
 *   /resources/quiz/images/affiche.png → https://bucket.r2.dev/images/affiche.png
 *   /resources/quiz/musique/song.mp3 → https://bucket.r2.dev/musique/song.mp3
 */
function transformUrl(relativePath) {
    if (!relativePath) return null;
    
    // Si c'est déjà une URL complète, ne pas modifier
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }
    
    // Nettoyer le chemin
    let cleanPath = relativePath
        .replace(/^\/resources\/quiz\//, '')  // Supprimer le préfixe /resources/quiz/
        .replace(/^\/resources\//, '')         // Supprimer /resources/
        .replace(/^\//, '');                   // Supprimer le / initial
    
    // Construire l'URL R2
    return `${R2_PUBLIC_URL}/${cleanPath}`;
}

/**
 * Met à jour les URLs des questions
 */
async function updateQuestionUrls() {
    console.log('\n📦 Mise à jour: questions');
    
    // Récupérer toutes les questions avec média
    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, media')
        .not('media', 'is', null);
    
    if (error) {
        console.error('   ❌ Erreur:', error.message);
        return;
    }
    
    let updated = 0;
    
    for (const question of questions) {
        if (!question.media) continue;
        
        const newUrl = transformUrl(question.media);
        
        if (newUrl !== question.media) {
            const { error: updateError } = await supabase
                .from('questions')
                .update({ media: newUrl })
                .eq('id', question.id);
            
            if (updateError) {
                console.error(`   ❌ Question ${question.id}:`, updateError.message);
            } else {
                updated++;
                console.log(`   ✓ ${question.media} → ${newUrl}`);
            }
        }
    }
    
    console.log(`   ✅ ${updated} questions mises à jour`);
}

/**
 * Met à jour les URLs des références de dessin
 */
async function updateDrawingReferenceUrls() {
    console.log('\n📦 Mise à jour: drawing_references');
    
    const { data: refs, error } = await supabase
        .from('drawing_references')
        .select('id, image_url')
        .not('image_url', 'is', null);
    
    if (error) {
        console.error('   ❌ Erreur:', error.message);
        return;
    }
    
    let updated = 0;
    
    for (const ref of refs) {
        if (!ref.image_url) continue;
        
        const newUrl = transformUrl(ref.image_url);
        
        if (newUrl !== ref.image_url) {
            const { error: updateError } = await supabase
                .from('drawing_references')
                .update({ image_url: newUrl })
                .eq('id', ref.id);
            
            if (updateError) {
                console.error(`   ❌ Ref ${ref.id}:`, updateError.message);
            } else {
                updated++;
                console.log(`   ✓ ${ref.image_url} → ${newUrl}`);
            }
        }
    }
    
    console.log(`   ✅ ${updated} références mises à jour`);
}

/**
 * Affiche un aperçu des transformations sans les appliquer
 */
async function previewChanges() {
    console.log('\n👁️  APERÇU DES CHANGEMENTS (sans modification)');
    console.log('─'.repeat(60));
    
    // Questions
    const { data: questions } = await supabase
        .from('questions')
        .select('id, media')
        .not('media', 'is', null)
        .limit(10);
    
    console.log('\n📝 Questions (10 premiers):');
    for (const q of questions || []) {
        const newUrl = transformUrl(q.media);
        if (newUrl !== q.media) {
            console.log(`   ${q.media}`);
            console.log(`   → ${newUrl}`);
            console.log('');
        }
    }
    
    // Drawing references
    const { data: refs } = await supabase
        .from('drawing_references')
        .select('id, image_url')
        .not('image_url', 'is', null)
        .limit(5);
    
    console.log('\n🖼️  Références de dessin (5 premiers):');
    for (const r of refs || []) {
        const newUrl = transformUrl(r.image_url);
        if (newUrl !== r.image_url) {
            console.log(`   ${r.image_url}`);
            console.log(`   → ${newUrl}`);
            console.log('');
        }
    }
}

/**
 * Fonction principale
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     MISE À JOUR DES URLs MÉDIAS - Wilco Quiz               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    console.log(`\n🔗 URL R2 configurée: ${R2_PUBLIC_URL}`);
    
    // Vérifier les arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--preview')) {
        await previewChanges();
        console.log('\n💡 Pour appliquer les changements, relancez sans --preview');
        return;
    }
    
    if (!args.includes('--confirm')) {
        await previewChanges();
        console.log('\n⚠️  Pour appliquer les changements, relancez avec --confirm');
        console.log('   node update-media-urls.js --confirm');
        return;
    }
    
    console.log('\n🚀 Application des changements...');
    
    await updateQuestionUrls();
    await updateDrawingReferenceUrls();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     ✅ MISE À JOUR TERMINÉE !                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
