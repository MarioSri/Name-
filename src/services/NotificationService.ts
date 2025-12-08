import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "approval" | "submission" | "reminder" | "emergency" | "meeting";
  timestamp: string;
  read: boolean;
  urgent: boolean;
  documentId?: string;
}

interface SupabaseNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  urgent: boolean;
  document_id?: string;
  created_at: string;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private subscription: any = null;
  private currentUserId: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize real-time subscription for a user
  initializeRealTime(userId: string) {
    if (this.subscription && this.currentUserId === userId) {
      return; // Already subscribed for this user
    }
    
    this.currentUserId = userId;
    
    // Cleanup existing subscription
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }
    
    // Subscribe to real-time updates
    this.subscription = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Real-time notification update:', payload);
        this.refreshNotifications();
      })
      .subscribe();
      
    // Initial load
    this.refreshNotifications();
  }

  // Cleanup subscription
  cleanup() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
    this.currentUserId = null;
  }

  private async refreshNotifications() {
    if (!this.currentUserId) return;
    
    const notifications = await this.getNotifications();
    this.notifyListeners(notifications);
  }

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    // Use Supabase ONLY - no localStorage fallback
    const userId = this.currentUserId;

    if (!userId) {
      console.warn('No user ID available for notification');
      return;
    }

    try {
      // Insert into Supabase
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          urgent: notification.urgent,
          document_id: notification.documentId,
          read: false
        });

      if (error) {
        console.error('Error adding notification to Supabase:', error);
      }
      // Real-time subscription will handle the update
    } catch (err) {
      console.error('Error adding notification:', err);
    }
  }

  // Send notification to specific user
  async sendToUser(userId: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          urgent: notification.urgent,
          document_id: notification.documentId,
          read: false
        });

      if (error) {
        console.error('Error sending notification to user:', error);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }

  async getNotifications(): Promise<Notification[]> {
    if (!this.currentUserId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications from Supabase:', error);
        return [];
      }

      return (data || []).map(this.convertFromSupabase);
    } catch (err) {
      console.error('Error getting notifications:', err);
      return [];
    }
  }

  private convertFromSupabase(n: SupabaseNotification): Notification {
    const now = new Date();
    const created = new Date(n.created_at);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    let timestamp = 'Just now';
    if (diffDays > 0) {
      timestamp = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      timestamp = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      timestamp = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    }
    
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as Notification['type'],
      timestamp,
      read: n.read,
      urgent: n.urgent,
      documentId: n.document_id
    };
  }

  async markAsRead(notificationId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  async markAllAsRead() {
    if (!this.currentUserId) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', this.currentUserId);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }

  subscribe(callback: (notifications: Notification[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(notifications: Notification[]) {
    this.listeners.forEach(listener => listener(notifications));
  }
}

export const notificationService = NotificationService.getInstance();
export type { Notification };