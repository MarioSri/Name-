/**
 * Supabase Channel Service
 * Handles department chat, private messages, and channels
 */

import { supabase } from '@/lib/supabase';
import { realtimeService, RealtimeSubscription } from './SupabaseRealtimeService';

export interface Channel {
  id: string;
  channel_id: string;
  name: string;
  description?: string;
  type: 'department' | 'private' | 'group' | 'announcement';
  department?: string;
  members: string[];
  member_ids: string[];
  created_by: string;
  is_archived: boolean;
  is_readonly?: boolean;
  auto_delete_enabled?: boolean;
  auto_delete_days?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  message_id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  attachments: any[];
  reply_to?: string;
  is_edited: boolean;
  is_deleted: boolean;
  read_by: string[];
  created_at: string;
  updated_at: string;
}

class SupabaseChannelService {
  // ==================== CHANNELS ====================

  /**
   * Get all channels for a user
   */
  async getChannelsForUser(userId: string): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching channels:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get channels by department
   */
  async getChannelsByDepartment(department: string): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('department', department)
      .eq('is_archived', false)
      .order('name');

    if (error) {
      console.error('❌ Error fetching department channels:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get or create department channel
   */
  async getOrCreateDepartmentChannel(department: string, creatorId: string, creatorName: string): Promise<Channel> {
    const channelId = `dept-${department.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check if channel exists
    const { data: existing } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new department channel
    const { data, error } = await supabase
      .from('channels')
      .insert({
        channel_id: channelId,
        name: `${department} Department`,
        description: `Official channel for ${department} department`,
        channel_type: 'department',
        department,
        created_by: creatorId,
        is_archived: false,
        is_private: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating department channel:', error);
      throw error;
    }

    console.log('✅ Department channel created:', channelId);
    return data;
  }

  /**
   * Create private channel between users
   */
  async createPrivateChannel(
    user1Id: string,
    user1Name: string,
    user2Id: string,
    user2Name: string
  ): Promise<Channel> {
    // Create deterministic channel ID for private chat
    const sortedIds = [user1Id, user2Id].sort();
    const channelId = `private-${sortedIds[0]}-${sortedIds[1]}`;

    // Check if channel exists
    const { data: existing } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new private channel
    const { data, error } = await supabase
      .from('channels')
      .insert({
        channel_id: channelId,
        name: `${user1Name} & ${user2Name}`,
        channel_type: 'private',
        created_by: user1Id,
        is_archived: false,
        is_private: true,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating private channel:', error);
      throw error;
    }

    console.log('✅ Private channel created:', channelId);
    return data;
  }

  /**
   * Create group channel
   */
  async createGroupChannel(
    name: string,
    memberIds: string[],
    memberNames: string[],
    creatorId: string,
    description?: string
  ): Promise<Channel> {
    const channelId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase
      .from('channels')
      .insert({
        channel_id: channelId,
        name,
        description,
        channel_type: 'group',
        created_by: creatorId,
        is_archived: false,
        is_private: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating group channel:', error);
      throw error;
    }

    console.log('✅ Group channel created:', channelId);
    return data;
  }

  /**
   * Add member to channel
   */
  async addMemberToChannel(channelId: string, memberId: string, memberName: string): Promise<Channel> {
    // Get current channel
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Add member if not already present
    const memberIds = channel.member_ids || [];
    const members = channel.members || [];

    if (!memberIds.includes(memberId)) {
      const { data, error } = await supabase
        .from('channels')
        .update({
          member_ids: [...memberIds, memberId],
          members: [...members, memberName],
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', channelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return channel;
  }

  /**
   * Remove member from channel
   */
  async removeMemberFromChannel(channelId: string, memberId: string): Promise<Channel> {
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (!channel) {
      throw new Error('Channel not found');
    }

    const memberIds = (channel.member_ids || []).filter((id: string) => id !== memberId);
    const members = (channel.members || []).filter((_: string, i: number) => 
      channel.member_ids[i] !== memberId
    );

    const { data, error } = await supabase
      .from('channels')
      .update({
        member_ids: memberIds,
        members: members,
        updated_at: new Date().toISOString(),
      })
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== MESSAGES ====================

  /**
   * Get messages for a channel
   */
  async getMessages(channelId: string, limit = 50, before?: string): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }

    // Return in chronological order
    return (data || []).reverse();
  }

  /**
   * Send a message
   */
  async sendMessage(
    channelId: string,
    senderId: string,
    senderName: string,
    content: string,
    options?: {
      senderAvatar?: string;
      messageType?: Message['message_type'];
      attachments?: any[];
      replyTo?: string;
    }
  ): Promise<Message> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        message_id: messageId,
        channel_id: channelId,
        sender_id: senderId,
        sender_name: senderName,
        sender_avatar: options?.senderAvatar,
        content,
        message_type: options?.messageType || 'text',
        attachments: options?.attachments || [],
        reply_to: options?.replyTo,
        is_edited: false,
        is_deleted: false,
        read_by: [senderId],
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }

    // Update channel's updated_at
    await supabase
      .from('channels')
      .update({ updated_at: new Date().toISOString() })
      .eq('channel_id', channelId);

    console.log('✅ Message sent:', messageId);
    return data;
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', messageId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        content: '[Message deleted]',
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', messageId);

    if (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }

    console.log('✅ Message deleted:', messageId);
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(channelId: string, userId: string): Promise<void> {
    // Get unread messages
    const { data: messages } = await supabase
      .from('messages')
      .select('message_id, read_by')
      .eq('channel_id', channelId)
      .not('read_by', 'cs', `{${userId}}`);

    if (!messages || messages.length === 0) return;

    // Update each message
    for (const msg of messages) {
      await supabase
        .from('messages')
        .update({
          read_by: [...(msg.read_by || []), userId],
        })
        .eq('message_id', msg.message_id);
    }

    console.log(`✅ Marked ${messages.length} messages as read`);
  }

  /**
   * Get unread count for a channel
   */
  async getUnreadCount(channelId: string, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .not('read_by', 'cs', `{${userId}}`);

    if (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to channel messages
   */
  subscribeToMessages(channelId: string, callback: (message: Message) => void): RealtimeSubscription {
    return realtimeService.subscribe<Message>({
      table: 'messages',
      filter: `channel_id=eq.${channelId}`,
      onInsert: (payload) => callback(payload.new),
      onUpdate: (payload) => callback(payload.new),
    });
  }

  /**
   * Subscribe to all messages for user's channels
   */
  subscribeToAllMessages(callback: (payload: any) => void): RealtimeSubscription {
    return realtimeService.subscribe<Message>({
      table: 'messages',
      onChange: callback,
    });
  }

  /**
   * Subscribe to channel updates
   */
  subscribeToChannels(callback: (payload: any) => void): RealtimeSubscription {
    return realtimeService.subscribe<Channel>({
      table: 'channels',
      onChange: callback,
    });
  }

  /**
   * Unsubscribe from all
   */
  unsubscribeAll(): void {
    realtimeService.unsubscribeAll();
  }
}

export const supabaseChannelService = new SupabaseChannelService();
export default supabaseChannelService;
