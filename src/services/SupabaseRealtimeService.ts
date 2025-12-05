/**
 * Supabase Realtime Service
 * Handles real-time subscriptions for all tables
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export interface SubscriptionConfig<T> {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
  onInsert?: (payload: { new: T }) => void;
  onUpdate?: (payload: { new: T; old: T }) => void;
  onDelete?: (payload: { old: T }) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

class SupabaseRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptionCount = 0;

  /**
   * Subscribe to table changes
   */
  subscribe<T extends Record<string, any>>(config: SubscriptionConfig<T>): RealtimeSubscription {
    const channelName = `${config.table}-${++this.subscriptionCount}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`📡 [${config.table}] Realtime event:`, payload.eventType);
          
          if (config.onChange) {
            config.onChange(payload);
          }

          switch (payload.eventType) {
            case 'INSERT':
              if (config.onInsert) {
                config.onInsert({ new: payload.new as T });
              }
              break;
            case 'UPDATE':
              if (config.onUpdate) {
                config.onUpdate({ new: payload.new as T, old: payload.old as T });
              }
              break;
            case 'DELETE':
              if (config.onDelete) {
                config.onDelete({ old: payload.old as T });
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 [${config.table}] Subscription status:`, status);
      });

    this.channels.set(channelName, channel);

    return {
      channel,
      unsubscribe: () => {
        channel.unsubscribe();
        this.channels.delete(channelName);
      },
    };
  }

  /**
   * Subscribe to multiple tables at once
   */
  subscribeToMultiple<T extends Record<string, any>>(
    configs: SubscriptionConfig<T>[]
  ): RealtimeSubscription[] {
    return configs.map((config) => this.subscribe(config));
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, name) => {
      console.log(`📡 Unsubscribing from ${name}`);
      channel.unsubscribe();
    });
    this.channels.clear();
  }

  /**
   * Get active subscription count
   */
  getActiveSubscriptions(): number {
    return this.channels.size;
  }

  /**
   * Check if connected to realtime
   */
  isConnected(): boolean {
    return this.channels.size > 0;
  }
}

export const realtimeService = new SupabaseRealtimeService();
export default realtimeService;
