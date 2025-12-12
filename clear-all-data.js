/**
 * Complete Data Cleanup Script
 * 
 * This script clears ALL application data from localStorage.
 * Run this in the browser console (F12 > Console) to clean client-side data.
 * 
 * For Supabase database cleanup, see the SQL section at the bottom or run:
 * clear-supabase-data.sql in the Supabase SQL Editor
 */

(function clearAllData() {
  console.log('🧹 Starting complete data cleanup...\n');
  
  // ===== LOCALSTORAGE CLEANUP =====
  console.log('📦 Clearing localStorage...');
  
  // Application-specific keys to clear
  const appKeys = [
    // Authentication
    'auth-user',
    'auth-token',
    'auth-session',
    'current-user',
    'user-data',
    'user-profile',
    'logged-in-user',
    
    // Approval data
    'pending-approvals',
    'approval-history',
    'approval-history-new',
    'approval-cards',
    'submitted-approvals',
    'my-approvals',
    
    // Documents
    'documents',
    'submitted-documents',
    'document-drafts',
    'recent-documents',
    'tracking-cards',
    
    // Meetings
    'meetings',
    'scheduled-meetings',
    'meeting-requests',
    
    // Channels & Messages
    'channels',
    'messages',
    'unread-messages',
    
    // Calendar
    'calendar-events',
    'reminders',
    
    // Notifications
    'notifications',
    'notification-preferences',
    
    // UI State
    'sidebar-collapsed',
    'theme',
    'dashboard-layout',
    'dashboard-widgets',
    
    // Cache
    'recipients-cache',
    'users-cache',
    'departments-cache',
    
    // Supabase
    'sb-goupzmplowjbnnxmnvou-auth-token',
    'supabase.auth.token',
  ];
  
  let clearedKeys = 0;
  
  // Clear specific keys
  appKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      console.log(`  ✓ Cleared: ${key}`);
      clearedKeys++;
    }
  });
  
  // Also clear any keys matching common patterns
  const patterns = [
    /^sb-.*-auth-token$/,
    /^supabase\./,
    /approval/i,
    /document/i,
    /meeting/i,
    /channel/i,
    /message/i,
    /notification/i,
    /calendar/i,
    /user/i,
    /auth/i,
    /cache/i,
  ];
  
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (patterns.some(pattern => pattern.test(key))) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        console.log(`  ✓ Pattern cleared: ${key}`);
        clearedKeys++;
      }
    }
  });
  
  console.log(`\n✅ Cleared ${clearedKeys} localStorage keys\n`);
  
  // ===== SESSION STORAGE CLEANUP =====
  console.log('📦 Clearing sessionStorage...');
  const sessionKeys = Object.keys(sessionStorage);
  sessionStorage.clear();
  console.log(`✅ Cleared ${sessionKeys.length} sessionStorage keys\n`);
  
  // ===== INDEXED DB CLEANUP =====
  console.log('📦 Clearing IndexedDB...');
  if (window.indexedDB) {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.log(`  ✓ Deleted IndexedDB: ${db.name}`);
        }
      });
      console.log(`✅ Cleared ${databases.length} IndexedDB databases\n`);
    }).catch(err => {
      console.log('⚠️ Could not enumerate IndexedDB databases');
    });
  }
  
  // ===== CACHE STORAGE CLEANUP =====
  console.log('📦 Clearing Cache Storage...');
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
        console.log(`  ✓ Deleted cache: ${name}`);
      });
      console.log(`✅ Cleared ${names.length} caches\n`);
    });
  }
  
  // Dispatch storage event to notify React components
  window.dispatchEvent(new Event('storage'));
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 CLIENT-SIDE CLEANUP COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n⚠️  IMPORTANT: To clear Supabase database data:');
  console.log('    1. Go to Supabase Dashboard → SQL Editor');
  console.log('    2. Copy and run the SQL from: clear-supabase-data.sql');
  console.log('    3. Or run the SQL printed below\n');
  console.log('🔄 Please refresh the page (Ctrl+F5) to complete the cleanup.\n');
  
  return 'Cleanup complete! Refresh the page.';
})();
