/**
 * Real-time document service for unified document management
 * Handles Track Documents, Approval Center, Document Management, Emergency Management, and Approval Chain with Bypass
 * NOW USING SUPABASE - NO MORE localStorage
 */

import { supabase } from '@/lib/supabase';
import { supabaseDocumentService, Document, ApprovalCard } from './SupabaseDocumentService';
import { realtimeService } from './SupabaseRealtimeService';
import { io, Socket } from 'socket.io-client';

export interface DocumentData {
  id: string;
  tracking_id?: string;
  title: string;
  type: string;
  submitter: string;
  submitter_id?: string;
  submittedDate: string;
  priority: string;
  description: string;
  recipients: string[];
  recipientIds: string[];
  workflow?: {
    steps: Array<{
      name: string;
      assignee: string;
      status: 'pending' | 'current' | 'completed' | 'rejected' | 'bypassed';
      completedDate?: string;
    }>;
    currentStep: string;
    progress: number;
    isParallel?: boolean;
    hasBypass?: boolean;
  };
  source: 'document-management' | 'emergency-management' | 'approval-chain-bypass';
  routingType?: 'sequential' | 'parallel' | 'reverse' | 'bidirectional';
  isEmergency?: boolean;
  isParallel?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'partially-approved';
  files?: File[];
  signedBy?: string[];
  rejectedBy?: string[];
}

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  department?: string;
  branch?: string;
}

