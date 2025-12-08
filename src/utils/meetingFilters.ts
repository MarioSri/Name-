/**
 * Meeting Filtering Utilities
 * Filters meetings based on recipient selection and organizer status
 */

import { Meeting } from '@/types/meeting';

interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  branch?: string;
}

/**
 * Filters meetings to show only those where the current user is:
 * 1. The organizer (createdBy)
 * 2. An invited attendee (in attendees array)
 * 
 * @param meetings - Array of all meetings
 * @param currentUser - The currently logged-in user
 * @returns Filtered array of meetings visible to the current user
 */
export const filterMeetingsByRecipient = (
  meetings: Meeting[],
  currentUser: User | null
): Meeting[] => {
  if (!currentUser) {
    console.warn('[Meeting Filtering] ⚠️ No current user - showing no meetings');
    return [];
  }

  if (!meetings || meetings.length === 0) {
    console.log('[Meeting Filtering] ℹ️ No meetings to filter');
    return [];
  }

  // Normalize IDs to strings for consistent comparison (handles both string and number types)
  const currentUserId = String(currentUser.id || '');
  const currentUserName = currentUser.name || '';
  const currentUserEmail = (currentUser.email || '').toLowerCase().trim();

  console.log(`[Meeting Filtering] 🔍 Filtering ${meetings.length} meetings for user:`, {
    id: currentUserId,
    name: currentUserName,
    email: currentUserEmail,
    role: currentUser.role
  });

  const filteredMeetings = meetings.filter((meeting) => {
    // Normalize meeting creator ID to string for comparison
    const meetingCreatorId = String(meeting.createdBy || '');
    
    // 1. Check if user is the organizer/creator (with ID normalization)
    if (meetingCreatorId === currentUserId) {
      console.log(`[Meeting Filtering] ✅ Including "${meeting.title}" - User is organizer (ID: ${currentUserId})`);
      return true;
    }

    // 2. Check if user is in attendees array with multiple criteria
    const isAttendee = meeting.attendees?.some((attendee) => {
      // Normalize attendee ID to string
      const attendeeId = String(attendee.id || '');
      const attendeeEmail = (attendee.email || '').toLowerCase().trim();
      
      // Check ID match (normalized)
      if (attendeeId && currentUserId && attendeeId === currentUserId) {
        console.log(`[Meeting Filtering] ✅ Including "${meeting.title}" - User is attendee (ID match: ${attendeeId})`);
        return true;
      }
      
      // Check email match (case-insensitive)
      if (attendeeEmail && currentUserEmail && attendeeEmail === currentUserEmail) {
        console.log(`[Meeting Filtering] ✅ Including "${meeting.title}" - User is attendee (Email match: ${attendeeEmail})`);
        return true;
      }
      
      // Check name match (exact)
      if (attendee.name && currentUserName && attendee.name === currentUserName) {
        console.log(`[Meeting Filtering] ✅ Including "${meeting.title}" - User is attendee (Name match: ${attendee.name})`);
        return true;
      }
      
      return false;
    });

    if (isAttendee) {
      return true;
    }

    // 3. Not a recipient - exclude meeting
    console.log(`[Meeting Filtering] ❌ Excluding "${meeting.title}" - User not a recipient`);
    return false;
  });

  console.log(`[Meeting Filtering] ✅ Result: ${filteredMeetings.length}/${meetings.length} meetings visible to ${currentUserName}`);

  return filteredMeetings;
};

/**
 * In-memory meeting storage (replaces localStorage)
 * TODO: Migrate to Supabase for persistent meeting storage
 */
const meetingStore: Map<string, Meeting> = new Map();

/**
 * Saves meetings to in-memory store
 * @param meetings - Array of meetings to save
 */
export const saveMeetingsToStorage = (meetings: Meeting[]): void => {
  try {
    meetingStore.clear();
    meetings.forEach(m => meetingStore.set(m.id, m));
    console.log(`[Meeting Storage] Saved ${meetings.length} meetings to memory`);
  } catch (error) {
    console.error('[Meeting Storage] Error saving to memory:', error);
  }
};

/**
 * Loads meetings from in-memory store
 * @returns Array of meetings from storage
 */
export const loadMeetingsFromStorage = (): Meeting[] => {
  try {
    const meetings = Array.from(meetingStore.values());
    if (meetings.length === 0) {
      console.log('[Meeting Storage] No meetings found in memory');
      return [];
    }
    console.log(`[Meeting Storage] Loaded ${meetings.length} meetings from memory`);
    return meetings;
  } catch (error) {
    console.error('[Meeting Storage] Error loading from memory:', error);
    return [];
  }
};

/**
 * Adds a new meeting to in-memory store
 * @param meeting - Meeting to add
 */
export const addMeetingToStorage = (meeting: Meeting): void => {
  meetingStore.set(meeting.id, meeting);
  
  // Dispatch custom event for cross-component updates
  window.dispatchEvent(new CustomEvent('meetings-updated', { detail: meeting }));
  console.log(`[Meeting Storage] Added meeting "${meeting.title}" and dispatched update event`);
};

/**
 * Updates an existing meeting in in-memory store
 * @param meetingId - ID of meeting to update
 * @param updatedMeeting - Updated meeting data
 */
export const updateMeetingInStorage = (meetingId: string, updatedMeeting: Partial<Meeting>): void => {
  const existing = meetingStore.get(meetingId);
  if (existing) {
    meetingStore.set(meetingId, { ...existing, ...updatedMeeting });
  }
  window.dispatchEvent(new CustomEvent('meetings-updated', { detail: updatedMeeting }));
  console.log(`[Meeting Storage] Updated meeting ${meetingId}`);
};

/**
 * Deletes a meeting from in-memory store
 * @param meetingId - ID of meeting to delete
 */
export const deleteMeetingFromStorage = (meetingId: string): void => {
  meetingStore.delete(meetingId);
  window.dispatchEvent(new CustomEvent('meetings-updated', { detail: { id: meetingId } }));
  console.log(`[Meeting Storage] Deleted meeting ${meetingId}`);
};
