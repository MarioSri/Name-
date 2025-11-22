import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';
import { supabase } from '@/lib/supabase';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  created_by: string;
  members: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  file_url?: string;
  file_name?: string;
  reply_to?: string;
  reactions?: { emoji: string; user_ids: string[] }[];
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TypingIndicator {
  user_id: string;
  channel_id: string;
  timestamp: number;
}

class MessagesRealtimeService {
  private subscriptions: RealtimeSubscription[] = [];
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to channels where user is a member
   */
  subscribeToUserChannels(
    userId: string,
    callbacks: {
      onInsert?: (channel: Channel) => void;
      onUpdate?: (channel: Channel) => void;
      onDelete?: (channel: Channel) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<Channel>({
      table: 'channels',
      event: '*',
      filter: `members=cs.{${userId}}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to messages in a specific channel
   */
  subscribeToChannelMessages(
    channelId: string,
    callbacks: {
      onInsert?: (message: Message) => void;
      onUpdate?: (message: Message) => void;
      onDelete?: (message: Message) => void;
    }
  ): RealtimeSubscription {
    const subscription = realtimeService.subscribe<Message>({
      table: 'messages',
      event: '*',
      filter: `channel_id=eq.${channelId}`,
      onInsert: callbacks.onInsert,
      onUpdate: callbacks.onUpdate,
      onDelete: (payload) => callbacks.onDelete?.(payload.old)
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to typing indicators in a channel
   */
  subscribeToTypingIndicators(
    channelId: string,
    currentUserId: string,
    onTyping: (typingUsers: TypingIndicator[]) => void
  ): { unsubscribe: () => void; sendTyping: () => void } {
    const channelName = `typing:${channelId}`;
    const typingUsers = new Map<string, TypingIndicator>();

    const broadcast = realtimeService.subscribeToBroadcast(
      channelName,
      'typing',
      (payload: { user_id: string; timestamp: number }) => {
        if (payload.user_id === currentUserId) return;

        typingUsers.set(payload.user_id, {
          user_id: payload.user_id,
          channel_id: channelId,
          timestamp: payload.timestamp
        });

        // Remove typing indicator after 3 seconds of inactivity
        const timerId = this.typingTimers.get(payload.user_id);
        if (timerId) clearTimeout(timerId);

        const newTimer = setTimeout(() => {
          typingUsers.delete(payload.user_id);
          onTyping(Array.from(typingUsers.values()));
        }, 3000);

        this.typingTimers.set(payload.user_id, newTimer);

        onTyping(Array.from(typingUsers.values()));
      }
    );

    let localTypingTimer: NodeJS.Timeout | null = null;

    return {
      unsubscribe: () => {
        broadcast.unsubscribe();
        this.typingTimers.forEach(timer => clearTimeout(timer));
        this.typingTimers.clear();
        if (localTypingTimer) clearTimeout(localTypingTimer);
      },
      sendTyping: () => {
        // Throttle typing events to once per second
        if (localTypingTimer) return;

        broadcast.send({
          user_id: currentUserId,
          timestamp: Date.now()
        });

        localTypingTimer = setTimeout(() => {
          localTypingTimer = null;
        }, 1000);
      }
    };
  }

  /**
   * Subscribe to user presence in a channel
   */
  subscribeToChannelPresence(
    channelId: string,
    userId: string,
    userMetadata: { name: string; avatar?: string }
  ) {
    return realtimeService.subscribeToPresence(
      `channel:${channelId}:presence`,
      userId,
      userMetadata
    );
  }

  /**
   * Fetch channels for a user
   */
  async fetchUserChannels(userId: string): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .contains('members', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Messages] Error fetching channels:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch messages from a channel
   */
  async fetchChannelMessages(
    channelId: string,
    limit: number = 50,
    before?: string
  ): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Messages] Error fetching messages:', error);
      throw error;
    }

    // Return in ascending order (oldest first)
    return (data || []).reverse();
  }

  /**
   * Create a new channel
   */
  async createChannel(channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>): Promise<Channel> {
    const { data, error } = await supabase
      .from('channels')
      .insert(channel)
      .select()
      .single();

    if (error) {
      console.error('[Messages] Error creating channel:', error);
      throw error;
    }

    return data;
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('[Messages] Error sending message:', error);
      throw error;
    }

    // Update channel's updated_at timestamp
    await supabase
      .from('channels')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.channel_id);

    return data;
  }

  /**
   * Edit a message
   */
  async editMessage(id: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content,
        edited_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Messages] Error editing message:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Messages] Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, emoji: string, userId: string): Promise<Message> {
    // Fetch current message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('[Messages] Error fetching message for reaction:', fetchError);
      throw fetchError;
    }

    const reactions = message?.reactions || [];
    const existingReaction = reactions.find((r: any) => r.emoji === emoji);

    if (existingReaction) {
      if (!existingReaction.user_ids.includes(userId)) {
        existingReaction.user_ids.push(userId);
      }
    } else {
      reactions.push({ emoji, user_ids: [userId] });
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('[Messages] Error adding reaction:', error);
      throw error;
    }

    return data;
  }

  /**
   * Unsubscribe from all message subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
  }
}

// Export singleton instance
export const messagesRealtimeService = new MessagesRealtimeService();
