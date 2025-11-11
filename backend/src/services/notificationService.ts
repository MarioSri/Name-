import { supabase } from '../config/supabase';
import { EmailService } from './emailService';
import { SocketService } from './socketService';
import { NotificationPreferences } from '../types';

export class NotificationService {
  constructor(
    private socketService: SocketService,
    private emailService: EmailService
  ) {}

  async sendNotificationToRecipients(
    recipientIds: string[],
    notification: {
      title: string;
      message: string;
      type: 'document' | 'approval' | 'reminder' | 'general';
      data?: any;
    }
  ) {
    for (const recipientId of recipientIds) {
      const { data: user } = await supabase
        .from('users')
        .select('*, notification_preferences')
        .eq('id', recipientId)
        .single();

      if (user) {
        await this.deliverNotification(user, notification);
      }
    }
  }

  private async deliverNotification(
    user: any,
    notification: {
      title: string;
      message: string;
      type: string;
      data?: any;
    }
  ) {
    const prefs = user.notification_preferences || {
      email: true,
      push: true,
      sms: false,
      whatsapp: false
    };

    // Push notification via Socket.IO
    if (prefs.push) {
      this.socketService.emitToUser(user.id, 'notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    }

    // Email notification
    if (prefs.email) {
      await this.emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.message
      );
    }

    // SMS notification (placeholder for SMS service)
    if (prefs.sms && user.phone) {
      await this.sendSMS(user.phone, notification.message);
    }

    // WhatsApp notification (placeholder for WhatsApp service)
    if (prefs.whatsapp && user.whatsapp_number) {
      await this.sendWhatsApp(user.whatsapp_number, notification.message);
    }

    // Store notification in database
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      data: notification.data,
      delivered_via: this.getDeliveryMethods(prefs)
    });
  }

  private async sendSMS(phone: string, message: string) {
    // Placeholder for SMS service integration
    console.log(`SMS to ${phone}: ${message}`);
  }

  private async sendWhatsApp(number: string, message: string) {
    // Placeholder for WhatsApp service integration
    console.log(`WhatsApp to ${number}: ${message}`);
  }

  private getDeliveryMethods(prefs: NotificationPreferences): string[] {
    const methods = [];
    if (prefs.push) methods.push('push');
    if (prefs.email) methods.push('email');
    if (prefs.sms) methods.push('sms');
    if (prefs.whatsapp) methods.push('whatsapp');
    return methods;
  }
}