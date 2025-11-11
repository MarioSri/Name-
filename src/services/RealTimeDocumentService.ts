/**
 * Real-time document service for unified document management
 * Handles Track Documents, Approval Center, Document Management, Emergency Management, and Approval Chain with Bypass
 */

import { supabase } from '@/lib/supabase';
import { io, Socket } from 'socket.io-client';

export interface DocumentData {
  id: string;
  title: string;
  type: string;
  submitter: string;
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
  };
  source: 'document-management' | 'emergency-management' | 'approval-chain-bypass';
  routingType?: 'sequential' | 'parallel' | 'reverse' | 'bidirectional';
  isEmergency?: boolean;
  isParallel?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'partially-approved';
  files?: File[];
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
        .channel('documents')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'documents' },
          (payload) => this.handleSupabaseChange(payload)
        )
        .subscribe();
    } catch (error) {
      console.error('Supabase subscription failed:', error);
    }
  }

  // Document Management Integration
  async submitDocument(documentData: Partial<DocumentData>, currentUser: User): Promise<DocumentData> {
    const document: DocumentData = {
      id: `doc-${Date.now()}`,
      title: documentData.title || '',
      type: documentData.type || 'Letter',
      submitter: currentUser.name,
      submittedDate: new Date().toISOString().split('T')[0],
      priority: documentData.priority || 'normal',
      description: documentData.description || '',
      recipients: documentData.recipients || [],
      recipientIds: documentData.recipientIds || [],
      workflow: this.createWorkflow(documentData.recipients || [], documentData.routingType),
      source: 'document-management',
      routingType: documentData.routingType || 'sequential',
      isEmergency: false,
      isParallel: documentData.routingType === 'parallel' || documentData.routingType === 'bidirectional',
      status: 'pending',
      files: documentData.files
    };

    // Save to localStorage (Track Documents)
    this.saveToTrackDocuments(document);

    // Create approval cards for recipients
    this.createApprovalCards(document);

    // Emit real-time events
    this.emit('document-submitted', document);
    this.emitToSocket('document-created', document);

    return document;
  }

  // Emergency Management Integration
  async createEmergencyDocument(documentData: Partial<DocumentData>, currentUser: User): Promise<DocumentData> {
    const document: DocumentData = {
      id: `emergency-${Date.now()}`,
      title: documentData.title || '',
      type: documentData.type || 'Emergency',
      submitter: currentUser.name,
      submittedDate: new Date().toISOString().split('T')[0],
      priority: 'critical',
      description: documentData.description || '',
      recipients: documentData.recipients || [],
      recipientIds: documentData.recipientIds || [],
      workflow: this.createWorkflow(documentData.recipients || [], 'parallel'),
      source: 'emergency-management',
      routingType: 'parallel',
      isEmergency: true,
      isParallel: true,
      status: 'pending',
      files: documentData.files
    };

    // Save to localStorage
    this.saveToTrackDocuments(document);
    this.createApprovalCards(document);

    // Emit emergency events
    this.emit('emergency-document-created', document);
    this.emitToSocket('emergency-document', document);

    return document;
  }

  // Approval Chain with Bypass Integration
  async createApprovalChainDocument(documentData: Partial<DocumentData>, currentUser: User): Promise<DocumentData> {
    const document: DocumentData = {
      id: `approval-chain-${Date.now()}`,
      title: documentData.title || '',
      type: documentData.type || 'Letter',
      submitter: currentUser.name,
      submittedDate: new Date().toISOString().split('T')[0],
      priority: documentData.priority || 'high',
      description: documentData.description || '',
      recipients: documentData.recipients || [],
      recipientIds: documentData.recipientIds || [],
      workflow: this.createWorkflow(documentData.recipients || [], documentData.routingType, true),
      source: 'approval-chain-bypass',
      routingType: documentData.routingType || 'sequential',
      isEmergency: false,
      isParallel: documentData.routingType === 'parallel' || documentData.routingType === 'bidirectional',
      status: 'pending',
      files: documentData.files
    };

    // Save to localStorage
    this.saveToTrackDocuments(document);
    this.createApprovalCards(document);

    // Emit events
    this.emit('approval-chain-created', document);
    this.emitToSocket('approval-chain-document', document);

    return document;
  }

  // Approval Processing
  async approveDocument(documentId: string, currentUser: User, comments?: string): Promise<void> {
    const trackingDocs = this.getTrackDocuments();
    const approvalCards = this.getApprovalCards();

    // Update tracking document
    const updatedTracking = trackingDocs.map(doc => {
      if (doc.id === documentId) {
        return this.processApproval(doc, currentUser, 'approved', comments);
      }
      return doc;
    });

    // Update approval cards
    const updatedApprovals = approvalCards.filter(card => {
      if (card.id === documentId || card.trackingCardId === documentId) {
        // Handle based on routing type
        if (card.isParallel || card.routingType === 'parallel') {
          return true; // Keep for other recipients
        } else {
          return false; // Remove for sequential
        }
      }
      return true;
    });

    // Save updates
    localStorage.setItem('submitted-documents', JSON.stringify(updatedTracking));
    localStorage.setItem('pending-approvals', JSON.stringify(updatedApprovals));

    // Emit real-time updates
    this.emit('document-approved', { documentId, approvedBy: currentUser.name });
    this.emitToSocket('document-approved', { documentId, approvedBy: currentUser.name });
  }

  async rejectDocument(documentId: string, currentUser: User, reason: string): Promise<void> {
    const trackingDocs = this.getTrackDocuments();
    const approvalCards = this.getApprovalCards();

    // Update tracking document
    const updatedTracking = trackingDocs.map(doc => {
      if (doc.id === documentId) {
        return this.processApproval(doc, currentUser, 'rejected', reason);
      }
      return doc;
    });

    // Handle approval cards based on bypass capability
    const updatedApprovals = approvalCards.filter(card => {
      if (card.id === documentId || card.trackingCardId === documentId) {
        // Check if has bypass capability
        const trackingDoc = updatedTracking.find(td => td.id === documentId);
        const hasBypass = trackingDoc?.workflow?.hasBypass || card.source === 'approval-chain-bypass';
        
        if (hasBypass) {
          return true; // Keep for bypass
        } else {
          return false; // Remove for all
        }
      }
      return true;
    });

    // Save updates
    localStorage.setItem('submitted-documents', JSON.stringify(updatedTracking));
    localStorage.setItem('pending-approvals', JSON.stringify(updatedApprovals));

    // Emit real-time updates
    this.emit('document-rejected', { documentId, rejectedBy: currentUser.name, reason });
    this.emitToSocket('document-rejected', { documentId, rejectedBy: currentUser.name });
  }

  // Real-time recipient management
  async updateRecipients(documentId: string, newRecipients: string[], newRecipientIds: string[]): Promise<void> {
    const trackingDocs = this.getTrackDocuments();
    const approvalCards = this.getApprovalCards();

    // Update tracking documents
    const updatedTracking = trackingDocs.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          recipients: newRecipients,
          recipientIds: newRecipientIds,
          workflow: this.createWorkflow(newRecipients, doc.routingType)
        };
      }
      return doc;
    });

    // Update approval cards
    const updatedApprovals = approvalCards.map(card => {
      if (card.id === documentId || card.trackingCardId === documentId) {
        return {
          ...card,
          recipients: newRecipients,
          recipientIds: newRecipientIds
        };
      }
      return card;
    });

    // Save updates
    localStorage.setItem('submitted-documents', JSON.stringify(updatedTracking));
    localStorage.setItem('pending-approvals', JSON.stringify(updatedApprovals));

    // Emit real-time updates
    this.emit('recipients-updated', { documentId, recipients: newRecipients, recipientIds: newRecipientIds });
    this.emitToSocket('recipients-updated', { documentId, recipients: newRecipients });
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

  private saveToTrackDocuments(document: DocumentData) {
    const existing = this.getTrackDocuments();
    existing.unshift(document);
    localStorage.setItem('submitted-documents', JSON.stringify(existing));
  }

  private createApprovalCards(document: DocumentData) {
    const approvalCard = {
      ...document,
      trackingCardId: document.id
    };

    const existing = this.getApprovalCards();
    existing.unshift(approvalCard);
    localStorage.setItem('pending-approvals', JSON.stringify(existing));
  }

  private processApproval(document: DocumentData, user: User, action: 'approved' | 'rejected', comments?: string) {
    const updatedDoc = { ...document };
    
    if (action === 'approved') {
      updatedDoc.signedBy = [...(updatedDoc.signedBy || []), user.name];
    } else {
      updatedDoc.rejectedBy = [...(updatedDoc.rejectedBy || []), user.name];
    }

    // Update workflow
    if (updatedDoc.workflow) {
      const userStepIndex = updatedDoc.workflow.steps.findIndex(step => 
        step.assignee.toLowerCase().includes(user.role?.toLowerCase() || '') ||
        step.assignee.toLowerCase().includes(user.name?.toLowerCase() || '')
      );

      if (userStepIndex !== -1) {
        updatedDoc.workflow.steps[userStepIndex].status = action === 'approved' ? 'completed' : 'rejected';
        updatedDoc.workflow.steps[userStepIndex].completedDate = new Date().toISOString().split('T')[0];

        // Update progress
        const completedSteps = updatedDoc.workflow.steps.filter(s => s.status === 'completed' || s.status === 'rejected').length;
        updatedDoc.workflow.progress = Math.round((completedSteps / updatedDoc.workflow.steps.length) * 100);

        // Check if workflow is complete
        if (completedSteps === updatedDoc.workflow.steps.length) {
          updatedDoc.status = action === 'approved' ? 'approved' : 'rejected';
          updatedDoc.workflow.currentStep = 'Complete';
        } else if (!updatedDoc.workflow.isParallel && action === 'approved') {
          // Move to next step in sequential workflow
          const nextStepIndex = userStepIndex + 1;
          if (nextStepIndex < updatedDoc.workflow.steps.length) {
            updatedDoc.workflow.steps[nextStepIndex].status = 'current';
            updatedDoc.workflow.currentStep = updatedDoc.workflow.steps[nextStepIndex].name;
          }
        }
      }
    }

    return updatedDoc;
  }

  private getTrackDocuments(): DocumentData[] {
    return JSON.parse(localStorage.getItem('submitted-documents') || '[]');
  }

  private getApprovalCards(): DocumentData[] {
    return JSON.parse(localStorage.getItem('pending-approvals') || '[]');
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
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
    console.log('📡 Supabase change:', payload);
    this.emit('supabase-change', payload);
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