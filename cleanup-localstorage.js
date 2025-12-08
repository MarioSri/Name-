/**
 * LocalStorage Cleanup Script
 * Run this in the browser console to remove specific approval cards
 * 
 * Usage: Copy and paste this entire script into the browser console (F12 > Console)
 */

(function cleanupApprovalCards() {
  console.log('🧹 Starting localStorage cleanup...');
  
  // Keywords to filter out (case-insensitive)
  const filterKeywords = ['8989', 'manasa'];
  
  // Keys that store approval data
  const keysToClean = [
    'pending-approvals',
    'approval-history',
    'approval-history-new',
    'tracking-cards',
    'submitted-documents'
  ];
  
  let totalRemoved = 0;
  
  keysToClean.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        console.log(`ℹ️ Key "${key}" not found or empty`);
        return;
      }
      
      const parsed = JSON.parse(data);
      
      if (!Array.isArray(parsed)) {
        console.log(`ℹ️ Key "${key}" is not an array, skipping`);
        return;
      }
      
      const originalLength = parsed.length;
      
      // Filter out items containing the keywords
      const filtered = parsed.filter(item => {
        const itemStr = JSON.stringify(item).toLowerCase();
        const shouldRemove = filterKeywords.some(keyword => 
          itemStr.includes(keyword.toLowerCase())
        );
        
        if (shouldRemove) {
          console.log(`🗑️ Removing from "${key}":`, item.title || item.id || 'Unknown');
        }
        
        return !shouldRemove;
      });
      
      const removedCount = originalLength - filtered.length;
      totalRemoved += removedCount;
      
      if (removedCount > 0) {
        localStorage.setItem(key, JSON.stringify(filtered));
        console.log(`✅ Removed ${removedCount} items from "${key}"`);
      } else {
        console.log(`ℹ️ No matching items found in "${key}"`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing "${key}":`, error);
    }
  });
  
  console.log(`\n🎉 Cleanup complete! Removed ${totalRemoved} total items.`);
  console.log('🔄 Please refresh the page to see changes.');
  
  // Dispatch event to notify React components
  window.dispatchEvent(new Event('storage'));
  
  return `Removed ${totalRemoved} items`;
})();
