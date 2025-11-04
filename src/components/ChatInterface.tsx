import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DecentralizedChatService } from '@/services/DecentralizedChatService';
import { 
  ChatChannel, 
  ChatMessage, 
  ChatUser, 
  MessageType,
  ChatNotification,
  SignatureRequest,
  ChatPoll
} from '@/types/chat';
import { cn } from '@/lib/utils';
import { VideoCallModal } from './VideoCallModal';
import {
  Send,
  SendHorizontal,
  Paperclip,
  Smile,
  Phone,
  Video,
  Settings,
  Search,
  Hash,
  Lock,
  Users,
  Bell,
  BellOff,
  Pin,
  MoreVertical,
  Reply,
  Edit,
  Trash2,
  FileText,
  Image,
  Download,
  Eye,
  ThumbsUp,
  MessageSquare,
  PenTool,
  BarChart3,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  Menu,
  PanelRightOpen,
  PanelLeftOpen,
  X,
  Plus,
  UserPlus,
  UserRoundPlus,
  Copy,
  CheckSquare,
  Clock
} from 'lucide-react';

interface ChatInterfaceProps {
  className?: string;
  channelMessageCounts?: { [key: string]: number };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className, channelMessageCounts = {} }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Chat service
  const [chatService] = useState(() => new DecentralizedChatService(
    import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  ));

  // State
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([
    { id: 'user-1', fullName: 'Dr. Principal', role: 'Principal', avatar: '' },
    { id: 'user-2', fullName: 'Prof. Registrar', role: 'Registrar', avatar: '' }
  ]);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  
  // UI State
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelRecipients, setNewChannelRecipients] = useState<string[]>([]);
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [showAddRecipientsModal, setShowAddRecipientsModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedChannelsToDelete, setSelectedChannelsToDelete] = useState<string[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeVideoCallId, setActiveVideoCallId] = useState<string | null>(null);
  const [showChannelMembersModal, setShowChannelMembersModal] = useState(false);
  const [selectedChannelForMembers, setSelectedChannelForMembers] = useState<ChatChannel | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<string[]>([]);
  const [polls, setPolls] = useState<{[key: string]: ChatPoll}>({});
  const [showPollVotesModal, setShowPollVotesModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [privateReplyTo, setPrivateReplyTo] = useState<ChatMessage | null>(null);
  const [showPrivateReplyModal, setShowPrivateReplyModal] = useState(false);
  const [privateReplyMessage, setPrivateReplyMessage] = useState('');

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Memoized default channels for instant loading
  const defaultChannels = useMemo(() => {
    if (!user) return [];
    return [
      {
        id: 'general',
        name: 'General',
        members: [user.id, 'principal', 'registrar', 'hod-cse', 'dean'],
        isPrivate: false,
        createdAt: new Date(),
        createdBy: user.id
      },
      {
        id: 'admin-council',
        name: 'Administrative Council',
        members: [user.id, 'principal', 'registrar', 'dean'],
        isPrivate: false,
        createdAt: new Date(),
        createdBy: user.id
      },
      {
        id: 'faculty-board',
        name: 'Faculty Board',
        members: [user.id, 'hod-cse', 'hod-eee', 'dean'],
        isPrivate: false,
        createdAt: new Date(),
        createdBy: user.id
      }
    ];
  }, [user]);

  // Memoized users for instant loading
  const defaultUsers = useMemo(() => {
    if (!user) return [];
    return [
      { id: 'user-1', fullName: 'Dr. Principal', role: 'Principal', avatar: '' },
      { id: 'user-2', fullName: 'Prof. Registrar', role: 'Registrar', avatar: '' },
      { id: user.id, fullName: user.fullName || 'You', role: user.role, avatar: '' }
    ];
  }, [user]);

  // Optimized initialization for instant loading
  useEffect(() => {
    if (!user) return;

    // Instant setup with default data
    setUsers(defaultUsers);
    setChannels(defaultChannels);
    if (defaultChannels.length > 0) {
      setActiveChannel(defaultChannels[0]);
    }
    setConnectionStatus('connected');

    // Background initialization (non-blocking)
    const initChatBackground = async () => {
      try {
        const documentChannels = JSON.parse(localStorage.getItem('document-channels') || '[]');
        const userDocumentChannels = documentChannels.filter((channel: any) => 
          channel.members.includes(user.id) || channel.createdBy === user.id
        );
        
        if (userDocumentChannels.length > 0) {
          const allChannels = [...userDocumentChannels, ...defaultChannels].map(channel => ({
            ...channel,
            members: channel.members?.length > 0 ? channel.members : [user.id, 'principal', 'registrar', 'dean']
          }));
          setChannels(allChannels);
        }
      } catch (error) {
        // Keep default channels on error
      }
    };

    // Run background init after component is mounted
    setTimeout(initChatBackground, 0);

    // Optimized event listeners
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'document-channels') {
        initChatBackground();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, defaultChannels, defaultUsers]);

  // Memoized sample messages for instant loading
  const getSampleMessages = useCallback((channelId: string) => [
    {
      id: 'msg-1',
      channelId,
      senderId: 'user-1',
      content: 'Here are the project documents',
      type: 'file' as MessageType,
      timestamp: new Date(Date.now() - 3600000),
      status: 'delivered',
      reactions: [],
      attachments: [
        {
          id: 'att-1',
          name: 'project-report.pdf',
          url: 'mock://project-report.pdf',
          type: 'document' as MessageType,
          size: 2048576,
          mimeType: 'application/pdf'
        }
      ],
      metadata: {}
    },
    {
      id: 'msg-2',
      channelId,
      senderId: 'user-2',
      content: 'Meeting photos from yesterday',
      type: 'image' as MessageType,
      timestamp: new Date(Date.now() - 1800000),
      status: 'delivered',
      reactions: [],
      attachments: [
        {
          id: 'att-2',
          name: 'meeting-photo.jpg',
          url: 'mock://meeting-photo.jpg',
          type: 'image' as MessageType,
          size: 1024000,
          mimeType: 'image/jpeg'
        }
      ],
      metadata: {}
    }
  ], []);

  const scrollToBottom = useCallback((force = false) => {
    if (force) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    // Instant loading with sample messages
    const sampleMessages = getSampleMessages(channelId);
    setMessages(sampleMessages);
    scrollToBottom(true);

    // Background loading (non-blocking)
    try {
      const channelMessages = await chatService.getMessages(channelId);
      if (channelMessages.length > 0) {
        setMessages([...sampleMessages, ...channelMessages]);
        scrollToBottom(true);
      }
    } catch (error) {
      // Keep sample messages on error
    }
  }, [chatService, getSampleMessages, scrollToBottom]);

  // Load messages when active channel changes
  useEffect(() => {
    if (activeChannel) {
      loadMessages(activeChannel.id);
    }
  }, [activeChannel, loadMessages]);

  // Optimized cleanup function for auto-delete messages after 24 hours
  const cleanupMessages = useCallback(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    setMessages(prev => {
      const filtered = prev.filter(message => {
        const messageTime = new Date(message.timestamp);
        return messageTime > twentyFourHoursAgo;
      });
      
      // Log deleted messages count for debugging
      if (filtered.length !== prev.length) {
        console.log(`Auto-deleted ${prev.length - filtered.length} message(s) older than 24 hours`);
        toast({
          title: 'Messages Cleaned',
          description: `${prev.length - filtered.length} old message(s) automatically deleted`,
          variant: 'default'
        });
      }
      
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [toast]);

  // Cleanup function for auto-delete channels after 1 week (7 days)
  const cleanupChannels = useCallback(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setChannels(prev => {
      const filtered = prev.filter(channel => {
        const channelCreationTime = new Date(channel.createdAt);
        // Keep channels that are newer than 1 week
        return channelCreationTime > oneWeekAgo;
      });
      
      // Check if active channel was deleted
      if (activeChannel && !filtered.find(ch => ch.id === activeChannel.id)) {
        setActiveChannel(filtered.length > 0 ? filtered[0] : null);
      }
      
      // Log deleted channels count for debugging
      if (filtered.length !== prev.length) {
        console.log(`Auto-deleted ${prev.length - filtered.length} channel(s) older than 1 week`);
        toast({
          title: 'Channels Cleaned',
          description: `${prev.length - filtered.length} old channel(s) automatically deleted`,
          variant: 'default'
        });
      }
      
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [activeChannel, toast]);

  // Auto-delete messages after 24 hours - runs every hour
  useEffect(() => {
    // Run cleanup every hour
    const interval = setInterval(cleanupMessages, 60 * 60 * 1000);
    
    // Initial cleanup
    cleanupMessages();

    return () => clearInterval(interval);
  }, [cleanupMessages]);

  // Auto-delete channels after 1 week - runs every day
  useEffect(() => {
    // Run cleanup every 24 hours
    const interval = setInterval(cleanupChannels, 24 * 60 * 60 * 1000);
    
    // Initial cleanup
    cleanupChannels();

    return () => clearInterval(interval);
  }, [cleanupChannels]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || !user) return;

    const messageData = {
      channelId: activeChannel.id,
      senderId: user.id,
      type: 'text' as MessageType,
      content: messageInput.trim(),
      parentMessageId: replyingTo?.id
    };

    try {
      const message = await chatService.sendMessage(messageData);
      setMessages(prev => [...prev, message]);
      setMessageInput('');
      setReplyingTo(null);
      scrollToBottom(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeChannel || !user) return;

    try {
      const fileUrl = await chatService.uploadFile(file, activeChannel.id);
      
      const messageData = {
        channelId: activeChannel.id,
        senderId: user.id,
        type: getFileType(file),
        content: `Shared ${file.name}`,
        attachments: [{
          id: Date.now().toString(),
          name: file.name,
          url: fileUrl,
          type: getFileType(file),
          size: file.size,
          mimeType: file.type
        }]
      };

      const message = await chatService.sendMessage(messageData);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    }
  };

  const getFileType = (file: File): MessageType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.includes('pdf') || file.type.includes('document')) return 'document';
    return 'file';
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await chatService.editMessage(messageId, newContent);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, editedAt: new Date() }
          : msg
      ));
      setEditingMessage(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
    }
  };

  const handleVoiceRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
          
          if (activeChannel && user) {
            try {
              const fileUrl = await chatService.uploadFile(audioFile, activeChannel.id);
              
              const messageData = {
                channelId: activeChannel.id,
                senderId: user.id,
                type: 'audio' as MessageType,
                content: 'Voice message',
                attachments: [{
                  id: Date.now().toString(),
                  name: audioFile.name,
                  url: fileUrl,
                  type: 'audio' as MessageType,
                  size: audioFile.size,
                  mimeType: audioFile.type
                }]
              };

              const message = await chatService.sendMessage(messageData);
              setMessages(prev => [...prev, message]);
              
              toast({
                title: 'Voice message sent',
                description: 'Your voice message has been sent successfully',
                variant: 'default'
              });
            } catch (error) {
              toast({
                title: 'Upload Failed',
                description: 'Failed to send voice message',
                variant: 'destructive'
              });
            }
          }
          
          stream.getTracks().forEach(track => track.stop());
        };

        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (error) {
        toast({
          title: 'Recording failed',
          description: 'Could not access microphone',
          variant: 'destructive'
        });
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
        setMediaRecorder(null);
      }
    }
  };

  const handleCreateSignatureRequest = async () => {
    if (!activeChannel || !user) return;

    const signatureRequest = {
      messageId: '',
      documentId: 'temp-doc-id',
      requestedBy: user.id,
      targetUsers: activeChannel.members,
      title: 'Signature Required',
      description: 'Please review and sign this document',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    try {
      const request = await chatService.createSignatureRequest(signatureRequest);
      
      const messageData = {
        channelId: activeChannel.id,
        senderId: user.id,
        type: 'signature-request' as MessageType,
        content: 'Signature request created',
        metadata: {
          signatureRequestId: request.id
        }
      };

      const message = await chatService.sendMessage(messageData);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create signature request',
        variant: 'destructive'
      });
    }
  };

  const handleCreatePoll = async (title: string, options: string[]) => {
    if (!activeChannel || !user) return;

    const pollId = `poll-${Date.now()}`;
    const poll = {
      id: pollId,
      channelId: activeChannel.id,
      createdBy: user.id,
      title,
      options: options.map((option, index) => ({
        id: `option-${index}`,
        text: option,
        votes: []
      })),
      type: 'single-choice' as const
    };

    try {
      setPolls(prev => ({...prev, [pollId]: poll}));
      
      const messageData = {
        channelId: activeChannel.id,
        senderId: user.id,
        type: 'poll' as MessageType,
        content: `Poll created: ${title}`,
        metadata: {
          pollId
        }
      };

      const message = await chatService.sendMessage(messageData);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create poll',
        variant: 'destructive'
      });
    }
  };

  const handleVoteOnPoll = (pollId: string, optionId: string) => {
    if (!user) return;
    
    setPolls(prev => {
      const poll = prev[pollId];
      if (!poll) return prev;
      
      const updatedOptions = poll.options.map(option => {
        if (option.id === optionId) {
          const hasVoted = option.votes.includes(user.id);
          return {
            ...option,
            votes: hasVoted 
              ? option.votes.filter(id => id !== user.id)
              : [...option.votes.filter(id => id !== user.id), user.id]
          };
        } else {
          return {
            ...option,
            votes: option.votes.filter(id => id !== user.id)
          };
        }
      });
      
      return {
        ...prev,
        [pollId]: {
          ...poll,
          options: updatedOptions
        }
      };
    });
  };

  const getPollResults = (pollId: string) => {
    const poll = polls[pollId];
    if (!poll) return { totalVotes: 0, options: [] };
    
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);
    const optionsWithPercentage = poll.options.map(option => ({
      ...option,
      percentage: totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0
    }));
    
    return { totalVotes, options: optionsWithPercentage };
  };

  const showNotification = (notification: Partial<ChatNotification>) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'New Message', {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const handleDownloadFile = async (attachment: any) => {
    try {
      // For demo purposes, create a mock file if URL doesn't exist
      if (!attachment.url || attachment.url.startsWith('mock://') || attachment.url.includes('placeholder')) {
        const mockContent = createMockFile(attachment);
        const blob = new Blob([mockContent], { type: attachment.mimeType || 'application/octet-stream' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Try to fetch real file
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error('File not found');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: 'Download Started',
        description: `Downloaded ${attachment.name}`,
        variant: 'default'
      });
    } catch (error) {
      // Fallback: create mock file even if fetch fails
      try {
        const mockContent = createMockFile(attachment);
        const blob = new Blob([mockContent], { type: attachment.mimeType || 'application/octet-stream' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: 'Download Started',
          description: `Downloaded ${attachment.name} (demo file)`,
          variant: 'default'
        });
      } catch (fallbackError) {
        toast({
          title: 'Download Failed',
          description: 'Unable to download file',
          variant: 'destructive'
        });
      }
    }
  };

  const createMockFile = (attachment: any) => {
    if (attachment.type === 'image') {
      // Create a simple SVG image
      return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16">
          ${attachment.name}
        </text>
      </svg>`;
    } else {
      // Create a text file with file info
      return `File: ${attachment.name}
Type: ${attachment.type}
Size: ${attachment.size || 'Unknown'}

This is a demo file from the IAOMS chat system.
Generated on: ${new Date().toLocaleString()}`;
    }
  };

  const handleDeleteChannels = () => {
    if (selectedChannelsToDelete.length === 0) return;
    
    setChannels(prev => prev.filter(channel => !selectedChannelsToDelete.includes(channel.id)));
    
    if (activeChannel && selectedChannelsToDelete.includes(activeChannel.id)) {
      const remainingChannels = channels.filter(channel => !selectedChannelsToDelete.includes(channel.id));
      setActiveChannel(remainingChannels.length > 0 ? remainingChannels[0] : null);
    }
    
    toast({
      title: 'Channels Deleted',
      description: `${selectedChannelsToDelete.length} channel(s) deleted successfully`,
      variant: 'default'
    });
    
    setSelectedChannelsToDelete([]);
    setDeleteMode(false);
    setShowDeleteConfirmation(false);
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
      case 'read': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-3 h-3 text-red-500" />;
      default: return <Lock className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: Date | string | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleCopyMessage = (message: ChatMessage) => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
      variant: 'default'
    });
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handlePinMessage = (messageId: string) => {
    setPinnedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
    const isPinned = pinnedMessages.includes(messageId);
    toast({
      title: isPinned ? 'Unpinned' : 'Pinned',
      description: `Message ${isPinned ? 'unpinned' : 'pinned'} successfully`,
      variant: 'default'
    });
  };

  const handleReplyPrivately = (message: ChatMessage) => {
    setPrivateReplyTo(message);
    setShowPrivateReplyModal(true);
    
    toast({
      title: 'Private Reply',
      description: `Starting private conversation with ${users.find(u => u.id === message.senderId)?.fullName || 'user'}`,
      variant: 'default'
    });
  };

  const handleSendPrivateReply = async () => {
    if (!privateReplyTo || !privateReplyMessage.trim() || !user) return;

    try {
      // Create or find private channel with the sender
      const recipientId = privateReplyTo.senderId;
      const recipient = users.find(u => u.id === recipientId);
      
      if (!recipient) {
        toast({
          title: 'Error',
          description: 'Could not find the recipient user',
          variant: 'destructive'
        });
        return;
      }

      // Create a private channel name that's consistent regardless of who creates it
      const channelName = [user.id, recipientId].sort().join('-private-');
      
      // Check if private channel already exists
      let privateChannel = channels.find(ch => ch.name === channelName && ch.isPrivate);
      
      if (!privateChannel) {
        // Create new private channel
        privateChannel = {
          id: `private-${Date.now()}`,
          name: channelName,
          description: `Private chat between ${user.fullName || user.name || 'You'} and ${recipient.fullName}`,
          type: 'private',
          isPrivate: true,
          members: [user.id, recipientId],
          admins: [user.id, recipientId],
          createdAt: new Date(),
          createdBy: user.id,
          updatedAt: new Date(),
          settings: {
            allowFileSharing: true,
            allowPolls: false,
            allowVideoCall: true,
            notificationsEnabled: true
          }
        };
        
        setChannels(prev => [...prev, privateChannel]);
      }

      // Send the private reply with reference to original message
      const privateReplyMessageData = {
        channelId: privateChannel.id,
        senderId: user.id,
        type: 'text' as MessageType,
        content: privateReplyMessage,
        metadata: {
          replyToPrivate: privateReplyTo.id,
          originalChannelId: privateReplyTo.channelId,
          originalMessageContent: privateReplyTo.content.substring(0, 100) + (privateReplyTo.content.length > 100 ? '...' : '')
        }
      };

      const message = await chatService.sendMessage(privateReplyMessageData);
      setMessages(prev => [...prev, message]);
      
      // Switch to the private channel
      setActiveChannel(privateChannel);
      
      // Clear the private reply state
      setPrivateReplyMessage('');
      setPrivateReplyTo(null);
      setShowPrivateReplyModal(false);
      
      toast({
        title: 'Private Reply Sent',
        description: `Your private message was sent to ${recipient.fullName}`,
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Failed to send private reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send private reply',
        variant: 'destructive'
      });
    }
  };

  const handleReactToMessage = (messageId: string, emoji: string = '👍') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1 }
                : r
            )
          };
        } else {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, count: 1 }]
          };
        }
      }
      return msg;
    }));
    toast({
      title: 'Reaction Added',
      description: `Added ${emoji} reaction to message`,
      variant: 'default'
    });
  };

  const MessageComponent: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isOwnMessage = message.senderId === user?.id;
    const isSystemMessage = message.senderId === 'system';
    const sender = users.find(u => u.id === message.senderId);

    return (
      <div className={cn(
        "flex gap-3 p-2 hover:bg-muted/50 group",
        isOwnMessage && "flex-row-reverse",
        isSystemMessage && "justify-center",
        selectedMessages.includes(message.id) && "bg-blue-50 border-l-4 border-l-blue-500",
        pinnedMessages.includes(message.id) && "bg-yellow-50 border border-yellow-200"
      )}>
        {!isSystemMessage && (
          <Avatar className="w-8 h-8">
            <AvatarImage src={sender?.avatar} />
            <AvatarFallback>
              {sender?.fullName?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          "flex-1 min-w-0", 
          isOwnMessage && "text-right",
          isSystemMessage && "text-center"
        )}>
          {!isSystemMessage && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {isOwnMessage ? 'You' : sender?.fullName || 'You'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(message.timestamp)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
              {getMessageStatusIcon(message.status)}
            </div>
          )}
          
          {message.parentMessageId && (
            <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded">
              Replying to a message
            </div>
          )}
          
          {message.metadata?.replyToPrivate && (
            <div className="text-xs text-purple-600 mb-2 p-2 bg-purple-50 border border-purple-200 rounded flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span className="font-medium">Private Reply</span>
              <span className="text-purple-500">
                • Re: "{message.metadata.originalMessageContent}"
              </span>
            </div>
          )}
          
          {editingMessage?.id === message.id ? (
            <div className={cn(
              "inline-block p-3 rounded-lg w-full",
              message.metadata.pollId ? "max-w-full" : "max-w-[80%]",
              isOwnMessage 
                ? "bg-gray-200 text-gray-900" 
                : "bg-muted"
            )}>
              <div className="space-y-2">
                <Textarea
                  value={editingMessage.content}
                  onChange={(e) => setEditingMessage({...editingMessage, content: e.target.value})}
                  className="min-h-[60px] w-full resize-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleEditMessage(message.id, editingMessage.content)}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "inline-block p-3 rounded-lg",
              message.metadata?.pollId ? "max-w-full" : "max-w-[80%]",
              isSystemMessage 
                ? "bg-blue-50 text-blue-800 border border-blue-200 text-sm" 
                : isOwnMessage 
                ? "bg-gray-200 text-gray-900" 
                : "bg-muted"
            )}>
              <p className={cn(
                "whitespace-pre-wrap",
                isSystemMessage ? "text-sm font-medium" : "text-sm",
                message.metadata?.callType === 'video-start' && !message.metadata?.callEnded && "cursor-pointer hover:text-blue-600",
                message.metadata?.callType === 'video-start' && message.metadata?.callEnded && "text-red-600"
              )}
              onClick={() => {
                if (message.metadata?.callType === 'video-start' && !message.metadata?.callEnded) {
                  setActiveVideoCallId(message.metadata.meetingId);
                  setShowVideoCall(true);
                }
              }}
              >
                {message.content}
              </p>
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded hover:bg-muted/70 transition-colors">
                        {attachment.type === 'image' ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-green-500" />
                        )}
                        <span 
                          className="text-sm cursor-pointer hover:underline flex-1" 
                          onClick={() => handleDownloadFile(attachment)}
                          title={`Click to download ${attachment.name}`}
                        >
                          {attachment.name}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDownloadFile(attachment)}
                          title={`Download ${attachment.name}`}
                          className="hover:bg-primary/10"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {message.metadata.signatureRequestId && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                    <div className="flex items-center gap-2">
                      <PenTool className="w-4 h-4" />
                      <span className="text-sm font-medium">Signature Request</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please review and sign the attached document
                    </p>
                    <Button size="sm" className="mt-2">
                      View & Sign
                    </Button>
                  </div>
                )}
                
                {message.metadata.pollId && (() => {
                  const pollResults = getPollResults(message.metadata.pollId);
                  const poll = polls[message.metadata.pollId];
                  const userVote = poll?.options.find(opt => opt.votes.includes(user?.id || ''));
                  
                  return (
                    <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-base">{poll?.title || 'Poll'}</h4>
                        </div>
                        
                        <div className="space-y-2">
                          {pollResults.options.map((option) => {
                            const isSelected = userVote?.id === option.id;
                            return (
                              <div key={option.id} className="space-y-1">
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded"
                                  onClick={() => handleVoteOnPoll(message.metadata.pollId, option.id)}
                                >
                                  <div className="w-4 h-4 border-2 border-blue-600 rounded-full flex items-center justify-center">
                                    {isSelected && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                                  </div>
                                  <span className="text-sm flex-1">{option.text}</span>
                                  <span className="text-xs text-muted-foreground">{option.votes.length}</span>
                                </div>
                                <div className="ml-6">
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${option.percentage}%`}}></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-3"
                          onClick={() => {
                            setSelectedPollId(message.metadata.pollId);
                            setShowPollVotesModal(true);
                          }}
                        >
                          View votes ({pollResults.totalVotes})
                        </Button>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
          
          {message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {message.reactions.map(reaction => (
                <Button
                  key={reaction.emoji}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {!isSystemMessage && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleCopyMessage(message)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setReplyingTo(message)}>
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {!isOwnMessage && (
                  <DropdownMenuItem onClick={() => handleReplyPrivately(message)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply Privately
                  </DropdownMenuItem>
                )}
                {isOwnMessage && (
                  <>
                    <DropdownMenuItem onClick={() => setEditingMessage(message)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => handleReactToMessage(message.id)}>
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  React
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  const ChannelSidebar: React.FC = () => (
    <div className={cn(
      "border-r bg-background flex flex-col",
      showSidebar ? "w-64" : "w-0 overflow-hidden"
    )}>
      <div className="p-4 border-t">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <h3 className="font-semibold flex-shrink-0 text-sm">Channels</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            {deleteMode ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeleteMode(false);
                    setSelectedChannelsToDelete([]);
                  }}
                  className="whitespace-nowrap h-8 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={selectedChannelsToDelete.length === 0}
                  className="whitespace-nowrap h-8 px-2 text-xs"
                >
                  Delete ({selectedChannelsToDelete.length})
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteMode(true)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20">
          <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Auto-delete: Channels after 7 days</span>
          </p>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Add default channels with message counts if none exist */}
          {channels.length === 0 && [
            { id: 'admin-council', name: 'Administrative Council', isPrivate: false, members: ['user-1', 'principal', 'registrar', 'dean'], createdAt: new Date(), createdBy: 'user-1' },
            { id: 'faculty-board', name: 'Faculty Board', isPrivate: false, members: ['user-1', 'hod-cse', 'hod-eee', 'dean'], createdAt: new Date(), createdBy: 'user-1' },
            { id: 'general', name: 'General', isPrivate: false, members: ['user-1', 'principal', 'registrar', 'hod-cse', 'dean'], createdAt: new Date(), createdBy: 'user-1' }
          ].map(channel => (
            <div key={channel.id} className="flex items-center gap-1">
              {deleteMode && (
                <input
                  type="checkbox"
                  checked={selectedChannelsToDelete.includes(channel.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannelsToDelete(prev => [...prev, channel.id]);
                    } else {
                      setSelectedChannelsToDelete(prev => prev.filter(id => id !== channel.id));
                    }
                  }}
                  className="w-4 h-4 rounded flex-shrink-0"
                />
              )}
              <Button
                variant={activeChannel?.id === channel.id ? "secondary" : "ghost"}
                className="flex-1 justify-start min-w-0"
                onClick={() => !deleteMode && setActiveChannel(channel)}
                disabled={deleteMode}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                  {channelMessageCounts[channel.name] && (
                    <Badge variant="destructive" className="px-1 py-0 text-xs ml-auto flex-shrink-0">
                      {channelMessageCounts[channel.name]}
                    </Badge>
                  )}
                </div>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => {
                  setSelectedChannelForMembers(channel);
                  setShowChannelMembersModal(true);
                }}
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {channels.map(channel => (
            <div key={channel.id} className="flex items-center gap-1">
              {deleteMode && (
                <input
                  type="checkbox"
                  checked={selectedChannelsToDelete.includes(channel.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannelsToDelete(prev => [...prev, channel.id]);
                    } else {
                      setSelectedChannelsToDelete(prev => prev.filter(id => id !== channel.id));
                    }
                  }}
                  className="w-4 h-4 rounded flex-shrink-0"
                />
              )}
              <Button
                variant={activeChannel?.id === channel.id ? "secondary" : "ghost"}
                className="flex-1 justify-start min-w-0"
                onClick={() => !deleteMode && setActiveChannel(channel)}
                disabled={deleteMode}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                  {channelMessageCounts[channel.name] && (
                    <Badge variant="destructive" className="ml-auto px-1 py-0 text-xs flex-shrink-0">
                      {channelMessageCounts[channel.name]}
                    </Badge>
                  )}
                </div>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => {
                  setSelectedChannelForMembers(channel);
                  setShowChannelMembersModal(true);
                }}
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-center"
          onClick={() => setShowSidebar(false)}
        >
          <PanelLeftOpen className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("flex h-full bg-background", className)}>
      <ChannelSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Members Panel */}
        {showMembers && activeChannel && (
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold mb-3">Channel Members ({activeChannel.members.length})</h3>
            <div className="flex flex-wrap gap-2">
              {activeChannel.members.map(memberId => {
                const member = users.find(u => u.id === memberId) || { id: memberId, fullName: 'Unknown User', role: 'member' };
                return (
                  <div key={memberId} className="flex items-center gap-2 p-2 bg-background rounded border">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {member.fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.fullName}</span>
                    <Badge variant="outline" className="text-xs">{member.role}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Channel Header */}
        {activeChannel && (
          <div className="p-4 border-b bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!showSidebar && (
                  <Button size="sm" variant="ghost" onClick={() => setShowSidebar(true)}>
                    <PanelRightOpen className="w-5 h-5" />
                  </Button>
                )}
                <Lock className="w-5 h-5" />
                <div>
                  <h2 className="font-semibold">{activeChannel.name}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {activeChannel.members.length} members
                      {typingUsers.length > 0 && (
                        <span className="ml-2">
                          • {typingUsers.length} typing...
                        </span>
                      )}
                    </p>
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      <Clock className="w-3 h-3 mr-1" />
                      Auto-delete: 24h
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowSearch(!showSearch)}>
                  <Search className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={activeVideoCallId ? "secondary" : "ghost"} 
                  onClick={() => setShowVideoCall(true)}
                  className={activeVideoCallId ? "animate-pulse" : ""}
                >
                  <Video className={`w-4 h-4 ${activeVideoCallId ? 'text-green-600' : ''}`} />
                  {activeVideoCallId && <span className="ml-1 text-xs">Live</span>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewChannelModal(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddRecipientsModal(true)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        {showSearch && (
          <div className="p-4 border-b bg-muted/20">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {useMemo(() => 
              messages
                .filter(message => 
                  !searchQuery || 
                  message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (users.find(u => u.id === message.senderId)?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(message => (
                  <MessageComponent key={message.id} message={message} />
                )), [messages, searchQuery, users]
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Reply Bar */}
        {replyingTo && (
          <div className="p-2 bg-muted/50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4" />
              <span className="text-sm">Replying to {replyingTo.content}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
              ×
            </Button>
          </div>
        )}
        
        {/* Message Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls"
              aria-label="Upload file"
            />
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPollModal(true)}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Textarea
                placeholder={`Message ${activeChannel?.name || 'channel'}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[40px] max-h-[120px] resize-none pr-10"
              />
              <Button
                size="sm"
                variant={isRecording ? "destructive" : "ghost"}
                onClick={handleVoiceRecording}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 ${isRecording ? "animate-pulse" : ""}`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 p-3 bg-background border rounded-lg shadow-lg z-10">
                  <div className="grid grid-cols-8 gap-1 w-64">
                    {['👍','👎','😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMessageInput(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1 hover:bg-muted rounded text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
            >
              <SendHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* New Channel Modal */}
      <AlertDialog open={showNewChannelModal} onOpenChange={setShowNewChannelModal}>
        <AlertDialogContent className="max-w-2xl">
          <button
            onClick={() => setShowNewChannelModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-yellow-500" />
              Create New Channel
            </AlertDialogTitle>
            <AlertDialogDescription>
              Create a new chat channel and add recipients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Channel Name</label>
              <Input
                placeholder="Enter channel name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Add Recipients</label>
              <ScrollArea className="h-64 border rounded-md p-2">
                {[{id: 'principal', name: 'Dr. Principal', role: 'Principal'}, {id: 'registrar', name: 'Prof. Registrar', role: 'Registrar'}, {id: 'hod-cse', name: 'Dr. HOD-CSE', role: 'HOD'}].map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{person.role}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newChannelRecipients.includes(person.id)) {
                          setNewChannelRecipients(newChannelRecipients.filter(id => id !== person.id));
                        } else {
                          setNewChannelRecipients([...newChannelRecipients, person.id]);
                        }
                      }}
                    >
                      {newChannelRecipients.includes(person.id) ? 'Remove' : 'Add'}
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
            {newChannelRecipients.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Selected Recipients ({newChannelRecipients.length})</label>
                <div className="flex flex-wrap gap-2">
                  {newChannelRecipients.map(id => (
                    <div key={id} className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full">
                      <UserRoundPlus className="w-4 h-4" />
                      <span className="text-sm font-medium">{id.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setNewChannelName('');
              setNewChannelRecipients([]);
              setIsPrivateChannel(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (newChannelName.trim() && newChannelRecipients.length > 0 && user) {
                  const newChannel: ChatChannel = {
                    id: `channel-${Date.now()}`,
                    name: newChannelName.trim(),
                    members: [user.id, ...newChannelRecipients],
                    isPrivate: true,
                    createdAt: new Date(),
                    createdBy: user.id
                  };
                  
                  setChannels(prev => [newChannel, ...prev]);
                  setActiveChannel(newChannel);
                  
                  toast({
                    title: 'Channel Created',
                    description: `${newChannelName} has been created successfully`,
                    variant: 'default'
                  });
                  
                  setNewChannelName('');
                  setNewChannelRecipients([]);
                  setIsPrivateChannel(false);
                  setShowNewChannelModal(false);
                }
              }}
              disabled={!newChannelName.trim() || newChannelRecipients.length === 0}
            >
              Create Channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Recipients Modal */}
      <AlertDialog open={showAddRecipientsModal} onOpenChange={setShowAddRecipientsModal}>
        <AlertDialogContent className="max-w-2xl">
          <button
            onClick={() => setShowAddRecipientsModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Add Recipients
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select recipients to start a direct chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Available Staff</label>
              <ScrollArea className="h-64 border rounded-md p-2">
                {[{id: 'principal', name: 'Dr. Principal', role: 'Principal'}, {id: 'registrar', name: 'Prof. Registrar', role: 'Registrar'}, {id: 'hod-cse', name: 'Dr. HOD-CSE', role: 'HOD'}, {id: 'hod-eee', name: 'Dr. HOD-EEE', role: 'HOD'}, {id: 'dean', name: 'Dr. Dean', role: 'Dean'}].map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{person.role}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedRecipients.includes(person.id)) {
                          setSelectedRecipients(selectedRecipients.filter(id => id !== person.id));
                        } else {
                          setSelectedRecipients([...selectedRecipients, person.id]);
                        }
                      }}
                    >
                      {selectedRecipients.includes(person.id) ? 'Remove' : 'Add'}
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
            {selectedRecipients.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Selected Recipients ({selectedRecipients.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map(id => (
                    <div key={id} className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full">
                      <UserRoundPlus className="w-4 h-4" />
                      <span className="text-sm font-medium">{id.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedRecipients([]);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedRecipients.length > 0 && user) {
                  const newChannel: ChatChannel = {
                    id: `dm-${Date.now()}`,
                    name: selectedRecipients.map(id => id.toUpperCase()).join(', '),
                    members: [user.id, ...selectedRecipients],
                    isPrivate: true,
                    createdAt: new Date(),
                    createdBy: user.id
                  };
                  setChannels(prev => [newChannel, ...prev]);
                  setActiveChannel(newChannel);
                  toast({
                    title: 'Chat Started',
                    description: `Started chat with ${selectedRecipients.length} recipient(s)`,
                    variant: 'default'
                  });
                  setSelectedRecipients([]);
                  setShowAddRecipientsModal(false);
                }
              }}
              disabled={selectedRecipients.length === 0}
            >
              Start Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Poll Creation Modal */}
      <AlertDialog open={showPollModal} onOpenChange={setShowPollModal}>
        <AlertDialogContent>
          <button
            onClick={() => setShowPollModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Poll</AlertDialogTitle>
            <AlertDialogDescription>
              Create a poll for the channel members to vote on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Poll Question</label>
              <Input
                placeholder="What's your question?"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                className="px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Options</label>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...pollOptions];
                      newOptions[index] = e.target.value;
                      setPollOptions(newOptions);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="mt-2"
              >
                + Add Option
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPollTitle('');
              setPollOptions(['', '']);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const validOptions = pollOptions.filter(opt => opt.trim());
                if (pollTitle.trim() && validOptions.length >= 2) {
                  handleCreatePoll(pollTitle.trim(), validOptions);
                  setPollTitle('');
                  setPollOptions(['', '']);
                  setShowPollModal(false);
                }
              }}
              disabled={!pollTitle.trim() || pollOptions.filter(opt => opt.trim()).length < 2}
            >
              Create Poll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channels</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedChannelsToDelete.length} channel(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannels}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Channel Members Modal */}
      <AlertDialog open={showChannelMembersModal} onOpenChange={setShowChannelMembersModal}>
        <AlertDialogContent className="max-w-2xl">
          <button
            onClick={() => setShowChannelMembersModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              View Members in Channel Group
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedChannelForMembers?.name} • Total Members: {selectedChannelForMembers?.members?.length || 0}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Channel Group Members</label>
              <ScrollArea className="h-64 border rounded-md p-2">
                {selectedChannelForMembers?.members?.map((memberId) => {
                  // Helper function to get user display info from member ID
                  const getMemberInfo = (id: string) => {
                    // Map of common recipient IDs to their display names
                    const recipientMap: { [key: string]: { fullName: string; role: string } } = {
                      // Leadership
                      'principal-dr.-robert-principal': { fullName: 'Dr. Robert Principal', role: 'Principal' },
                      'registrar-prof.-sarah-registrar': { fullName: 'Prof. Sarah Registrar', role: 'Registrar' },
                      'dean-dr.-maria-dean': { fullName: 'Dr. Maria Dean', role: 'Dean' },
                      'chairman-mr.-david-chairman': { fullName: 'Mr. David Chairman', role: 'Chairman' },
                      'director-(for-information)-ms.-lisa-director': { fullName: 'Ms. Lisa Director', role: 'Director' },
                      'leadership-prof.-leadership-officer': { fullName: 'Prof. Leadership Officer', role: 'Leadership' },
                      
                      // CDC Employees
                      'cdc-head-dr.-cdc-head': { fullName: 'Dr. CDC Head', role: 'CDC Head' },
                      'cdc-coordinator-prof.-cdc-coordinator': { fullName: 'Prof. CDC Coordinator', role: 'CDC Coordinator' },
                      'cdc-executive-ms.-cdc-executive': { fullName: 'Ms. CDC Executive', role: 'CDC Executive' },
                      
                      // Administrative
                      'controller-of-examinations-dr.-robert-controller': { fullName: 'Dr. Robert Controller', role: 'Controller' },
                      'asst.-dean-iiic-prof.-asst-dean': { fullName: 'Prof. Asst Dean', role: 'Asst. Dean IIIC' },
                      'head-operations-mr.-michael-operations': { fullName: 'Mr. Michael Operations', role: 'Head Operations' },
                      'librarian-ms.-jennifer-librarian': { fullName: 'Ms. Jennifer Librarian', role: 'Librarian' },
                      'ssg-prof.-william-ssg': { fullName: 'Prof. William SSG', role: 'SSG' },
                      
                      // HODs
                      'hod-dr.-eee-hod-eee': { fullName: 'Dr. EEE HOD', role: 'HOD EEE' },
                      'hod-dr.-mech-hod-mech': { fullName: 'Dr. MECH HOD', role: 'HOD MECH' },
                      'hod-dr.-cse-hod-cse': { fullName: 'Dr. CSE HOD', role: 'HOD CSE' },
                      'hod-dr.-ece-hod-ece': { fullName: 'Dr. ECE HOD', role: 'HOD ECE' },
                      'hod-dr.-csm-hod-csm': { fullName: 'Dr. CSM HOD', role: 'HOD CSM' },
                      'hod-dr.-cso-hod-cso': { fullName: 'Dr. CSO HOD', role: 'HOD CSO' },
                      'hod-dr.-csd-hod-csd': { fullName: 'Dr. CSD HOD', role: 'HOD CSD' },
                      'hod-dr.-csc-hod-csc': { fullName: 'Dr. CSC HOD', role: 'HOD CSC' },
                      
                      // Program Department Heads
                      'program-department-head-prof.-eee-head-eee': { fullName: 'Prof. EEE Head', role: 'Program Head EEE' },
                      'program-department-head-prof.-mech-head-mech': { fullName: 'Prof. MECH Head', role: 'Program Head MECH' },
                      'program-department-head-prof.-cse-head-cse': { fullName: 'Prof. CSE Head', role: 'Program Head CSE' },
                      'program-department-head-prof.-ece-head-ece': { fullName: 'Prof. ECE Head', role: 'Program Head ECE' },
                      'program-department-head-prof.-csm-head-csm': { fullName: 'Prof. CSM Head', role: 'Program Head CSM' },
                      'program-department-head-prof.-cso-head-cso': { fullName: 'Prof. CSO Head', role: 'Program Head CSO' },
                      'program-department-head-prof.-csd-head-csd': { fullName: 'Prof. CSD Head', role: 'Program Head CSD' },
                      'program-department-head-prof.-csc-head-csc': { fullName: 'Prof. CSC Head', role: 'Program Head CSC' }
                    };
                    
                    // Check if we have a mapping
                    if (recipientMap[id]) {
                      return recipientMap[id];
                    }
                    
                    // Check if it's the current user
                    if (id === user?.id || id === user?.name) {
                      return { fullName: user?.name || 'You', role: user?.role || 'User' };
                    }
                    
                    // Try to extract name from ID
                    const parts = id.split('-');
                    let name = '';
                    let role = '';
                    
                    for (let i = 0; i < parts.length; i++) {
                      if (parts[i].match(/^(dr\.|prof\.|mr\.|ms\.)$/i)) {
                        name = parts.slice(i).join(' ').replace(/-/g, ' ')
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                  .join(' ');
                        break;
                      }
                    }
                    
                    // Extract role
                    if (id.includes('hod')) role = 'HOD';
                    else if (id.includes('principal')) role = 'Principal';
                    else if (id.includes('registrar')) role = 'Registrar';
                    else if (id.includes('dean')) role = 'Dean';
                    else if (id.includes('program-department-head')) role = 'Program Head';
                    else if (id.includes('faculty')) role = 'Faculty';
                    else if (id.includes('employee')) role = 'Employee';
                    else role = 'Member';
                    
                    if (!name) {
                      name = id.replace(/-/g, ' ')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ');
                    }
                    
                    return { fullName: name, role: role };
                  };
                  
                  const memberInfo = getMemberInfo(memberId);
                  const isCurrentUser = memberId === user?.id || memberId === user?.name;
                  const isAdmin = selectedChannelForMembers?.admins?.includes(memberId);
                  
                  return (
                    <div key={memberId} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {memberInfo.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {memberInfo.fullName}
                            {isCurrentUser && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {memberInfo.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Badge variant="outline" className="text-xs">
                            Admin
                          </Badge>
                        )}
                        {selectedChannelForMembers?.createdBy === memberId && (
                          <Badge variant="secondary" className="text-xs">
                            Creator
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Poll Votes Modal */}
      <AlertDialog open={showPollVotesModal} onOpenChange={setShowPollVotesModal}>
        <AlertDialogContent className="max-w-2xl">
          <button
            onClick={() => setShowPollVotesModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Poll Results
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPollId && polls[selectedPollId] ? polls[selectedPollId].title : 'Poll Results'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {selectedPollId && polls[selectedPollId] && (() => {
              const pollResults = getPollResults(selectedPollId);
              return (
                <div>
                  <label className="text-sm font-medium mb-2 block">Votes by Option</label>
                  <ScrollArea className="h-64 border rounded-md p-2">
                    {pollResults.options.map((option) => (
                      <div key={option.id} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{option.text}</span>
                          <Badge variant="secondary">{option.votes.length} votes ({option.percentage}%)</Badge>
                        </div>
                        <div className="space-y-1">
                          {option.votes.map(userId => {
                            const voter = users.find(u => u.id === userId) || 
                              { id: userId, fullName: userId.charAt(0).toUpperCase() + userId.slice(1), role: 'Member' };
                            return (
                              <div key={userId} className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {voter.fullName.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{voter.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{voter.role}</p>
                                </div>
                              </div>
                            );
                          })}
                          {option.votes.length === 0 && (
                            <p className="text-xs text-muted-foreground italic p-2">No votes yet</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              );
            })()}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPollVotesModal(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => {
          setShowVideoCall(false);
          setActiveVideoCallId(null);
        }}
        channelName={activeChannel?.name || 'Unknown Channel'}
        channelMembers={activeChannel?.members.filter(id => id !== user?.id).map(id => {
          const member = users.find(u => u.id === id);
          return member?.fullName || id;
        }) || []}
        onCallStart={(meetingId) => {
          setActiveVideoCallId(meetingId);
          // Add video call start message to chat
          if (activeChannel && user) {
            const callStartMessage: ChatMessage = {
              id: `call-start-${Date.now()}`,
              channelId: activeChannel.id,
              senderId: 'system',
              content: `Video Call Started — Click To Join`,
              type: 'system',
              timestamp: new Date(),
              status: 'delivered',
              reactions: [],
              metadata: {
                meetingId,
                callType: 'video-start',
                initiatedBy: user.fullName
              }
            };
            setMessages(prev => [...prev, callStartMessage]);
          }
        }}
        onCallEnd={(meetingId, duration) => {
          // Mark the start message as ended and add end message
          if (activeChannel && user) {
            setMessages(prev => prev.map(msg => 
              msg.metadata?.meetingId === meetingId && msg.metadata?.callType === 'video-start'
                ? { ...msg, metadata: { ...msg.metadata, callEnded: true } }
                : msg
            ));
            
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const callEndMessage: ChatMessage = {
              id: `call-end-${Date.now()}`,
              channelId: activeChannel.id,
              senderId: 'system',
              content: `Video Call Ended At ${endTime} • Duration: ${minutes}m ${seconds}s`,
              type: 'system',
              timestamp: new Date(),
              status: 'delivered',
              reactions: [],
              metadata: {
                meetingId,
                callType: 'video-end',
                duration,
                endedBy: user.fullName
              }
            };
            setMessages(prev => [...prev, callEndMessage]);
          }
          setActiveVideoCallId(null);
        }}
      />

      {/* Private Reply Modal */}
      <Dialog open={showPrivateReplyModal} onOpenChange={setShowPrivateReplyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply Privately</DialogTitle>
            <DialogDescription>
              Send a private message to {privateReplyTo ? users.find(u => u.id === privateReplyTo.senderId)?.fullName || 'user' : 'user'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Original message reference */}
          {privateReplyTo && (
            <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-blue-500 mb-4">
              <div className="text-sm text-muted-foreground mb-1">
                Original message from {users.find(u => u.id === privateReplyTo.senderId)?.fullName || 'user'}:
              </div>
              <div className="text-sm">
                {privateReplyTo.content.length > 150 
                  ? privateReplyTo.content.substring(0, 150) + '...' 
                  : privateReplyTo.content
                }
              </div>
            </div>
          )}
          
          {/* Private reply input */}
          <div className="space-y-4">
            <Textarea
              placeholder="Type your private reply..."
              value={privateReplyMessage}
              onChange={(e) => setPrivateReplyMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && privateReplyMessage.trim()) {
                  e.preventDefault();
                  handleSendPrivateReply();
                }
              }}
              className="min-h-[120px]"
            />
            <div className="text-xs text-muted-foreground">
              Press Ctrl+Enter to send
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPrivateReplyModal(false);
                setPrivateReplyMessage('');
                setPrivateReplyTo(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendPrivateReply}
              disabled={!privateReplyMessage.trim()}
            >
              Send Private Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
