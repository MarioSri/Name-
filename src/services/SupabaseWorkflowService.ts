import { supabase } from '@/lib/supabase';

export interface Document {
  id: string;
  title: string;
  type: string;
  description?: string;
  submitted_by: string;
  submitted_by_name: string;
  submitted_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'partially-approved';
  priority: string;
  workflow: any;
  signed_by: string[];
  files: any[];
  [key: string]: any;
}

export interface ApprovalCard {
  id: string;
  document_id: string;
  title: string;
  type: string;
  submitter: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: string;
  recipients: string[];
  recipient_ids: string[];
  files: any[];
  [key: string]: any;
}

class SupabaseWorkflowService {
  // Documents
  async createDocument(doc: Partial<Document>) {
    const { data, error } = await supabase.from('documents').insert(doc).select().single();
    if (error) throw error;
    return data;
  }

  async getDocuments(userId?: string) {
    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('submitted_by', userId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateDocument(id: string, updates: Partial<Document>) {
    const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  // Approval Cards
  async createApprovalCard(card: Partial<ApprovalCard>) {
    const { data, error } = await supabase.from('approval_cards').insert(card).select().single();
    if (error) throw error;
    return data;
  }

  async getApprovalCards(recipientId?: string) {
    let query = supabase.from('approval_cards').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (recipientId) query = query.contains('recipient_ids', [recipientId]);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateApprovalCard(id: string, updates: Partial<ApprovalCard>) {
    const { data, error } = await supabase.from('approval_cards').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteApprovalCard(id: string) {
    const { error } = await supabase.from('approval_cards').delete().eq('id', id);
    if (error) throw error;
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string) {
    const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async upsertNotificationPreferences(userId: string, prefs: any) {
    const { data, error } = await supabase.from('notification_preferences').upsert({ user_id: userId, ...prefs }).select().single();
    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  subscribeToApprovalCards(recipientId: string, callback: (payload: any) => void) {
    return supabase
      .channel('approval_cards_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_cards' }, callback)
      .subscribe();
  }

  subscribeToDocuments(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('documents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `submitted_by=eq.${userId}` }, callback)
      .subscribe();
  }

  // Recipients
  async getRecipients(role?: string, branch?: string) {
    let query = supabase.from('recipients').select('*').order('name');
    if (role) query = query.eq('role', role);
    if (branch) query = query.eq('branch', branch);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getRecipientById(userId: string) {
    const { data, error } = await supabase.from('recipients').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateRecipient(userId: string, updates: any) {
    const { data, error } = await supabase.from('recipients').update(updates).eq('user_id', userId).select().single();
    if (error) throw error;
    return data;
  }
}

export const supabaseWorkflowService = new SupabaseWorkflowService();
