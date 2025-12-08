import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private async getAuthHeaders() {
    // Get token from Supabase session instead of localStorage
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async search(query: string) {
    const response = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}`, {
      headers: await this.getAuthHeaders()
    });
    return response.json();
  }

  async getDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: await this.getAuthHeaders()
    });
    return response.json();
  }

  async sendNotification(recipientIds: string[], title: string, message: string, type?: string, data?: any) {
    const response = await fetch(`${API_BASE_URL}/notifications/send`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ recipientIds, title, message, type, data })
    });
    return response.json();
  }

  async getUserNotifications() {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      headers: await this.getAuthHeaders()
    });
    return response.json();
  }

  async updateNotificationPreferences(preferences: any) {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(preferences)
    });
    return response.json();
  }
}

export const apiService = new ApiService();