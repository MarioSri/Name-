-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 7: Channels & Messages
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- CHANNELS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('CH-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  
  -- Channel Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Type
  channel_type channel_type NOT NULL DEFAULT 'department',
  
  -- Department (for department channels)
  department department,
  
  -- Linked entities (for threads)
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
  
  -- Owner
  created_by UUID NOT NULL REFERENCES recipients(id),
  
  -- Settings
  is_private BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  allow_replies BOOLEAN DEFAULT TRUE,
  
  -- Auto-delete settings
  auto_delete_enabled BOOLEAN DEFAULT FALSE,
  auto_delete_days INTEGER DEFAULT 30,
  
  -- Visual
  icon VARCHAR(100),
  color VARCHAR(20),
  
  -- Statistics
  member_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_department ON channels(department);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_document ON channels(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channels_approval ON channels(approval_card_id) WHERE approval_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channels_archived ON channels(is_archived);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CHANNEL MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Role
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member', 'guest')),
  
  -- Status
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMPTZ,
  
  -- Notifications
  notification_preference VARCHAR(20) DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
  
  -- Activity
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id UUID,
  unread_count INTEGER DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  UNIQUE(channel_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_member ON channel_members(member_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_role ON channel_members(role);

ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MESSAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('MSG-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  
  -- Channel
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id UUID NOT NULL REFERENCES recipients(id),
  
  -- Content
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'rich_text', 'markdown', 'html')),
  
  -- Reply/Thread
  parent_message_id UUID REFERENCES messages(id),
  thread_root_id UUID REFERENCES messages(id),
  reply_count INTEGER DEFAULT 0,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Mentions
  mentions UUID[] DEFAULT '{}',
  mention_everyone BOOLEAN DEFAULT FALSE,
  
  -- Reactions summary
  reactions_count JSONB DEFAULT '{}',
  
  -- Edit tracking
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  original_content TEXT,
  
  -- Status
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_by UUID REFERENCES recipients(id),
  pinned_at TIMESTAMPTZ,
  
  -- Deletion
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES recipients(id),
  
  -- System message
  is_system_message BOOLEAN DEFAULT FALSE,
  system_message_type VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_root_id) WHERE thread_root_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_mentions ON messages USING GIN (mentions);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MESSAGE REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Reaction (emoji code or custom reaction id)
  reaction VARCHAR(50) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MESSAGE READ STATUS
-- ============================================================

CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Read status
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_message ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_user ON message_read_status(user_id);

ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

