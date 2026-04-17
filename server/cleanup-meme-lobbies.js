/**
 * Script de nettoyage des lobbies Meme
 * 
 * À exécuter avec : node cleanup-meme-lobbies.js
 * 
 * Ce script supprime tous les lobbies meme en cours
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://orkkqdfrutbwrkrvhyfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ya2txZGZydXRid3JrcnZoeWZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQzOTM5OSwiZXhwIjoyMDg5MDE1Mzk5fQ.O1q6k6RXsRTQSQM7plAR8YJb4zpBqJHDmrdd3tDlPP0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupMemeLobbies() {
  console.log('🧹 Nettoyage des lobbies Meme...\n');
  
  try {
    // 1. Récupérer tous les lobbies
    const { data: lobbies, error: fetchError } = await supabase
      .from('meme_lobbies')
      .select('id, code, status, creator_pseudo, created_at, participants');
    
    if (fetchError) {
      console.error('❌ Erreur récupération lobbies:', fetchError.message);
      return;
    }
    
    console.log(`📋 ${lobbies?.length || 0} lobby(s) trouvé(s):\n`);
    
    if (!lobbies || lobbies.length === 0) {
      console.log('✅ Aucun lobby à nettoyer');
      return;
    }
    
    // Afficher les lobbies
    for (const lobby of lobbies) {
      const participantCount = lobby.participants?.length || 0;
      console.log(`  - ${lobby.code} (${lobby.status}) - ${lobby.creator_pseudo} - ${participantCount} joueur(s) - créé le ${new Date(lobby.created_at).toLocaleString('fr-FR')}`);
    }
    
    console.log('\n');
    
    // 2. Supprimer les créations associées
    const lobbyIds = lobbies.map(l => l.id);
    
    const { error: deleteCreationsError } = await supabase
      .from('meme_creations')
      .delete()
      .in('lobby_id', lobbyIds);
    
    if (deleteCreationsError) {
      console.error('⚠️ Erreur suppression créations:', deleteCreationsError.message);
    } else {
      console.log('🗑️ Créations supprimées');
    }
    
    // 3. Supprimer les assignments
    const { error: deleteAssignmentsError } = await supabase
      .from('meme_assignments')
      .delete()
      .in('lobby_id', lobbyIds);
    
    if (deleteAssignmentsError) {
      console.error('⚠️ Erreur suppression assignments:', deleteAssignmentsError.message);
    } else {
      console.log('🗑️ Assignments supprimés');
    }
    
    // 4. Supprimer les lobbies
    const { error: deleteLobbiesError } = await supabase
      .from('meme_lobbies')
      .delete()
      .in('id', lobbyIds);
    
    if (deleteLobbiesError) {
      console.error('❌ Erreur suppression lobbies:', deleteLobbiesError.message);
    } else {
      console.log('🗑️ Lobbies supprimés');
    }
    
    console.log('\n✅ Nettoyage terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

cleanupMemeLobbies();
