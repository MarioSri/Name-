/**
 * EmergencyNotificationService
 * 
 * NOW USES IN-MEMORY STORAGE - NO localStorage
 * TODO: Migrate to Supabase for persistent notification logs
 */

interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'whatsapp';
  enabled: boolean;
  interval: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}

interface UserNotificationPreferences {
  email: NotificationChannel;
  sms: NotificationChannel;
  push: NotificationChannel;
  whatsapp: NotificationChannel;
}

interface EmergencyNotificationSettings {
  useProfileDefaults: boolean;
  overrideForEmergency: boolean;
  notificationStrategy: 'recipient-based' | 'document-based';
  channels: NotificationChannel[];
  schedulingOptions: {
    interval: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  };
}

interface EmergencyDocument {
  id: string;
  title: string;
  description: string;
  urgencyLevel: 'medium' | 'urgent' | 'high' | 'critical';
  submittedBy: string;
  autoEscalation?: boolean;
  escalationTimeout?: number;
  escalationTimeUnit?: string;
  cyclicEscalation?: boolean;
}

// In-memory storage to replace localStorage
class InMemoryStorage {
  private notificationLogs: any[] = [];
  private emergencySubmissions: any[] = [];
  private escalationData: Map<string, any> = new Map();
  private notificationIntervals: Map<string, number> = new Map();
  private recipientSettings: Map<string, NotificationChannel[]> = new Map();
  private documentResponses: Map<string, any[]> = new Map();

  // Notification logs
  addNotificationLog(log: any): void {
    this.notificationLogs.unshift(log);
    if (this.notificationLogs.length > 1000) {
      this.notificationLogs = this.notificationLogs.slice(0, 1000);
    }
  }

  getNotificationLogs(): any[] {
    return this.notificationLogs;
  }

  // Emergency submissions
  addEmergencySubmission(submission: any): void {
    this.emergencySubmissions.unshift(submission);
    if (this.emergencySubmissions.length > 100) {
      this.emergencySubmissions = this.emergencySubmissions.slice(0, 100);
    }
  }

  getEmergencySubmissions(): any[] {
    return this.emergencySubmissions;
  }

  // Escalation data
  setEscalationData(documentId: string, data: any): void {
    this.escalationData.set(documentId, data);
  }

  getEscalationData(documentId: string): any {
    return this.escalationData.get(documentId) || {};
  }

  removeEscalationData(documentId: string): void {
    this.escalationData.delete(documentId);
  }

  // Notification intervals
  setNotificationInterval(notificationId: string, intervalId: number): void {
    this.notificationIntervals.set(notificationId, intervalId);
  }

  getNotificationInterval(notificationId: string): number | undefined {
    return this.notificationIntervals.get(notificationId);
  }

  removeNotificationInterval(notificationId: string): void {
    this.notificationIntervals.delete(notificationId);
  }

  // Recipient settings
  setRecipientSettings(recipientId: string, settings: NotificationChannel[]): void {
    this.recipientSettings.set(recipientId, settings);
  }

  getRecipientSettings(recipientId: string): NotificationChannel[] | undefined {
    return this.recipientSettings.get(recipientId);
  }

  // Document responses
  getDocumentResponses(documentId: string): any[] {
    return this.documentResponses.get(documentId) || [];
  }
}

const storage = new InMemoryStorage();

class EmergencyNotificationService {
  private static instance: EmergencyNotificationService;

  static getInstance(): EmergencyNotificationService {
    if (!EmergencyNotificationService.instance) {
      EmergencyNotificationService.instance = new EmergencyNotificationService();
    }
    return EmergencyNotificationService.instance;
  }

  // Get user notification preferences from profile - simplified for one-time notifications
  private getUserPreferences(recipientId: string): UserNotificationPreferences {
    // Fixed preferences - no custom options, notifications sent only once
    return {
      email: { type: 'email', enabled: true, interval: 1, unit: 'seconds' },
      sms: { type: 'sms', enabled: true, interval: 1, unit: 'seconds' },
      push: { type: 'push', enabled: true, interval: 1, unit: 'seconds' },
      whatsapp: { type: 'whatsapp', enabled: true, interval: 1, unit: 'seconds' }
    };
  }

  // Send notifications based on profile settings - one-time only
  private async sendWithProfileSettings(
    recipients: string[],
    document: EmergencyDocument
  ): Promise<void> {
    for (const recipientId of recipients) {
      const preferences = this.getUserPreferences(recipientId);
      
      // Send one-time notifications for all enabled channels
      Object.values(preferences).forEach(channel => {
        if (channel.enabled) {
          this.deliverNotification(recipientId, document, channel);
        }
      });
    }
  }

