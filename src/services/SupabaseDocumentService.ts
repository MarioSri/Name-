/**
 * Supabase Document Service
 * Handles all document-related database operations with real-time support
 * Replaces localStorage['submitted-documents'] and localStorage['pending-approvals']
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface DocumentData {
  id?: string;
  document_id: string;
  title: string;
  type: string;
  submitter_id?: string;
  submitter_name: string;
  submitted_date?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  description: string;
  recipients: string[];
  recipient_ids: string[];
  workflow?: {
    steps: Array<{
      name: string;
      assignee: string;
      status: 'pending' | 'current' | 'completed' | 'rejected' | 'bypassed';
      completedDate?: string;
    }>;
    currentStep: string;
    progress: number;
    isParallel?: boolean;
    hasBypass?: boolean;
  };
  source: 'document-management' | 'emergency-management' | 'approval-chain-bypass';
  routing_type?: 'sequential' | 'parallel' | 'reverse' | 'bidirectional';
  is_emergency?: boolean;
  is_parallel?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'partially-approved';
  signed_by?: string[];
  rejected_by?: string[];
  files?: any[];
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalCard {
  id?: string;
  approval_id: string;
  tracking_card_id: string;
  document_id: string;
  title: string;
  type: string;
  submitter_name: string;
  submitter_id?: string;
  submitted_date?: string;
  priority: string;
  description: string;
  recipients: string[];
  recipient_ids: string[];
  workflow?: any;
  source: string;
  routing_type?: string;
  is_emergency?: boolean;
  is_parallel?: boolean;
  status: string;
  files?: any[];
  metadata?: any;
}

class SupabaseDocumentService {
  private documentChannel: RealtimeChannel | null = null;
  private approvalChannel: RealtimeChannel | null = null;

  // =====================================================
  // SUBMITTED DOCUMENTS OPERATIONS
  // =====================================================

  /**
   * Create a new submitted document
   */
  async createDocument(document: DocumentData): Promise<DocumentData> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .insert([{
          document_id: document.document_id,
          title: document.title,
          type: document.type,
          submitter_id: document.submitter_id,
          submitter_name: document.submitter_name,
          submitted_date: document.submitted_date || new Date().toISOString(),
          priority: document.priority,
          description: document.description,
          recipients: document.recipients,
          recipient_ids: document.recipient_ids,
          workflow: document.workflow,
          source: document.source,
          routing_type: document.routing_type,
          is_emergency: document.is_emergency,
          is_parallel: document.is_parallel,
          status: document.status,
          signed_by: document.signed_by || [],
          rejected_by: document.rejected_by || [],
          files: document.files,
          metadata: document.metadata
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Document created in Supabase:', data.document_id);
      return data as DocumentData;
    } catch (error) {
      console.error('❌ Error creating document:', error);
      throw error;
    }
  }

  /**
   * Get documents submitted by a specific user
   */
  async getDocumentsBySubmitter(submitterId: string): Promise<DocumentData[]> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .select('*')
        .eq('submitter_id', submitterId)
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data as DocumentData[];
    } catch (error) {
      console.error('❌ Error fetching documents:', error);
      return [];
    }
  }

  /**
   * Get all documents (for admin/principal)
   */
  async getAllDocuments(): Promise<DocumentData[]> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .select('*')
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data as DocumentData[];
    } catch (error) {
      console.error('❌ Error fetching all documents:', error);
      return [];
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string): Promise<DocumentData | null> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (error) throw error;
      return data as DocumentData;
    } catch (error) {
      console.error('❌ Error fetching document:', error);
      return null;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(documentId: string, updates: Partial<DocumentData>): Promise<DocumentData | null> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .update(updates)
        .eq('document_id', documentId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Document updated:', documentId);
      return data as DocumentData;
    } catch (error) {
      console.error('❌ Error updating document:', error);
      return null;
    }
  }

  /**
   * Update document workflow
   */
  async updateWorkflow(documentId: string, workflow: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('submitted_documents')
        .update({ workflow })
        .eq('document_id', documentId);

      if (error) throw error;

      console.log('✅ Workflow updated for document:', documentId);
    } catch (error) {
      console.error('❌ Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(
    documentId: string, 
    status: 'pending' | 'approved' | 'rejected' | 'partially-approved'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('submitted_documents')
        .update({ status })
        .eq('document_id', documentId);

      if (error) throw error;

      console.log('✅ Document status updated:', documentId, status);
    } catch (error) {
      console.error('❌ Error updating document status:', error);
      throw error;
    }
  }

  /**
   * Add signature to document
   */
  async addSignature(documentId: string, signerName: string): Promise<void> {
    try {
      // Get current document
      const doc = await this.getDocumentById(documentId);
      if (!doc) throw new Error('Document not found');

      const signedBy = [...(doc.signed_by || []), signerName];

      const { error } = await supabase
        .from('submitted_documents')
        .update({ signed_by: signedBy })
        .eq('document_id', documentId);

      if (error) throw error;

      console.log('✅ Signature added:', signerName);
    } catch (error) {
      console.error('❌ Error adding signature:', error);
      throw error;
    }
  }

  /**
   * Add rejection to document
   */
  async addRejection(documentId: string, rejectorName: string): Promise<void> {
    try {
      const doc = await this.getDocumentById(documentId);
      if (!doc) throw new Error('Document not found');

      const rejectedBy = [...(doc.rejected_by || []), rejectorName];

      const { error } = await supabase
        .from('submitted_documents')
        .update({ rejected_by: rejectedBy })
        .eq('document_id', documentId);

      if (error) throw error;

      console.log('✅ Rejection added:', rejectorName);
    } catch (error) {
      console.error('❌ Error adding rejection:', error);
      throw error;
    }
  }

  // =====================================================
  // APPROVAL CARDS OPERATIONS
  // =====================================================

  /**
   * Create approval cards for recipients
   */
  async createApprovalCards(document: DocumentData): Promise<void> {
    try {
      const approvalCard: ApprovalCard = {
        approval_id: `approval-${document.document_id}`,
        tracking_card_id: document.document_id,
        document_id: document.document_id,
        title: document.title,
        type: document.type,
        submitter_name: document.submitter_name,
        submitter_id: document.submitter_id,
        submitted_date: document.submitted_date,
        priority: document.priority,
        description: document.description,
        recipients: document.recipients,
        recipient_ids: document.recipient_ids,
        workflow: document.workflow,
        source: document.source,
        routing_type: document.routing_type,
        is_emergency: document.is_emergency,
        is_parallel: document.is_parallel,
        status: 'pending',
        files: document.files,
        metadata: document.metadata
      };

      const { error } = await supabase
        .from('pending_approvals')
        .insert([approvalCard]);

      if (error) throw error;

      console.log('✅ Approval cards created for:', document.recipient_ids.length, 'recipients');
    } catch (error) {
      console.error('❌ Error creating approval cards:', error);
      throw error;
    }
  }

  /**
   * Get approval cards for a specific recipient
   */
  async getApprovalsByRecipient(recipientId: string): Promise<ApprovalCard[]> {
    try {
      const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .contains('recipient_ids', [recipientId])
        .order('submitted_date', { ascending: false });

      if (error) throw error;

      console.log(`✅ Found ${data?.length || 0} approval cards for recipient:`, recipientId);
      return data as ApprovalCard[];
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
      return [];
    }
  }

  /**
   * Get all approval cards
   */
  async getAllApprovals(): Promise<ApprovalCard[]> {
    try {
      const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data as ApprovalCard[];
    } catch (error) {
      console.error('❌ Error fetching all approvals:', error);
      return [];
    }
  }

  /**
   * Update approval card status
   */
  async updateApprovalStatus(approvalId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_approvals')
        .update({ status })
        .eq('approval_id', approvalId);

      if (error) throw error;

      console.log('✅ Approval status updated:', approvalId, status);
    } catch (error) {
      console.error('❌ Error updating approval status:', error);
      throw error;
    }
  }

  /**
   * Delete approval card (after approval/rejection)
   */
  async deleteApprovalCard(approvalId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_approvals')
        .delete()
        .eq('approval_id', approvalId);

      if (error) throw error;

      console.log('✅ Approval card deleted:', approvalId);
    } catch (error) {
      console.error('❌ Error deleting approval card:', error);
      throw error;
    }
  }

  /**
   * Delete approval cards by tracking card ID
   */
  async deleteApprovalsByTrackingId(trackingCardId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_approvals')
        .delete()
        .eq('tracking_card_id', trackingCardId);

      if (error) throw error;

      console.log('✅ Approval cards deleted for tracking card:', trackingCardId);
    } catch (error) {
      console.error('❌ Error deleting approval cards:', error);
      throw error;
    }
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Subscribe to document changes
   */
  subscribeToDocuments(callback: (payload: any) => void): RealtimeChannel {
    this.documentChannel = supabase
      .channel('submitted_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submitted_documents'
        },
        (payload) => {
          console.log('📡 Document change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();

    console.log('🔔 Subscribed to document changes');
    return this.documentChannel;
  }

  /**
   * Subscribe to approval card changes
   */
  subscribeToApprovals(callback: (payload: any) => void): RealtimeChannel {
    this.approvalChannel = supabase
      .channel('pending_approvals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_approvals'
        },
        (payload) => {
          console.log('📡 Approval change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();

    console.log('🔔 Subscribed to approval changes');
    return this.approvalChannel;
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    if (this.documentChannel) {
      supabase.removeChannel(this.documentChannel);
      this.documentChannel = null;
    }
    if (this.approvalChannel) {
      supabase.removeChannel(this.approvalChannel);
      this.approvalChannel = null;
    }
    console.log('🔕 Unsubscribed from all channels');
  }

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  /**
   * Get documents where user is a recipient
   */
  async getDocumentsForRecipient(recipientId: string): Promise<DocumentData[]> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .select('*')
        .contains('recipient_ids', [recipientId])
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data as DocumentData[];
    } catch (error) {
      console.error('❌ Error fetching documents for recipient:', error);
      return [];
    }
  }

  /**
   * Get documents by status
   */
  async getDocumentsByStatus(status: string): Promise<DocumentData[]> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .select('*')
        .eq('status', status)
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data as DocumentData[];
    } catch (error) {
      console.error('❌ Error fetching documents by status:', error);
      return [];
    }
  }

  /**
   * Get emergency documents
   */
  async getEmergencyDocuments(): Promise<DocumentData[]> {
    try {
      const { data, error } = await supabase
        .from('submitted_documents')
        .select('*')
        .eq('is_emergency', true)
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data as DocumentData[];
    } catch (error) {
      console.error('❌ Error fetching emergency documents:', error);
      return [];
    }
  }
}

// Singleton instance
export const supabaseDocumentService = new SupabaseDocumentService();
export default supabaseDocumentService;
