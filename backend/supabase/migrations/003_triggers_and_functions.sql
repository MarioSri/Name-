-- ============================================================
-- IAOMS Database Triggers and Functions
-- Real-time updates, workflow automation, notifications
-- ============================================================

-- ============================================================
-- FUNCTION: Handle Document Status Updates
-- ============================================================

CREATE OR REPLACE FUNCTION handle_document_status_update()
RETURNS TRIGGER AS $$
DECLARE
    current_recipient_record RECORD;
    next_recipient_record RECORD;
    workflow_steps JSONB;
    current_step_index INTEGER;
BEGIN
    -- If status changed to approved and routing is sequential
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Get workflow steps
        workflow_steps := NEW.workflow->'steps';
        
        -- Find current step
        SELECT INTO current_step_index
            idx - 1
        FROM jsonb_array_elements(workflow_steps) WITH ORDINALITY arr(elem, idx)
        WHERE elem->>'status' = 'current';
        
        -- Move to next step if sequential routing
        IF NEW.routing_type = 'sequential' AND current_step_index IS NOT NULL THEN
            -- Update current step to completed
            workflow_steps := jsonb_set(
                workflow_steps,
                ARRAY[(current_step_index - 1)::text, 'status'],
                '"completed"'
            );
            
            -- Update next step to current if exists
            IF current_step_index < jsonb_array_length(workflow_steps) THEN
                workflow_steps := jsonb_set(
                    workflow_steps,
                    ARRAY[current_step_index::text, 'status'],
                    '"current"'
                );
                
                -- Get next recipient
                SELECT INTO next_recipient_record
                    recipient_id, recipient_name
                FROM document_recipients
                WHERE document_id = NEW.id
                AND recipient_order = current_step_index
                LIMIT 1;
                
                -- Update approval card
                UPDATE approval_cards
                SET 
                    current_recipient_id = next_recipient_record.recipient_id,
                    current_recipient_name = next_recipient_record.recipient_name,
                    status = 'pending',
                    workflow = workflow_steps,
                    updated_at = NOW()
                WHERE tracking_card_id = NEW.tracking_id;
                
                -- Create notification for next recipient
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    document_id,
                    priority,
                    action_url
                ) VALUES (
                    next_recipient_record.recipient_id,
                    'approval-required',
                    'New Document Requires Approval',
                    NEW.title || ' requires your approval',
                    NEW.id,
                    NEW.priority,
                    '/approvals'
                );
            ELSE
                -- All steps completed
                UPDATE approval_cards
                SET status = 'approved', updated_at = NOW()
                WHERE tracking_card_id = NEW.tracking_id;
                
                -- Notify submitter
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    document_id,
                    priority
                ) VALUES (
                    NEW.submitter_id,
                    'document-approved',
                    'Document Approved',
                    NEW.title || ' has been fully approved',
                    NEW.id,
                    'normal'
                );
            END IF;
            
            -- Update document workflow
            NEW.workflow := workflow_steps;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_status_update_trigger
    AFTER UPDATE OF status ON documents
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_document_status_update();

-- ============================================================
-- FUNCTION: Handle Approval Actions
-- ============================================================

CREATE OR REPLACE FUNCTION handle_approval_action()
RETURNS TRIGGER AS $$
DECLARE
    approval_card_record RECORD;
    document_record RECORD;
    next_recipient_id TEXT;
    next_recipient_name TEXT;
    recipient_count INTEGER;
    approved_count INTEGER;
