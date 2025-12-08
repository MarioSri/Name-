import { 
  LiveMeetingRequest, 
  CreateLiveMeetingRequestDto, 
  LiveMeetingResponse, 
  LiveMeetingStats,
  URGENCY_CONFIGS,
  LIVE_MEETING_PERMISSIONS
} from '../types/liveMeeting';
import { supabase } from '@/lib/supabase';

// In-memory current user cache (populated from Supabase auth)
let cachedCurrentUser: { id: string; name: string; role: string } | null = null;

class LiveMeetingService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  private isDevelopment = import.meta.env.DEV;

  // Get current user from Supabase auth session
  private async getCurrentUser(): Promise<{ id: string; name: string; role: string } | null> {
    if (cachedCurrentUser) {
      return cachedCurrentUser;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        cachedCurrentUser = {
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          role: 'employee'
        };
        return cachedCurrentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  }
  
  // Set current user (for external auth context updates)
  public setCurrentUser(user: { id: string; name: string; role: string } | null): void {
    cachedCurrentUser = user;
  }

  // Create a new live meeting request
  async createRequest(requestData: CreateLiveMeetingRequestDto): Promise<LiveMeetingRequest> {
    if (this.isDevelopment) {
      return this.mockCreateRequest(requestData);
    }

    try {
      const response = await fetch(`${this.baseUrl}/live-meetings/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create live meeting request: ${response.statusText}`);
      }

      const request = await response.json();
      
      // Send real-time notifications
      await this.sendRealTimeNotifications(request);
      
      return request;
    } catch (error) {
      console.error('Error creating live meeting request:', error);
      throw error;
    }
  }

  // Respond to a live meeting request
  async respondToRequest(response: LiveMeetingResponse): Promise<void> {
    if (this.isDevelopment) {
      return this.mockRespondToRequest(response);
    }

    try {
      const apiResponse = await fetch(`${this.baseUrl}/live-meetings/requests/${response.requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(response)
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to respond to live meeting request: ${apiResponse.statusText}`);
      }

      // If accepted, generate meeting link and send notifications
      if (response.response === 'accept') {
        await this.handleAcceptedRequest(response.requestId);
      }
    } catch (error) {
      console.error('Error responding to live meeting request:', error);
      throw error;
    }
  }

  // Get live meeting requests for current user
  async getMyRequests(filter?: 'pending' | 'urgent' | 'immediate' | 'all'): Promise<LiveMeetingRequest[]> {
    if (this.isDevelopment) {
      return this.mockGetMyRequests(filter);
    }

    try {
      const url = new URL(`${this.baseUrl}/live-meetings/requests/my`);
      if (filter && filter !== 'all') {
        url.searchParams.append('filter', filter);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch live meeting requests: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching live meeting requests:', error);
      throw error;
    }
  }

  // Get live meeting stats
  async getStats(): Promise<LiveMeetingStats> {
    if (this.isDevelopment) {
      return this.mockGetStats();
    }

    try {
      const response = await fetch(`${this.baseUrl}/live-meetings/stats`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch live meeting stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching live meeting stats:', error);
      throw error;
    }
  }

  // Check if user can request meeting from target user
  canRequestMeeting(userRole: string, targetUserRole: string): boolean {
    const allowedRoles = LIVE_MEETING_PERMISSIONS[userRole] || [];
    return allowedRoles.includes(targetUserRole) || allowedRoles.includes('all');
  }

  // Get available participants based on current user role
  async getAvailableParticipants(currentUserRole: string): Promise<any[]> {
    if (this.isDevelopment) {
      return this.mockGetAvailableParticipants(currentUserRole);
    }

    try {
      const response = await fetch(`${this.baseUrl}/live-meetings/participants?role=${currentUserRole}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available participants: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching available participants:', error);
      throw error;
    }
  }

  // Generate meeting link for accepted requests
  private async generateMeetingLink(meetingFormat: string): Promise<string> {
    if (meetingFormat === 'in_person') {
      return '';
    }

    // For online meetings, generate appropriate link
    switch (meetingFormat) {
      case 'online':
        // Default to Google Meet for now
        return await this.generateGoogleMeetLink();
      case 'hybrid':
        return await this.generateGoogleMeetLink();
      default:
        return '';
    }
  }

  // Generate Google Meet link
  private async generateGoogleMeetLink(): Promise<string> {
    // This would integrate with Google Calendar API to create a meeting
    // For now, return a placeholder
    const meetingId = Math.random().toString(36).substring(2, 15);
    return `https://meet.google.com/${meetingId}`;
  }

  // Send real-time notifications
  private async sendRealTimeNotifications(request: LiveMeetingRequest): Promise<void> {
    // Send email notifications
    await this.sendEmailNotification(request);
    
    // Send dashboard notifications
    await this.sendDashboardNotification(request);
    
    // Send WebSocket notifications for real-time updates
    await this.sendWebSocketNotification(request);
  }

  private async sendEmailNotification(request: LiveMeetingRequest): Promise<void> {
    // Email notification implementation
    console.log('Sending email notification for live meeting request:', request.id);
  }

  private async sendDashboardNotification(request: LiveMeetingRequest): Promise<void> {
    // Dashboard notification implementation
    console.log('Sending dashboard notification for live meeting request:', request.id);
  }

  private async sendWebSocketNotification(request: LiveMeetingRequest): Promise<void> {
    // WebSocket notification implementation
    console.log('Sending WebSocket notification for live meeting request:', request.id);
  }

  private async handleAcceptedRequest(requestId: string): Promise<void> {
    // Generate meeting link and send to participants
    console.log('Handling accepted live meeting request:', requestId);
  }

  private async getAuthToken(): Promise<string> {
    // Get authentication token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }

  // Supabase-backed implementation for development
  private async mockCreateRequest(requestData: CreateLiveMeetingRequestDto): Promise<LiveMeetingRequest> {
    const { supabaseRealTimeFeatures } = await import('@/services/SupabaseRealTimeFeatures');
    
    const urgencyConfig = URGENCY_CONFIGS[requestData.urgency];
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + urgencyConfig.expiresInMinutes);
    
    // Get current user from Supabase auth
    const currentUser = await this.getCurrentUser() || { 
      id: 'current_user_id', 
      name: 'Current User',
      role: 'employee'
    };
    
    // Create in Supabase
    const supabaseRequest = await supabaseRealTimeFeatures.liveMeet.create({
      document_id: requestData.documentId,
      document_type: requestData.documentType,
      document_title: requestData.documentTitle,
      requester_id: currentUser.id,
      requester_name: currentUser.name,
      requester_role: currentUser.role,
      target_user_id: requestData.targetUserIds[0],
      target_user_name: 'Target User', // Will be resolved from recipients
      target_user_role: 'principal',
      urgency: requestData.urgency,
      meeting_format: requestData.meetingFormat,
      purpose: requestData.purpose,
      agenda: requestData.agenda,
      requested_time: requestData.requestedTime?.toISOString(),
      location: requestData.location,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    });
    
    // Convert Supabase response to LiveMeetingRequest format
    const request: LiveMeetingRequest = {
      id: supabaseRequest?.id || `live_req_${Date.now()}`,
      type: 'live_communication_request',
      documentId: requestData.documentId,
      documentType: requestData.documentType,
      documentTitle: requestData.documentTitle,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterRole: currentUser.role,
      targetUserId: requestData.targetUserIds[0],
      targetUserName: 'Target User',
      targetUserRole: 'principal',
      urgency: requestData.urgency,
      meetingFormat: requestData.meetingFormat,
      purpose: requestData.purpose,
      agenda: requestData.agenda,
      requestedTime: requestData.requestedTime,
      location: requestData.location,
      status: 'pending',
      participants: requestData.targetUserIds.map((userId, index) => ({
        id: `participant_${index}`,
        userId,
        userName: `User ${index + 1}`,
        role: 'principal',
        email: `user${index + 1}@institution.edu`,
        status: 'invited'
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt
    };

    console.log('Supabase: Created live meeting request:', request);
    return request;
  }

  private async mockRespondToRequest(response: LiveMeetingResponse): Promise<void> {
    const { supabaseRealTimeFeatures } = await import('@/services/SupabaseRealTimeFeatures');
    
    console.log('Supabase: Responding to live meeting request:', response);
    
    // Update status in Supabase
    await supabaseRealTimeFeatures.liveMeet.update(response.requestId, {
      status: response.response === 'accept' ? 'accepted' : 
              response.response === 'decline' ? 'declined' : 
              response.response === 'propose_alternative' ? 'pending' : 'cancelled'
    });
    
    if (response.response === 'accept') {
      // Generate meeting link
      const meetingLink = await this.generateMeetingLink('online');
      console.log('Supabase: Generated meeting link:', meetingLink);
      
      // Update with meeting link
      await supabaseRealTimeFeatures.liveMeet.update(response.requestId, {
        meeting_link: meetingLink
      });
    }
  }

  private async mockGetMyRequests(filter?: string): Promise<LiveMeetingRequest[]> {
    const { supabaseRealTimeFeatures } = await import('@/services/SupabaseRealTimeFeatures');
    
    // Get current user from Supabase auth
    const currentUser = await this.getCurrentUser();
    
    if (!currentUser?.id) {
      return [];
    }
    
    // Fetch from Supabase
    const supabaseRequests = await supabaseRealTimeFeatures.liveMeet.getForUser(currentUser.id);
    
    // Convert to LiveMeetingRequest format
    const requests: LiveMeetingRequest[] = supabaseRequests.map((req: any) => ({
      id: req.id,
      type: 'live_communication_request',
      documentId: req.document_id,
      documentType: req.document_type,
      documentTitle: req.document_title,
      requesterId: req.requester_id,
      requesterName: req.requester_name,
      requesterRole: req.requester_role,
      targetUserId: req.target_user_id,
      targetUserName: req.target_user_name,
      targetUserRole: req.target_user_role,
      urgency: req.urgency,
      meetingFormat: req.meeting_format,
      purpose: req.purpose,
      agenda: req.agenda,
      requestedTime: req.requested_time ? new Date(req.requested_time) : undefined,
      location: req.location,
      status: req.status,
      meetingLink: req.meeting_link,
      participants: [],
      createdAt: new Date(req.created_at),
      updatedAt: new Date(req.updated_at),
      expiresAt: req.expires_at ? new Date(req.expires_at) : undefined
    }));

    // Apply filter
    if (filter && filter !== 'all') {
      return requests.filter(req => {
        switch (filter) {
          case 'pending':
            return req.status === 'pending';
          case 'urgent':
            return req.urgency === 'urgent';
          case 'immediate':
            return req.urgency === 'immediate';
          default:
            return true;
        }
      });
    }

    return requests;
  }

  private async mockGetStats(): Promise<LiveMeetingStats> {
    const { supabaseRealTimeFeatures } = await import('@/services/SupabaseRealTimeFeatures');
    
    // Get current user from Supabase auth
    const currentUser = await this.getCurrentUser();
    
    if (!currentUser?.id) {
      return {
        totalRequests: 0,
        pendingRequests: 0,
        immediateRequests: 0,
        urgentRequests: 0,
        todaysMeetings: 0,
        successRate: 0,
        averageResponseTime: 0
      };
    }
    
    // Fetch all requests from Supabase
    const requests = await supabaseRealTimeFeatures.liveMeet.getForUser(currentUser.id);
    
    const today = new Date().toDateString();
    const totalRequests = requests.length;
    const pendingRequests = requests.filter((r: any) => r.status === 'pending').length;
    const immediateRequests = requests.filter((r: any) => r.urgency === 'immediate').length;
    const urgentRequests = requests.filter((r: any) => r.urgency === 'urgent').length;
    const todaysMeetings = requests.filter((r: any) => 
      r.status === 'accepted' && new Date(r.requested_time).toDateString() === today
    ).length;
    
    const acceptedRequests = requests.filter((r: any) => r.status === 'accepted').length;
    const successRate = totalRequests > 0 ? Math.round((acceptedRequests / totalRequests) * 100) : 0;
    
    return {
      totalRequests,
      pendingRequests,
      immediateRequests,
      urgentRequests,
      todaysMeetings,
      successRate,
      averageResponseTime: 12 // Would need response timestamps to calculate
    };
  }

  private async mockGetAvailableParticipants(currentUserRole: string): Promise<any[]> {
    // Use real recipients from Supabase
    const { supabaseWorkflowService } = await import('@/services/SupabaseWorkflowService');
    const recipients = await supabaseWorkflowService.getRecipients();
    
    const allowedRoles = LIVE_MEETING_PERMISSIONS[currentUserRole] || [];
    
    return recipients
      .map(r => ({
        id: r.user_id,
        name: r.name,
        role: r.role.toLowerCase().replace(/\s+/g, '_'),
        email: r.email,
        department: r.department || 'General'
      }))
      .filter(user => 
        allowedRoles.includes(user.role) || allowedRoles.includes('all')
      );
  }
}

export const liveMeetingService = new LiveMeetingService();
