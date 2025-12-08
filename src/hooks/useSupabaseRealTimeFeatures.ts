/**
 * React Hooks for Supabase Real-Time Features
 * LiveMeet+, Notes & Reminders, Analytics, Approval History, Notifications, Search
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  supabaseRealTimeFeatures,
  LiveMeetRequest,
  Note,
  Reminder,
  ApprovalHistoryItem,
  Notification,
  SearchHistoryItem
} from '@/services/SupabaseRealTimeFeatures';

// ============================================================
// LIVEMEET+ HOOK
// ============================================================

export function useSupabaseLiveMeet() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LiveMeetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await supabaseRealTimeFeatures.getLiveMeetRequests(user.id);
      setRequests(data);
      setError(null);
    } catch (err) {
      setError('Failed to load LiveMeet+ requests');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    fetchRequests();

    // Subscribe to real-time updates
    const unsubscribe = supabaseRealTimeFeatures.subscribeLiveMeetRequests(
      user.id,
      setRequests
    );

    return () => unsubscribe();
  }, [user?.id, fetchRequests]);

  const createRequest = useCallback(async (
    request: Omit<LiveMeetRequest, 'request_id' | 'submitter_id' | 'submitter_name'>,
    participants: string[]
  ) => {
    if (!user) return null;
    
    const fullRequest: LiveMeetRequest = {
      ...request,
      request_id: `livemeet-${Date.now()}`,
      submitter_id: user.id,
      submitter_name: user.name,
      submitter_role: user.role,
      submitter_department: user.department
    };

    return await supabaseRealTimeFeatures.createLiveMeetRequest(fullRequest, participants);
  }, [user]);

  const respondToRequest = useCallback(async (requestId: string, response: 'accepted' | 'declined') => {
    if (!user?.id) return false;
    return await supabaseRealTimeFeatures.updateLiveMeetRequestStatus(requestId, response, user.id);
  }, [user?.id]);

  return {
    requests,
    isLoading,
    error,
    createRequest,
    respondToRequest,
    refresh: fetchRequests
  };
}

// ============================================================
// NOTES HOOK
// ============================================================

export function useSupabaseNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await supabaseRealTimeFeatures.getNotes(user.id);
      setNotes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load notes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    fetchNotes();

    const unsubscribe = supabaseRealTimeFeatures.subscribeNotes(user.id, setNotes);
    return () => unsubscribe();
  }, [user?.id, fetchNotes]);

  const createNote = useCallback(async (note: Omit<Note, 'note_id' | 'owner_id' | 'owner_name'>) => {
    if (!user) return null;
    
    return await supabaseRealTimeFeatures.createNote({
      ...note,
      note_id: `note-${Date.now()}`,
      owner_id: user.id,
      owner_name: user.name
    });
  }, [user]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    return await supabaseRealTimeFeatures.updateNote(noteId, updates);
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    return await supabaseRealTimeFeatures.deleteNote(noteId);
  }, []);

  const togglePin = useCallback(async (noteId: string, isPinned: boolean) => {
    return await supabaseRealTimeFeatures.updateNote(noteId, { is_pinned: !isPinned });
  }, []);

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    refresh: fetchNotes
  };
}

// ============================================================
// REMINDERS HOOK
// ============================================================

export function useSupabaseReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await supabaseRealTimeFeatures.getReminders(user.id);
      setReminders(data);
      setError(null);
    } catch (err) {
      setError('Failed to load reminders');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    fetchReminders();

    const unsubscribe = supabaseRealTimeFeatures.subscribeReminders(user.id, setReminders);
    return () => unsubscribe();
  }, [user?.id, fetchReminders]);

  const createReminder = useCallback(async (reminder: Omit<Reminder, 'reminder_id' | 'owner_id' | 'owner_name'>) => {
    if (!user) return null;
    
    return await supabaseRealTimeFeatures.createReminder({
      ...reminder,
      reminder_id: `reminder-${Date.now()}`,
      owner_id: user.id,
      owner_name: user.name
    });
  }, [user]);

  const updateReminder = useCallback(async (reminderId: string, updates: Partial<Reminder>) => {
    return await supabaseRealTimeFeatures.updateReminder(reminderId, updates);
  }, []);

  const deleteReminder = useCallback(async (reminderId: string) => {
    return await supabaseRealTimeFeatures.deleteReminder(reminderId);
  }, []);

  const completeReminder = useCallback(async (reminderId: string) => {
    return await supabaseRealTimeFeatures.updateReminder(reminderId, { is_completed: true });
  }, []);

  const snoozeReminder = useCallback(async (reminderId: string, snoozeUntil: string) => {
    return await supabaseRealTimeFeatures.updateReminder(reminderId, { 
      is_snoozed: true,
      snooze_until: snoozeUntil
    });
  }, []);

  // Get upcoming reminders (due in next hour)
  const upcomingReminders = reminders.filter(r => {
    const reminderTime = new Date(r.reminder_time);
    const now = new Date();
    const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return reminderTime >= now && reminderTime <= hourFromNow && !r.is_completed;
  });

  // Get overdue reminders
  const overdueReminders = reminders.filter(r => {
    const reminderTime = new Date(r.reminder_time);
    return reminderTime < new Date() && !r.is_completed;
  });

  return {
    reminders,
    upcomingReminders,
    overdueReminders,
    isLoading,
    error,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    snoozeReminder,
    refresh: fetchReminders
  };
}

// ============================================================
// APPROVAL HISTORY HOOK
// ============================================================

export function useSupabaseApprovalHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (options?: { userId?: string; trackingId?: string; limit?: number }) => {
    try {
      const data = await supabaseRealTimeFeatures.getApprovalHistory(options);
      setHistory(data);
      setError(null);
    } catch (err) {
      setError('Failed to load approval history');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetchHistory({ limit: 50 });

    const unsubscribe = supabaseRealTimeFeatures.subscribeApprovalHistory(user.id, setHistory);
    return () => unsubscribe();
  }, [user?.id, fetchHistory]);

  const addHistory = useCallback(async (
    history: Omit<ApprovalHistoryItem, 'history_id' | 'action_by_id' | 'action_by_name' | 'action_by_role'>
  ) => {
    if (!user) return null;
    
    return await supabaseRealTimeFeatures.addApprovalHistory({
      ...history,
      history_id: `history-${Date.now()}`,
      action_by_id: user.id,
      action_by_name: user.name,
      action_by_role: user.role
    });
  }, [user]);

  const getByTrackingId = useCallback(async (trackingId: string) => {
    return await supabaseRealTimeFeatures.getApprovalHistory({ trackingId });
  }, []);

  return {
    history,
    isLoading,
    error,
    addHistory,
    getByTrackingId,
    refresh: () => fetchHistory({ limit: 50 })
  };
}

// ============================================================
// NOTIFICATIONS HOOK
// ============================================================

export function useSupabaseNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await supabaseRealTimeFeatures.getNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const unsubscribe = supabaseRealTimeFeatures.subscribeNotifications(user.id, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    });

    return () => unsubscribe();
  }, [user?.id, fetchNotifications]);

  const createNotification = useCallback(async (
    notification: Omit<Notification, 'notification_id'>
  ) => {
    return await supabaseRealTimeFeatures.createNotification({
      ...notification,
      notification_id: `notif-${Date.now()}`
    });
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await supabaseRealTimeFeatures.markNotificationRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false;
    const success = await supabaseRealTimeFeatures.markAllNotificationsRead(user.id);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
    return success;
  }, [user?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const success = await supabaseRealTimeFeatures.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
    }
    return success;
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
}

// ============================================================
// ANALYTICS HOOK
// ============================================================

export function useSupabaseAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [live, snap] = await Promise.all([
        supabaseRealTimeFeatures.getLiveAnalytics(),
        supabaseRealTimeFeatures.getAnalyticsSnapshot()
      ]);
      setAnalytics(live);
      setSnapshot(snap);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    const unsubscribe = supabaseRealTimeFeatures.subscribeAnalytics(setAnalytics);
    return () => unsubscribe();
  }, [fetchAnalytics]);

  const generateSnapshot = useCallback(async () => {
    const newSnapshot = await supabaseRealTimeFeatures.generateAnalyticsSnapshot();
    if (newSnapshot) {
      setSnapshot(newSnapshot);
    }
    return newSnapshot;
  }, []);

  return {
    analytics,
    snapshot,
    isLoading,
    error,
    generateSnapshot,
    refresh: fetchAnalytics
  };
}

// ============================================================
// SEARCH HOOK
// ============================================================

export function useSupabaseSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!user || !query.trim()) return null;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const data = await supabaseRealTimeFeatures.globalSearch(query, user.id, user.name);
      setResults(data);
      return data;
    } catch (err) {
      setError('Search failed');
      console.error(err);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    const data = await supabaseRealTimeFeatures.getSearchHistory(user.id);
    setHistory(data);
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const clearResults = useCallback(() => {
    setResults(null);
  }, []);

  return {
    results,
    history,
    isSearching,
    error,
    search,
    clearResults,
    refreshHistory: fetchHistory
  };
}
