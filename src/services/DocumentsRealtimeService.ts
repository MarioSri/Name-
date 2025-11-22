import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';
import { supabase } from '@/lib/supabase';

export interface Document {
  id: string;
  title: string;
  description?: string;
  sender_id: string;
  recipients: string[];
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  metadata?: Record<string, any>;
}

export interface ApprovalCard {
  id: string;
  document_id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'forwarded';
  approval_chain?: any[];
  forwarded_to?: string[];
  rejected_reason?: string;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

class DocumentsRealtimeService {
  private subscriptions: RealtimeSubscription[] = [];

  /**
   * Subscribe to documents by user role
   */
  subscribeToDocumentsByRole(
    userId: string,
    role: 'sender' | 'recipient' | 'all',
    callbacks: {
      onInsert?: (document: Document) => void;
      onUpdate?: (document: Document) => void;
      onDelete?: (document: Document) => void;
    }
  ): RealtimeSubscription {
    let filter: string | undefined;

    if (role === 'sender') {
      filter = `sender_id=eq.${userId}`;
    } else if (role === 'recipient') {
      filter = `recipients=cs.{${userId}}`;
    }
    // No filter for 'all' role (admin/principal)

    const subscription = realtimeService.subscribe<Document>({
      table: 'documents',
      event: '*',
      filter,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to approval cards for a specific user
   */
  subscribeToApprovalCards(
    recipientId: string,
    callbacks: {
      onInsert?: (card: ApprovalCard) => void;
      onUpdate?: (card: ApprovalCard) => void;
      onDelete?: (card: ApprovalCard) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<ApprovalCard>({
      table: 'approval_cards',
      event: '*',
      filter: `recipient_id=eq.${recipientId}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to all approval cards (admin/principal view)
   */
  subscribeToAllApprovalCards(
    callbacks: {
      onInsert?: (card: ApprovalCard) => void;
      onUpdate?: (card: ApprovalCard) => void;
      onDelete?: (card: ApprovalCard) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<ApprovalCard>({
      table: 'approval_cards',
      event: '*',
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to comments on a specific document
   */
  subscribeToDocumentComments(
    documentId: string,
    callbacks: {
      onInsert?: (comment: DocumentComment) => void;
      onUpdate?: (comment: DocumentComment) => void;
      onDelete?: (comment: DocumentComment) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<DocumentComment>({
      table: 'document_comments',
      event: '*',
      filter: `document_id=eq.${documentId}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Fetch documents with filters
   */
  async fetchDocuments(
    userId?: string,
    role?: 'sender' | 'recipient' | 'all',
    status?: Document['status']
  ): Promise<Document[]> {
    let query = supabase.from('documents').select('*');

    if (role === 'sender' && userId) {
      query = query.eq('sender_id', userId);
    } else if (role === 'recipient' && userId) {
      query = query.contains('recipients', [userId]);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[Documents] Error fetching documents:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch approval cards for a user
   */
  async fetchApprovalCards(
    recipientId?: string,
    status?: ApprovalCard['status']
  ): Promise<ApprovalCard[]> {
    let query = supabase.from('approval_cards').select('*');

    if (recipientId) {
      query = query.eq('recipient_id', recipientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[Documents] Error fetching approval cards:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new document
   */
  async createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single();

    if (error) {
      console.error('[Documents] Error creating document:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Documents] Error updating document:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update approval card status
   */
  async updateApprovalCard(id: string, updates: Partial<ApprovalCard>): Promise<ApprovalCard> {
    const { data, error } = await supabase
      .from('approval_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Documents] Error updating approval card:', error);
      throw error;
    }

    return data;
  }

  /**
   * Add comment to document
   */
  async addComment(comment: Omit<DocumentComment, 'id' | 'created_at'>): Promise<DocumentComment> {
    const { data, error } = await supabase
      .from('document_comments')
      .insert(comment)
      .select()
      .single();

    if (error) {
      console.error('[Documents] Error adding comment:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Documents] Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all document subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}

// Export singleton instance
export const documentsRealtimeService = new DocumentsRealtimeService();