  // Send notifications with emergency override settings
  private async sendWithEmergencyOverride(
    recipients: string[],
    document: EmergencyDocument,
    settings: EmergencyNotificationSettings
  ): Promise<void> {
    if (settings.notificationStrategy === 'document-based') {
      // Same notification settings for all recipients
      recipients.forEach(recipientId => {
        settings.channels.forEach(channel => {
          this.scheduleNotification(recipientId, document, channel);
        });
      });
    } else {
      // Recipient-based: Use individual settings per recipient
      recipients.forEach(recipientId => {
        const recipientSettings = this.getRecipientSpecificSettings(recipientId, settings);
        recipientSettings.forEach(channel => {
          this.scheduleNotification(recipientId, document, channel);
        });
      });
    }
  }

  // Get recipient-specific notification settings
  private getRecipientSpecificSettings(
    recipientId: string,
    settings: EmergencyNotificationSettings
  ): NotificationChannel[] {
    const saved = storage.getRecipientSettings(recipientId);
    if (saved) {
      return saved;
    }
    return settings.channels;
  }

  // Schedule notification delivery - modified for one-time delivery when using profile settings
  private scheduleNotification(
    recipientId: string,
    document: EmergencyDocument,
    channel: NotificationChannel
  ): void {
    const intervalMs = this.convertToMilliseconds(channel.interval, channel.unit);
    
    // Immediate notification for critical emergencies
    if (document.urgencyLevel === 'critical') {
      this.deliverNotification(recipientId, document, channel);
    }
    
    // Schedule recurring notifications (only for emergency override mode)
    const notificationId = `${document.id}-${recipientId}-${channel.type}`;
    
    setTimeout(() => {
      this.deliverNotification(recipientId, document, channel);
      
      // Set up recurring notifications
      const recurringInterval = setInterval(() => {
        this.deliverNotification(recipientId, document, channel);
      }, intervalMs);
      
      // Store interval ID for cleanup (in memory)
      storage.setNotificationInterval(notificationId, recurringInterval as unknown as number);
    }, document.urgencyLevel === 'critical' ? 0 : intervalMs);
  }

