import { supabase } from '../config/supabase';

export class RealtimeService {
  static subscribeToDocuments(callback: (payload: any) => void) {
    return supabase
      .channel('documents')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'documents' }, 
        callback
      )
      .subscribe();
  }

  static subscribeToTable(table: string, callback: (payload: any) => void) {
    return supabase
      .channel(table)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }
}