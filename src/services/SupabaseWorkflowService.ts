/**
 * Supabase Workflow Service
 * Handles recipients, approval workflows, and user management
 */

import { supabase } from '@/lib/supabase';
import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';

export interface Recipient {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  role_type: string;
  department?: string;
  branch?: string;
  avatar?: string;
  phone?: string;
  designation?: string;
  is_active: boolean;
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

class SupabaseWorkflowService {
  // ==================== RECIPIENTS ====================

  /**
   * Get all recipients
   */
  async getRecipients(): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Error fetching recipients:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get recipient by ID or email
   */
  async getRecipientById(idOrEmail: string): Promise<Recipient | null> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .or(`user_id.eq.${idOrEmail},email.eq.${idOrEmail}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching recipient:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get recipients by role
   */
  async getRecipientsByRole(role: string): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .or(`role.eq.${role},role_type.eq.${role}`)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching recipients by role:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get recipients by department
   */
  async getRecipientsByDepartment(department: string): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('department', department)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching recipients by department:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new recipient
   */
  async createRecipient(recipient: Partial<Recipient>): Promise<Recipient> {
    const { data, error } = await supabase
      .from('recipients')
      .insert({
        user_id: recipient.user_id || `user-${Date.now()}`,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role || 'EMPLOYEE',
        role_type: recipient.role_type || 'EMPLOYEE',
        department: recipient.department,
        branch: recipient.branch,
        avatar: recipient.avatar,
        phone: recipient.phone,
        designation: recipient.designation,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating recipient:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update recipient
   */
  async updateRecipient(idOrEmail: string, updates: Partial<Recipient>): Promise<Recipient> {
    const { data, error } = await supabase
      .from('recipients')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .or(`user_id.eq.${idOrEmail},email.eq.${idOrEmail}`)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating recipient:', error);
      throw error;
    }

    return data;
  }

  // ==================== APPROVAL CARDS ====================

  /**
   * Get approval cards for a recipient (using normalized junction table)
   */
  async getApprovalCards(recipientUserId?: string): Promise<ApprovalCard[]> {
    if (!recipientUserId) {
      // Get all approval cards
      const { data, error } = await supabase
        .from('approval_cards')
        .select(`
          *,
          recipients:approval_card_recipients(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching approval cards:', error);
        throw error;
      }
      return data || [];
    }

    // Get recipient UUID from user_id if needed
    let recipientUuid = recipientUserId;
    if (!recipientUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: recipient } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', recipientUserId)
        .single();
      if (recipient) {
        recipientUuid = recipient.id;
        console.log(`✅ [Workflow] Resolved user_id ${recipientUserId} to UUID ${recipientUuid}`);
      } else {
        console.warn(`⚠️ [Workflow] Could not find recipient for user_id: ${recipientUserId}`);
        // Return empty array if we can't resolve the UUID
        return [];
      }
    }

    console.log(`📡 [Workflow] Getting approval cards for UUID: ${recipientUuid}`);

    // Get cards where user is current approver (correct column name)
    const { data: directCards, error: directError } = await supabase
      .from('approval_cards')
      .select(`
        *,
        recipients:approval_card_recipients(*)
      `)
      .eq('current_approver_id', recipientUuid)
      .order('created_at', { ascending: false });

    if (directError) {
      console.error('❌ Error fetching direct approval cards:', directError);
      throw directError;
    }

    // Also get cards from junction table - use recipient_id (UUID) not recipient_user_id
    const { data: junctionCards, error: junctionError } = await supabase
      .from('approval_card_recipients')
      .select(`
        approval_card:approval_cards(
          *,
          recipients:approval_card_recipients(*)
        )
      `)
      .eq('recipient_id', recipientUuid);

    if (junctionError) {
      console.error('❌ Error fetching junction approval cards:', junctionError);
      throw junctionError;
    }

    // Combine and deduplicate
    const allCards = [...(directCards || [])];
    const directIds = new Set(allCards.map(c => c.id));
    
    junctionCards?.forEach((jc: any) => {
      if (jc.approval_card && !directIds.has(jc.approval_card.id)) {
        allCards.push(jc.approval_card);
      }
    });

