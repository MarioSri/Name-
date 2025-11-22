/**
 * React hook for real-time meeting management using Supabase Realtime
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  meetingsRealtimeService, 
  Meeting 
} from '@/services/MeetingsRealtimeService';
import { RealtimeSubscription } from '@/services/SupabaseRealtimeService';

export interface UseSupabaseRealTimeMeetingsReturn {
  // Data
  meetings: Meeting[];
  
  // Actions
  createMeeting: (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => Promise<Meeting>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<Meeting>;
  cancelMeeting: (id: string) => Promise<Meeting>;
  deleteMeeting: (id: string) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Real-time status
  isConnected: boolean;
}

export const useSupabaseRealTimeMeetings = (): UseSupabaseRealTimeMeetingsReturn => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<RealtimeSubscription[]>([]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch meetings where user is organizer or attendee
      const data = await meetingsRealtimeService.fetchUserMeetings(user.id);
      setMeetings(data);

      setIsConnected(true);
    } catch (err) {
      console.error('[useSupabaseRealTimeMeetings] Error loading meetings:', err);
      setError('Failed to load meetings');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const subs: RealtimeSubscription[] = [];

    // Subscribe to meetings where user is organizer or attendee
    const meetingSubs = meetingsRealtimeService.subscribeToUserMeetings(
      user.id,
      {
        onInsert: (meeting) => {
          console.log('[useSupabaseRealTimeMeetings] Meeting inserted:', meeting);
          setMeetings(prev => [meeting, ...prev].sort((a, b) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          ));
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Meeting Scheduled', {
              body: `${meeting.title} - ${new Date(meeting.start_time).toLocaleString()}`,
              icon: '/logo.png'
            });
          }
        },
        onUpdate: (meeting) => {
          console.log('[useSupabaseRealTimeMeetings] Meeting updated:', meeting);
          setMeetings(prev => 
            prev.map(m => m.id === meeting.id ? meeting : m).sort((a, b) => 
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            )
          );
        },
        onDelete: (meeting) => {
          console.log('[useSupabaseRealTimeMeetings] Meeting deleted:', meeting);
          setMeetings(prev => 
            prev.filter(m => m.id !== meeting.id)
          );
        }
      }
    );
    subs.push(...meetingSubs);

    setSubscriptions(subs);
    setIsConnected(true);

    // Load initial data
    loadData();

    // Cleanup subscriptions on unmount
    return () => {
      subs.forEach(sub => sub.unsubscribe());
      setIsConnected(false);
    };
  }, [user?.id, loadData]);

  // Create a new meeting
  const createMeeting = useCallback(async (
    data: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Meeting> => {
    try {
      setLoading(true);
      setError(null);

      const meeting = await meetingsRealtimeService.createMeeting(data);
      return meeting;
    } catch (err) {
      console.error('[useSupabaseRealTimeMeetings] Error creating meeting:', err);
      setError('Failed to create meeting');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a meeting
  const updateMeeting = useCallback(async (
    id: string,
    updates: Partial<Meeting>
  ): Promise<Meeting> => {
    try {
      setLoading(true);
      setError(null);

      return await meetingsRealtimeService.updateMeeting(id, updates);
    } catch (err) {
      console.error('[useSupabaseRealTimeMeetings] Error updating meeting:', err);
      setError('Failed to update meeting');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel a meeting
  const cancelMeeting = useCallback(async (id: string): Promise<Meeting> => {
    try {
      setLoading(true);
      setError(null);

      return await meetingsRealtimeService.cancelMeeting(id);
    } catch (err) {
      console.error('[useSupabaseRealTimeMeetings] Error cancelling meeting:', err);
      setError('Failed to cancel meeting');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a meeting
  const deleteMeeting = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await meetingsRealtimeService.deleteMeeting(id);
    } catch (err) {
      console.error('[useSupabaseRealTimeMeetings] Error deleting meeting:', err);
      setError('Failed to delete meeting');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Data
    meetings,
    
    // Actions
    createMeeting,
    updateMeeting,
    cancelMeeting,
    deleteMeeting,
    
    // State
    loading,
    error,
    
    // Real-time status
    isConnected
  };
};