  // Convert time units to milliseconds
  private convertToMilliseconds(interval: number, unit: string): number {
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000
    };
    return interval * (multipliers[unit as keyof typeof multipliers] || multipliers.minutes);
  }

  // Deliver notification through specific channel
  private deliverNotification(
    recipientId: string,
    document: EmergencyDocument,
    channel: NotificationChannel
  ): void {
    const notification = {
      id: `${Date.now()}-${recipientId}`,
      recipientId,
      documentId: document.id,
      channel: channel.type,
      title: `EMERGENCY: ${document.title}`,
      message: document.description,
      urgencyLevel: document.urgencyLevel,
      timestamp: new Date().toISOString(),
      delivered: true
    };

    // Store notification log (in memory)
    storage.addNotificationLog(notification);

    // Simulate actual delivery based on channel
    switch (channel.type) {
      case 'email':
        console.log(`📧 Email sent to ${recipientId}: ${notification.title}`);
        break;
      case 'sms':
        console.log(`📱 SMS sent to ${recipientId}: ${notification.title}`);
        break;
      case 'push':
        this.sendBrowserNotification(notification);
        break;
      case 'whatsapp':
        console.log(`💬 WhatsApp sent to ${recipientId}: ${notification.title}`);
        break;
    }
  }

  // Send browser push notification
  private sendBrowserNotification(notification: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.urgencyLevel === 'critical'
      });
    }
  }

  // Main method to send emergency notifications
  async sendEmergencyNotification(
    recipients: string[],
    document: EmergencyDocument,
    settings: EmergencyNotificationSettings
  ): Promise<void> {
    if (settings.useProfileDefaults) {
      await this.sendWithProfileSettings(recipients, document);
    } else if (settings.overrideForEmergency) {
      await this.sendWithEmergencyOverride(recipients, document, settings);
    } else {
      // Fallback to profile settings
      await this.sendWithProfileSettings(recipients, document);
    }

    // Log emergency submission
    const emergencyLog = {
      id: document.id,
      document,
      recipients,
      settings,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    
    // Log emergency submission (in memory)
    storage.addEmergencySubmission(emergencyLog);
  }

  // Get predefined scheduling intervals
  getSchedulingOptions(): Array<{value: string, label: string, interval: number, unit: string}> {
    return [
      { value: '1min', label: 'Every 1 minute', interval: 1, unit: 'minutes' },
      { value: '15min', label: 'Every 15 minutes', interval: 15, unit: 'minutes' },
      { value: '1hour', label: 'Hourly', interval: 1, unit: 'hours' },
      { value: '1day', label: 'Daily', interval: 1, unit: 'days' },
      { value: '1week', label: 'Weekly', interval: 1, unit: 'weeks' },
      { value: 'custom', label: 'Custom Interval', interval: 0, unit: 'minutes' }
    ];
  }

  // Handle document rejection - stops escalation
  handleDocumentRejection(documentId: string, rejectedBy: string): void {
    const escalationData = storage.getEscalationData(documentId);
    escalationData.escalationStopped = true;
    escalationData.rejectedBy = rejectedBy;
    escalationData.status = 'rejected';
    storage.setEscalationData(documentId, escalationData);
    
    // Stop all notifications for this document
    this.stopNotifications(documentId);
  }

  // Handle cyclic escalation for non-responsive recipients
  handleCyclicEscalation(documentId: string, recipients: string[]): void {
    const escalationData = storage.getEscalationData(documentId);
    
    if (escalationData.escalationStopped) {
      return; // Don't escalate if document was rejected
    }

    const currentIndex = escalationData.currentRecipientIndex || 0;
    const nextIndex = (currentIndex + 1) % recipients.length;
    
    escalationData.currentRecipientIndex = nextIndex;
    escalationData.escalationLevel = (escalationData.escalationLevel || 0) + 1;
    
    // If we've completed a full cycle, return to original non-responding recipient
    if (nextIndex === 0 && escalationData.escalationLevel > recipients.length) {
      escalationData.returnedToOriginal = true;
    }
    
    storage.setEscalationData(documentId, escalationData);
    
    // Send notification to next recipient
    const nextRecipient = recipients[nextIndex];
    this.sendEscalationNotification(documentId, nextRecipient, escalationData.escalationLevel);
  }

  // Send escalation notification to specific recipient
  private sendEscalationNotification(documentId: string, recipientId: string, escalationLevel: number): void {
    const document = this.getDocumentById(documentId);
    if (!document) return;

    const notification = {
      id: `${Date.now()}-${recipientId}`,
      recipientId,
      documentId,
      channel: 'escalation',
      title: `ESCALATED EMERGENCY (Level ${escalationLevel}): ${document.title}`,
      message: `This document has been escalated due to no response. Please review urgently.`,
      urgencyLevel: document.urgencyLevel,
      timestamp: new Date().toISOString(),
      escalationLevel,
      delivered: true
    };

    // Store notification log (in memory)
    storage.addNotificationLog(notification);
  }

  // Get document by ID
  private getDocumentById(documentId: string): EmergencyDocument | null {
    const submissions = storage.getEmergencySubmissions();
    const submission = submissions.find((s: any) => s.id === documentId);
    return submission ? submission.document : null;
  }

  // Initialize escalation for a document
  initializeEscalation(document: EmergencyDocument, recipients: string[]): void {
    if (!document.autoEscalation) return;

    const escalationData = {
      documentId: document.id,
      recipients,
      originalRecipients: [...recipients],
      currentRecipientIndex: 0,
      escalationLevel: 0,
      escalationStopped: false,
      cyclicEscalation: document.cyclicEscalation || true,
      timeout: document.escalationTimeout || 24,
      timeUnit: document.escalationTimeUnit || 'hours'
    };

    storage.setEscalationData(document.id, escalationData);

    // Set up escalation timer
    const timeoutMs = this.convertToMilliseconds(escalationData.timeout, escalationData.timeUnit);
    
    setTimeout(() => {
      this.checkForEscalation(document.id);
    }, timeoutMs);
  }

  // Check if escalation is needed
  private checkForEscalation(documentId: string): void {
    const escalationData = storage.getEscalationData(documentId);
    
    if (escalationData.escalationStopped) {
      return;
    }

    // Check if current recipient has responded
    const hasResponse = this.checkRecipientResponse(documentId, escalationData.recipients?.[escalationData.currentRecipientIndex]);
    
    if (!hasResponse && escalationData.recipients) {
      // Escalate to next recipient
      this.handleCyclicEscalation(documentId, escalationData.recipients);
      
      // Set up next escalation check
      const timeoutMs = this.convertToMilliseconds(escalationData.timeout, escalationData.timeUnit);
      setTimeout(() => {
        this.checkForEscalation(documentId);
      }, timeoutMs);
    }
  }

  // Check if recipient has responded
  private checkRecipientResponse(documentId: string, recipientId: string): boolean {
    const responses = storage.getDocumentResponses(documentId);
    return responses.some((response: any) => response.recipientId === recipientId);
  }

  // Stop all notifications for a document
  stopNotifications(documentId: string): void {
    const logs = storage.getNotificationLogs();
    logs.forEach((log: any) => {
      if (log.documentId === documentId) {
        const intervalId = storage.getNotificationInterval(log.id);
        if (intervalId) {
          clearInterval(intervalId);
          storage.removeNotificationInterval(log.id);
        }
      }
    });
    
    // Clear escalation data
    storage.removeEscalationData(documentId);
  }
  
  // Public getter for notification logs
  getNotificationLogs(): any[] {
    return storage.getNotificationLogs();
  }
  
  // Public getter for submission logs
  getSubmissionLogs(): any[] {
    return storage.getEmergencySubmissions();
  }
}

export const emergencyNotificationService = EmergencyNotificationService.getInstance();
export type { 
  NotificationChannel, 
  UserNotificationPreferences, 
  EmergencyNotificationSettings, 
  EmergencyDocument 
};