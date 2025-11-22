# Supabase Realtime Quick Reference

## 🚀 Quick Start

### Import Services
```typescript
import { documentsRealtimeService } from '@/services/DocumentsRealtimeService';
import { meetingsRealtimeService } from '@/services/MeetingsRealtimeService';
import { messagesRealtimeService } from '@/services/MessagesRealtimeService';
import { notificationsRealtimeService } from '@/services/NotificationsRealtimeService';
```

### Use React Hook (Easiest)
```typescript
import { useSupabaseRealTimeDocuments } from '@/hooks/useSupabaseRealTimeDocuments';

const MyComponent = () => {
  const {
    trackDocuments,      // Your submitted documents
    approvalCards,       // Pending approvals
    submitDocument,
    approveDocument,
    rejectDocument,
    loading,
    error,
    isConnected
  } = useSupabaseRealTimeDocuments();

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {approvalCards.map(card => (
        <div key={card.id}>{card.title}</div>
      ))}
    </div>
  );
};
```

---

## 📄 Documents Service

### Subscribe to Documents
```typescript
// Subscribe to documents where you're the sender
const subscription = documentsRealtimeService.subscribeToDocumentsByRole(
  userId,
  'sender',
  {
    onInsert: (doc) => console.log('New document:', doc),
    onUpdate: (doc) => console.log('Updated:', doc),
    onDelete: (doc) => console.log('Deleted:', doc)
  }
);

// Cleanup
subscription.unsubscribe();
```

### Subscribe to Approval Cards
```typescript
const subscription = documentsRealtimeService.subscribeToApprovalCards(
  recipientId,
  {
    onInsert: (card) => {
      // New approval card received
      showNotification('New approval required!');
    },
    onUpdate: (card) => {
      // Card status changed (approved/rejected)
    }
  }
);
```

### CRUD Operations
```typescript
// Create document
const doc = await documentsRealtimeService.createDocument({
  title: 'Leave Request',
  description: 'Annual leave application',
  sender_id: userId,
  recipients: ['user1', 'user2'],
  status: 'pending'
});

// Update document
await documentsRealtimeService.updateDocument(docId, {
  status: 'approved'
});

// Approve card
await documentsRealtimeService.updateApprovalCard(cardId, {
  status: 'approved',
  approved_at: new Date().toISOString()
});

// Reject card
await documentsRealtimeService.updateApprovalCard(cardId, {
  status: 'rejected',
  rejected_reason: 'Missing required information'
});
```

---

## 📅 Meetings Service

### Subscribe to Your Meetings
```typescript
const subscriptions = meetingsRealtimeService.subscribeToUserMeetings(
  userId,
  {
    onInsert: (meeting) => {
      // New meeting scheduled
      showNotification(`Meeting: ${meeting.title}`);
    },
    onUpdate: (meeting) => {
      // Meeting rescheduled or updated
    },
    onDelete: (meeting) => {
      // Meeting cancelled
    }
  }
);

// Returns 2 subscriptions: organizer + attendee
// Cleanup both:
subscriptions.forEach(sub => sub.unsubscribe());
```

### Create Meeting
```typescript
const meeting = await meetingsRealtimeService.createMeeting({
  title: 'Team Standup',
  organizer_id: userId,
  attendees: ['user1', 'user2', 'user3'],
  start_time: '2024-01-20T10:00:00Z',
  end_time: '2024-01-20T10:30:00Z',
  platform: 'google-meet',
  meeting_links: {
    primary: 'google-meet',
    googleMeet: {
      joinUrl: 'https://meet.google.com/abc-defg-hij',
      meetingId: 'abc-defg-hij'
    }
  },
  status: 'scheduled'
});
```

### Fetch Meetings with Date Range
```typescript
const meetings = await meetingsRealtimeService.fetchUserMeetings(
  userId,
  {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  }
);
```

---

## 💬 Messages Service

### Subscribe to Channel Messages
```typescript
const subscription = messagesRealtimeService.subscribeToChannelMessages(
  channelId,
  {
    onInsert: (message) => {
      // New message received
      appendMessageToUI(message);
    },
    onUpdate: (message) => {
      // Message edited
    },
    onDelete: (message) => {
      // Message deleted
    }
  }
);
```

### Typing Indicators
```typescript
const { unsubscribe, sendTyping } = messagesRealtimeService.subscribeToTypingIndicators(
  channelId,
  currentUserId,
  (typingUsers) => {
    // Update UI with typing users
    setTypingUsers(typingUsers);
  }
);

// When user types:
onInputChange = () => {
  sendTyping(); // Throttled to 1/sec automatically
};

// Cleanup:
unsubscribe();
```

### Send Message
```typescript
const message = await messagesRealtimeService.sendMessage({
  channel_id: channelId,
  user_id: userId,
  content: 'Hello!',
  message_type: 'text'
});
```

### Presence (Online Users)
```typescript
const { unsubscribe } = messagesRealtimeService.subscribeToChannelPresence(
  channelId,
  userId,
  { name: 'John Doe', avatar: 'https://...' }
);
```

---

## 🔔 Notifications Service

### Subscribe to Notifications
```typescript
const subscription = notificationsRealtimeService.subscribeToUserNotifications(
  userId,
  {
    onInsert: (notification) => {
      // New notification (browser notification shown automatically)
      showToast(notification.title, notification.message);
    },
    onUpdate: (notification) => {
      // Notification marked as read
    }
  }
);
```

