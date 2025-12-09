/**
 * useSupabaseRealTimeMeetings Hook
 * React hook for real-time meeting management using Supabase
 * Provides CRUD operations and real-time subscriptions for meetings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Meeting, MeetingAttendee, MeetingStatus, MeetingPriority, MeetingType, MeetingCategory } from '@/types/meeting';

// Supabase meeting record structure (matches actual schema)
interface SupabaseMeeting {
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
}

// Supabase meeting participant record (matches actual schema)
interface SupabaseMeetingParticipant {
  id: string;
  meeting_id: string;
  participant_id: string;
  role?: string;
  response_status?: string;
  responded_at?: string;
  attended?: boolean;
  joined_at?: string;
  left_at?: string;
  notified_at?: string;
  reminder_sent?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UseSupabaseRealTimeMeetingsResult {
  meetings: Meeting[];
  createMeeting: (meeting: Partial<Meeting>) => Promise<Meeting>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<Meeting>;
  deleteMeeting: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

// Convert Supabase record to Meeting type
function toMeeting(record: SupabaseMeeting, participants: SupabaseMeetingParticipant[] = []): Meeting {
  const attendees: MeetingAttendee[] = participants.map(p => ({
    id: p.participant_id,
    name: p.participant_id, // Will be resolved from recipients table if needed
    email: '',
    role: p.role || 'Attendee',
    department: undefined,
    status: (p.response_status || 'pending') as any,
    responseTime: p.responded_at ? new Date(p.responded_at) : undefined,
    isRequired: true,
    canEdit: false
  }));

  // Parse date and time from start_time
  const startDate = record.start_time ? new Date(record.start_time) : new Date();
  const endDate = record.end_time ? new Date(record.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

  return {
    id: record.id,
    title: record.title,
    description: record.description || '',
    date: startDate.toISOString().split('T')[0],
    time: startDate.toTimeString().slice(0, 5),
    duration: durationMinutes || 60,
    location: record.meeting_url || '',
    type: record.meeting_type as MeetingType,
    status: record.status as MeetingStatus,
    priority: 'medium' as MeetingPriority,
    category: 'general' as MeetingCategory,
    isRecurring: record.is_recurring,
    parentMeetingId: undefined,
    recurringPattern: record.recurrence_rule ? { frequency: 'weekly', interval: 1 } : undefined,
    meetingLinks: record.meeting_url ? { primary: 'custom' as any } : undefined,
    notifications: undefined,
    department: undefined,
    tags: [],
    attendees,
    documents: [],
    createdBy: record.organizer_id,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}

// Convert Meeting to Supabase insert format
function toSupabaseInsert(meeting: Partial<Meeting>, userId: string, userName: string): Partial<SupabaseMeeting> {
  // Build start_time from date and time
  const dateStr = meeting.date || new Date().toISOString().split('T')[0];
  const timeStr = meeting.time || '09:00';
  const startTime = new Date(`${dateStr}T${timeStr}:00`);
  const durationMs = (meeting.duration || 60) * 60 * 1000;
  const endTime = new Date(startTime.getTime() + durationMs);

  return {
    meeting_id: `mtg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: meeting.title || 'Untitled Meeting',
    description: meeting.description,
    organizer_id: userId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    meeting_type: meeting.type || 'video',
    status: meeting.status || 'scheduled',
    is_recurring: meeting.isRecurring || false,
    recurrence_rule: meeting.recurringPattern ? JSON.stringify(meeting.recurringPattern) : undefined,
    meeting_url: meeting.location || meeting.meetingLinks?.primary
  };
}

export function useSupabaseRealTimeMeetings(): UseSupabaseRealTimeMeetingsResult {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const participantsSubscriptionRef = useRef<any>(null);

  // Fetch all meetings with participants
  const fetchMeetings = useCallback(async () => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch meetings (use start_time instead of meeting_date - correct column name)
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .order('start_time', { ascending: true });

      if (meetingsError) {
        console.error('❌ Error fetching meetings:', meetingsError);
        setError(meetingsError.message);
        setIsConnected(false);
        return;
      }

      // Fetch all participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('meeting_participants')
        .select('*');

      if (participantsError) {
        console.warn('⚠️ Error fetching participants:', participantsError);
      }

      // Group participants by meeting
      const participantsByMeeting: Record<string, SupabaseMeetingParticipant[]> = {};
      (participantsData || []).forEach((p: SupabaseMeetingParticipant) => {
        if (!participantsByMeeting[p.meeting_id]) {
          participantsByMeeting[p.meeting_id] = [];
        }
        participantsByMeeting[p.meeting_id].push(p);
      });

      // Convert to Meeting objects
      const convertedMeetings = (meetingsData || []).map((m: SupabaseMeeting) => 
        toMeeting(m, participantsByMeeting[m.id] || [])
      );

      setMeetings(convertedMeetings);
      setIsConnected(true);
      console.log('✅ Loaded', convertedMeetings.length, 'meetings from Supabase');

    } catch (err) {
      console.error('❌ Failed to fetch meetings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    fetchMeetings();

    // Subscribe to meetings table changes
    subscriptionRef.current = supabase
      .channel('meetings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        (payload) => {
          console.log('📡 Meetings realtime update:', payload.eventType);
          fetchMeetings(); // Refetch on any change
        }
      )
      .subscribe((status) => {
        console.log('📡 Meetings subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to participants table changes
    participantsSubscriptionRef.current = supabase
      .channel('meeting-participants-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_participants' },
        (payload) => {
          console.log('📡 Meeting participants realtime update:', payload.eventType);
          fetchMeetings(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (participantsSubscriptionRef.current) {
        supabase.removeChannel(participantsSubscriptionRef.current);
      }
    };
  }, [fetchMeetings]);

  // Create a new meeting
  const createMeeting = useCallback(async (meetingData: Partial<Meeting>): Promise<Meeting> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // First, get or create the host recipient record
      const hostUserId = user.id || user.email || 'unknown';
      const hostName = user.name || user.email || 'Unknown User';
      
      // Try to find existing recipient
      let { data: hostRecipient } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', hostUserId)
        .single();

      // If no recipient exists, create one
      if (!hostRecipient) {
        const { data: newRecipient, error: recipientError } = await supabase
          .from('recipients')
          .insert({
            user_id: hostUserId,
            name: hostName,
            email: user.email || '',
            role: user.role || 'Staff',
            department: 'General'
          })
          .select('id')
          .single();

        if (recipientError) {
          console.warn('⚠️ Could not create host recipient:', recipientError);
          // Continue without organizer_id - schema may need adjustment
        } else {
          hostRecipient = newRecipient;
        }
      }

      const insertData: any = toSupabaseInsert(meetingData, hostUserId, hostName);
      if (hostRecipient) {
        insertData.organizer_id = hostRecipient.id;
      }

      const { data: newMeeting, error: insertError } = await supabase
        .from('meetings')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating meeting:', insertError);
        throw new Error(insertError.message);
      }

      // Insert participants if provided
      if (meetingData.attendees && meetingData.attendees.length > 0) {
        for (const attendee of meetingData.attendees) {
          // Find or create participant recipient
          let { data: participantRecipient } = await supabase
            .from('recipients')
            .select('id')
            .eq('user_id', attendee.id)
            .single();

          if (!participantRecipient) {
            const { data: newParticipant } = await supabase
              .from('recipients')
              .insert({
                user_id: attendee.id,
                name: attendee.name,
                email: attendee.email || '',
                role: attendee.role || 'Attendee',
                department: attendee.department || 'General'
              })
              .select('id')
              .single();
            participantRecipient = newParticipant;
          }

          if (participantRecipient) {
            await supabase
              .from('meeting_participants')
              .insert({
                meeting_id: newMeeting.id,
                participant_id: participantRecipient.id,
                participant_user_id: attendee.id,
                participant_name: attendee.name,
                status: attendee.status || 'invited'
              });
          }
        }
      }

      const created = toMeeting(newMeeting, []);
      console.log('✅ Created meeting:', created.id);

      toast({
        title: "Meeting Created",
        description: `"${created.title}" has been scheduled.`
      });

      return created;

    } catch (err) {
      console.error('❌ Failed to create meeting:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create meeting',
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  // Update an existing meeting
  const updateMeeting = useCallback(async (id: string, updates: Partial<Meeting>): Promise<Meeting> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      
      // Handle date/time -> start_time/end_time conversion
      if (updates.date !== undefined || updates.time !== undefined || updates.duration !== undefined) {
        // Fetch existing meeting to get current values
        const { data: existing } = await supabase
          .from('meetings')
          .select('start_time, end_time')
          .eq('id', id)
          .single();
        
        const existingStart = existing?.start_time ? new Date(existing.start_time) : new Date();
        const existingEnd = existing?.end_time ? new Date(existing.end_time) : new Date(existingStart.getTime() + 60 * 60 * 1000);
        
        const dateStr = updates.date || existingStart.toISOString().split('T')[0];
        const timeStr = updates.time || existingStart.toTimeString().slice(0, 5);
        const durationMinutes = updates.duration || Math.round((existingEnd.getTime() - existingStart.getTime()) / (1000 * 60));
        
        const newStart = new Date(`${dateStr}T${timeStr}:00`);
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);
        
        updateData.start_time = newStart.toISOString();
        updateData.end_time = newEnd.toISOString();
      }
      
      if (updates.location !== undefined) updateData.meeting_url = updates.location;
      if (updates.type !== undefined) updateData.meeting_type = updates.type;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
      if (updates.recurringPattern !== undefined) updateData.recurrence_rule = JSON.stringify(updates.recurringPattern);

      updateData.updated_at = new Date().toISOString();

      const { data: updatedMeeting, error: updateError } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating meeting:', updateError);
        throw new Error(updateError.message);
      }

      // Update participants if provided
      if (updates.attendees) {
        // Delete existing participants
        await supabase
          .from('meeting_participants')
          .delete()
          .eq('meeting_id', id);

        // Insert new participants
        for (const attendee of updates.attendees) {
          // Find or create participant recipient
          let { data: participantRecipient } = await supabase
            .from('recipients')
            .select('id')
            .eq('user_id', attendee.id)
            .single();

          if (!participantRecipient) {
            const { data: newParticipant } = await supabase
              .from('recipients')
              .insert({
                user_id: attendee.id,
                name: attendee.name,
                email: attendee.email || '',
                role: attendee.role || 'Attendee',
                department: attendee.department || 'General'
              })
              .select('id')
              .single();
            participantRecipient = newParticipant;
          }

          if (participantRecipient) {
            await supabase
              .from('meeting_participants')
              .insert({
                meeting_id: id,
                participant_id: participantRecipient.id,
                participant_user_id: attendee.id,
                participant_name: attendee.name,
                status: attendee.status || 'invited'
              });
          }
        }
      }

      const updated = toMeeting(updatedMeeting, []);
      console.log('✅ Updated meeting:', id);

      toast({
        title: "Meeting Updated",
        description: `"${updated.title}" has been updated.`
      });

      return updated;

    } catch (err) {
      console.error('❌ Failed to update meeting:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update meeting',
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  // Delete a meeting
  const deleteMeeting = useCallback(async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Delete participants first
      await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', id);

      // Delete the meeting
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Error deleting meeting:', deleteError);
        throw new Error(deleteError.message);
      }

      console.log('✅ Deleted meeting:', id);

      toast({
        title: "Meeting Deleted",
        description: "The meeting has been removed."
      });

    } catch (err) {
      console.error('❌ Failed to delete meeting:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete meeting',
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  return {
    meetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    loading,
    error,
    isConnected,
    refetch: fetchMeetings
  };
}