class RealTimeDocumentService {
  private socket: Socket | null = null;
  private supabaseSubscription: any = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeSocket();
    this.initializeSupabase();
  }

  private initializeSocket() {
    try {
      this.socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('🔌 Real-time service connected');
      });

      this.socket.on('document-created', (data) => {
        this.handleDocumentCreated(data);
      });

      this.socket.on('document-updated', (data) => {
        this.handleDocumentUpdated(data);
      });

      this.socket.on('approval-required', (data) => {
        this.handleApprovalRequired(data);
      });

    } catch (error) {
      console.error('Socket connection failed:', error);
    }
  }

  private async initializeSupabase() {
    try {
      // Subscribe to document changes
      this.supabaseSubscription = supabase
        .channel('realtime-documents')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'documents' },
          (payload) => this.handleSupabaseChange(payload)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'approval_cards' },
          (payload) => this.handleApprovalChange(payload)
        )
        .subscribe();
    } catch (error) {
      console.error('Supabase subscription failed:', error);
    }
  }

  // Document Management Integration - NOW USING SUPABASE
  async submitDocument(documentData: Partial<DocumentData>, currentUser: User): Promise<DocumentData> {
    const trackingId = `DOC-${Date.now()}`;
    const workflow = this.createWorkflow(documentData.recipients || [], documentData.routingType);
    
    try {
      // Create document in Supabase
      const supabaseDoc = await supabaseDocumentService.createDocument({
        tracking_id: trackingId,
        title: documentData.title || '',
        description: documentData.description || '',
        type: documentData.type || 'Letter',
        priority: documentData.priority || 'normal',
        submitter_id: currentUser.id,
        submitter_name: currentUser.name,
        submitter_role: currentUser.role,
        recipients: documentData.recipients || [],
        recipient_ids: documentData.recipientIds || [],
        routing_type: documentData.routingType || 'sequential',
        is_emergency: false,
        is_parallel: documentData.routingType === 'parallel' || documentData.routingType === 'bidirectional',
        source: 'document-management',
        workflow,
      });

      // Create approval cards in Supabase
      await supabaseDocumentService.createApprovalCards(supabaseDoc);

      // Convert to DocumentData format for compatibility
      const document: DocumentData = {
        id: supabaseDoc.tracking_id,
        tracking_id: supabaseDoc.tracking_id,
        title: supabaseDoc.title,
        type: supabaseDoc.type,
        submitter: supabaseDoc.submitter_name,
        submitter_id: supabaseDoc.submitter_id,
        submittedDate: supabaseDoc.created_at.split('T')[0],
        priority: supabaseDoc.priority,
        description: supabaseDoc.description || '',
        recipients: supabaseDoc.recipients,
        recipientIds: supabaseDoc.recipient_ids,
        workflow,
        source: 'document-management',
        routingType: supabaseDoc.routing_type as any,
        isEmergency: false,
        isParallel: supabaseDoc.is_parallel,
        status: 'pending',
      };

      // Emit real-time events
      this.emit('document-submitted', document);
      this.emitToSocket('document-created', document);

      console.log('✅ Document submitted to Supabase:', trackingId);
      return document;
    } catch (error) {
      console.error('❌ Failed to submit document:', error);
      throw error;
    }
  }

  // Emergency Management Integration - NOW USING SUPABASE
  async createEmergencyDocument(documentData: Partial<DocumentData>, currentUser: User): Promise<DocumentData> {
    const trackingId = `EMERGENCY-${Date.now()}`;
    const workflow = this.createWorkflow(documentData.recipients || [], 'parallel');
    
    try {
      // Create emergency document in Supabase
      const supabaseDoc = await supabaseDocumentService.createDocument({
        tracking_id: trackingId,
        title: documentData.title || '',
        description: documentData.description || '',
        type: documentData.type || 'Emergency',
        priority: 'critical',
        submitter_id: currentUser.id,
        submitter_name: currentUser.name,
        submitter_role: currentUser.role,
        recipients: documentData.recipients || [],
        recipient_ids: documentData.recipientIds || [],
        routing_type: 'parallel',
        is_emergency: true,
        is_parallel: true,
        source: 'emergency-management',
        workflow,
      });

      // Create approval cards
      await supabaseDocumentService.createApprovalCards(supabaseDoc);

      const document: DocumentData = {
        id: supabaseDoc.tracking_id,
        tracking_id: supabaseDoc.tracking_id,
        title: supabaseDoc.title,
        type: supabaseDoc.type,
        submitter: supabaseDoc.submitter_name,
        submitter_id: supabaseDoc.submitter_id,
        submittedDate: supabaseDoc.created_at.split('T')[0],
        priority: 'critical',
        description: supabaseDoc.description || '',
        recipients: supabaseDoc.recipients,
        recipientIds: supabaseDoc.recipient_ids,
        workflow,
        source: 'emergency-management',
        routingType: 'parallel',
        isEmergency: true,
        isParallel: true,
        status: 'pending',
      };

      // Emit emergency events
      this.emit('emergency-document-created', document);
      this.emitToSocket('emergency-document', document);

      console.log('✅ Emergency document created:', trackingId);
      return document;
    } catch (error) {
      console.error('❌ Failed to create emergency document:', error);
      throw error;
    }
  }

  // Approval Chain with Bypass Integration - NOW USING SUPABASE
  async createApprovalChainDocument(documentData: Partial<DocumentData>, currentUser: User): Promise<DocumentData> {
    const trackingId = `CHAIN-${Date.now()}`;
    const workflow = this.createWorkflow(documentData.recipients || [], documentData.routingType, true);
    
    try {
      const supabaseDoc = await supabaseDocumentService.createDocument({
        tracking_id: trackingId,
        title: documentData.title || '',
        description: documentData.description || '',
        type: documentData.type || 'Letter',
        priority: documentData.priority || 'high',
        submitter_id: currentUser.id,
        submitter_name: currentUser.name,
        submitter_role: currentUser.role,
        recipients: documentData.recipients || [],
        recipient_ids: documentData.recipientIds || [],
        routing_type: documentData.routingType || 'sequential',
        is_emergency: false,
        is_parallel: documentData.routingType === 'parallel' || documentData.routingType === 'bidirectional',
        source: 'approval-chain-bypass',
        workflow,
      });

      await supabaseDocumentService.createApprovalCards(supabaseDoc);

      const document: DocumentData = {
        id: supabaseDoc.tracking_id,
        tracking_id: supabaseDoc.tracking_id,
        title: supabaseDoc.title,
        type: supabaseDoc.type,
        submitter: supabaseDoc.submitter_name,
        submitter_id: supabaseDoc.submitter_id,
        submittedDate: supabaseDoc.created_at.split('T')[0],
        priority: supabaseDoc.priority,
        description: supabaseDoc.description || '',
        recipients: supabaseDoc.recipients,
        recipientIds: supabaseDoc.recipient_ids,
        workflow,
        source: 'approval-chain-bypass',
        routingType: supabaseDoc.routing_type as any,
        isEmergency: false,
        isParallel: supabaseDoc.is_parallel,
        status: 'pending',
      };

      // Emit events
      this.emit('approval-chain-created', document);
      this.emitToSocket('approval-chain-document', document);

      console.log('✅ Approval chain document created:', trackingId);
      return document;
    } catch (error) {
      console.error('❌ Failed to create approval chain document:', error);
      throw error;
    }
  }

  // Approval Processing - NOW USING SUPABASE
  async approveDocument(documentId: string, currentUser: User, comments?: string): Promise<void> {
    try {
      // Update document status in Supabase
      await supabaseDocumentService.updateDocumentStatus(documentId, 'approved');
      
      // Get and update approval cards
      const approvals = await supabaseDocumentService.getApprovalsByRecipient(currentUser.id);
      const relevantApproval = approvals.find(a => 
        a.tracking_card_id === documentId || a.approval_id === documentId
      );
      
      if (relevantApproval) {
        await supabaseDocumentService.updateApprovalStatus(relevantApproval.approval_id, 'approved');
      }

      // Emit real-time updates
      this.emit('document-approved', { documentId, approvedBy: currentUser.name, comments });
      this.emitToSocket('document-approved', { documentId, approvedBy: currentUser.name });
      
      console.log('✅ Document approved:', documentId);
    } catch (error) {
      console.error('❌ Failed to approve document:', error);
      throw error;
    }
  }

  // Reject Document - NOW USING SUPABASE
  async rejectDocument(documentId: string, currentUser: User, reason: string): Promise<void> {
    try {
      // Update document status in Supabase
      await supabaseDocumentService.updateDocumentStatus(documentId, 'rejected');
      
      // Get and update approval cards
      const approvals = await supabaseDocumentService.getApprovalsByRecipient(currentUser.id);
      const relevantApproval = approvals.find(a => 
        a.tracking_card_id === documentId || a.approval_id === documentId
      );
      
      if (relevantApproval) {
        await supabaseDocumentService.updateApprovalStatus(relevantApproval.approval_id, 'rejected');
      }

      // Emit real-time updates
      this.emit('document-rejected', { documentId, rejectedBy: currentUser.name, reason });
      this.emitToSocket('document-rejected', { documentId, rejectedBy: currentUser.name });
      
      console.log('✅ Document rejected:', documentId);
    } catch (error) {
      console.error('❌ Failed to reject document:', error);
      throw error;
    }
  }

  // Real-time recipient management - NOW USING SUPABASE
  async updateRecipients(documentId: string, newRecipients: string[], newRecipientIds: string[]): Promise<void> {
    try {
      // Update document in Supabase
      await supabaseDocumentService.updateDocument(documentId, {
        recipients: newRecipients,
        recipient_ids: newRecipientIds,
        workflow: this.createWorkflow(newRecipients),
      });

      // Emit real-time updates
      this.emit('recipients-updated', { documentId, recipients: newRecipients, recipientIds: newRecipientIds });
      this.emitToSocket('recipients-updated', { documentId, recipients: newRecipients });
      
      console.log('✅ Recipients updated for:', documentId);
    } catch (error) {
      console.error('❌ Failed to update recipients:', error);
      throw error;
    }
  }

  // Get documents by submitter from Supabase
  async getDocumentsBySubmitter(submitterId: string): Promise<DocumentData[]> {
    try {
      const docs = await supabaseDocumentService.getDocumentsBySubmitter(submitterId);
      return docs.map(doc => this.convertToDocumentData(doc));
    } catch (error) {
      console.error('❌ Failed to get documents:', error);
      return [];
    }
  }

  // Get approval cards for recipient from Supabase
  async getApprovalCardsForRecipient(recipientId: string): Promise<DocumentData[]> {
    try {
      const approvals = await supabaseDocumentService.getPendingApprovalsByRecipient(recipientId);
      return approvals.map(approval => this.convertApprovalToDocumentData(approval));
    } catch (error) {
      console.error('❌ Failed to get approval cards:', error);
      return [];
    }
  }

  // Convert Supabase Document to DocumentData
  private convertToDocumentData(doc: Document): DocumentData {
    return {
      id: doc.tracking_id,
      tracking_id: doc.tracking_id,
      title: doc.title,
      type: doc.type,
      submitter: doc.submitter_name,
      submitter_id: doc.submitter_id,
      submittedDate: doc.created_at.split('T')[0],
      priority: doc.priority,
      description: doc.description || '',
      recipients: doc.recipients,
      recipientIds: doc.recipient_ids,
      workflow: doc.workflow,
      source: doc.source as any,
      routingType: doc.routing_type as any,
      isEmergency: doc.is_emergency,
      isParallel: doc.is_parallel,
      status: doc.status as any,
    };
  }

  // Convert Supabase ApprovalCard to DocumentData
  private convertApprovalToDocumentData(approval: ApprovalCard): DocumentData {
    return {
      id: approval.approval_id,
      tracking_id: approval.tracking_card_id,
      title: approval.title,
      type: approval.type,
      submitter: approval.submitter,
      submitter_id: approval.submitter_id,
      submittedDate: approval.created_at.split('T')[0],
      priority: approval.priority,
      description: approval.description || '',
      recipients: approval.recipients,
      recipientIds: approval.recipient_ids,
      workflow: approval.workflow,
      source: approval.source as any,
      routingType: approval.routing_type as any,
      isEmergency: approval.is_emergency,
      isParallel: approval.is_parallel,
      status: approval.status as any,
    };
  }

  // Helper methods
  private createWorkflow(recipients: string[], routingType?: string, hasBypass?: boolean) {
    const steps = recipients.map((recipient, index) => ({
      name: `Step ${index + 1}`,
      assignee: recipient,
      status: (index === 0 || routingType === 'parallel' || routingType === 'bidirectional') ? 'current' : 'pending'
    }));

    return {
      steps,
      currentStep: steps[0]?.name || 'Complete',
      progress: 0,
      isParallel: routingType === 'parallel' || routingType === 'bidirectional',
      hasBypass
    };
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));

    // Also emit as window event for component communication
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  private emitToSocket(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private handleDocumentCreated(data: any) {
    this.emit('document-created', data);
  }

  private handleDocumentUpdated(data: any) {
    this.emit('document-updated', data);
  }

  private handleApprovalRequired(data: any) {
    this.emit('approval-required', data);
  }

  private handleSupabaseChange(payload: any) {
    console.log('📡 Supabase document change:', payload);
    this.emit('supabase-change', payload);
    this.emit('document-updated', payload);
  }

  private handleApprovalChange(payload: any) {
    console.log('📡 Supabase approval change:', payload);
    this.emit('approval-change', payload);
    this.emit('approval-required', payload);
  }

  // Cleanup
  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.supabaseSubscription) {
      this.supabaseSubscription.unsubscribe();
    }
    this.eventListeners.clear();
  }
}

// Singleton instance
export const realTimeDocumentService = new RealTimeDocumentService();
export default realTimeDocumentService;