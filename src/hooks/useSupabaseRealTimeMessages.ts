import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesRealtimeService, Channel, Message, TypingIndicator } from '@/services/MessagesRealtimeService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UseSupabaseRealTimeMessagesReturn {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  
  // Channel management
  channels: Channel[];
  activeChannel: Channel | null;
  setActiveChannel: (channel: Channel | null) => void;
  createChannel: (channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>) => Promise<Channel>;
  
  // Message management
  messages: Message[];
  sendMessage: (content: string, type?: 'text' | 'file' | 'image') => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  
  // Typing indicators
  typingUsers: TypingIndicator[];
  sendTypingIndicator: () => void;
  
  // Presence
  onlineUsers: string[];
  
  // Stats
  unreadCounts: Record<string, number>;
  totalUnread: number;
}

/**
 * Hook for Supabase Realtime Messages with typing indicators and presence
 * 
 * Features:
 * - Real-time channel subscriptions
 * - Message CRUD operations
 * - Typing indicator broadcasting
 * - User presence tracking
 * - Unread message counts
 * - Browser notifications for new messages
 */
export function useSupabaseRealTimeMessages(): UseSupabaseRealTimeMessagesReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const subscriptionsRef = useRef<{ unsubscribe: () => void }[]>([]);
  const typingSubscriptionRef = useRef<{ unsubscribe: () => void; sendTyping: () => void } | null>(null);
  const presenceSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  /**
   * Calculate total unread messages across all channels
   */
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  /**
   * Load user's channels from Supabase
   */
  const loadChannels = useCallback(async () => {
    if (!user) return;
    
    try {
      const userChannels = await messagesRealtimeService.fetchUserChannels(user.id);
      setChannels(userChannels);
      setIsConnected(true);
      
      // Initialize unread counts
      const counts: Record<string, number> = {};
      userChannels.forEach(channel => {
        counts[channel.id] = 0; // Will be updated by subscriptions
      });
      setUnreadCounts(counts);
      
    } catch (error) {
      console.error('[Messages Hook] Error loading channels:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Load messages for active channel
   */
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      const channelMessages = await messagesRealtimeService.fetchChannelMessages(channelId, 50);
      setMessages(channelMessages);
      
      // Mark channel as read
      setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
      
    } catch (error) {
      console.error('[Messages Hook] Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Send a message to the active channel
   */
  const sendMessage = useCallback(async (content: string, type: 'text' | 'file' | 'image' = 'text') => {
    if (!activeChannel || !user) return;

    try {
      await messagesRealtimeService.sendMessage({
        channel_id: activeChannel.id,
        user_id: user.id,
        content,
        message_type: type
      });
    } catch (error) {
      console.error('[Messages Hook] Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  }, [activeChannel, user, toast]);

  /**
   * Edit an existing message
   */
  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await messagesRealtimeService.editMessage(messageId, content);
    } catch (error) {
      console.error('[Messages Hook] Error editing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await messagesRealtimeService.deleteMessage(messageId);
    } catch (error) {
      console.error('[Messages Hook] Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Add reaction to a message
   */
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      await messagesRealtimeService.addReaction(messageId, emoji, user.id);
    } catch (error) {
      console.error('[Messages Hook] Error adding reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reaction',
        variant: 'destructive'
      });
    }
  }, [user, toast]);

  /**
   * Create a new channel
   */
  const createChannel = useCallback(async (channelData: Omit<Channel, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newChannel = await messagesRealtimeService.createChannel(channelData);
      return newChannel;
    } catch (error) {
      console.error('[Messages Hook] Error creating channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to create channel',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(() => {
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.sendTyping();
    }
  }, []);

  /**
   * Setup real-time subscriptions
   */
  useEffect(() => {
    if (!user) return;

    // Subscribe to user's channels
    const channelSub = messagesRealtimeService.subscribeToUserChannels(user.id, {
      onInsert: (channel) => {
        setChannels(prev => [...prev, channel]);
        setUnreadCounts(prev => ({ ...prev, [channel.id]: 0 }));
      },
      onUpdate: (channel) => {
        setChannels(prev => prev.map(c => c.id === channel.id ? channel : c));
      },
      onDelete: (channel) => {
        setChannels(prev => prev.filter(c => c.id !== channel.id));
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[channel.id];
          return newCounts;
        });
      }
    });

    subscriptionsRef.current.push(channelSub);

    // Load initial channels
    loadChannels();

    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [user, loadChannels]);

  /**
   * Setup channel-specific subscriptions when active channel changes
   */
  useEffect(() => {
    if (!activeChannel || !user) return;

    // Load messages
    loadMessages(activeChannel.id);

    // Subscribe to new messages
    const messageSub = messagesRealtimeService.subscribeToChannelMessages(
      activeChannel.id,
      {
        onInsert: (message) => {
          setMessages(prev => [...prev, message]);
          
          // Show browser notification if message is from another user
          if (message.user_id !== user.id) {
            if (Notification.permission === 'granted') {
              new Notification(`New message in ${activeChannel.name}`, {
                body: message.content.substring(0, 100),
                icon: '/favicon.ico'
              });
            }
            // Note: Unread counts should be managed when switching channels,
            // not while viewing the active channel
          }
        },
        onUpdate: (message) => {
          setMessages(prev => prev.map(m => m.id === message.id ? message : m));
        },
        onDelete: (message) => {
          setMessages(prev => prev.filter(m => m.id !== message.id));
        }
      }
    );

    // Subscribe to typing indicators
    const typingSub = messagesRealtimeService.subscribeToTypingIndicators(
      activeChannel.id,
      user.id,
      setTypingUsers
    );
    typingSubscriptionRef.current = typingSub;

    // Subscribe to presence
    const presenceSub = messagesRealtimeService.subscribeToChannelPresence(
      activeChannel.id,
      user.id,
      { name: user.name || user.email }
    );
    
    // Track presence state via channel events
    const updatePresence = () => {
      const presenceState = presenceSub.channel.presenceState();
      const users = Object.keys(presenceState).filter(id => id !== user.id);
      setOnlineUsers(users);
    };
    
    const syncHandler = presenceSub.channel.on('presence', { event: 'sync' }, updatePresence);
    const joinHandler = presenceSub.channel.on('presence', { event: 'join' }, updatePresence);
    const leaveHandler = presenceSub.channel.on('presence', { event: 'leave' }, updatePresence);
    
    presenceSubscriptionRef.current = presenceSub;

    // Cleanup subscriptions
    return () => {
      // Remove presence event listeners
      if (presenceSub.channel) {
        presenceSub.channel.unsubscribe();
      }
      messageSub.unsubscribe();
      typingSub.unsubscribe();
      presenceSub.unsubscribe();
      setTypingUsers([]);
      setOnlineUsers([]);
    };
  }, [activeChannel, user, loadMessages, toast]);

  /**
   * Request notification permission on mount
   */
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    isConnected,
    isLoading,
    channels,
    activeChannel,
    setActiveChannel,
    createChannel,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    typingUsers,
    sendTypingIndicator,
    onlineUsers,
    unreadCounts,
    totalUnread
  };
}
