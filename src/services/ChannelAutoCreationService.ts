import { ChatChannel } from '@/types/chat';

/**
 * ChannelAutoCreationService
 * NOW USES IN-MEMORY STORAGE - NO localStorage
 * TODO: Migrate to Supabase for persistent channel storage
 */

interface DocumentSubmission {
  documentId: string;
  documentTitle: string;
  submittedBy: string;
  submittedByName: string;
  recipients: string[];
  recipientNames?: string[];
  source: 'Document Management' | 'Emergency Management' | 'Approval Chain with Bypass';
  submittedAt: Date;
}

// In-memory channel storage
const channelStore: Map<string, ChatChannel> = new Map();

export class ChannelAutoCreationService {
  private static readonly STORAGE_KEY = 'document-channels';

  /**
   * Automatically create a channel when a document is submitted
   */
  static createDocumentChannel(submission: DocumentSubmission): ChatChannel {
    const channelId = `channel-${submission.documentId}-${Date.now()}`;
    
    // Create channel with submitter + all recipients
    const members = [
      submission.submittedBy,
      ...submission.recipients
    ];

    // Remove duplicates
    const uniqueMembers = Array.from(new Set(members));

    const channel: ChatChannel = {
      id: channelId,
      name: `${submission.documentId} - ${submission.documentTitle}`,
      description: `Auto-created channel for ${submission.source}\nCreated by: ${submission.submittedByName}\nCreated on: ${submission.submittedAt.toLocaleDateString()}`,
      type: 'document-thread',
      members: uniqueMembers,
      admins: [submission.submittedBy], // Submitter is admin
      isPrivate: true, // Only visible to members
      documentId: submission.documentId,
      createdBy: submission.submittedBy,
      createdAt: submission.submittedAt,
      updatedAt: submission.submittedAt,
      pinnedMessages: [],
      settings: {
        allowFileUploads: true,
        allowPolls: true,
        allowSignatureRequests: true,
        requireModeration: false,
        autoArchive: false,
        notificationLevel: 'all'
      }
    };

    // Save to in-memory store (no localStorage)
    this.saveChannel(channel);

    // Broadcast event for real-time updates
    this.broadcastChannelCreated(channel);

    console.log('✅ Channel auto-created:', {
      channelId: channel.id,
      documentId: submission.documentId,
      members: uniqueMembers,
      source: submission.source
    });

    return channel;
  }

  /**
   * Save channel to in-memory store
   */
  private static saveChannel(channel: ChatChannel): void {
    try {
      // Check if channel already exists for this document
      const existingChannel = Array.from(channelStore.values()).find(
        ch => ch.documentId === channel.documentId
      );

      if (existingChannel) {
        // Update existing channel
        channelStore.set(existingChannel.id, channel);
      } else {
        // Add new channel
        channelStore.set(channel.id, channel);
      }
    } catch (error) {
      console.error('Failed to save channel:', error);
    }
  }

  /**
   * Get all channels from in-memory store
   */
  static getChannels(): ChatChannel[] {
    try {
      return Array.from(channelStore.values());
    } catch (error) {
      console.error('Failed to load channels:', error);
      return [];
    }
  }

  /**
   * Get channels visible to a specific user
   */
  static getUserChannels(userId: string): ChatChannel[] {
    const allChannels = this.getChannels();
    return allChannels.filter(channel => 
      channel.members.includes(userId) || channel.createdBy === userId
    );
  }

  /**
   * Get channel by document ID
   */
  static getChannelByDocumentId(documentId: string): ChatChannel | null {
    const channels = this.getChannels();
    return channels.find(ch => ch.documentId === documentId) || null;
  }

  /**
   * Add members to an existing channel
   */
  static addMembersToChannel(channelId: string, newMembers: string[]): void {
    try {
      const channel = channelStore.get(channelId);

      if (channel) {
        const existingMembers = channel.members || [];
        channel.members = Array.from(new Set([...existingMembers, ...newMembers]));
        channel.updatedAt = new Date();
        channelStore.set(channelId, channel);
        this.broadcastChannelUpdated(channel);
      }
    } catch (error) {
      console.error('Failed to add members:', error);
    }
  }

  /**
   * Delete a channel
   */
  static deleteChannel(channelId: string): void {
    try {
      channelStore.delete(channelId);
      this.broadcastChannelDeleted(channelId);
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  }

  /**
   * Broadcast channel-created event
   */
  private static broadcastChannelCreated(channel: ChatChannel): void {
    const event = new CustomEvent('channel-created', {
      detail: { channel }
    });
    window.dispatchEvent(event);
  }

  /**
   * Broadcast channel-updated event
   */
  private static broadcastChannelUpdated(channel: ChatChannel): void {
    const event = new CustomEvent('channel-updated', {
      detail: { channel }
    });
    window.dispatchEvent(event);
  }

  /**
   * Broadcast channel-deleted event
   */
  private static broadcastChannelDeleted(channelId: string): void {
    const event = new CustomEvent('channel-deleted', {
      detail: { channelId }
    });
    window.dispatchEvent(event);
  }

  /**
   * Update channel description
   */
  static updateChannelDescription(channelId: string, description: string): void {
    try {
      const channel = channelStore.get(channelId);

      if (channel) {
        channel.description = description;
        channel.updatedAt = new Date();
        channelStore.set(channelId, channel);
        this.broadcastChannelUpdated(channel);
      }
    } catch (error) {
      console.error('Failed to update channel description:', error);
    }
  }
}

// Export singleton instance
export const channelAutoCreationService = ChannelAutoCreationService;