    return allCards;
  }

  /**
   * Get pending approval cards for a recipient
   */
  async getPendingApprovalCards(recipientUserId: string): Promise<ApprovalCard[]> {
    const cards = await this.getApprovalCards(recipientUserId);
    return cards.filter(c => c.status === 'pending');
  }

  /**
   * Create approval card with recipients (using normalized junction table)
   */
  async createApprovalCard(
    card: Partial<ApprovalCard>,
    recipientDetails?: { id: string; userId: string; name: string }[]
  ): Promise<ApprovalCard> {
    const approvalId = card.approval_id || `approval-${Date.now()}`;
    
    const { data, error } = await supabase
      .from('approval_cards')
      .insert({
        approval_id: approvalId,
        tracking_card_id: card.tracking_card_id,
        document_id: card.document_id,
        title: card.title,
        description: card.description,
        type: card.type || 'Letter',
        priority: card.priority || 'normal',
        status: 'pending',
        submitter: card.submitter,
        submitter_id: card.submitter_id,
        current_recipient_id: recipientDetails?.[0]?.userId || card.current_recipient_id,
        routing_type: card.routing_type || 'sequential',
        is_emergency: card.is_emergency || false,
        is_parallel: card.is_parallel || false,
        source: card.source || 'document-management',
        workflow: card.workflow || {},
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating approval card:', error);
      throw error;
    }

    // Add recipients to junction table
    if (recipientDetails && recipientDetails.length > 0) {
      const recipientRecords = recipientDetails.map((r, index) => ({
        approval_card_id: data.id,
        recipient_id: r.id,
        recipient_user_id: r.userId,
        recipient_name: r.name,
        order_index: index,
        status: 'pending',
      }));

      const { error: junctionError } = await supabase
        .from('approval_card_recipients')
        .insert(recipientRecords);

      if (junctionError) {
        console.error('❌ Error adding approval card recipients:', junctionError);
        // Don't throw - card is created, just log the error
      }
    }

    console.log('✅ Approval card created:', data.approval_id);
    return data;
  }

  /**
   * Update approval card status (now uses separate approvals table)
   */
  async updateApprovalCardStatus(
    approvalId: string,
    status: string,
    userId: string,
    userName: string,
    comments?: string,
    nextRecipientId?: string
  ): Promise<ApprovalCard> {
    // Get the current card first
    const { data: currentCard, error: fetchError } = await supabase
      .from('approval_cards')
      .select('*')
      .eq('approval_id', approvalId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching approval card:', fetchError);
      throw fetchError;
    }

    // Get user's recipient record for the approvals table
    const { data: recipient } = await supabase
      .from('recipients')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Create approval record in the approvals table
    if (recipient) {
      await supabase
        .from('approvals')
        .insert({
          approval_card_id: currentCard.id,
          document_id: currentCard.document_id,
          approver_id: recipient.id,
          approver_user_id: userId,
          approver_name: userName,
          action: status,
          status: status,
          comments: comments,
          approved_at: new Date().toISOString(),
        });
    }

    // Update the approval card
    const updates: any = {
      status,
      comments,
      updated_at: new Date().toISOString(),
    };

    if (nextRecipientId !== undefined) {
      updates.current_recipient_id = nextRecipientId;
    }

    const { data, error } = await supabase
      .from('approval_cards')
      .update(updates)
      .eq('approval_id', approvalId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating approval card:', error);
      throw error;
    }

    console.log('✅ Approval card updated:', approvalId, status);
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

  // ==================== REALTIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to approval cards for a recipient
   */
  subscribeToApprovalCards(
    recipientId: string,
    callback: (payload: any) => void
  ): RealtimeSubscription {
    return realtimeService.subscribe<ApprovalCard>({
      table: 'approval_cards',
      onChange: callback,
    });
  }

  /**
   * Subscribe to recipients changes
   */
  subscribeToRecipients(callback: (payload: any) => void): RealtimeSubscription {
    return realtimeService.subscribe<Recipient>({
      table: 'recipients',
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

export const supabaseWorkflowService = new SupabaseWorkflowService();
export default supabaseWorkflowService;
