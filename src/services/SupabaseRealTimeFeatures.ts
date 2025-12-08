/**
 * Supabase Real-Time Features Service
 * Handles LiveMeet+, Notes & Reminders, Analytics, Approval History, Notifications, Search
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface LiveMeetRequest {
  id?: string;
  request_id: string;
  title: string;
  description?: string;
  submitter_id: string;
  submitter_name: string;
  submitter_role?: string;
  submitter_department?: string;
  request_type?: string;
  priority?: string;
  status?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  location?: string;
  meeting_url?: string;
  is_emergency?: boolean;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  participants?: LiveMeetParticipant[];
}

export interface LiveMeetParticipant {
  id?: string;
  request_id?: string;
  participant_id: string;
  participant_name: string;
  participant_role?: string;
  status?: string;
  response_at?: string;
}

export interface Note {
  id?: string;
  note_id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  content?: string;
  color?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  category?: string;
  tags?: string[];
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Reminder {
  id?: string;
  reminder_id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description?: string;
  reminder_time: string;
  reminder_type?: string;
  recurrence_rule?: string;
  is_completed?: boolean;
  is_snoozed?: boolean;
  snooze_until?: string;
  priority?: string;
  category?: string;
  linked_document_id?: string;
  linked_approval_id?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalHistoryItem {
  id?: string;
  history_id: string;
  document_id?: string;
  approval_card_id?: string;
  tracking_id: string;
  title: string;
  action: string;
  action_by_id: string;
  action_by_name: string;
  action_by_role?: string;
  previous_status?: string;
  new_status?: string;
  comments?: string;
  signature_url?: string;
  metadata?: any;
  created_at?: string;
}

export interface Notification {
  id?: string;
  notification_id: string;
  recipient_id?: string;
  recipient_user_id: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  is_read?: boolean;
  action_url?: string;
  data?: any;
  created_at?: string;
}

export interface AnalyticsSnapshot {
  id?: string;
  snapshot_date: string;
  total_documents?: number;
  pending_documents?: number;
  approved_documents?: number;
  rejected_documents?: number;
  total_users?: number;
  active_users?: number;
  total_approvals?: number;
  avg_approval_time_hours?: number;
  department_stats?: any;
  role_stats?: any;
  created_at?: string;
}

export interface SearchHistoryItem {
  id?: string;
  search_id: string;
  user_id: string;
  user_name: string;
  query: string;
  search_type?: string;
  filters?: any;
  results_count?: number;
  created_at?: string;
}

// ============================================================
// SUPABASE REAL-TIME FEATURES SERVICE
// ============================================================

class SupabaseRealTimeFeaturesService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  // ============================================================
  // LIVEMEET+ METHODS
  // ============================================================

  async createLiveMeetRequest(request: LiveMeetRequest, participants: string[]): Promise<LiveMeetRequest | null> {
    try {
      const { data, error } = await supabase
        .from('livemeet_requests')
        .insert({
          request_id: request.request_id || `livemeet-${Date.now()}`,
          title: request.title,
          description: request.description,
          submitter_id: request.submitter_id,
          submitter_name: request.submitter_name,
          submitter_role: request.submitter_role,
          submitter_department: request.submitter_department,
          request_type: request.request_type || 'meeting',
          priority: request.priority || 'normal',
          status: 'pending',
          scheduled_time: request.scheduled_time,
          duration_minutes: request.duration_minutes || 30,
          location: request.location,
          is_emergency: request.is_emergency || false,
          metadata: request.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      if (data && participants.length > 0) {
        const participantRecords = participants.map(p => ({
          request_id: data.id,
          participant_id: p,
          participant_name: p, // Will be resolved from recipients
          status: 'pending'
        }));

        await supabase.from('livemeet_participants').insert(participantRecords);
      }

      console.log('✅ LiveMeet+ request created:', data?.request_id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create LiveMeet+ request:', error);
      return null;
    }
  }

  async getLiveMeetRequests(userId: string): Promise<LiveMeetRequest[]> {
    try {
      // Get requests where user is a participant (not the submitter)
      const { data: participantData } = await supabase
        .from('livemeet_participants')
        .select('request_id')
        .eq('participant_id', userId);

      const requestIds = participantData?.map(p => p.request_id) || [];

      if (requestIds.length === 0) return [];

      const { data, error } = await supabase
        .from('livemeet_requests')
        .select(`
          *,
          livemeet_participants (*)
        `)
        .in('id', requestIds)
        .neq('submitter_id', userId) // Exclude requests created by user
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get LiveMeet+ requests:', error);
      return [];
    }
  }

  async updateLiveMeetRequestStatus(requestId: string, status: string, participantId?: string): Promise<boolean> {
    try {
      if (participantId) {
        // Update participant response
        const { error } = await supabase
          .from('livemeet_participants')
          .update({ 
            status, 
            response_at: new Date().toISOString() 
          })
          .eq('request_id', requestId)
          .eq('participant_id', participantId);

        if (error) throw error;
      }

      // Update main request status if all participants responded
      const { data: participants } = await supabase
        .from('livemeet_participants')
        .select('status')
        .eq('request_id', requestId);

      const allResponded = participants?.every(p => p.status !== 'pending');
      if (allResponded) {
        const allAccepted = participants?.every(p => p.status === 'accepted');
        await supabase
          .from('livemeet_requests')
          .update({ 
            status: allAccepted ? 'confirmed' : 'partial',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to update LiveMeet+ status:', error);
      return false;
    }
  }

  subscribeLiveMeetRequests(userId: string, callback: (requests: LiveMeetRequest[]) => void): () => void {
    const channel = supabase
      .channel(`livemeet-${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'livemeet_requests' },
        () => this.getLiveMeetRequests(userId).then(callback)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'livemeet_participants', filter: `participant_id=eq.${userId}` },
        () => this.getLiveMeetRequests(userId).then(callback)
      )
      .subscribe();

    this.subscriptions.set(`livemeet-${userId}`, channel);
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`livemeet-${userId}`);
    };
  }

  // ============================================================
  // NOTES METHODS
  // ============================================================

  async createNote(note: Note): Promise<Note | null> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          note_id: note.note_id || `note-${Date.now()}`,
          owner_id: note.owner_id,
          owner_name: note.owner_name,
          title: note.title,
          content: note.content,
          color: note.color || 'yellow',
          is_pinned: note.is_pinned || false,
          category: note.category || 'general',
          tags: note.tags || [],
          metadata: note.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Note created:', data?.note_id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create note:', error);
      return null;
    }
  }

  async getNotes(userId: string): Promise<Note[]> {
    try {
      // Note: The 'notes' table doesn't exist in Supabase schema
      // Return empty array and log warning
      console.warn('⚠️ Notes table does not exist in Supabase schema. Using localStorage fallback.');
      return [];
    } catch (error) {
      console.error('❌ Failed to get notes:', error);
      return [];
    }
  }

  async updateNote(noteId: string, updates: Partial<Note>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('note_id', noteId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to update note:', error);
      return false;
    }
  }

  async deleteNote(noteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('note_id', noteId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to delete note:', error);
      return false;
    }
  }

  subscribeNotes(userId: string, callback: (notes: Note[]) => void): () => void {
    const channel = supabase
      .channel(`notes-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `owner_id=eq.${userId}` },
        () => this.getNotes(userId).then(callback)
      )
      .subscribe();

    this.subscriptions.set(`notes-${userId}`, channel);
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`notes-${userId}`);
    };
  }

  // ============================================================
  // REMINDERS METHODS
  // ============================================================

  async createReminder(reminder: Reminder): Promise<Reminder | null> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          reminder_id: reminder.reminder_id || `reminder-${Date.now()}`,
          owner_id: reminder.owner_id,
          owner_name: reminder.owner_name,
          title: reminder.title,
          description: reminder.description,
          reminder_time: reminder.reminder_time,
          reminder_type: reminder.reminder_type || 'once',
          recurrence_rule: reminder.recurrence_rule,
          priority: reminder.priority || 'normal',
          category: reminder.category || 'general',
          linked_document_id: reminder.linked_document_id,
          linked_approval_id: reminder.linked_approval_id,
          metadata: reminder.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Reminder created:', data?.reminder_id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create reminder:', error);
      return null;
    }
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'dismissed')
        .order('remind_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get reminders:', error);
      return [];
    }
  }

  async updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('reminder_id', reminderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to update reminder:', error);
      return false;
    }
  }

  async deleteReminder(reminderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('reminder_id', reminderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to delete reminder:', error);
      return false;
    }
  }

  subscribeReminders(userId: string, callback: (reminders: Reminder[]) => void): () => void {
    const channel = supabase
      .channel(`reminders-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `owner_id=eq.${userId}` },
        () => this.getReminders(userId).then(callback)
      )
      .subscribe();

    this.subscriptions.set(`reminders-${userId}`, channel);
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`reminders-${userId}`);
    };
  }

  // ============================================================
  // APPROVAL HISTORY METHODS
  // ============================================================

  async addApprovalHistory(history: ApprovalHistoryItem): Promise<ApprovalHistoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .insert({
          history_id: history.history_id || `history-${Date.now()}`,
          document_id: history.document_id,
          approval_card_id: history.approval_card_id,
          tracking_id: history.tracking_id,
          title: history.title,
          action: history.action,
          action_by_id: history.action_by_id,
          action_by_name: history.action_by_name,
          action_by_role: history.action_by_role,
          previous_status: history.previous_status,
          new_status: history.new_status,
          comments: history.comments,
          signature_url: history.signature_url,
          metadata: history.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Approval history added:', data?.history_id);
      return data;
    } catch (error) {
      console.error('❌ Failed to add approval history:', error);
      return null;
    }
  }

  async getApprovalHistory(options?: { 
    userId?: string; 
    trackingId?: string;
    limit?: number;
  }): Promise<ApprovalHistoryItem[]> {
    try {
      let query = supabase
        .from('approval_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.userId) {
        query = query.eq('action_by_id', options.userId);
      }
      if (options?.trackingId) {
        query = query.eq('tracking_id', options.trackingId);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get approval history:', error);
      return [];
    }
  }

  subscribeApprovalHistory(userId: string, callback: (history: ApprovalHistoryItem[]) => void): () => void {
    const channel = supabase
      .channel(`approval-history-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'approval_history' },
        () => this.getApprovalHistory({ limit: 50 }).then(callback)
      )
      .subscribe();

    this.subscriptions.set(`approval-history-${userId}`, channel);
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`approval-history-${userId}`);
    };
  }

  // ============================================================
  // NOTIFICATIONS METHODS
  // ============================================================

  async createNotification(notification: Notification): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          notification_id: notification.notification_id || `notif-${Date.now()}`,
          recipient_user_id: notification.recipient_user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          category: notification.category || 'general',
          is_read: false,
          action_url: notification.action_url,
          data: notification.data || {}
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Notification created:', data?.notification_id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      return null;
    }
  }

  async getNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    try {
      // Get recipient UUID from user_id if needed
      let recipientUuid = userId;
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: recipient } = await supabase
          .from('recipients')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (recipient) {
          recipientUuid = recipient.id;
        }
      }
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', recipientUuid)
        .order('created_at', { ascending: false })
        .limit(50);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get notifications:', error);
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('notification_id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return false;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      // Get recipient UUID from user_id if needed
      let recipientUuid = userId;
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: recipient } = await supabase
          .from('recipients')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (recipient) {
          recipientUuid = recipient.id;
        }
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', recipientUuid)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      return false;
    }
  }

  subscribeNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    // Get recipient UUID for subscription filter (this is sync, so we start with user_id and fix later)
    // The subscription will use the notification's recipient_id (UUID)
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => this.getNotifications(userId).then(callback)
      )
      .subscribe();

    this.subscriptions.set(`notifications-${userId}`, channel);
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`notifications-${userId}`);
    };
  }

  // ============================================================
  // ANALYTICS METHODS
  // ============================================================

  async getAnalyticsSnapshot(date?: string): Promise<AnalyticsSnapshot | null> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('snapshot_date', targetDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to get analytics snapshot:', error);
      return null;
    }
  }

  async generateAnalyticsSnapshot(): Promise<AnalyticsSnapshot | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get document counts
      const { count: totalDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true });
      const { count: pendingDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: approvedDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      const { count: rejectedDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

      // Get user counts
      const { count: totalUsers } = await supabase.from('recipients').select('*', { count: 'exact', head: true });
      const { count: activeUsers } = await supabase.from('recipients').select('*', { count: 'exact', head: true }).eq('is_active', true);

      // Get approval counts
      const { count: totalApprovals } = await supabase.from('approvals').select('*', { count: 'exact', head: true });

      // Get department stats
      const { data: deptData } = await supabase.from('recipients').select('department');
      const departmentStats: any = {};
      deptData?.forEach(r => {
        if (r.department) {
          departmentStats[r.department] = (departmentStats[r.department] || 0) + 1;
        }
      });

      // Get role stats
      const { data: roleData } = await supabase.from('recipients').select('role');
      const roleStats: any = {};
      roleData?.forEach(r => {
        if (r.role) {
          roleStats[r.role] = (roleStats[r.role] || 0) + 1;
        }
      });

      const snapshot: AnalyticsSnapshot = {
        snapshot_date: today,
        total_documents: totalDocs || 0,
        pending_documents: pendingDocs || 0,
        approved_documents: approvedDocs || 0,
        rejected_documents: rejectedDocs || 0,
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_approvals: totalApprovals || 0,
        avg_approval_time_hours: 0,
        department_stats: departmentStats,
        role_stats: roleStats
      };

      // Upsert snapshot
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .upsert(snapshot, { onConflict: 'snapshot_date' })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Analytics snapshot generated for:', today);
      return data;
    } catch (error) {
      console.error('❌ Failed to generate analytics snapshot:', error);
      return null;
    }
  }

  async getLiveAnalytics(): Promise<any> {
    try {
      // Get real-time counts
      const [
        { count: totalDocs },
        { count: pendingDocs },
        { count: approvedDocs },
        { count: pendingApprovals },
        { count: totalUsers }
      ] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('approval_cards').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('recipients').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);

      return {
        totalDocuments: totalDocs || 0,
        pendingDocuments: pendingDocs || 0,
        approvedDocuments: approvedDocs || 0,
        pendingApprovals: pendingApprovals || 0,
        activeUsers: totalUsers || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to get live analytics:', error);
      return null;
    }
  }

  subscribeAnalytics(callback: (analytics: any) => void): () => void {
    const channel = supabase
      .channel('analytics')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        () => this.getLiveAnalytics().then(callback)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'approval_cards' },
        () => this.getLiveAnalytics().then(callback)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'approvals' },
        () => this.getLiveAnalytics().then(callback)
      )
      .subscribe();

    this.subscriptions.set('analytics', channel);
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete('analytics');
    };
  }

  // ============================================================
  // SEARCH METHODS
  // ============================================================

  async globalSearch(query: string, userId: string, userName: string): Promise<any> {
    try {
      // Use the SQL global_search function for optimized searching
      const { data: searchResults, error: searchError } = await supabase
        .rpc('global_search', {
          search_query: query,
          search_user_id: userId,
          max_results: 50
        });

      if (searchError) {
        console.warn('SQL function search failed, falling back to direct queries:', searchError);
        return this.fallbackSearch(query, userId, userName);
      }

      // Group results by type
      const trackingCards = (searchResults || [])
        .filter((r: any) => r.result_type === 'tracking_card')
        .map((r: any) => ({
          id: r.result_id,
          tracking_id: r.result_tracking_id,
          title: r.result_title,
          description: r.result_description,
          status: r.result_status,
          created_at: r.result_created_at,
          relevance: r.relevance
        }));

      const approvalCards = (searchResults || [])
        .filter((r: any) => r.result_type === 'approval_card')
        .map((r: any) => ({
          id: r.result_id,
          approval_id: r.result_tracking_id,
          title: r.result_title,
          description: r.result_description,
          status: r.result_status,
          created_at: r.result_created_at,
          relevance: r.relevance
        }));

      const approvalHistory = (searchResults || [])
        .filter((r: any) => r.result_type === 'approval_history')
        .map((r: any) => ({
          id: r.result_id,
          tracking_id: r.result_tracking_id,
          title: r.result_title,
          comments: r.result_description,
          action: r.result_status,
          created_at: r.result_created_at,
          relevance: r.relevance
        }));

      const liveMeetRequests = (searchResults || [])
        .filter((r: any) => r.result_type === 'livemeet_card')
        .map((r: any) => ({
          id: r.result_id,
          request_id: r.result_tracking_id,
          title: r.result_title,
          description: r.result_description,
          status: r.result_status,
          created_at: r.result_created_at,
          relevance: r.relevance
        }));

      const totalResults = (searchResults || []).length;

      // Save search history
      await supabase.from('search_history').insert({
        search_id: `search-${Date.now()}`,
        user_id: userId,
        user_name: userName,
        query,
        search_type: 'global',
        results_count: totalResults
      });

      return {
        trackingCards,
        approvalCards,
        approvalHistory,
        liveMeetRequests,
        totalResults,
        allResults: searchResults || []
      };
    } catch (error) {
      console.error('❌ Search failed:', error);
      return this.fallbackSearch(query, userId, userName);
    }
  }

  // Fallback search method using direct queries (if SQL function not available)
  private async fallbackSearch(query: string, userId: string, userName: string): Promise<any> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;

      // Search tracking documents (Track Cards)
      const { data: trackingCards } = await supabase
        .from('documents')
        .select('*')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},tracking_id.ilike.${searchTerm}`)
        .limit(15);

      // Search approval cards
      const { data: approvalCards } = await supabase
        .from('approval_cards')
        .select('*')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},approval_id.ilike.${searchTerm}`)
        .limit(15);

      // Search approval history
      const { data: approvalHistory } = await supabase
        .from('approval_history')
        .select('*')
        .or(`title.ilike.${searchTerm},tracking_id.ilike.${searchTerm},action.ilike.${searchTerm},action_by_name.ilike.${searchTerm},comments.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(15);

      // Search LiveMeet+ requests
      const { data: liveMeetRequests } = await supabase
        .from('livemeet_requests')
        .select('*')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},request_id.ilike.${searchTerm},submitter_name.ilike.${searchTerm}`)
        .limit(15);

      const totalResults = 
        (trackingCards?.length || 0) + 
        (approvalCards?.length || 0) + 
        (approvalHistory?.length || 0) + 
        (liveMeetRequests?.length || 0);

      // Save search history
      await supabase.from('search_history').insert({
        search_id: `search-${Date.now()}`,
        user_id: userId,
        user_name: userName,
        query,
        search_type: 'global',
        results_count: totalResults
      });

      return {
        trackingCards: trackingCards || [],
        approvalCards: approvalCards || [],
        approvalHistory: approvalHistory || [],
        liveMeetRequests: liveMeetRequests || [],
        totalResults
      };
    } catch (error) {
      console.error('❌ Search failed:', error);
      return { documents: [], approvalCards: [], recipients: [], totalResults: 0 };
    }
  }

  async getSearchHistory(userId: string, limit = 10): Promise<SearchHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get search history:', error);
      return [];
    }
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, key) => {
      channel.unsubscribe();
      console.log(`🔌 Unsubscribed from: ${key}`);
    });
    this.subscriptions.clear();
  }
}

export const supabaseRealTimeFeatures = new SupabaseRealTimeFeaturesService();
