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
  recipient_user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  action_url?: string;
  data?: Record<string, any>;
  created_at: string;
}

export interface Meeting {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  host_id: string;
  host_user_id: string;
  host_name: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
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
  participant_user_id: string;
  participant_name: string;
  status: string;
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

    if (error) throw error;
    
    // Convert junction table objects to arrays for backward compatibility
    return (data || []).map(doc => ({
      ...doc,
      recipients: doc.doc_recipients?.map((r: any) => ({
        recipient_name: r.recipient_name,
        recipient_user_id: r.recipient_user_id,
        order_index: r.order_index
      })) || []
    }));
  }

  async getDocumentsBySubmitter(submitterId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .eq('submitter_id', submitterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Convert junction table objects to arrays for backward compatibility
    return (data || []).map(doc => ({
      ...doc,
      recipients: doc.doc_recipients?.map((r: any) => ({
        recipient_name: r.recipient_name,
        recipient_user_id: r.recipient_user_id,
        order_index: r.order_index
      })) || []
    }));
  }

  async getDocumentByTrackingId(trackingId: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        doc_recipients:document_recipients(*)
      `)
      .eq('tracking_id', trackingId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    // Convert junction table objects for backward compatibility
    return {
      ...data,
      recipients: data.doc_recipients?.map((r: any) => ({
        recipient_name: r.recipient_name,
        recipient_user_id: r.recipient_user_id,
        order_index: r.order_index
      })) || []
    };
  }

  async createDocument(doc: Partial<Document>, recipientIds: { id: string; userId: string; name: string }[]): Promise<Document> {
    const trackingId = doc.tracking_id || `DOC-${Date.now()}`;
    
    // Create document
    const { data: docData, error: docError } = await supabase
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

    if (docError) throw docError;

    // Add recipients
    if (recipientIds.length > 0) {
      const recipientRecords = recipientIds.map((r, index) => ({
        document_id: docData.id,
        recipient_id: r.id,
        recipient_user_id: r.userId,
        recipient_name: r.name,
        order_index: index,
        status: 'pending',
      }));

      const { error: recipientError } = await supabase
        .from('document_recipients')
        .insert(recipientRecords);

      if (recipientError) throw recipientError;
    }

    return docData;
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

    if (error) throw error;
    
    // Convert junction table objects to arrays for backward compatibility
    return (data || []).map(card => ({
      ...card,
      recipients: card.card_recipients?.map((r: any) => ({
        recipient_name: r.recipient_name,
        recipient_user_id: r.recipient_user_id,
        order_index: r.order_index
      })) || []
    }));
  }

  async getApprovalCardsByRecipient(recipientUserId: string): Promise<ApprovalCard[]> {
    // Get cards where this user is the current recipient
    const { data: directCards, error: directError } = await supabase
      .from('approval_cards')
      .select(`
        *,
        card_recipients:approval_card_recipients(*)
      `)
      .eq('current_recipient_id', recipientUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (directError) throw directError;

    // Also get cards where this user is in the recipients list
    const { data: recipientCards, error: recipientError } = await supabase
      .from('approval_card_recipients')
      .select(`
        approval_card:approval_cards(
          *,
          card_recipients:approval_card_recipients(*)
        )
      `)
      .eq('recipient_user_id', recipientUserId)
      .eq('status', 'pending');

    if (recipientError) throw recipientError;

    // Combine and deduplicate
    const allCards = [...(directCards || [])];
    const directIds = new Set(allCards.map(c => c.id));
    
    recipientCards?.forEach(rc => {
      if (rc.approval_card && !directIds.has(rc.approval_card.id)) {
        allCards.push(rc.approval_card);
      }
    });

    // Convert junction table objects to arrays for backward compatibility
    return allCards.map(card => ({
      ...card,
      recipients: card.card_recipients?.map((r: any) => ({
        recipient_name: r.recipient_name,
        recipient_user_id: r.recipient_user_id,
        order_index: r.order_index
      })) || []
    }));
  }

  async getApprovalCardByApprovalId(approvalId: string): Promise<ApprovalCard | null> {
    const { data, error } = await supabase
      .from('approval_cards')
      .select(`
        *,
        card_recipients:approval_card_recipients(*)
      `)
      .eq('approval_id', approvalId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    // Convert junction table objects for backward compatibility
    return {
      ...data,
      recipients: data.card_recipients?.map((r: any) => ({
        recipient_name: r.recipient_name,
        recipient_user_id: r.recipient_user_id,
        order_index: r.order_index
      })) || []
    };
  }

  async createApprovalCard(
    card: Partial<ApprovalCard>, 
    recipientIds: { id: string; userId: string; name: string }[]
  ): Promise<ApprovalCard> {
    const approvalId = card.approval_id || `APPR-${Date.now()}`;
    
    // Use provided current_recipient_id, or default to first recipient
    const currentRecipientId = card.current_recipient_id || recipientIds[0]?.userId;
    
    console.log('🔨 Creating approval card:', {
      approvalId,
      title: card.title,
      currentRecipientId,
      recipientCount: recipientIds.length,
      routingType: card.routing_type
    });
    
    // Create approval card
    const { data: cardData, error: cardError } = await supabase
      .from('approval_cards')
      .insert({
        approval_id: approvalId,
        document_id: card.document_id,
        tracking_card_id: card.tracking_card_id,
        title: card.title,
        description: card.description,
        type: card.type || 'Letter',
        priority: card.priority || 'normal',
        status: 'pending',
        submitter: card.submitter,
        submitter_id: card.submitter_id,
        current_recipient_id: currentRecipientId,
        routing_type: card.routing_type || 'sequential',
        is_emergency: card.is_emergency || false,
        is_parallel: card.is_parallel || false,
        source: card.source || 'document-management',
        workflow: card.workflow || {},
        comments: card.comments,
      })
      .select()
      .single();

    if (cardError) {
      console.error('❌ Error creating approval card:', cardError);
      throw cardError;
    }

    console.log('✅ Approval card created:', cardData.id);

    // Add recipients
    if (recipientIds.length > 0) {
      const recipientRecords = recipientIds.map((r, index) => ({
        approval_card_id: cardData.id,
        recipient_id: r.id,
        recipient_user_id: r.userId,
        recipient_name: r.name,
        order_index: index,
        status: index === 0 ? 'current' : 'pending', // First recipient is current
      }));

      console.log('📋 Adding recipients to approval card:', recipientRecords.map(r => r.recipient_name));

      const { error: recipientError } = await supabase
        .from('approval_card_recipients')
        .insert(recipientRecords);

      if (recipientError) {
        console.error('❌ Error adding recipients:', recipientError);
        throw recipientError;
      }
      
      console.log(`✅ Added ${recipientIds.length} recipients to approval card`);
    }

    return cardData;
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
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async createNotification(notification: Partial<Notification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        notification_id: notification.notification_id || `NOTIF-${Date.now()}`,
        recipient_id: notification.recipient_id,
        recipient_user_id: notification.recipient_user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        category: notification.category || 'general',
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
      .update({ is_read: true })
      .eq('notification_id', notificationId);

    if (error) throw error;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', userId)
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
      .order('scheduled_start', { ascending: true });

    if (userId) {
      query = query.or(`host_user_id.eq.${userId}`);
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
      .eq('participant_user_id', userId);

    if (error) throw error;
    return data?.map(d => d.meeting).filter(Boolean) || [];
  }

  async createMeeting(meeting: Partial<Meeting>, participantIds: { id: string; userId: string; name: string }[]): Promise<Meeting> {
    const meetingId = meeting.meeting_id || `MEET-${Date.now()}`;

    const { data: meetingData, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        meeting_id: meetingId,
        title: meeting.title,
        description: meeting.description,
        host_id: meeting.host_id,
        host_user_id: meeting.host_user_id,
        host_name: meeting.host_name,
        scheduled_start: meeting.scheduled_start,
        scheduled_end: meeting.scheduled_end,
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
        participant_user_id: p.userId,
        participant_name: p.name,
        status: 'invited',
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

  // Subscribe to documents for a specific submitter
  subscribeToDocuments(submitterId: string, callback: ChangeCallback<Document>): RealtimeChannel {
    return this.subscribeToTable('documents', callback, { column: 'submitter_id', value: submitterId });
  }

  // Subscribe to approval cards for a specific recipient
  subscribeToApprovalCards(recipientId: string, callback: ChangeCallback<ApprovalCard>): RealtimeChannel {
    return this.subscribeToTable('approval_cards', callback, { column: 'current_recipient_id', value: recipientId });
  }

  // Subscribe to notifications for a specific user
  subscribeToNotifications(userId: string, callback: ChangeCallback<Notification>): RealtimeChannel {
    return this.subscribeToTable('notifications', callback, { column: 'recipient_user_id', value: userId });
  }

  // Subscribe to all approval cards (for admin view)
  subscribeToAllApprovalCards(callback: ChangeCallback<ApprovalCard>): RealtimeChannel {
    return this.subscribeToTable('approval_cards', callback);
  }

  // Subscribe to all documents (for admin view)
  subscribeToAllDocuments(callback: ChangeCallback<Document>): RealtimeChannel {
    return this.subscribeToTable('documents', callback);
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
export default supabaseStorage;
