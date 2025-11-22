import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';
import { supabase } from '@/lib/supabase';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  organizer_id: string;
  attendees: string[];
  start_time: string;
  end_time: string;
  platform: 'google-meet' | 'zoom' | 'teams';
  meeting_links: {
    primary: string;
    googleMeet?: { joinUrl: string; meetingId: string };
    zoom?: { joinUrl: string; meetingId: string; password?: string };
    teams?: { joinUrl: string; meetingId: string };
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface MeetingParticipant {
  meeting_id: string;
  user_id: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
  joined_at?: string;
  left_at?: string;
}

class MeetingsRealtimeService {
  private subscriptions: RealtimeSubscription[] = [];

  /**
   * Subscribe to meetings where user is organizer or attendee
   */
  subscribeToUserMeetings(
    userId: string,
    callbacks: {
      onInsert?: (meeting: Meeting) => void;
      onUpdate?: (meeting: Meeting) => void;
      onDelete?: (meeting: Meeting) => void;
    }
  ): RealtimeSubscription[] {
    // Subscribe to meetings where user is organizer
    const organizerSub = realtimeService.subscribe<Meeting>({
      table: 'meetings',
      event: '*',
      filter: `organizer_id=eq.${userId}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    // Subscribe to meetings where user is attendee
    const attendeeSub = realtimeService.subscribe<Meeting>({
      table: 'meetings',
      event: '*',
      filter: `attendees=cs.{${userId}}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(organizerSub, attendeeSub);
    return [organizerSub, attendeeSub];
  }

  /**
   * Subscribe to all meetings (admin view)
   */
  subscribeToAllMeetings(
    callbacks: {
      onInsert?: (meeting: Meeting) => void;
      onUpdate?: (meeting: Meeting) => void;
      onDelete?: (meeting: Meeting) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<Meeting>({
      table: 'meetings',
      event: '*',
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to meeting participants (for tracking who joined/left)
   */
  subscribeToMeetingParticipants(
    meetingId: string,
    callbacks: {
      onInsert?: (participant: MeetingParticipant) => void;
      onUpdate?: (participant: MeetingParticipant) => void;
      onDelete?: (participant: MeetingParticipant) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<MeetingParticipant>({
      table: 'meeting_participants',
      event: '*',
      filter: `meeting_id=eq.${meetingId}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Fetch meetings for a user
   */
  async fetchUserMeetings(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<Meeting[]> {
    let query = supabase
      .from('meetings')
      .select('*')
      .or(`organizer_id.eq.${userId},attendees.cs.{${userId}}`);

    if (dateRange) {
      query = query
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[Meetings] Error fetching meetings:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch all meetings (admin view)
   */
  async fetchAllMeetings(
    status?: Meeting['status'],
    dateRange?: { start: string; end: string }
  ): Promise<Meeting[]> {
    let query = supabase.from('meetings').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (dateRange) {
      query = query
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[Meetings] Error fetching meetings:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new meeting
   */
  async createMeeting(meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>): Promise<Meeting> {
    const { data, error } = await supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single();

    if (error) {
      console.error('[Meetings] Error creating meeting:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update a meeting
   */
  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
    const { data, error } = await supabase
      .from('meetings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Meetings] Error updating meeting:', error);
      throw error;
    }

    return data;
  }

  /**
   * Cancel a meeting
   */
  async cancelMeeting(id: string): Promise<Meeting> {
    return this.updateMeeting(id, { status: 'cancelled' });
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Meetings] Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(
    meetingId: string,
    userId: string,
    status: MeetingParticipant['status']
  ): Promise<MeetingParticipant> {
    const { data, error } = await supabase
      .from('meeting_participants')
      .upsert({
        meeting_id: meetingId,
        user_id: userId,
        status
      })
      .select()
      .single();

    if (error) {
      console.error('[Meetings] Error updating participant status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Unsubscribe from all meeting subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}

// Export singleton instance
export const meetingsRealtimeService = new MeetingsRealtimeService();
