/**
 * Supabase Document Service
 * Handles documents, tracking, and approval cards
 */

import { supabase } from '@/lib/supabase';
import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';

export interface Document {
  id: string;
  tracking_id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  submitter_id: string;
  submitter_name: string;
  submitter_role?: string;
  recipients: string[];
  recipient_ids: string[];
  routing_type: string;
  is_emergency: boolean;
  is_parallel: boolean;
  source: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  metadata: any;
  workflow: any;
  created_at: string;
  updated_at: string;
}

export interface ApprovalCard {
  id: string;
  approval_id: string;
  tracking_card_id: string;
  document_id?: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  submitter: string;
  submitter_id?: string;
  recipients: string[];
  recipient_ids: string[];
  current_recipient_id?: string;
  routing_type: string;
  is_emergency: boolean;
  is_parallel: boolean;
  source: string;
  workflow: any;
  approval_history: any[];
  comments?: string;
  created_at: string;
  updated_at: string;
}

class SupabaseDocumentService {
  // ==================== DOCUMENTS ====================

  /**
   * Create a new document (using normalized schema)
   */
  async createDocument(
    doc: Partial<Document>,
    recipientDetails?: { id: string; userId: string; name: string }[]
  ): Promise<Document> {
    const trackingId = doc.tracking_id || `DOC-${Date.now()}`;
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        tracking_id: trackingId,
        title: doc.title,
        description: doc.description,
        type: doc.type || 'Letter',
        priority: doc.priority || 'normal',
        status: 'pending',
        submitter_id: doc.submitter_id,
        submitter_name: doc.submitter_name,
        submitter_role: doc.submitter_role,
        routing_type: doc.routing_type || 'sequential',
        is_emergency: doc.is_emergency || false,
        is_parallel: doc.is_parallel || false,
        source: doc.source || 'document-management',
        file_url: doc.file_url,
        file_name: doc.file_name,
        file_size: doc.file_size,
        metadata: doc.metadata || {},
        workflow: doc.workflow || {},
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating document:', error);
      throw error;
    }

    // Add recipients to junction table
    if (recipientDetails && recipientDetails.length > 0) {
      const recipientRecords = recipientDetails.map((r, index) => ({
        document_id: data.id,
        recipient_id: r.id,
        recipient_user_id: r.userId,
        recipient_name: r.name,
        order_index: index,
        status: 'pending',
      }));

      const { error: junctionError } = await supabase
        .from('document_recipients')
        .insert(recipientRecords);

      if (junctionError) {
        console.error('❌ Error adding document recipients:', junctionError);
      }
    }

