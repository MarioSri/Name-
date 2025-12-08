-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 6: Meetings & Calendar
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- MEETINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('MTG-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  
  -- Meeting Details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  agenda TEXT,
  
  -- Type & Mode
  meeting_type meeting_type NOT NULL DEFAULT 'in_person',
  
  -- Status & Priority
  status operation_status DEFAULT 'pending',
  priority priority_level DEFAULT 'normal',
  
  -- Organizer
  organizer_id UUID NOT NULL REFERENCES recipients(id),
  department department,
  
  -- Schedule
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  
  -- Recurrence (JSONB for flexibility)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB DEFAULT '{}',
  parent_meeting_id UUID REFERENCES meetings(id),
  
  -- Location
  location VARCHAR(500),
  room_number VARCHAR(50),
  building VARCHAR(100),
  
  -- Virtual Meeting
  meeting_url TEXT,
  google_meet_id VARCHAR(255),
  zoom_meeting_id VARCHAR(255),
  teams_meeting_id VARCHAR(255),
  meeting_password VARCHAR(100),
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Minutes & Notes
  minutes TEXT,
  notes TEXT,
  action_items JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES recipients(id),
  cancellation_reason TEXT,
  
  -- Constraints
  CONSTRAINT valid_meeting_times CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_meetings_operation ON meetings(operation_id);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_department ON meetings(department);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MEETING PARTICIPANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Role
  role VARCHAR(30) DEFAULT 'attendee' CHECK (role IN ('organizer', 'co_organizer', 'presenter', 'attendee', 'optional')),
  
  -- Response
  response_status VARCHAR(20) DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMPTZ,
  
  -- Attendance
  attended BOOLEAN,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  
  -- Notifications
  notified_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(meeting_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_participant ON meeting_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_response ON meeting_participants(response_status);

ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CALENDAR EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('EVT-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  
  -- Event Details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Type
  event_type VARCHAR(50) DEFAULT 'event' CHECK (event_type IN ('event', 'meeting', 'reminder', 'deadline', 'holiday', 'leave', 'task')),
  
  -- Owner
  created_by UUID NOT NULL REFERENCES recipients(id),
  
  -- Schedule
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB DEFAULT '{}',
  parent_event_id UUID REFERENCES calendar_events(id),
  
  -- Location
  location VARCHAR(500),
  
  -- Linked entities
  meeting_id UUID REFERENCES meetings(id),
  document_id UUID REFERENCES documents(id),
  
  -- Google Calendar sync
  google_calendar_id VARCHAR(255),
  google_event_id VARCHAR(255),
  
  -- Visual
  color VARCHAR(20) DEFAULT '#3B82F6',
  
  -- Privacy
  visibility VARCHAR(20) DEFAULT 'default' CHECK (visibility IN ('default', 'public', 'private', 'confidential')),
  
  -- Status
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_meeting ON calendar_events(meeting_id) WHERE meeting_id IS NOT NULL;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- EVENT ATTENDEES
-- ============================================================

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Response
  response_status VARCHAR(20) DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMPTZ,
  
  -- Notifications
  notified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, attendee_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_attendee ON event_attendees(attendee_id);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LIVE MEETING REQUESTS (LiveMeet feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS live_meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('LMR-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Request Details
  title VARCHAR(500) NOT NULL,
  reason TEXT,
  
  -- Urgency
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('immediate', 'urgent', 'normal')),
  
  -- Requester & Target
  requester_id UUID NOT NULL REFERENCES recipients(id),
  target_id UUID NOT NULL REFERENCES recipients(id),
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  
  -- Response
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  
  -- Meeting created from this request
  meeting_id UUID REFERENCES meetings(id),
  
  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_meeting_requests_requester ON live_meeting_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_live_meeting_requests_target ON live_meeting_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_live_meeting_requests_status ON live_meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_live_meeting_requests_expires ON live_meeting_requests(expires_at) WHERE status = 'pending';

ALTER TABLE live_meeting_requests ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_live_meeting_requests_updated_at ON live_meeting_requests;
CREATE TRIGGER update_live_meeting_requests_updated_at
  BEFORE UPDATE ON live_meeting_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