### Unread Count Badge
```typescript
const subscription = notificationsRealtimeService.subscribeToUnreadCount(
  userId,
  (count) => {
    setBadgeCount(count); // Update badge in real-time
  }
);
```

### Request Browser Permissions
```typescript
const permission = await notificationsRealtimeService.requestNotificationPermission();
if (permission === 'granted') {
  console.log('Browser notifications enabled!');
}
```

### Mark as Read
```typescript
// Mark single notification as read
await notificationsRealtimeService.markAsRead(notificationId);

// Mark all as read
await notificationsRealtimeService.markAllAsRead(userId);
```

---

## 🎨 UI Integration Examples

### Approval Card Component
```typescript
const ApprovalCard = ({ card }: { card: ApprovalCard }) => {
  const { approveDocument, rejectDocument, loading } = useSupabaseRealTimeDocuments();
  const [reason, setReason] = useState('');

  const handleApprove = async () => {
    await approveDocument(card.id);
    toast.success('Document approved!');
  };

  const handleReject = async () => {
    await rejectDocument(card.id, reason);
    toast.success('Document rejected');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{card.title}</CardTitle>
        <Badge>{card.status}</Badge>
      </CardHeader>
      <CardContent>
        <Button onClick={handleApprove} disabled={loading}>
          Approve
        </Button>
        <Button onClick={handleReject} variant="destructive" disabled={loading}>
          Reject
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Live Meeting List
```typescript
const MeetingsList = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    // Load initial meetings
    meetingsRealtimeService.fetchUserMeetings(user.id).then(setMeetings);

    // Subscribe to updates
    const subs = meetingsRealtimeService.subscribeToUserMeetings(user.id, {
      onInsert: (meeting) => setMeetings(prev => [...prev, meeting]),
      onUpdate: (meeting) => setMeetings(prev => 
        prev.map(m => m.id === meeting.id ? meeting : m)
      ),
      onDelete: (meeting) => setMeetings(prev => 
        prev.filter(m => m.id !== meeting.id)
      )
    });

    return () => subs.forEach(sub => sub.unsubscribe());
  }, [user?.id]);

  return (
    <div>
      {meetings.map(meeting => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
};
```

### Real-time Message Thread
```typescript
const ChatThread = ({ channelId }: { channelId: string }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Load initial messages
    messagesRealtimeService.fetchChannelMessages(channelId).then(setMessages);

    // Subscribe to new messages
    const messageSub = messagesRealtimeService.subscribeToChannelMessages(channelId, {
      onInsert: (msg) => setMessages(prev => [...prev, msg])
    });

    // Subscribe to typing indicators
    const { unsubscribe: unsubTyping, sendTyping } = 
      messagesRealtimeService.subscribeToTypingIndicators(
        channelId,
        user!.id,
        setTypingUsers
      );

    return () => {
      messageSub.unsubscribe();
      unsubTyping();
    };
  }, [channelId]);

  const handleSend = async () => {
    await messagesRealtimeService.sendMessage({
      channel_id: channelId,
      user_id: user!.id,
      content: input,
      message_type: 'text'
    });
    setInput('');
  };

  return (
    <div>
      {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
      <input 
        value={input} 
        onChange={(e) => { setInput(e.target.value); sendTyping(); }} 
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};
```

---

## 🔧 Common Patterns

### Loading State
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    const data = await documentsRealtimeService.fetchDocuments(userId, 'sender');
    setDocuments(data);
    setLoading(false);
  };
  loadData();
}, [userId]);

if (loading) return <Spinner />;
```

### Error Handling
```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  try {
    setError(null);
    await documentsRealtimeService.createDocument(data);
    toast.success('Document created!');
  } catch (err) {
    setError('Failed to create document');
    console.error(err);
  }
};
```

### Cleanup Subscriptions
```typescript
useEffect(() => {
  const sub = documentsRealtimeService.subscribeToApprovalCards(userId, callbacks);
  
  return () => {
    sub.unsubscribe(); // ALWAYS cleanup!
  };
}, [userId]);
```

---

## 🐛 Debugging

### Check Connection
```typescript
import { realtimeService } from '@/services/SupabaseRealtimeService';

console.log('Connected:', realtimeService.isConnected());
console.log('Active channels:', realtimeService.getActiveChannelCount());
```

### Enable Logging
All services log to console with `[Realtime]` prefix:
```
[Realtime] ✅ Successfully subscribed to documents
[Realtime] documents INSERT: { id: '123', title: 'Test' }
[Realtime] 🔌 Unsubscribed from public:documents:*:all
```

---

## ⚡ Performance Tips

1. **Use role-based filters** instead of fetching all data
2. **Unsubscribe** when component unmounts
3. **Batch operations** with `subscribeToMultiple()`
4. **Paginate** messages/notifications (use `limit`)
5. **Debounce** typing indicators (built-in at 1/sec)
6. **Filter on server** using Supabase RLS policies

---

## 📚 TypeScript Types

```typescript
import { Document, ApprovalCard } from '@/services/DocumentsRealtimeService';
import { Meeting, MeetingParticipant } from '@/services/MeetingsRealtimeService';
import { Message, Channel, TypingIndicator } from '@/services/MessagesRealtimeService';
import { Notification } from '@/services/NotificationsRealtimeService';
import { RealtimeSubscription } from '@/services/SupabaseRealtimeService';
```

---

**Last Updated**: January 2024
**Version**: 1.0.0
