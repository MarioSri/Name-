import { 
  LiveMeetingRequest, 
  CreateLiveMeetingRequestDto, 
  LiveMeetingResponse, 
  LiveMeetingStats,
  URGENCY_CONFIGS,
  LIVE_MEETING_PERMISSIONS
} from '../types/liveMeeting';

class LiveMeetingService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  private isDevelopment = import.meta.env.DEV;

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
          'Authorization': `Bearer ${this.getAuthToken()}`
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

  private getAuthToken(): string {
    // Get authentication token from storage
    return localStorage.getItem('authToken') || '';
  }

  // Mock implementations for development
  private async mockCreateRequest(requestData: CreateLiveMeetingRequestDto): Promise<LiveMeetingRequest> {
    const urgencyConfig = URGENCY_CONFIGS[requestData.urgency];
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + urgencyConfig.expiresInMinutes);

    const request: LiveMeetingRequest = {
      id: `live_req_${Date.now()}`,
      type: 'live_communication_request',
      documentId: requestData.documentId,
      documentType: requestData.documentType,
      documentTitle: requestData.documentTitle,
      requesterId: 'current_user_id', // Mock current user
      requesterName: 'Current User',
      requesterRole: 'employee',
      targetUserId: requestData.targetUserIds[0], // For simplicity, use first target
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Mock: Created live meeting request:', request);
    return request;
  }

  private async mockRespondToRequest(response: LiveMeetingResponse): Promise<void> {
    console.log('Mock: Responding to live meeting request:', response);
    
    if (response.response === 'accept') {
      // Generate mock meeting link
      const meetingLink = `https://meet.google.com/mock-${Date.now()}`;
      console.log('Mock: Generated meeting link:', meetingLink);
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async mockGetMyRequests(filter?: string): Promise<LiveMeetingRequest[]> {
    // Return mock data for development
    const mockRequests: LiveMeetingRequest[] = [];

    // Apply filter
    if (filter && filter !== 'all') {
      return mockRequests.filter(req => {
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

    return mockRequests;
  }

  private async mockGetStats(): Promise<LiveMeetingStats> {
    return {
      totalRequests: 24,
      pendingRequests: 3,
      immediateRequests: 1,
      urgentRequests: 2,
      todaysMeetings: 8,
      successRate: 94,
      averageResponseTime: 12 // minutes
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
