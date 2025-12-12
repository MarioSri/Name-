/**
 * Supabase Storage Service
 * Central service to replace ALL localStorage with Supabase
 * Provides real-time sync for all data across the app
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ==================== TYPES ====================

export interface Recipient {
  id: string;
  user_id: string;
  google_id?: string;
  name: string;
  email: string;
  role: string;
  role_type: string;
  department?: string;
  branch?: string;
  avatar?: string;
  phone?: string;
  designation?: string;
  can_approve: boolean;
  approval_level: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

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
  routing_type: string;
  is_emergency: boolean;
  is_parallel: boolean;
  source: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  metadata?: Record<string, any>;
  workflow?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Virtual - from junction table
  recipients?: DocumentRecipient[];
}

export interface DocumentRecipient {
  id: string;
  document_id: string;
  recipient_id: string;
  recipient_user_id: string;
  recipient_name: string;
  order_index: number;
  status: string;
  created_at: string;
}

export interface ApprovalCard {
  id: string;
  approval_id: string;
  document_id?: string;
  tracking_card_id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  submitter: string;
  submitter_id?: string;
  current_recipient_id?: string;
  routing_type: string;
  is_emergency: boolean;
  is_parallel: boolean;
  source: string;
  workflow?: Record<string, any>;
  comments?: string;
  created_at: string;
  updated_at: string;
  // Virtual - from junction table
  recipients?: ApprovalCardRecipient[];
}

export interface ApprovalCardRecipient {
  id: string;
  approval_card_id: string;
  recipient_id: string;
  recipient_user_id: string;
  recipient_name: string;
  order_index: number;
  status: string;
  created_at: string;
}

export interface Approval {
  id: string;
  approval_card_id: string;
  document_id?: string;
  approver_id: string;
  approver_user_id: string;
  approver_name: string;
  action: string;
  status: string;
  comments?: string;
  signature_url?: string;
  signature_data?: Record<string, any>;
  approved_at: string;
  created_at: string;
}

export interface Comment {
  id: string;
  document_id?: string;
  approval_card_id?: string;
  author_id: string;
  author_user_id: string;
  author_name: string;
  content: string;
  is_private: boolean;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  user_ref_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sound_enabled: boolean;
  theme: string;
  language: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  notification_id: string;
  recipient_id: string;
  notification_type: string;
  priority?: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  is_archived?: boolean;
  action_url?: string;
  data?: Record<string, any>;
  created_at: string;
  expires_at?: string;
  // Legacy fields for compatibility
  type?: string;
  category?: string;
  recipient_user_id?: string;
}

export interface Meeting {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  organizer_id: string;
  start_time?: string;
  end_time?: string;
  status: string;
  meeting_url?: string;
  meeting_type: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_at: string;
  updated_at: string;
  participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  participant_id: string;
  role?: string;
  response_status?: string;
  responded_at?: string;
  attended?: boolean;
  joined_at?: string;
  left_at?: string;
}

export interface CalendarEvent {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  user_id: string;
  owner_user_id: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  color?: string;
  recurrence_rule?: string;
  location?: string;
  is_private: boolean;
  reminder_minutes?: number;
  created_at: string;
  updated_at: string;
  attendees?: EventAttendee[];
}

export interface EventAttendee {
  id: string;
  event_id: string;
  attendee_id: string;
  attendee_user_id: string;
  status: string;
}

type ChangeCallback<T> = (payload: RealtimePostgresChangesPayload<T>) => void;

// ==================== SERVICE CLASS ====================

class SupabaseStorageService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // ==================== RECIPIENTS ====================

  async getRecipients(): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('is_active', true)
      .order('approval_level', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getRecipientByUserId(userId: string): Promise<Recipient | null> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRecipientByEmail(email: string): Promise<Recipient | null> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRecipientsByRole(role: string): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .or(`role.eq.${role},role_type.eq.${role}`)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  async getRecipientsByDepartment(department: string): Promise<Recipient[]> {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('department', department)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  async createOrUpdateRecipient(recipient: Partial<Recipient>): Promise<Recipient> {
    const { data, error } = await supabase
      .from('recipients')
      .upsert({
        user_id: recipient.user_id,
        google_id: recipient.google_id,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role || 'EMPLOYEE',
        role_type: recipient.role_type || 'EMPLOYEE',
        department: recipient.department,
        branch: recipient.branch,
        avatar: recipient.avatar,
        phone: recipient.phone,
        designation: recipient.designation,
        can_approve: recipient.can_approve ?? false,
        approval_level: recipient.approval_level ?? 5,
        is_active: true,
        metadata: recipient.metadata || {},
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== DOCUMENTS ====================

  async getDocuments(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Storage] Error fetching documents:', error);
      throw error;
    }
    
    console.log(`📦 [Storage] Raw documents from Supabase:`, data?.length || 0);
    
    // Get submitter info for each document (batch lookup by UUIDs)
    const submitterUuids = [...new Set((data || []).map(doc => doc.created_by).filter(Boolean))];
    const submitterMap = new Map<string, Recipient>();
    
    if (submitterUuids.length > 0) {
      const { data: submitters } = await supabase
        .from('recipients')
        .select('*')
        .in('id', submitterUuids);
      
      (submitters || []).forEach(s => submitterMap.set(s.id, s));
    }
    
    // Map Supabase columns to TypeScript interface
    return (data || []).map(doc => {
      const submitter = submitterMap.get(doc.created_by);
      return {
        id: doc.id,
        tracking_id: doc.document_id || doc.id,
        title: doc.title || 'Untitled',
        description: doc.description,
        type: doc.document_type || 'letter',
        priority: doc.priority || 'normal',
        status: doc.status || 'pending',
        submitter_id: doc.created_by,
        submitter_name: submitter?.name || 'Unknown',
        submitter_role: submitter?.role || submitter?.role_type || '',
        routing_type: doc.routing_type || 'sequential',
        is_emergency: doc.priority === 'emergency' || doc.priority === 'urgent',
        is_parallel: doc.routing_type === 'parallel',
        source: 'supabase',
        file_url: doc.file_url || doc.google_drive_url,
        file_name: doc.file_name,
        file_size: doc.file_size,
        metadata: doc.metadata,
        workflow: doc.metadata?.workflow,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        recipients: doc.doc_recipients?.map((r: any) => ({
          recipient_id: r.recipient_id,
          recipient_user_id: r.recipient_id,
          recipient_name: '',
          recipient_type: r.recipient_type,
          order_index: r.approval_order || 0,
          status: r.approval_status || 'pending'
        })) || []
      };
    });
  }

  async getDocumentsBySubmitter(submitterId: string): Promise<Document[]> {
    // Resolve UUID if needed
    let submitterUuid = submitterId;
    let submitterInfo: Recipient | null = null;
    
    if (!submitterId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Look up the recipient UUID from user_id
      submitterInfo = await this.getRecipientByUserId(submitterId);
      if (submitterInfo) {
        submitterUuid = submitterInfo.id;
        console.log(`✅ [Storage] Resolved user_id ${submitterId} to UUID ${submitterUuid}`);
      } else {
        console.warn(`⚠️ [Storage] Could not find recipient for user_id: ${submitterId}`);
        return [];
      }
    } else {
      // Already a UUID, fetch the recipient info for name/role
      const { data: recipientData } = await supabase
        .from('recipients')
        .select('*')
        .eq('id', submitterId)
        .single();
      submitterInfo = recipientData;
    }
    
    console.log(`📡 [Storage] Getting documents for UUID: ${submitterUuid}`);
    
    // Query documents (simple query without complex join)
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .eq('created_by', submitterUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Storage] Error fetching documents:', error);
      throw error;
    }
    
    console.log(`✅ [Storage] Found ${data?.length || 0} documents for user ${submitterId}`);
    
    // Map Supabase columns to TypeScript interface
    return (data || []).map(doc => ({
      id: doc.id,
      tracking_id: doc.document_id || doc.id,
      title: doc.title || 'Untitled',
      description: doc.description,
      type: doc.document_type || 'letter',
      priority: doc.priority || 'normal',
      status: doc.status || 'pending',
      submitter_id: submitterInfo?.user_id || doc.created_by, // Use user_id for matching
      submitter_name: submitterInfo?.name || 'Unknown',
      submitter_role: submitterInfo?.role || submitterInfo?.role_type || '',
      routing_type: doc.routing_type || 'sequential',
      is_emergency: doc.priority === 'emergency' || doc.priority === 'urgent',
      is_parallel: doc.routing_type === 'parallel',
      source: 'supabase',
      file_url: doc.file_url || doc.google_drive_url,
      file_name: doc.file_name,
      file_size: doc.file_size,
      metadata: doc.metadata,
      workflow: doc.metadata?.workflow,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      recipients: doc.doc_recipients?.map((r: any) => ({
        recipient_id: r.recipient_id,
        recipient_user_id: r.recipient_id,
        recipient_name: '',
        recipient_type: r.recipient_type,
        order_index: r.approval_order || 0,
        status: r.approval_status || 'pending'
      })) || []
    }));
  }

  async getDocumentByTrackingId(trackingId: string): Promise<Document | null> {
    // Use document_id column (correct Supabase schema column name)
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .eq('document_id', trackingId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    // Get submitter info
    let submitter: Recipient | null = null;
    if (data.created_by) {
      const { data: submitterData } = await supabase
        .from('recipients')
        .select('*')
        .eq('id', data.created_by)
        .single();
      submitter = submitterData;
    }
    
    // Map Supabase columns to TypeScript interface
    return {
      id: data.id,
      tracking_id: data.document_id || data.id,
      title: data.title || 'Untitled',
      description: data.description,
      type: data.document_type || 'letter',
      priority: data.priority || 'normal',
      status: data.status || 'pending',
      submitter_id: data.created_by,
      submitter_name: submitter?.name || 'Unknown',
      submitter_role: submitter?.role || submitter?.role_type || '',
      routing_type: data.routing_type || 'sequential',
      is_emergency: data.priority === 'emergency' || data.priority === 'urgent',
      is_parallel: data.routing_type === 'parallel',
      source: 'supabase',
      file_url: data.file_url || data.google_drive_url,
      file_name: data.file_name,
      file_size: data.file_size,
      metadata: data.metadata,
      workflow: data.metadata?.workflow,
      created_at: data.created_at,
      updated_at: data.updated_at,
      recipients: data.doc_recipients?.map((r: any) => ({
        recipient_id: r.recipient_id,
        recipient_user_id: r.recipient_id,
        recipient_name: '',
        recipient_type: r.recipient_type,
        order_index: r.approval_order || 0,
        status: r.approval_status || 'pending'
      })) || []
    };
  }

  async createDocument(doc: Partial<Document>, recipientIds: { id: string; userId: string; name: string }[]): Promise<Document> {
    // Map document type to valid enum value
    const docTypeMap: Record<string, string> = {
      'Letter': 'letter',
      'Circular': 'circular', 
      'Report': 'report',
      'Memo': 'memo',
      'Notice': 'notice',
      'Proposal': 'proposal',
      'Request': 'request',
      'Application': 'application',
      'Certificate': 'certificate',
      'Meeting Minutes': 'meeting_minutes',
      'Policy': 'policy',
      'Announcement': 'announcement',
      'Document': 'letter', // Default
    };
    
    // Map priority to valid enum value
    const priorityMap: Record<string, string> = {
      'low': 'low',
      'normal': 'normal',
      'medium': 'normal',
      'high': 'high',
      'urgent': 'urgent',
      'emergency': 'emergency',
    };
    
    // Map routing type to valid enum value
    const routingMap: Record<string, string> = {
      'sequential': 'sequential',
      'parallel': 'parallel',
      'reverse': 'reverse',
      'bidirectional': 'bidirectional',
      'hybrid': 'hybrid',
    };

    // Get submitter's recipient ID (UUID) from Supabase
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars, 8-4-4-4-12 hex)
    const isValidUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    let createdByUuid = doc.submitter_id;
    if (doc.submitter_id && !isValidUuid(doc.submitter_id)) {
      // If it's not a UUID, try to look up the recipient by user_id
      console.log('🔍 Looking up UUID for submitter:', doc.submitter_id);
      const recipient = await this.getRecipientByUserId(doc.submitter_id);
      if (recipient) {
        createdByUuid = recipient.id;
        console.log('✅ Found submitter UUID:', createdByUuid);
      } else {
        console.error('❌ Submitter not found in recipients table:', doc.submitter_id);
        throw new Error(`Submitter ${doc.submitter_id} not found in recipients table. Cannot create document.`);
      }
    }

    // Store extra fields in metadata since they don't exist in schema
    const metadata = {
      ...(doc.metadata || {}),
      tracking_id: doc.tracking_id,
      submitter_name: doc.submitter_name,
      submitter_role: doc.submitter_role,
      is_emergency: doc.is_emergency || false,
      is_parallel: doc.is_parallel || false,
      source: doc.source || 'document-management',
      workflow: doc.workflow || {},
    };
    
    console.log('📄 Creating document with mapped values:', {
      title: doc.title,
      document_type: docTypeMap[doc.type || 'Document'] || 'letter',
      priority: priorityMap[doc.priority || 'normal'] || 'normal',
      routing_type: routingMap[doc.routing_type || 'sequential'] || 'sequential',
      created_by: createdByUuid,
    });

    // Create document using actual Supabase schema columns
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        title: doc.title,
        description: doc.description,
        document_type: docTypeMap[doc.type || 'Document'] || 'letter',
        priority: priorityMap[doc.priority || 'normal'] || 'normal',
        status: 'pending',
        created_by: createdByUuid,
        routing_type: routingMap[doc.routing_type || 'sequential'] || 'sequential',
        file_url: doc.file_url,
        file_name: doc.file_name,
        file_size: doc.file_size,
        metadata: metadata,
      })
      .select()
      .single();

    if (docError) {
      console.error('❌ Error creating document:', docError);
      throw docError;
    }

    console.log('✅ Document created:', docData.id, 'document_id:', docData.document_id);

    // Add recipients - use recipient_id (UUID) and proper column names
    if (recipientIds.length > 0) {
      const recipientRecords = recipientIds.map((r, index) => ({
        document_id: docData.id,
        recipient_id: r.id, // This should be UUID
        recipient_type: 'approver',
        approval_order: index,
        approval_status: 'pending',
      }));

      console.log('📋 Adding document recipients:', recipientRecords);

      const { error: recipientError } = await supabase
        .from('document_recipients')
        .insert(recipientRecords);

      if (recipientError) {
        console.error('❌ Error adding document recipients:', recipientError);
        // Don't throw - document was created, recipients failed
        console.warn('Document created but recipients not added. You may need to verify recipient UUIDs exist in the recipients table.');
      }
    }

    // Return with tracking_id for compatibility (stored in metadata or use document_id)
    return {
      ...docData,
      tracking_id: doc.tracking_id || docData.document_id,
    } as Document;
  }

  async updateDocumentStatus(trackingId: string, status: string): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('tracking_id', trackingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== APPROVAL CARDS ====================

  async getApprovalCards(): Promise<ApprovalCard[]> {
    const { data, error } = await supabase
      .from('approval_cards')
      .select(`
        *,
        card_recipients:approval_card_recipients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Storage] Error fetching approval cards:', error);
      throw error;
    }
    
    console.log(`📦 [Storage] Raw approval cards from Supabase:`, data?.length || 0);
    
    // Get submitter info for each card (batch lookup by UUIDs)
    const submitterUuids = [...new Set((data || []).map(card => card.submitted_by).filter(Boolean))];
    const submitterMap = new Map<string, Recipient>();
    
    if (submitterUuids.length > 0) {
      const { data: submitters } = await supabase
        .from('recipients')
        .select('*')
        .in('id', submitterUuids);
      
      (submitters || []).forEach(s => submitterMap.set(s.id, s));
    }
    
    // Also look up current_approver info to get user_id
    const approverUuids = [...new Set((data || []).map(c => c.current_approver_id).filter(Boolean))];
    const approverMap = new Map<string, Recipient>();
    
    if (approverUuids.length > 0) {
      const { data: approvers } = await supabase
        .from('recipients')
        .select('*')
        .in('id', approverUuids);
      
      (approvers || []).forEach(a => approverMap.set(a.id, a));
    }
    
    // Map Supabase columns to TypeScript interface
    return (data || []).map(card => {
      const submitter = submitterMap.get(card.submitted_by);
      const currentApprover = approverMap.get(card.current_approver_id);
      
      return {
        id: card.id,
        approval_id: card.card_id || card.id,
        document_id: card.document_id,
        tracking_card_id: card.card_id || card.id,
        title: card.title || 'Untitled',
        description: card.description,
        type: card.routing_type || 'approval',
        priority: card.priority || 'normal',
        status: card.status || 'pending',
        submitter: submitter?.name || 'Unknown',
        submitter_id: submitter?.user_id || card.submitted_by, // Use user_id for matching
        current_recipient_id: currentApprover?.user_id || card.current_approver_id, // Use user_id for matching
        routing_type: card.routing_type || 'sequential',
        is_emergency: card.priority === 'emergency' || card.priority === 'urgent',
        is_parallel: card.routing_type === 'parallel',
        source: 'supabase',
        workflow: card.metadata?.workflow,
        comments: '',
        created_at: card.created_at,
        updated_at: card.updated_at,
        recipients: card.card_recipients?.map((r: any) => ({
          recipient_id: r.recipient_id,
          recipient_user_id: r.recipient_id,
          recipient_name: '',
          recipient_type: r.recipient_type,
          order_index: r.approval_order || 0,
          status: r.status || 'pending'
        })) || []
      };
    });
  }

  async getApprovalCardsByRecipient(recipientUserId: string): Promise<ApprovalCard[]> {
    // Get the recipient's UUID if we have a user_id string
    let recipientUuid = recipientUserId;
    if (!recipientUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const recipient = await this.getRecipientByUserId(recipientUserId);
      if (recipient) {
        recipientUuid = recipient.id;
        console.log(`✅ [Storage] Resolved user_id ${recipientUserId} to UUID ${recipientUuid}`);
      } else {
        console.warn(`⚠️ [Storage] Could not find recipient for user_id: ${recipientUserId}`);
        // Return empty array if we can't find the recipient - prevents invalid queries
        return [];
      }
    }
    
    console.log(`📡 [Storage] Getting approval cards for UUID: ${recipientUuid}`);
    
    // Get cards where this user is the current approver (simple query without complex join)
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
      console.error('❌ [Storage] Error fetching direct approval cards:', directError);
      throw directError;
    }

    // Also get cards where this user is in the recipients list
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
      console.error('❌ [Storage] Error fetching recipient cards:', recipientError);
      throw recipientError;
    }

    // Combine and deduplicate
    const allCards = [...(directCards || [])];
    const directIds = new Set(allCards.map(c => c.id));
    
    recipientCards?.forEach((rc: any) => {
      if (rc.approval_card && !directIds.has(rc.approval_card.id)) {
        allCards.push(rc.approval_card);
      }
    });

    console.log(`✅ [Storage] Found ${allCards.length} approval cards (${directCards?.length || 0} direct, ${recipientCards?.length || 0} via recipients)`);

    // Get submitter info for all cards (batch lookup)
    const submitterUuids = [...new Set(allCards.map(c => c.submitted_by).filter(Boolean))];
    const submitterMap = new Map<string, Recipient>();
    
    if (submitterUuids.length > 0) {
      const { data: submitters } = await supabase
        .from('recipients')
        .select('*')
        .in('id', submitterUuids);
      
      (submitters || []).forEach(s => submitterMap.set(s.id, s));
    }

    // Also look up current_approver info to get user_id
    const approverUuids = [...new Set(allCards.map(c => c.current_approver_id).filter(Boolean))];
    const approverMap = new Map<string, Recipient>();
    
    if (approverUuids.length > 0) {
      const { data: approvers } = await supabase
        .from('recipients')
        .select('*')
        .in('id', approverUuids);
      
      (approvers || []).forEach(a => approverMap.set(a.id, a));
    }

    // Map Supabase columns to TypeScript interface
    return allCards.map(card => {
      const submitter = submitterMap.get(card.submitted_by);
      const currentApprover = approverMap.get(card.current_approver_id);
      
      return {
        id: card.id,
        approval_id: card.card_id || card.id,
        document_id: card.document_id,
        tracking_card_id: card.card_id || card.id,
        title: card.title || 'Untitled',
        description: card.description,
        type: card.routing_type || 'approval',
        priority: card.priority || 'normal',
        status: card.status || 'pending',
        submitter: submitter?.name || 'Unknown',
        submitter_id: submitter?.user_id || card.submitted_by, // Use user_id for matching
        current_recipient_id: currentApprover?.user_id || card.current_approver_id, // Use user_id for matching
        routing_type: card.routing_type || 'sequential',
        is_emergency: card.priority === 'emergency' || card.priority === 'urgent',
        is_parallel: card.routing_type === 'parallel',
        source: 'supabase',
        workflow: card.metadata?.workflow,
        comments: '',
        created_at: card.created_at,
        updated_at: card.updated_at,
        recipients: card.card_recipients?.map((r: any) => ({
          recipient_id: r.recipient_id,
          recipient_user_id: r.recipient_id,
          recipient_name: '',
          recipient_type: r.recipient_type,
          order_index: r.approval_order || 0,
          status: r.status || 'pending'
        })) || []
      };
    });
  }

  async getApprovalCardByApprovalId(approvalId: string): Promise<ApprovalCard | null> {
    // The approval_cards table uses 'card_id' not 'approval_id'
    const { data, error } = await supabase
      .from('approval_cards')
      .select(`
        *,
        card_recipients:approval_card_recipients(*)
      `)
      .eq('card_id', approvalId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    // Get submitter info
    let submitter: Recipient | null = null;
    if (data.submitted_by) {
      const { data: submitterData } = await supabase
        .from('recipients')
        .select('*')
        .eq('id', data.submitted_by)
        .single();
      submitter = submitterData;
    }
    
    // Map Supabase columns to TypeScript interface
    return {
      id: data.id,
      approval_id: data.card_id || data.id,
      document_id: data.document_id,
      tracking_card_id: data.card_id || data.id,
      title: data.title || 'Untitled',
      description: data.description,
      type: data.routing_type || 'approval',
      priority: data.priority || 'normal',
      status: data.status || 'pending',
      submitter: submitter?.name || 'Unknown',
      submitter_id: data.submitted_by,
      current_recipient_id: data.current_approver_id,
      routing_type: data.routing_type || 'sequential',
      is_emergency: data.priority === 'emergency' || data.priority === 'urgent',
      is_parallel: data.routing_type === 'parallel',
      source: 'supabase',
      workflow: data.metadata?.workflow,
      comments: '',
      created_at: data.created_at,
      updated_at: data.updated_at,
      recipients: data.card_recipients?.map((r: any) => ({
        recipient_id: r.recipient_id,
        recipient_user_id: r.recipient_id,
        recipient_name: '',
        recipient_type: r.recipient_type,
        order_index: r.approval_order || 0,
        status: r.status || 'pending'
      })) || []
    };
  }

  async createApprovalCard(
    card: Partial<ApprovalCard>, 
    recipientIds: { id: string; userId: string; name: string }[]
  ): Promise<ApprovalCard> {
    // Map routing type to valid enum value
    const routingMap: Record<string, string> = {
      'sequential': 'sequential',
      'parallel': 'parallel',
      'reverse': 'reverse',
      'bidirectional': 'bidirectional',
      'hybrid': 'hybrid',
    };
    
    // Map priority to valid enum value
    const priorityMap: Record<string, string> = {
      'low': 'low',
      'normal': 'normal',
      'medium': 'normal',
      'high': 'high',
      'urgent': 'urgent',
      'emergency': 'emergency',
    };
    
    // Get submitted_by UUID - look up from recipients table
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars, 8-4-4-4-12 hex)
    const isValidUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    let submittedByUuid = card.submitter_id;
    if (card.submitter_id && !isValidUuid(card.submitter_id)) {
      // If it's not a UUID, try to look up the recipient
      console.log('🔍 Looking up UUID for card submitter:', card.submitter_id);
      const recipient = await this.getRecipientByUserId(card.submitter_id);
      if (recipient) {
        submittedByUuid = recipient.id;
        console.log('✅ Found card submitter UUID:', submittedByUuid);
      } else {
        console.error(`❌ Submitter ${card.submitter_id} not found in recipients table`);
        throw new Error(`Submitter ${card.submitter_id} not found in recipients table. Cannot create approval card.`);
      }
    }
    
    // Get current_approver_id UUID from first recipient
    let currentApproverUuid = recipientIds[0]?.id;
    if (currentApproverUuid && !isValidUuid(currentApproverUuid)) {
      // If it's not a UUID, try to look up
      console.log('🔍 Looking up UUID for current approver:', recipientIds[0]?.userId);
      const recipient = await this.getRecipientByUserId(recipientIds[0]?.userId || card.current_recipient_id || '');
      if (recipient) {
        currentApproverUuid = recipient.id;
        console.log('✅ Found approver UUID:', currentApproverUuid);
      } else {
        console.error('❌ First recipient not found in recipients table');
        throw new Error('First recipient not found in recipients table. Cannot create approval card.');
      }
    }
    
    // Store extra fields in metadata since they don't exist in schema
    const metadata = {
      ...(card.workflow || {}),
      tracking_card_id: card.tracking_card_id,
      submitter_name: card.submitter,
      type: card.type,
      is_emergency: card.is_emergency || false,
      is_parallel: card.is_parallel || false,
      source: card.source || 'document-management',
      current_recipient_user_id: card.current_recipient_id,
      recipient_names: recipientIds.map(r => r.name),
      recipient_user_ids: recipientIds.map(r => r.userId),
    };
    
    console.log('🔨 Creating approval card with mapped values:', {
      title: card.title,
      submitted_by: submittedByUuid,
      current_approver_id: currentApproverUuid,
      routing_type: routingMap[card.routing_type || 'sequential'] || 'sequential',
      recipientCount: recipientIds.length,
    });
    
    // Create approval card using actual Supabase schema columns
    const { data: cardData, error: cardError } = await supabase
      .from('approval_cards')
      .insert({
        document_id: card.document_id,
        title: card.title,
        description: card.description,
        routing_type: routingMap[card.routing_type || 'sequential'] || 'sequential',
        priority: priorityMap[card.priority || 'normal'] || 'normal',
        status: 'pending',
        submitted_by: submittedByUuid,
        current_approver_id: currentApproverUuid,
        current_step: 1,
        total_steps: recipientIds.length,
        metadata: metadata,
      })
      .select()
      .single();

    if (cardError) {
      console.error('❌ Error creating approval card:', cardError);
      throw cardError;
    }

    console.log('✅ Approval card created:', cardData.id, 'card_id:', cardData.card_id);

    // Add recipients to approval_card_recipients
    if (recipientIds.length > 0) {
      const recipientRecords = recipientIds.map((r, index) => ({
        approval_card_id: cardData.id,
        recipient_id: r.id, // This should be UUID
        recipient_type: 'approver',
        approval_order: index + 1,
        status: index === 0 ? 'pending' : 'pending', // First recipient is active
      }));

      console.log('📋 Adding approval card recipients:', recipientRecords);

      const { error: recipientError } = await supabase
        .from('approval_card_recipients')
        .insert(recipientRecords);

      if (recipientError) {
        console.error('❌ Error adding approval card recipients:', recipientError);
        // Don't throw - card was created, recipients failed
        console.warn('Approval card created but recipients not added. Verify recipient UUIDs exist.');
      } else {
        console.log(`✅ Added ${recipientIds.length} recipients to approval card`);
      }
    }

    // Return with approval_id for compatibility (use card_id from database)
    return {
      ...cardData,
      approval_id: cardData.card_id,
      tracking_card_id: card.tracking_card_id,
    } as ApprovalCard;
  }

  async updateApprovalCardStatus(
    approvalId: string, 
    status: string, 
    nextRecipientId?: string,
    comments?: string
  ): Promise<ApprovalCard> {
    const updates: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (nextRecipientId !== undefined) {
      updates.current_recipient_id = nextRecipientId;
    }
    if (comments) {
      updates.comments = comments;
    }

    const { data, error } = await supabase
      .from('approval_cards')
      .update(updates)
      .eq('approval_id', approvalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== APPROVALS (History) ====================

  async getApprovalHistory(approvalCardId: string): Promise<Approval[]> {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('approval_card_id', approvalCardId)
      .order('approved_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createApproval(approval: Partial<Approval>): Promise<Approval> {
    const { data, error } = await supabase
      .from('approvals')
      .insert({
        approval_card_id: approval.approval_card_id,
        document_id: approval.document_id,
        approver_id: approval.approver_id,
        approver_user_id: approval.approver_user_id,
        approver_name: approval.approver_name,
        action: approval.action,
        status: approval.status,
        comments: approval.comments,
        signature_url: approval.signature_url,
        signature_data: approval.signature_data,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== COMMENTS ====================

  async getComments(documentId?: string, approvalCardId?: string): Promise<Comment[]> {
    let query = supabase.from('comments').select('*');
    
    if (documentId) query = query.eq('document_id', documentId);
    if (approvalCardId) query = query.eq('approval_card_id', approvalCardId);
    
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createComment(comment: Partial<Comment>): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        document_id: comment.document_id,
        approval_card_id: comment.approval_card_id,
        author_id: comment.author_id,
        author_user_id: comment.author_user_id,
        author_name: comment.author_name,
        content: comment.content,
        is_private: comment.is_private ?? false,
        parent_id: comment.parent_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== USER PREFERENCES ====================

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_ref_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    // First get the recipient ID
    const recipient = await this.getRecipientByUserId(userId);
    if (!recipient) throw new Error('User not found');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: recipient.id,
        user_ref_id: userId,
        email_notifications: prefs.email_notifications ?? true,
        push_notifications: prefs.push_notifications ?? true,
        sound_enabled: prefs.sound_enabled ?? true,
        theme: prefs.theme ?? 'light',
        language: prefs.language ?? 'en',
        preferences: prefs.preferences || {},
      }, { onConflict: 'user_ref_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(userId: string): Promise<Notification[]> {
    // Get recipient UUID from user_id
    let recipientUuid = userId;
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const recipient = await this.getRecipientByUserId(userId);
      if (recipient) {
        recipientUuid = recipient.id;
      } else {
        return []; // No matching recipient
      }
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientUuid)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async createNotification(notification: Partial<Notification>): Promise<Notification> {
    // Get recipient UUID if needed
    let recipientUuid = notification.recipient_id;
    if (notification.recipient_user_id && !notification.recipient_id) {
      const recipient = await this.getRecipientByUserId(notification.recipient_user_id);
      if (recipient) {
        recipientUuid = recipient.id;
      }
    }
    
    // Map notification type to valid enum value
    const typeMap: Record<string, string> = {
      'info': 'info',
      'success': 'success',
      'warning': 'warning',
      'error': 'error',
      'approval_request': 'approval_request',
      'approval_approved': 'approval_approved',
      'approval_rejected': 'approval_rejected',
      'document_submitted': 'document_submitted',
      'document_viewed': 'document_viewed',
      'reminder': 'reminder',
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        notification_id: notification.notification_id || `NOTIF-${Date.now()}`,
        recipient_id: recipientUuid,
        notification_type: typeMap[notification.type || 'info'] || 'info',
        priority: notification.priority || 'normal',
        title: notification.title,
        message: notification.message,
        is_read: false,
        action_url: notification.action_url,
        data: notification.data || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('notification_id', notificationId);

    if (error) throw error;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    // Get recipient UUID from user_id
    let recipientUuid = userId;
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const recipient = await this.getRecipientByUserId(userId);
      if (recipient) {
        recipientUuid = recipient.id;
      } else {
        return; // No matching recipient
      }
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', recipientUuid)
      .eq('is_read', false);

    if (error) throw error;
  }

  // ==================== MEETINGS ====================

  async getMeetings(userId?: string): Promise<Meeting[]> {
    let query = supabase
      .from('meetings')
      .select(`
        *,
        participants:meeting_participants(*)
      `)
      .order('start_time', { ascending: true });

    if (userId) {
      query = query.or(`organizer_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getMeetingsByParticipant(userId: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meeting_participants')
      .select(`
        meeting:meetings(
          *,
          participants:meeting_participants(*)
        )
      `)
      .eq('participant_id', userId);

    if (error) throw error;
    return data?.map((d: any) => d.meeting).filter(Boolean) as Meeting[] || [];
  }

  async createMeeting(meeting: Partial<Meeting>, participantIds: { id: string; userId: string; name: string }[]): Promise<Meeting> {
    const meetingId = meeting.meeting_id || `MEET-${Date.now()}`;

    const { data: meetingData, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        meeting_id: meetingId,
        title: meeting.title,
        description: meeting.description,
        organizer_id: meeting.organizer_id,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        status: 'scheduled',
        meeting_url: meeting.meeting_url,
        meeting_type: meeting.meeting_type || 'video',
        is_recurring: meeting.is_recurring || false,
        recurrence_rule: meeting.recurrence_rule,
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Add participants
    if (participantIds.length > 0) {
      const participantRecords = participantIds.map(p => ({
        meeting_id: meetingData.id,
        participant_id: p.id,
        role: 'attendee',
        response_status: 'pending',
      }));

      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert(participantRecords);

      if (participantError) throw participantError;
    }

    return meetingData;
  }

  // ==================== CALENDAR EVENTS ====================

  async getCalendarEvents(userId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:event_attendees(*)
      `)
      .eq('owner_user_id', userId);

    if (startDate) {
      query = query.gte('start_time', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('end_time', endDate.toISOString());
    }

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createCalendarEvent(event: Partial<CalendarEvent>, attendeeIds: { id: string; userId: string }[]): Promise<CalendarEvent> {
    const eventId = event.event_id || `EVT-${Date.now()}`;

    // Get user's recipient record for user_id reference
    const recipient = await this.getRecipientByUserId(event.owner_user_id!);
    if (!recipient) throw new Error('User not found');

    const { data: eventData, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        event_id: eventId,
        title: event.title,
        description: event.description,
        user_id: recipient.id,
        owner_user_id: event.owner_user_id,
        start_time: event.start_time,
        end_time: event.end_time,
        all_day: event.all_day || false,
        event_type: event.event_type || 'event',
        color: event.color,
        recurrence_rule: event.recurrence_rule,
        location: event.location,
        is_private: event.is_private || false,
        reminder_minutes: event.reminder_minutes,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Add attendees
    if (attendeeIds.length > 0) {
      const attendeeRecords = attendeeIds.map(a => ({
        event_id: eventData.id,
        attendee_id: a.id,
        attendee_user_id: a.userId,
        status: 'pending',
      }));

      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert(attendeeRecords);

      if (attendeeError) throw attendeeError;
    }

    return eventData;
  }

  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('event_id', eventId);

    if (error) throw error;
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================

  subscribeToTable<T extends Record<string, any>>(
    tableName: string,
    callback: ChangeCallback<T>,
    filter?: { column: string; value: string }
  ): RealtimeChannel {
    const channelName = filter 
      ? `${tableName}-${filter.column}-${filter.value}`
      : `${tableName}-all`;

    // Reuse existing channel
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    let channel = supabase.channel(channelName);
    
    const config: any = {
      event: '*',
      schema: 'public',
      table: tableName,
    };

    if (filter) {
      config.filter = `${filter.column}=eq.${filter.value}`;
    }

    channel = channel.on('postgres_changes', config, callback);

    channel.subscribe((status) => {
      console.log(`📡 Realtime ${tableName}: ${status}`);
    });

    this.channels.set(channelName, channel);
    return channel;
  }

  unsubscribeFromTable(tableName: string, filter?: { column: string; value: string }): void {
    const channelName = filter 
      ? `${tableName}-${filter.column}-${filter.value}`
      : `${tableName}-all`;

    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
  }

  // Subscribe to documents for a specific submitter (use created_by column which is UUID)
  subscribeToDocuments(submitterUuid: string, callback: ChangeCallback<Document>): RealtimeChannel {
    console.log(`📡 [Storage] Subscribing to documents for created_by=${submitterUuid}`);
    return this.subscribeToTable('documents', callback, { column: 'created_by', value: submitterUuid });
  }

  // Subscribe to approval cards for a specific recipient (use current_approver_id column which is UUID)
  subscribeToApprovalCards(recipientUuid: string, callback: ChangeCallback<ApprovalCard>): RealtimeChannel {
    console.log(`📡 [Storage] Subscribing to approval_cards for current_approver_id=${recipientUuid}`);
    return this.subscribeToTable('approval_cards', callback, { column: 'current_approver_id', value: recipientUuid });
  }

  // Subscribe to notifications for a specific user (use recipient_id column which is UUID)
  subscribeToNotifications(recipientUuid: string, callback: ChangeCallback<Notification>): RealtimeChannel {
    console.log(`📡 [Storage] Subscribing to notifications for recipient_id=${recipientUuid}`);
    return this.subscribeToTable('notifications', callback, { column: 'recipient_id', value: recipientUuid });
  }

  // Subscribe to all approval cards (for admin view)
  subscribeToAllApprovalCards(callback: ChangeCallback<ApprovalCard>): RealtimeChannel {
    console.log(`📡 [Storage] Subscribing to ALL approval_cards`);
    return this.subscribeToTable('approval_cards', callback);
  }

  // Subscribe to all documents (for admin view)
  subscribeToAllDocuments(callback: ChangeCallback<Document>): RealtimeChannel {
    console.log(`📡 [Storage] Subscribing to ALL documents`);
    return this.subscribeToTable('documents', callback);
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
export default supabaseStorage;
