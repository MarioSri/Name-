import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { NotificationService } from '../services/notificationService';
import { SocketService } from '../services/socketService';
import { EmailService } from '../services/emailService';

const socketService = new SocketService(null as any); // Will be injected
const emailService = new EmailService();
const notificationService = new NotificationService(socketService, emailService);

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { recipientIds, title, message, type, data } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipients are required' 
      });
    }

    await notificationService.sendNotificationToRecipients(recipientIds, {
      title,
      message,
      type: type || 'general',
      data
    });

    res.json({ success: true, message: 'Notifications sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send notifications' });
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const preferences = req.body;

    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: preferences })
      .eq('id', user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
};