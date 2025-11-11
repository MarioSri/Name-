import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Settings, X } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { apiService } from '@/services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  delivered_via: string[];
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { onNotification } = useSocket();

  useEffect(() => {
    loadNotifications();
    
    const unsubscribe = onNotification((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiService.getUserNotifications();
      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.data.filter((n: any) => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Notifications</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notifications
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {notification.delivered_via?.map((method) => (
                            <Badge key={method} variant="outline" className="text-xs">
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};