    console.log('✅ Document created:', data.tracking_id);
    return data;
  }

  /**
   * Get document by tracking ID (with recipients)
   */
  async getDocumentByTrackingId(trackingId: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        recipients:document_recipients(*)
      `)
      .eq('tracking_id', trackingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching document:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get documents by submitter (with recipients)
   */
  async getDocumentsBySubmitter(submitterId: string): Promise<Document[]> {
    // Get submitter UUID from user_id if needed
    let submitterUuid = submitterId;
    if (!submitterId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Look up the submitter UUID
      const { data: recipient } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', submitterId)
        .single();
      if (recipient) {
        submitterUuid = recipient.id;
        console.log(`✅ [DocService] Resolved submitter user_id ${submitterId} to UUID ${submitterUuid}`);
      } else {
        console.warn(`⚠️ [DocService] Could not find recipient for submitter user_id: ${submitterId}`);
        // Return empty array to prevent invalid queries
        return [];
      }
    }
    
    console.log(`📡 [DocService] Getting documents for submitter UUID: ${submitterUuid}`);
    
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .eq('created_by', submitterUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      throw error;
    }
    
    console.log(`✅ [DocService] Found ${data?.length || 0} documents`);

    // Convert doc_recipients to flat arrays for backward compatibility
    return (data || []).map(doc => ({
      ...doc,
      recipients: doc.doc_recipients?.map((r: any) => r.recipient_name) || [],
      recipient_ids: doc.doc_recipients?.map((r: any) => r.recipient_user_id) || [],
    }));
  }

  /**
   * Get all documents (with recipients)
   */
  async getAllDocuments(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      throw error;
    }

    // Convert doc_recipients to flat arrays for backward compatibility
    return (data || []).map(doc => ({
      ...doc,
      recipients: doc.doc_recipients?.map((r: any) => r.recipient_name) || [],
      recipient_ids: doc.doc_recipients?.map((r: any) => r.recipient_user_id) || [],
    }));
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(trackingId: string, status: string): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_id', trackingId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating document status:', error);
      throw error;
    }

    console.log('✅ Document status updated:', trackingId, status);
    return data;
  }

  /**
   * Update document
   */
  async updateDocument(trackingId: string, updates: Partial<Document>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_id', trackingId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating document:', error);
      throw error;
    }

    return data;
  }

  // ==================== APPROVAL CARDS ====================

  /**
   * Create approval cards for document recipients
   */
  async createApprovalCards(document: Document): Promise<ApprovalCard[]> {
    const cards: ApprovalCard[] = [];
    const recipientIds = document.recipient_ids || [];
    const recipients = document.recipients || [];

    if (document.is_parallel || document.routing_type === 'parallel') {
      // Create cards for all recipients at once
      for (let i = 0; i < recipientIds.length; i++) {
        const card = await this.createApprovalCard({
          tracking_card_id: document.tracking_id,
          document_id: document.id,
          title: document.title,
          description: document.description,
          type: document.type,
          priority: document.priority,
          submitter: document.submitter_name,
          submitter_id: document.submitter_id,
          recipients,
          recipient_ids: recipientIds,
          current_recipient_id: recipientIds[i],
          routing_type: document.routing_type,
          is_emergency: document.is_emergency,
          is_parallel: true,
          source: document.source,
          workflow: document.workflow,
        });
        cards.push(card);
      }
    } else {
      // Sequential: create card for first recipient only
      if (recipientIds.length > 0) {
        const card = await this.createApprovalCard({
          tracking_card_id: document.tracking_id,
          document_id: document.id,
          title: document.title,
          description: document.description,
          type: document.type,
          priority: document.priority,
          submitter: document.submitter_name,
          submitter_id: document.submitter_id,
          recipients,
          recipient_ids: recipientIds,
          current_recipient_id: recipientIds[0],
          routing_type: document.routing_type,
          is_emergency: document.is_emergency,
          is_parallel: false,
          source: document.source,
          workflow: document.workflow,
        });
        cards.push(card);
      }
    }

    return cards;
  }

  /**
   * Create single approval card
   */
  async createApprovalCard(card: Partial<ApprovalCard>): Promise<ApprovalCard> {
    const { data, error } = await supabase
      .from('approval_cards')
      .insert({
        approval_id: card.approval_id || `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tracking_card_id: card.tracking_card_id,
        document_id: card.document_id,
        title: card.title,
        description: card.description,
        type: card.type || 'Letter',
        priority: card.priority || 'normal',
        status: 'pending',
        submitter: card.submitter,
        submitter_id: card.submitter_id,
        recipients: card.recipients || [],
        recipient_ids: card.recipient_ids || [],
        current_recipient_id: card.current_recipient_id,
        routing_type: card.routing_type || 'sequential',
        is_emergency: card.is_emergency || false,
        is_parallel: card.is_parallel || false,
        source: card.source || 'document-management',
        workflow: card.workflow || {},
        approval_history: [],
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating approval card:', error);
      throw error;
    }

    console.log('✅ Approval card created:', data.approval_id);
    return data;
  }

  /**
   * Get approvals by recipient
   */
  async getApprovalsByRecipient(recipientId: string): Promise<ApprovalCard[]> {
    const { data, error } = await supabase
      .from('approval_cards')
      .select('*')
      .or(`current_recipient_id.eq.${recipientId},recipient_ids.cs.{${recipientId}}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching approvals:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get pending approvals by recipient
   */
  async getPendingApprovalsByRecipient(recipientId: string): Promise<ApprovalCard[]> {
    // Get recipient UUID from user_id if needed
    let recipientUuid = recipientId;
    if (!recipientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Look up the recipient UUID
      const { data: recipient } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', recipientId)
        .single();
      if (recipient) {
        recipientUuid = recipient.id;
        console.log(`✅ [DocService] Resolved user_id ${recipientId} to UUID ${recipientUuid}`);
      } else {
        console.warn(`⚠️ [DocService] Could not find recipient for user_id: ${recipientId}`);
        // Return empty array to prevent invalid queries
        return [];
      }
    }
    
    console.log(`📡 [DocService] Getting pending approvals for UUID: ${recipientUuid}`);
    
    // Get cards where this user is the current approver (correct column name)
    const { data: directCards, error: directError } = await supabase
      .from('approval_cards')
      .select(`
        *,
        card_recipients:approval_card_recipients(*)
      `)
      .eq('current_approver_id', recipientUuid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (directError) {
      console.error('❌ Error fetching direct pending approvals:', directError);
      throw directError;
    }

    // Also get cards where this user is in the recipients list (for parallel routing)
    // Use recipient_id (UUID) instead of recipient_user_id which doesn't exist
    const { data: recipientCards, error: recipientError } = await supabase
      .from('approval_card_recipients')
      .select(`
        approval_card:approval_cards(
          *,
          card_recipients:approval_card_recipients(*)
        )
      `)
      .eq('recipient_id', recipientUuid)
      .eq('status', 'pending');

    if (recipientError) {
      console.error('❌ Error fetching recipient pending approvals:', recipientError);
      // Don't fail - just use direct cards
    }

    // Combine and deduplicate
    const allCards = [...(directCards || [])];
    const directIds = new Set(allCards.map(c => c.id));
    
    recipientCards?.forEach((rc: any) => {
      if (rc.approval_card && !directIds.has(rc.approval_card.id)) {
        allCards.push(rc.approval_card);
      }
    });
    
    console.log(`✅ [DocService] Found ${allCards.length} pending approvals`);

    // Convert card_recipients to flat arrays for backward compatibility
    // Note: approval_card_recipients table has: recipient_id (UUID), recipient_type, approval_order
    return allCards.map(card => ({
      ...card,
      recipients: card.card_recipients?.map((r: any) => r.recipient_type) || [],
      recipient_ids: card.card_recipients?.map((r: any) => r.recipient_id) || [],
    }));
  }

  /**
   * Update approval status
   */
  async updateApprovalStatus(approvalId: string, status: string): Promise<ApprovalCard> {
    // Use card_id instead of approval_id
    const { data, error } = await supabase
      .from('approval_cards')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('card_id', approvalId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating approval status:', error);
      throw error;
    }

    console.log('✅ Approval status updated:', approvalId, status);
    return data;
  }

  /**
   * Delete approval card
   */
  async deleteApprovalCard(approvalId: string): Promise<void> {
    const { error } = await supabase
      .from('approval_cards')
      .delete()
      .eq('approval_id', approvalId);

    if (error) {
      console.error('❌ Error deleting approval card:', error);
      throw error;
    }

    console.log('✅ Approval card deleted:', approvalId);
  }

  /**
   * Delete approvals by tracking ID
   */
  async deleteApprovalsByTrackingId(trackingCardId: string): Promise<void> {
    const { error } = await supabase
      .from('approval_cards')
      .delete()
      .eq('tracking_card_id', trackingCardId);

    if (error) {
      console.error('❌ Error deleting approvals:', error);
      throw error;
    }

    console.log('✅ Approvals deleted for tracking card:', trackingCardId);
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to documents
   */
  subscribeToDocuments(callback: (payload: any) => void): RealtimeSubscription {
    return realtimeService.subscribe<Document>({
      table: 'documents',
      onChange: callback,
    });
  }

  /**
   * Subscribe to approvals
   */
  subscribeToApprovals(callback: (payload: any) => void): RealtimeSubscription {
    return realtimeService.subscribe<ApprovalCard>({
      table: 'approval_cards',
      onChange: callback,
    });
  }

  /**
   * Unsubscribe from all
   */
  unsubscribeAll(): void {
    realtimeService.unsubscribeAll();
  }
}

export const supabaseDocumentService = new SupabaseDocumentService();
export default supabaseDocumentService;
