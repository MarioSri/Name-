import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type DatabaseTable = 
  | 'documents' 
  | 'approval_cards' 
  | 'meetings' 
  | 'messages' 
  | 'notifications' 
  | 'users'
  | 'channels'
  | 'document_comments'
  | 'meeting_participants';

export type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeSubscription<T = any> {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export interface RealtimeOptions<T = any> {
  table: DatabaseTable;
  event?: ChangeType | '*';
  schema?: string;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { old: T }) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

class SupabaseRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptionCount: Map<string, number> = new Map();

  /**
   * Subscribe to real-time changes on a table
   */
  subscribe<T = any>(options: RealtimeOptions<T>): RealtimeSubscription<T> {
    const {
      table,
      event = '*',
      schema = 'public',
      filter,
      onInsert,
      onUpdate,
      onDelete,
      onChange
    } = options;

    // Create unique channel ID
    const channelId = `${schema}:${table}:${event}:${filter || 'all'}`;
    
    // Check if channel already exists
    let channel = this.channels.get(channelId);
    
    if (!channel) {
      // Create new channel
      channel = supabase.channel(channelId);
      
      // Configure postgres changes listener
      const postgresChange = channel.on(
        'postgres_changes',
        {
          event: event as any,
          schema,
          table,
          filter
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          
          // Call specific handlers
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete({ old: payload.old as T });
          }
          
          // Call general change handler
          if (onChange) {
            onChange(payload);
          }
        }
      );

      // Subscribe to channel
      channel.subscribe((status) => {
        console.log(`[Realtime] Channel ${channelId} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Successfully subscribed to ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] ❌ Error subscribing to ${table}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[Realtime] ⏱️ Subscription to ${table} timed out`);
        }
      });

      this.channels.set(channelId, channel);
      this.subscriptionCount.set(channelId, 1);
    } else {
      // Increment subscription count for existing channel
      const count = this.subscriptionCount.get(channelId) || 0;
      this.subscriptionCount.set(channelId, count + 1);
    }

    // Return subscription with unsubscribe function
    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelId)
    };
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelId: string): void {
    const count = this.subscriptionCount.get(channelId) || 0;
    
    if (count <= 1) {
      // Last subscription, remove channel
      const channel = this.channels.get(channelId);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelId);
        this.subscriptionCount.delete(channelId);
        console.log(`[Realtime] 🔌 Unsubscribed from ${channelId}`);
      }
    } else {
      // Decrement subscription count
      this.subscriptionCount.set(channelId, count - 1);
    }
  }

  /**
   * Subscribe to multiple tables at once
   */
  subscribeToMultiple<T = any>(subscriptions: RealtimeOptions<T>[]): RealtimeSubscription<T>[] {
    return subscriptions.map(options => this.subscribe(options));
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      supabase.removeChannel(channel);
      console.log(`[Realtime] 🔌 Unsubscribed from ${channelId}`);
    });
    this.channels.clear();
    this.subscriptionCount.clear();
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Check if connected to Supabase
   */
  isConnected(): boolean {
    return supabase.getChannels().length > 0;
  }

  /**
   * Subscribe to presence (user online status)
   */
  subscribeToPresence(channelName: string, userId: string, userMetadata: any = {}) {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('[Realtime] Presence sync:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Realtime] User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Realtime] User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userMetadata
          });
        }
      });

    return {
      channel,
      unsubscribe: () => {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }

  /**
   * Subscribe to broadcast messages
   */
  subscribeToBroadcast(
    channelName: string,
    eventName: string,
    callback: (payload: any) => void
  ) {
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: eventName }, (payload) => {
        console.log(`[Realtime] Broadcast received on ${eventName}:`, payload);
        callback(payload);
      })
      .subscribe();

    return {
      channel,
      send: (payload: any) => {
        channel.send({
          type: 'broadcast',
          event: eventName,
          payload
        });
      },
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }
}

// Export singleton instance
export const realtimeService = new SupabaseRealtimeService();