BEGIN
    -- Get approval card
    SELECT INTO approval_card_record
        *
    FROM approval_cards
    WHERE id = NEW.approval_card_id;
    
    -- Get document
    SELECT INTO document_record
        *
    FROM documents
    WHERE id = approval_card_record.document_id;
    
    -- Handle approval
    IF NEW.action = 'approved' THEN
        -- Update approval card recipient status
        UPDATE approval_card_recipients
        SET status = 'completed', completed_at = NOW()
        WHERE approval_card_id = approval_card_record.id
        AND recipient_id = NEW.approver_id;
        
        -- Count total and approved recipients
        SELECT INTO recipient_count
            COUNT(*)
        FROM approval_card_recipients
        WHERE approval_card_id = approval_card_record.id;
        
        SELECT INTO approved_count
            COUNT(*)
        FROM approval_card_recipients
        WHERE approval_card_id = approval_card_record.id
        AND status = 'completed';
        
        -- Check if parallel routing (all must approve) or sequential (one at a time)
        IF approval_card_record.routing_type = 'parallel' THEN
            -- Parallel: check if all approved
            IF approved_count >= recipient_count THEN
                -- All approved
                UPDATE approval_cards
                SET status = 'approved', updated_at = NOW()
                WHERE id = approval_card_record.id;
                
                UPDATE documents
                SET status = 'approved', updated_at = NOW()
                WHERE id = document_record.id;
            ELSE
                -- Partially approved
                UPDATE approval_cards
                SET status = 'partially-approved', updated_at = NOW()
                WHERE id = approval_card_record.id;
            END IF;
        ELSE
            -- Sequential: move to next recipient
            SELECT INTO next_recipient_id, next_recipient_name
                recipient_id, recipient_name
            FROM approval_card_recipients
            WHERE approval_card_id = approval_card_record.id
            AND status = 'pending'
            ORDER BY recipient_order
            LIMIT 1;
            
            IF next_recipient_id IS NOT NULL THEN
                -- Update to next recipient
                UPDATE approval_cards
                SET 
                    current_recipient_id = next_recipient_id,
                    current_recipient_name = next_recipient_name,
                    status = 'pending',
                    updated_at = NOW()
                WHERE id = approval_card_record.id;
                
                -- Notify next recipient
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    document_id,
                    approval_card_id,
                    priority,
                    action_url
                ) VALUES (
                    next_recipient_id,
                    'approval-required',
                    'Document Requires Your Approval',
                    document_record.title || ' is ready for your review',
                    document_record.id,
                    approval_card_record.id,
                    document_record.priority,
                    '/approvals'
                );
            ELSE
                -- All approved
                UPDATE approval_cards
                SET status = 'approved', updated_at = NOW()
                WHERE id = approval_card_record.id;
                
                UPDATE documents
                SET status = 'approved', updated_at = NOW()
                WHERE id = document_record.id;
            END IF;
        END IF;
        
        -- Create audit log
        INSERT INTO audit_logs (
            user_id,
            user_name,
            action,
            resource_type,
            resource_id,
            details
        ) VALUES (
            NEW.approver_id,
            NEW.approver_name,
            'approval',
            'document',
            document_record.id::text,
            jsonb_build_object(
                'document_title', document_record.title,
                'action', 'approved',
                'comments', NEW.comments
            )
        );
    ELSIF NEW.action = 'rejected' THEN
        -- Handle rejection
        UPDATE approval_cards
        SET status = 'rejected', updated_at = NOW()
        WHERE id = approval_card_record.id;
        
        UPDATE documents
        SET status = 'rejected', updated_at = NOW()
        WHERE id = document_record.id;
        
        -- Notify submitter
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            document_id,
            priority
        ) VALUES (
            document_record.submitter_id,
            'document-rejected',
            'Document Rejected',
            document_record.title || ' was rejected by ' || NEW.approver_name,
            document_record.id,
            'high'
        );
        
        -- Create audit log
        INSERT INTO audit_logs (
            user_id,
            user_name,
            action,
            resource_type,
            resource_id,
            details
        ) VALUES (
            NEW.approver_id,
            NEW.approver_name,
            'rejection',
            'document',
            document_record.id::text,
            jsonb_build_object(
                'document_title', document_record.title,
                'action', 'rejected',
                'comments', NEW.comments
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_action_trigger
    AFTER INSERT ON approvals
    FOR EACH ROW
    EXECUTE FUNCTION handle_approval_action();

-- ============================================================
-- FUNCTION: Handle Document Creation (Create Approval Cards)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_document_creation()
RETURNS TRIGGER AS $$
DECLARE
    recipient_record RECORD;
    approval_card_id_val UUID;
    approval_id_val TEXT;
    workflow_steps JSONB := '[]'::jsonb;
    step_index INTEGER := 0;
BEGIN
    -- Generate approval ID
    approval_id_val := 'APPROVAL-' || NEW.tracking_id || '-' || EXTRACT(EPOCH FROM NOW())::text;
    
    -- Create approval card
    INSERT INTO approval_cards (
        approval_id,
        tracking_card_id,
        document_id,
        title,
        description,
        submitter_name,
        submitter_id,
        submitter_role,
        priority,
        status,
        routing_type,
        workflow,
        recipient_ids,
        recipient_names,
        current_recipient_id,
        current_recipient_name
    )
    SELECT
        approval_id_val,
        NEW.tracking_id,
        NEW.id,
        NEW.title,
        NEW.description,
        NEW.submitter_name,
        NEW.submitter_id,
        NEW.submitter_role,
        NEW.priority,
        'pending',
        NEW.routing_type,
        NEW.workflow,
        ARRAY_AGG(recipient_id ORDER BY recipient_order),
        ARRAY_AGG(recipient_name ORDER BY recipient_order),
        (SELECT recipient_id FROM document_recipients WHERE document_id = NEW.id ORDER BY recipient_order LIMIT 1),
        (SELECT recipient_name FROM document_recipients WHERE document_id = NEW.id ORDER BY recipient_order LIMIT 1)
    FROM document_recipients
    WHERE document_id = NEW.id
    GROUP BY document_id;
    
    -- Get the created approval card ID
    SELECT INTO approval_card_id_val
        id
    FROM approval_cards
    WHERE approval_id = approval_id_val;
    
    -- Create approval card recipients
    FOR recipient_record IN
        SELECT * FROM document_recipients
        WHERE document_id = NEW.id
        ORDER BY recipient_order
    LOOP
        INSERT INTO approval_card_recipients (
            approval_card_id,
            recipient_id,
            recipient_name,
            recipient_order,
            status
        ) VALUES (
            approval_card_id_val,
            recipient_record.recipient_id,
            recipient_record.recipient_name,
            recipient_record.recipient_order,
            CASE 
                WHEN recipient_record.recipient_order = 1 AND NEW.routing_type = 'sequential' THEN 'current'
                WHEN NEW.routing_type = 'parallel' THEN 'pending'
                ELSE 'pending'
            END
        );
        
        -- Build workflow steps
        workflow_steps := workflow_steps || jsonb_build_object(
            'id', recipient_record.id::text,
            'name', recipient_record.recipient_name,
            'assignee', recipient_record.recipient_name,
            'status', CASE 
                WHEN recipient_record.recipient_order = 1 AND NEW.routing_type = 'sequential' THEN 'current'
                ELSE 'pending'
            END,
            'order', recipient_record.recipient_order
        );
        
        step_index := step_index + 1;
    END LOOP;
    
    -- Update approval card with workflow steps
    UPDATE approval_cards
    SET workflow = workflow_steps
    WHERE id = approval_card_id_val;
    
    -- Create notifications for recipients
    IF NEW.routing_type = 'sequential' THEN
        -- Notify first recipient only
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            document_id,
            approval_card_id,
            priority,
            action_url
        )
        SELECT
            recipient_id,
            'approval-required',
            'New Document Requires Approval',
            NEW.title || ' requires your approval',
            NEW.id,
            approval_card_id_val,
            NEW.priority,
            '/approvals'
        FROM document_recipients
        WHERE document_id = NEW.id
        AND recipient_order = 1
        LIMIT 1;
    ELSE
        -- Notify all recipients for parallel
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            document_id,
            approval_card_id,
            priority,
            action_url
        )
        SELECT
            recipient_id,
            'approval-required',
            'New Document Requires Approval',
            NEW.title || ' requires your approval',
            NEW.id,
            approval_card_id_val,
            NEW.priority,
            '/approvals'
        FROM document_recipients
        WHERE document_id = NEW.id;
    END IF;
    
    -- Create audit log
    INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        NEW.submitter_id,
        NEW.submitter_name,
        'document_created',
        'document',
        NEW.id::text,
        jsonb_build_object(
            'title', NEW.title,
            'type', NEW.type,
            'priority', NEW.priority,
            'routing_type', NEW.routing_type
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_creation_trigger
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION handle_document_creation();

-- ============================================================
-- FUNCTION: Handle Comment Creation (Notifications)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_comment_creation()
RETURNS TRIGGER AS $$
DECLARE
    document_record RECORD;
    recipient_record RECORD;
BEGIN
    -- Get document
    SELECT INTO document_record
        *
    FROM documents
    WHERE id = NEW.document_id;
    
    -- Notify document recipients (except comment author)
    FOR recipient_record IN
        SELECT DISTINCT recipient_id, recipient_name
        FROM document_recipients
        WHERE document_id = NEW.document_id
        AND recipient_id != NEW.author_id
    LOOP
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            document_id,
            priority,
            action_url
        ) VALUES (
            recipient_record.recipient_id,
            'comment-added',
            'New Comment on Document',
            NEW.author_name || ' commented on ' || document_record.title,
            NEW.document_id,
            'normal',
            '/approvals'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_creation_trigger
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_comment_creation();

-- ============================================================
-- FUNCTION: Handle Message Creation (Channel Notifications)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_message_creation()
RETURNS TRIGGER AS $$
DECLARE
    channel_record RECORD;
    member_record RECORD;
BEGIN
    -- Get channel
    SELECT INTO channel_record
        *
    FROM channels
    WHERE id = NEW.channel_id;
    
    -- Notify channel members (except sender)
    FOR member_record IN
        SELECT user_id
        FROM channel_members
        WHERE channel_id = NEW.channel_id
        AND user_id != NEW.sender_id
        AND notification_level IN ('all', 'mentions')
        AND (
            notification_level = 'all'
            OR NEW.mentions @> ARRAY[user_id]
        )
    LOOP
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            channel_id,
            priority,
            action_url
        ) VALUES (
            member_record.user_id,
            'channel-message',
            'New Message in ' || channel_record.name,
            NEW.sender_name || ': ' || LEFT(NEW.content, 100),
            NEW.channel_id,
            CASE WHEN NEW.mentions @> ARRAY[member_record.user_id] THEN 'high' ELSE 'normal' END,
            '/messages'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_creation_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_message_creation();

-- ============================================================
-- FUNCTION: Handle Meeting Creation (Notifications)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_meeting_creation()
RETURNS TRIGGER AS $$
DECLARE
    attendee_record RECORD;
BEGIN
    -- Notify all attendees
    FOR attendee_record IN
        SELECT user_id, name, email
        FROM meeting_attendees
        WHERE meeting_id = NEW.id
    LOOP
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            meeting_id,
            priority,
            action_url
        ) VALUES (
            attendee_record.user_id,
            'meeting-scheduled',
            'Meeting Scheduled: ' || NEW.title,
            NEW.title || ' scheduled for ' || NEW.date::text || ' at ' || NEW.time::text,
            NEW.id,
            NEW.priority,
            '/calendar'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meeting_creation_trigger
    AFTER INSERT ON calendar_meetings
    FOR EACH ROW
    EXECUTE FUNCTION handle_meeting_creation();

-- ============================================================
-- FUNCTION: Handle Live Meeting Request Creation
-- ============================================================

CREATE OR REPLACE FUNCTION handle_live_meeting_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for target
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        document_id,
        priority,
        action_url
    ) VALUES (
        NEW.target_id,
        'meeting-request',
        'LiveMeet+ Request: ' || NEW.title,
        NEW.requester_name || ' requested a meeting: ' || NEW.reason,
        NEW.document_id,
        CASE NEW.urgency
            WHEN 'immediate' THEN 'urgent'
            WHEN 'urgent' THEN 'high'
            ELSE 'normal'
        END,
        '/approvals'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER live_meeting_request_trigger
    AFTER INSERT ON live_meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_live_meeting_request();

-- ============================================================
-- FUNCTION: Update Analytics on Document Events
-- ============================================================

CREATE OR REPLACE FUNCTION update_analytics_on_document_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log analytics event
    INSERT INTO analytics_events (
        user_id,
        event_type,
        event_category,
        document_id,
        metadata
    ) VALUES (
        COALESCE(NEW.submitter_id, OLD.submitter_id),
        'document_' || LOWER(NEW.status),
        'document',
        NEW.id,
        jsonb_build_object(
            'previous_status', OLD.status,
            'new_status', NEW.status,
            'type', NEW.type,
            'priority', NEW.priority
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_document_event_trigger
    AFTER UPDATE OF status ON documents
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_analytics_on_document_event();

-- ============================================================
-- FUNCTION: Auto-create Channel for Document
-- ============================================================

CREATE OR REPLACE FUNCTION auto_create_document_channel()
RETURNS TRIGGER AS $$
DECLARE
    channel_id_val UUID;
    channel_id_text TEXT;
    recipient_record RECORD;
BEGIN
    -- Generate channel ID
    channel_id_text := 'channel-' || NEW.tracking_id || '-' || EXTRACT(EPOCH FROM NOW())::text;
    
    -- Create channel
    INSERT INTO channels (
        channel_id,
        name,
        description,
        type,
        document_id,
        created_by,
        is_private,
        settings
    ) VALUES (
        channel_id_text,
        NEW.title,
        'Auto-created channel for document discussion',
        'document-thread',
        NEW.id,
        NEW.submitter_id,
        true,
        jsonb_build_object(
            'allowFileUploads', true,
            'allowPolls', true,
            'allowSignatureRequests', true,
            'requireModeration', false,
            'autoArchive', false,
            'notificationLevel', 'all'
        )
    )
    RETURNING id INTO channel_id_val;
    
    -- Add submitter as admin
    INSERT INTO channel_members (
        channel_id,
        user_id,
        role
    ) VALUES (
        channel_id_val,
        NEW.submitter_id,
        'admin'
    );
    
    -- Add all recipients as members
    FOR recipient_record IN
        SELECT DISTINCT recipient_id
        FROM document_recipients
        WHERE document_id = NEW.id
    LOOP
        INSERT INTO channel_members (
            channel_id,
            user_id,
            role
        ) VALUES (
            channel_id_val,
            recipient_record.recipient_id,
            'member'
        )
        ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_document_channel_trigger
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_document_channel();

-- ============================================================
-- FUNCTION: Update User Last Seen
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET last_seen = NOW()
    WHERE id = auth.uid();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This trigger is called by application code, not database events
-- But we create the function for manual invocation

-- ============================================================
-- FUNCTION: Cleanup Expired Notifications
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND read = true;
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run periodically (via pg_cron or external scheduler)

