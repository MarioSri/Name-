/**
 * useSupabaseRealTimeMessages Hook
 * React hook for real-time messaging using Supabase
 * Provides channels, messages, and online presence tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Supabase channel record structure
interface SupabaseChannel {
  id: string;
  channel_id: string;
  name: string;
  description?: string;
  type: string;
  department?: string;
  created_by: string;
  is_active: boolean;
  auto_delete_hours?: number;
  created_at: string;
  updated_at: string;
}

// Supabase message record structure
interface SupabaseMessage {
  id: string;
  message_id: string;
  channel_id: string;
  sender_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: string;
  attachments?: any[];
  reply_to?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Supabase message read record
interface SupabaseMessageRead {
  id: string;
  message_id: string;
  reader_id: string;
  read_at: string;
}

// Application-level types
export interface Channel {
  id: string;
  channelId: string;
  name: string;
  description: string;
  type: 'department' | 'private' | 'document' | 'meeting';
  department?: string;
  createdBy: string;
  isActive: boolean;
  autoDeleteHours?: number;
  unreadCount: number;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  messageId: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  attachments: any[];
  replyTo?: string;
  isEdited: boolean;
  isDeleted: boolean;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnlineUser {
  id: string;
  name: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: Date;
}

interface UseSupabaseRealTimeMessagesResult {
  // Data
  channels: Channel[];
  messages: Record<string, Message[]>;
  onlineUsers: OnlineUser[];
  totalUnread: number;
  
  // Actions
  sendMessage: (channelId: string, content: string, type?: string) => Promise<Message>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  createChannel: (name: string, type: string, members: string[]) => Promise<Channel>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
  loadMessages: (channelId: string) => Promise<Message[]>;
  
  // State
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

// Convert Supabase channel to app Channel
function toChannel(record: SupabaseChannel, unreadCount: number = 0): Channel {
  return {
    id: record.id,
    channelId: record.channel_id,
    name: record.name,
    description: record.description || '',
    type: record.type as any,
    department: record.department,
    createdBy: record.created_by,
    isActive: record.is_active,
    autoDeleteHours: record.auto_delete_hours,
    unreadCount,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}

// Convert Supabase message to app Message
function toMessage(record: SupabaseMessage, isRead: boolean = false): Message {
  return {
    id: record.id,
    messageId: record.message_id,
    channelId: record.channel_id,
    senderId: record.sender_user_id,
    senderName: record.sender_name,
    senderAvatar: record.sender_avatar,
    content: record.content,
    messageType: record.message_type as any,
    attachments: record.attachments || [],
    replyTo: record.reply_to,
    isEdited: record.is_edited,
    isDeleted: record.is_deleted,
    isRead,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}

export function useSupabaseRealTimeMessages(): UseSupabaseRealTimeMessagesResult {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const channelsSubscriptionRef = useRef<any>(null);
  const messagesSubscriptionRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  // Get user's recipient ID
  const getUserRecipientId = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    const userId = user.id || user.email || 'unknown';
    const { data } = await supabase
      .from('recipients')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    return data?.id || null;
  }, [user]);

  // Fetch channels user is member of
  const fetchChannels = useCallback(async () => {
    if (!user) {
      setChannels([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recipientId = await getUserRecipientId();
      
      // Fetch all active channels (for now, show all - can filter by membership later)
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (channelsError) {
        console.error('❌ Error fetching channels:', channelsError);
        setError(channelsError.message);
        setIsConnected(false);
        return;
      }

      // Get unread counts per channel
      const unreadCounts: Record<string, number> = {};
      
      if (recipientId) {
        // Get all messages
        const { data: allMessages } = await supabase
          .from('messages')
          .select('id, channel_id')
          .eq('is_deleted', false);

        // Get read messages for this user
        const { data: readMessages } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('reader_id', recipientId);

        const readMessageIds = new Set(readMessages?.map(r => r.message_id) || []);
        
        // Calculate unread per channel
        (allMessages || []).forEach(msg => {
          if (!readMessageIds.has(msg.id)) {
            unreadCounts[msg.channel_id] = (unreadCounts[msg.channel_id] || 0) + 1;
          }
        });
      }

      const convertedChannels = (channelsData || []).map((c: SupabaseChannel) => 
        toChannel(c, unreadCounts[c.id] || 0)
      );

      setChannels(convertedChannels);
      setTotalUnread(Object.values(unreadCounts).reduce((a, b) => a + b, 0));
      setIsConnected(true);
      console.log('✅ Loaded', convertedChannels.length, 'channels from Supabase');

    } catch (err) {
      console.error('❌ Failed to fetch channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user, getUserRecipientId]);

  // Load messages for a specific channel
  const loadMessages = useCallback(async (channelId: string): Promise<Message[]> => {
    try {
      const recipientId = await getUserRecipientId();
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
        throw new Error(messagesError.message);
      }

      // Get read status for these messages
      let readMessageIds = new Set<string>();
      if (recipientId) {
        const { data: readData } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('reader_id', recipientId);
        
        readMessageIds = new Set(readData?.map(r => r.message_id) || []);
      }

      const convertedMessages = (messagesData || []).map((m: SupabaseMessage) =>
        toMessage(m, readMessageIds.has(m.id))
      );

      setMessages(prev => ({
        ...prev,
        [channelId]: convertedMessages
      }));

      return convertedMessages;

    } catch (err) {
      console.error('❌ Failed to load messages:', err);
      throw err;
    }
  }, [getUserRecipientId]);

  // Send a message
  const sendMessage = useCallback(async (
    channelId: string, 
    content: string, 
    type: string = 'text'
  ): Promise<Message> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const userId = user.id || user.email || 'unknown';
      const userName = user.name || user.email || 'Unknown User';
      
      // Get or create sender recipient
      let { data: senderRecipient } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!senderRecipient) {
        const { data: newRecipient } = await supabase
          .from('recipients')
          .insert({
            user_id: userId,
            name: userName,
            email: user.email || '',
            role: user.role || 'Staff',
            department: 'General'
          })
          .select('id')
          .single();
        senderRecipient = newRecipient;
      }

      if (!senderRecipient) {
        throw new Error('Could not get or create sender');
      }

      const messageData = {
        message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channel_id: channelId,
        sender_id: senderRecipient.id,
        sender_user_id: userId,
        sender_name: userName,
        content,
        message_type: type
      };

      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error sending message:', insertError);
        throw new Error(insertError.message);
      }

      // Update channel's updated_at
      await supabase
        .from('channels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', channelId);

      const sent = toMessage(newMessage, true);
      console.log('✅ Sent message:', sent.id);

      return sent;

    } catch (err) {
      console.error('❌ Failed to send message:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to send message',
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user || messageIds.length === 0) return;

    try {
      const recipientId = await getUserRecipientId();
      if (!recipientId) return;

      const readRecords = messageIds.map(msgId => ({
        message_id: msgId,
        reader_id: recipientId
      }));

      await supabase
        .from('message_reads')
        .upsert(readRecords, { onConflict: 'message_id,reader_id' });

      // Update local state
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(channelId => {
          updated[channelId] = updated[channelId].map(msg =>
            messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
          );
        });
        return updated;
      });

      // Recalculate unread count
      fetchChannels();

    } catch (err) {
      console.error('❌ Failed to mark messages as read:', err);
    }
  }, [user, getUserRecipientId, fetchChannels]);

  // Create a new channel
  const createChannel = useCallback(async (
    name: string, 
    type: string, 
    members: string[]
  ): Promise<Channel> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const userId = user.id || user.email || 'unknown';

      const channelData = {
        channel_id: `ch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        created_by: userId,
        is_active: true
      };

      const { data: newChannel, error: insertError } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating channel:', insertError);
        throw new Error(insertError.message);
      }

      // Add members
      for (const memberId of members) {
        let { data: memberRecipient } = await supabase
          .from('recipients')
          .select('id')
          .eq('user_id', memberId)
          .single();

        if (memberRecipient) {
          await supabase
            .from('channel_members')
            .insert({
              channel_id: newChannel.id,
              member_id: memberRecipient.id,
              member_user_id: memberId,
              role: memberId === userId ? 'admin' : 'member'
            });
        }
      }

      const created = toChannel(newChannel, 0);
      console.log('✅ Created channel:', created.id);

      toast({
        title: "Channel Created",
        description: `"${name}" is ready for messaging.`
      });

      return created;

    } catch (err) {
      console.error('❌ Failed to create channel:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create channel',
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  // Join a channel
  const joinChannel = useCallback(async (channelId: string): Promise<void> => {
    if (!user) return;

    try {
      const recipientId = await getUserRecipientId();
      if (!recipientId) return;

      const userId = user.id || user.email || 'unknown';

      await supabase
        .from('channel_members')
        .upsert({
          channel_id: channelId,
          member_id: recipientId,
          member_user_id: userId,
          role: 'member'
        }, { onConflict: 'channel_id,member_id' });

      console.log('✅ Joined channel:', channelId);

    } catch (err) {
      console.error('❌ Failed to join channel:', err);
    }
  }, [user, getUserRecipientId]);

  // Leave a channel
  const leaveChannel = useCallback(async (channelId: string): Promise<void> => {
    if (!user) return;

    try {
      const recipientId = await getUserRecipientId();
      if (!recipientId) return;

      await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('member_id', recipientId);

      console.log('✅ Left channel:', channelId);

    } catch (err) {
      console.error('❌ Failed to leave channel:', err);
    }
  }, [user, getUserRecipientId]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchChannels();

    // Subscribe to channels table changes
    channelsSubscriptionRef.current = supabase
      .channel('channels-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload) => {
          console.log('📡 Channels realtime update:', payload.eventType);
          fetchChannels();
        }
      )
      .subscribe((status) => {
        console.log('📡 Channels subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    // Subscribe to messages table changes
    messagesSubscriptionRef.current = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('📡 New message received:', payload.new);
          const newMsg = payload.new as SupabaseMessage;
          
          // Add to local state
          setMessages(prev => {
            const channelMsgs = prev[newMsg.channel_id] || [];
            const exists = channelMsgs.some(m => m.id === newMsg.id);
            if (exists) return prev;
            
            return {
              ...prev,
              [newMsg.channel_id]: [...channelMsgs, toMessage(newMsg, false)]
            };
          });
          
          // Update unread count
          setTotalUnread(prev => prev + 1);
        }
      )
      .subscribe();

    // Set up presence channel for online users
    const userId = user?.id || user?.email || 'anonymous';
    const userName = user?.name || user?.email || 'Unknown';
    
    presenceChannelRef.current = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannelRef.current?.presenceState() || {};
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.push({
              id: presence.user_id,
              name: presence.user_name,
              status: 'online',
              lastSeen: new Date()
            });
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannelRef.current?.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      if (channelsSubscriptionRef.current) {
        supabase.removeChannel(channelsSubscriptionRef.current);
      }
      if (messagesSubscriptionRef.current) {
        supabase.removeChannel(messagesSubscriptionRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [fetchChannels, user]);

  return {
    channels,
    messages,
    onlineUsers,
    totalUnread,
    sendMessage,
    markAsRead,
    createChannel,
    joinChannel,
    leaveChannel,
    loadMessages,
    loading,
    error,
    isConnected,
    refetch: fetchChannels
  };
}
