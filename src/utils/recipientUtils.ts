/**
 * Centralized utility for recipient name resolution
 * Uses Supabase as the source of truth - NO HARDCODED DATA
 */

import { supabaseStorage, Recipient } from '@/services/SupabaseStorageService';

// In-memory cache for recipient data
let recipientCache: Map<string, Recipient> = new Map();
let cacheInitialized = false;
let cacheLoadPromise: Promise<void> | null = null;

/**
 * Initialize the recipient cache from Supabase
 * Call this early in your app lifecycle
 */
export async function initializeRecipientCache(): Promise<void> {
  if (cacheInitialized) return;
  
  if (cacheLoadPromise) {
    return cacheLoadPromise;
  }

  cacheLoadPromise = (async () => {
    try {
      const recipients = await supabaseStorage.getRecipients();
      recipients.forEach(r => {
        // Cache by both UUID and user_id
        if (r.id) recipientCache.set(r.id, r);
        if (r.user_id) recipientCache.set(r.user_id, r);
      });
      cacheInitialized = true;
      console.log('✅ Recipient cache initialized with', recipients.length, 'recipients');
    } catch (error) {
      console.error('❌ Failed to initialize recipient cache:', error);
      throw error;
    }
  })();

  return cacheLoadPromise;
}

/**
 * Get a recipient by ID (UUID or user_id)
 */
export function getRecipientById(id: string): Recipient | undefined {
  return recipientCache.get(id);
}

/**
 * Get a recipient's display name by their ID
 * Returns the name from Supabase cache, with fallback formatting
 */
export function getRecipientName(recipientId: string): string {
  // Check cache first
  const cached = recipientCache.get(recipientId);
  if (cached?.name) {
    return cached.name;
  }

  // Fallback: try to extract name from ID format
  return formatRecipientIdAsName(recipientId);
}

/**
 * Get a recipient's full info by their ID
 */
export function getRecipientInfo(recipientId: string): { 
  name: string; 
  role: string; 
  department: string;
  email: string;
} {
  const cached = recipientCache.get(recipientId);
  if (cached) {
    return {
      name: cached.name || formatRecipientIdAsName(recipientId),
      role: cached.role || 'Unknown Role',
      department: cached.department || 'Unknown Department',
      email: cached.email || ''
    };
  }

  return {
    name: formatRecipientIdAsName(recipientId),
    role: extractRoleFromId(recipientId),
    department: extractDepartmentFromId(recipientId),
    email: ''
  };
}

/**
 * Format a recipient ID string as a display name
 * Used as fallback when recipient is not in cache
 */
export function formatRecipientIdAsName(recipientId: string): string {
  const parts = recipientId.split('-');
  
  // Try to find name pattern (usually contains Dr., Prof., Mr., Ms., etc.)
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].match(/^(dr\.|prof\.|mr\.|ms\.|dr|prof|mr|ms)$/i)) {
      const name = parts.slice(i).join(' ');
      return name.replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  }
  
  // If no title found, capitalize entire ID
  return recipientId.replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract role from recipient ID (fallback)
 */
function extractRoleFromId(recipientId: string): string {
  const id = recipientId.toLowerCase();
  
  if (id.includes('principal')) return 'Principal';
  if (id.includes('dean')) return 'Dean';
  if (id.includes('registrar')) return 'Registrar';
  if (id.includes('hod')) return 'Head of Department';
  if (id.includes('chairman')) return 'Chairman';
  if (id.includes('director')) return 'Director';
  if (id.includes('cdc')) return 'CDC Staff';
  if (id.includes('faculty')) return 'Faculty';
  if (id.includes('coordinator')) return 'Coordinator';
  if (id.includes('executive')) return 'Executive';
  if (id.includes('controller')) return 'Controller';
  if (id.includes('librarian')) return 'Librarian';
  
  return 'Staff';
}

/**
 * Extract department from recipient ID (fallback)
 */
function extractDepartmentFromId(recipientId: string): string {
  const id = recipientId.toLowerCase();
  
  if (id.includes('cse')) return 'Computer Science';
  if (id.includes('ece')) return 'Electronics & Communication';
  if (id.includes('eee')) return 'Electrical & Electronics';
  if (id.includes('mech')) return 'Mechanical Engineering';
  if (id.includes('csm')) return 'AI & ML';
  if (id.includes('cso')) return 'IoT';
  if (id.includes('csd')) return 'Data Science';
  if (id.includes('csc')) return 'Cyber Security';
  if (id.includes('cdc')) return 'CDC';
  if (id.includes('admin')) return 'Administration';
  
  return 'General';
}

/**
 * Get all cached recipients
 */
export function getAllCachedRecipients(): Recipient[] {
  // Deduplicate by id
  const seen = new Set<string>();
  const result: Recipient[] = [];
  
  recipientCache.forEach((recipient, key) => {
    if (recipient.id && !seen.has(recipient.id)) {
      seen.add(recipient.id);
      result.push(recipient);
    }
  });
  
  return result;
}

/**
 * Refresh the recipient cache from Supabase
 */
export async function refreshRecipientCache(): Promise<void> {
  recipientCache.clear();
  cacheInitialized = false;
  cacheLoadPromise = null;
  await initializeRecipientCache();
}

/**
 * Check if cache is initialized
 */
export function isCacheInitialized(): boolean {
  return cacheInitialized;
}

/**
 * Subscribe to real-time recipient updates
 */
export function subscribeToRecipientChanges(
  callback: (recipients: Recipient[]) => void
): () => void {
  return supabaseStorage.subscribeToTable('recipients', (_payload) => {
    // Refresh cache and notify
    refreshRecipientCache().then(() => {
      callback(getAllCachedRecipients());
    });
  });
}

// Auto-initialize cache when module is imported
initializeRecipientCache().catch(console.error);
