/**
 * Zustand Supabase Connection Store
 * Manages Supabase connection state and provides connection check utility
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface SupabaseStore {
  isConnected: boolean;
  connectionError: string | null;
  checkConnection: () => Promise<boolean>;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  isConnected: false,
  connectionError: null,

  checkConnection: async () => {
    try {
      // Test connection by making a simple query
      const { data, error } = await supabase
        .from('recipients')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Supabase connection check failed:', error);
        set({ isConnected: false, connectionError: error.message });
        return false;
      }

      // Connection works - we don't require auth session for anonymous access
      // The anon key provides sufficient permissions for public data
      set({ isConnected: true, connectionError: null });
      
      console.log('✅ Supabase connection check: Connected (using anon key)');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Supabase connection check error:', err);
      set({ isConnected: false, connectionError: errorMessage });
      return false;
    }
  },

  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),
}));

