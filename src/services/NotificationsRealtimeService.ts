import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'document' | 'approval' | 'meeting' | 'message' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: {
    document_id?: string;
    approval_id?: string;
    meeting_id?: string;
    channel_id?: string;
    sender_id?: string;
    action?: string;
  };
  created_at: string;
  read_at?: string;
}

class NotificationsRealtimeService {
  private subscriptions: RealtimeSubscription[] = [];

  /**
   * Subscribe to notifications for a specific user
   */
  subscribeToUserNotifications(
    userId: string,
    callbacks: {
      onInsert?: (notification: Notification) => void;
      onUpdate?: (notification: Notification) => void;
      onDelete?: (notification: Notification) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<Notification>({
      table: 'notifications',
      event: '*',
      filter: `user_id=eq.${userId}`,
      onInsert: (notification) => {
        console.log('[Notifications] New notification:', notification);
        
        // Show browser notification if permitted
        this.showBrowserNotification(notification);
        
        callbacks.onInsert?.(notification);
      },
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to unread notification count
   */
  subscribeToUnreadCount(
    userId: string,
    onCountChange: (count: number) => void
  ): RealtimeSubscription {
    let currentCount = 0;

    const subscription = realtimeService.subscribe<Notification>({
      table: 'notifications',
      event: '*',
      filter: `user_id=eq.${userId}`,
      onInsert: async (notification) => {
        if (!notification.read) {
          currentCount++;
          onCountChange(currentCount);
        }
      },
      onUpdate: async (notification) => {
        // Recalculate count when notification is marked as read
        const count = await this.getUnreadCount(userId);
        currentCount = count;
        onCountChange(currentCount);
      }
    });

    // Fetch initial count
    this.getUnreadCount(userId).then(count => {
      currentCount = count;
      onCountChange(count);
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Fetch notifications for a user
   */
  async fetchNotifications(
    userId: string,
    filters?: {
      read?: boolean;
      type?: Notification['type'];
      priority?: Notification['priority'];
      limit?: number;
    }
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (filters?.read !== undefined) {
      query = query.eq('read', filters.read);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50);

    const { data, error } = await query;

    if (error) {
      console.error('[Notifications] Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('[Notifications] Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Create a notification
   */
  async createNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error('[Notifications] Error creating notification:', error);
      throw error;
    }

    return data;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Notifications] Error marking notification as read:', error);
      throw error;
    }

    return data;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('[Notifications] Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Notifications] Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteReadNotifications(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true);

    if (error) {
      console.error('[Notifications] Error deleting read notifications:', error);
      throw error;
    }
  }

  /**
   * Show browser notification (if permission granted)
   */
  private async showBrowserNotification(notification: Notification): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent'
        });
      } catch (error) {
        console.error('[Notifications] Error showing browser notification:', error);
      }
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  /**
   * Unsubscribe from all notification subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}

// Export singleton instance
export const notificationsRealtimeService = new NotificationsRealtimeService();
