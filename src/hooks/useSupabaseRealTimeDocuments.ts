/**
 * useSupabaseRealTimeDocuments Hook
 * React hook for real-time document and approval management using Supabase
 * This replaces all localStorage-based document operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseStorage, Document, ApprovalCard, Approval, Comment } from '@/services/SupabaseStorageService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface DocumentData {
  id: string;
  trackingId: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  submitter: string;
  submitterId: string;
  submitterRole?: string;
  recipients: string[];
  recipientIds: string[];
  routingType: string;
  isEmergency: boolean;
  isParallel: boolean;
  source: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
  workflow?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalCardData {
  id: string;
  approvalId: string;
  documentId?: string;
  trackingCardId: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  submitter: string;
  submitterId?: string;
  recipients: string[];
  recipientIds: string[];
  currentRecipientId?: string;
  routingType: string;
  isEmergency: boolean;
  isParallel: boolean;
  source: string;
  workflow?: Record<string, any>;
  approvalHistory?: Approval[];
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseSupabaseRealTimeDocumentsResult {
  // Data
  trackDocuments: DocumentData[];
  approvalCards: ApprovalCardData[];
  approvalHistory: Approval[];
  comments: Record<string, Comment[]>;
  
  // Actions
  submitDocument: (data: Partial<DocumentData>) => Promise<DocumentData>;
  createEmergencyDocument: (data: Partial<DocumentData>) => Promise<DocumentData>;
  createApprovalChainDocument: (data: Partial<DocumentData>) => Promise<DocumentData>;
  approveDocument: (documentId: string, comments?: string) => Promise<void>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  addComment: (documentId: string, content: string, isPrivate?: boolean) => Promise<Comment>;
  refetch: () => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  isConnected: boolean;
}

// Convert Supabase Document to DocumentData
function toDocumentData(doc: Document): DocumentData {
  // Handle recipients - could be array of objects or array of strings
  const recipients = doc.recipients?.map(r => {
    if (typeof r === 'string') return r;
    return r.recipient_name || '';
  }) || [];
  
  const recipientIds = doc.recipients?.map(r => {
    if (typeof r === 'string') return r;
    return r.recipient_user_id || '';
  }) || [];

  return {
    id: doc.id,
    trackingId: doc.tracking_id,
    title: doc.title,
    description: doc.description,
    type: doc.type,
    priority: doc.priority,
    status: doc.status,
    submitter: doc.submitter_name,
    submitterId: doc.submitter_id,
    submitterRole: doc.submitter_role,
    recipients,
    recipientIds,
    routingType: doc.routing_type,
    isEmergency: doc.is_emergency,
    isParallel: doc.is_parallel,
    source: doc.source,
    fileUrl: doc.file_url,
    fileName: doc.file_name,
    fileSize: doc.file_size,
    metadata: doc.metadata,
    workflow: doc.workflow,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

// Convert Supabase ApprovalCard to ApprovalCardData
function toApprovalCardData(card: ApprovalCard): ApprovalCardData {
  // Handle recipients - could be array of objects or array of strings
  const recipients = card.recipients?.map(r => {
    if (typeof r === 'string') return r;
    return r.recipient_name || '';
  }) || [];
  
  const recipientIds = card.recipients?.map(r => {
    if (typeof r === 'string') return r;
    return r.recipient_user_id || '';
  }) || [];

  return {
    id: card.id,
    approvalId: card.approval_id,
    documentId: card.document_id,
    trackingCardId: card.tracking_card_id,
    title: card.title,
    description: card.description,
    type: card.type,
    priority: card.priority,
    status: card.status,
    submitter: card.submitter,
    submitterId: card.submitter_id,
    recipients,
    recipientIds,
    currentRecipientId: card.current_recipient_id,
    routingType: card.routing_type,
    isEmergency: card.is_emergency,
    isParallel: card.is_parallel,
    source: card.source,
    workflow: card.workflow,
    comments: card.comments,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
  };
}

export function useSupabaseRealTimeDocuments(): UseSupabaseRealTimeDocumentsResult {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [trackDocuments, setTrackDocuments] = useState<DocumentData[]>([]);
  const [approvalCards, setApprovalCards] = useState<ApprovalCardData[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<Approval[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const subscriptionsRef = useRef<any[]>([]);
  const loadDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Load initial data - SUPABASE ONLY, NO localStorage
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Prevent concurrent loads - debounce rapid calls
    if (isLoadingRef.current) {
      console.log('⏳ [Supabase] Load already in progress, skipping...');
      return;
    }

    isLoadingRef.current = true;
    setError(null);

    try {
      // Get user's Supabase UUID for proper filtering
      const supabaseUuid = (user as any).supabaseUuid || user.id;
      
      // Get user's submitted documents (tracking cards)
      const docs = await supabaseStorage.getDocumentsBySubmitter(supabaseUuid);
      
      // Get approval cards for this user
      const cards = await supabaseStorage.getApprovalCardsByRecipient(supabaseUuid);

      // Convert to frontend format - SUPABASE DATA ONLY
      const supabaseDocs = docs.map(toDocumentData);
      const supabaseCards = cards.map(toApprovalCardData);

      // Update state atomically
      setTrackDocuments(supabaseDocs);
      setApprovalCards(supabaseCards);

      setIsConnected(true);
      console.log('✅ [Supabase] Loaded', supabaseDocs.length, 'documents,', supabaseCards.length, 'approval cards');
    } catch (err) {
      console.error('❌ [Supabase] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsConnected(false);
      
      // On error, set empty arrays - NO localStorage fallback
      setTrackDocuments([]);
      setApprovalCards([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id]);

  // Debounced load function to prevent rapid re-fetches causing flickering
  const debouncedLoadData = useCallback(() => {
    if (loadDataTimeoutRef.current) {
      clearTimeout(loadDataTimeoutRef.current);
    }
    loadDataTimeoutRef.current = setTimeout(() => {
      loadData();
    }, 300); // 300ms debounce
  }, [loadData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to documents table
    // Note: Real-time payloads don't include joined data, so we refetch
    const docChannel = supabaseStorage.subscribeToDocuments(user.id, (payload) => {
      console.log('📡 [Supabase] Document change:', payload.eventType);
      
      // Use debounced load to prevent flickering
      debouncedLoadData();
    });

    // Subscribe to approval cards for this user
    // Note: Real-time payloads don't include joined data, so we refetch
    const approvalChannel = supabaseStorage.subscribeToApprovalCards(user.id, (payload) => {
      console.log('📡 [Supabase] Approval card change:', payload.eventType);
      
      // For new approvals, show a toast notification
      if (payload.eventType === 'INSERT') {
        const newCard = payload.new as any;
        toast({
          title: 'New Approval Required',
          description: `${newCard.title || 'A document'} requires your approval`,
          duration: 5000,
        });
      }
      
      // Use debounced load to prevent flickering
      debouncedLoadData();
    });

    subscriptionsRef.current = [docChannel, approvalChannel];

    // Load initial data
    loadData();

    // Cleanup
    return () => {
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
      }
      subscriptionsRef.current.forEach(channel => channel?.unsubscribe?.());
      subscriptionsRef.current = [];
    };
  }, [user?.id, loadData, debouncedLoadData, toast]);

  // Submit a new document
  const submitDocument = useCallback(async (data: Partial<DocumentData>): Promise<DocumentData> => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 [Supabase] submitDocument called with:', {
        title: data.title,
        recipientIds: data.recipientIds,
        recipients: data.recipients,
        trackingId: data.trackingId
      });

      // Get recipient details - lookup Supabase UUIDs for each recipient ID
      const recipientDetails = await Promise.all(
        (data.recipientIds || []).map(async (userId, index) => {
          // Try to find the recipient in Supabase by user_id
          const recipient = await supabaseStorage.getRecipientByUserId(userId);
          
          if (recipient) {
            console.log(`✅ Found recipient in Supabase: ${userId} → ${recipient.name} (${recipient.id})`);
            return {
              id: recipient.id,           // Supabase UUID
              userId: recipient.user_id,  // The user_id like "principal-001"
              name: recipient.name,
            };
          } else {
            // Recipient not in Supabase - use provided name or generate ID
            console.warn(`⚠️ Recipient not found in Supabase: ${userId}`);
            return {
              id: userId,                              // Use as-is if no UUID found
              userId: userId,
              name: data.recipients?.[index] || userId,
            };
          }
        })
      );

      console.log('📋 Resolved recipient details:', recipientDetails);

      // Use provided tracking ID or generate new one
      const trackingId = data.trackingId || `DOC-${Date.now()}`;

      // Get submitter ID - prefer supabaseUuid if available, otherwise fall back to user.id
      // The SupabaseStorageService will look up the UUID if needed
      const submitterId = (user as any).supabaseUuid || user.id;
      console.log('📤 Submitting document with submitter_id:', submitterId, '(user.id:', user.id, ')');

      // Create document in Supabase
      const doc = await supabaseStorage.createDocument({
        tracking_id: trackingId,
        title: data.title,
        description: data.description,
        type: data.type || 'Document',
        priority: data.priority || 'normal',
        submitter_id: submitterId,
        submitter_name: user.name || user.email?.split('@')[0] || 'User',
        submitter_role: user.role,
        routing_type: data.routingType || 'sequential',
        is_emergency: data.isEmergency || false,
        is_parallel: data.isParallel || false,
        source: data.source || 'document-management',
        file_url: data.fileUrl,
        file_name: data.fileName,
        file_size: data.fileSize,
        metadata: data.metadata || {},
        workflow: data.workflow || {},
      }, recipientDetails);

      console.log('✅ Document created in Supabase:', doc.id);

      // For sequential routing, create ONE approval card with first recipient as current
      // For parallel routing, create approval cards for ALL recipients simultaneously
      const isSequential = (data.routingType || 'sequential') === 'sequential';
      
      if (isSequential && recipientDetails.length > 0) {
        // Sequential: One card, starts with first recipient
        const firstRecipient = recipientDetails[0];
        
        const card = await supabaseStorage.createApprovalCard({
          approval_id: `APPR-${Date.now()}`,
          document_id: doc.id,
          tracking_card_id: trackingId,
          title: data.title,
          description: data.description,
          type: data.type || 'Document',
          priority: data.priority || 'normal',
          submitter: user.name || user.email?.split('@')[0] || 'User',
          submitter_id: submitterId, // Use the resolved submitter ID
          current_recipient_id: firstRecipient.userId, // Start with first recipient
          routing_type: 'sequential',
          is_emergency: data.isEmergency || false,
          is_parallel: false,
          source: data.source || 'document-management',
          workflow: data.workflow || {},
        }, recipientDetails); // Pass ALL recipients for the chain

        console.log(`✅ Sequential approval card created for ${recipientDetails.length} recipients, current: ${firstRecipient.name}`);
      } else {
        // Parallel: Create separate card for each recipient (all can approve simultaneously)
        for (const recipient of recipientDetails) {
          await supabaseStorage.createApprovalCard({
            approval_id: `APPR-${Date.now()}-${recipient.userId}`,
            document_id: doc.id,
            tracking_card_id: trackingId,
            title: data.title,
            description: data.description,
            type: data.type || 'Document',
            priority: data.priority || 'normal',
            submitter: user.name || user.email?.split('@')[0] || 'User',
            submitter_id: submitterId, // Use the resolved submitter ID
            current_recipient_id: recipient.userId, // Each recipient gets the card
            routing_type: 'parallel',
            is_emergency: data.isEmergency || false,
            is_parallel: true,
            source: data.source || 'document-management',
            workflow: data.workflow || {},
          }, [recipient]);
        }
        console.log(`✅ Parallel approval cards created for ${recipientDetails.length} recipients`);
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('supabase-document-created', { detail: { document: doc } }));

      const result = toDocumentData(doc);
      result.trackingId = trackingId; // Ensure trackingId is returned
      return result;
    } catch (err) {
      console.error('❌ [Supabase] submitDocument failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create emergency document
  const createEmergencyDocument = useCallback(async (data: Partial<DocumentData>): Promise<DocumentData> => {
    return submitDocument({
      ...data,
      isEmergency: true,
      priority: 'urgent',
    });
  }, [submitDocument]);

  // Create approval chain document
  const createApprovalChainDocument = useCallback(async (data: Partial<DocumentData>): Promise<DocumentData> => {
    return submitDocument({
      ...data,
      routingType: 'sequential',
    });
  }, [submitDocument]);

  // Approve a document
  const approveDocument = useCallback(async (documentId: string, approvalComments?: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Find the approval card
      const card = approvalCards.find(c => c.approvalId === documentId || c.id === documentId || c.trackingCardId === documentId);
      if (!card) throw new Error('Approval card not found');

      // Get user's recipient record
      const recipient = await supabaseStorage.getRecipientByUserId(user.id);
      if (!recipient) throw new Error('User recipient record not found');

      // Create approval record
      await supabaseStorage.createApproval({
        approval_card_id: card.id,
        approver_id: recipient.id,
        approver_user_id: user.id,
        approver_name: user.name,
        action: 'approved',
        status: 'approved',
        comments: approvalComments,
      });

      // Find next recipient in the chain
      const currentIndex = card.recipientIds.indexOf(user.id);
      const nextRecipientId = card.recipientIds[currentIndex + 1];

      // Update approval card status
      if (nextRecipientId && card.routingType === 'sequential') {
        // Move to next recipient
        await supabaseStorage.updateApprovalCardStatus(card.approvalId, 'pending', nextRecipientId, approvalComments);
      } else {
        // All approved or parallel routing
        await supabaseStorage.updateApprovalCardStatus(card.approvalId, 'approved', undefined, approvalComments);
        
        // Update document status
        await supabaseStorage.updateDocumentStatus(card.trackingCardId, 'approved');
      }

      // Remove from local state
      setApprovalCards(prev => prev.filter(c => c.id !== card.id));

      // Dispatch event
      window.dispatchEvent(new CustomEvent('supabase-document-approved', { 
        detail: { documentId, approver: user.name } 
      }));

      toast({
        title: 'Document Approved',
        description: `You have approved ${card.title}`,
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, approvalCards, toast]);

  // Reject a document
  const rejectDocument = useCallback(async (documentId: string, reason: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Find the approval card
      const card = approvalCards.find(c => c.approvalId === documentId || c.id === documentId || c.trackingCardId === documentId);
      if (!card) throw new Error('Approval card not found');

      // Get user's recipient record
      const recipient = await supabaseStorage.getRecipientByUserId(user.id);
      if (!recipient) throw new Error('User recipient record not found');

      // Create rejection record
      await supabaseStorage.createApproval({
        approval_card_id: card.id,
        approver_id: recipient.id,
        approver_user_id: user.id,
        approver_name: user.name,
        action: 'rejected',
        status: 'rejected',
        comments: reason,
      });

      // Update approval card status
      await supabaseStorage.updateApprovalCardStatus(card.approvalId, 'rejected', undefined, reason);

      // Update document status
      await supabaseStorage.updateDocumentStatus(card.trackingCardId, 'rejected');

      // Remove from local state
      setApprovalCards(prev => prev.filter(c => c.id !== card.id));

      // Dispatch event
      window.dispatchEvent(new CustomEvent('supabase-document-rejected', { 
        detail: { documentId, rejector: user.name, reason } 
      }));

      toast({
        title: 'Document Rejected',
        description: `You have rejected ${card.title}`,
        variant: 'destructive',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, approvalCards, toast]);

  // Add comment to a document
  const addComment = useCallback(async (documentId: string, content: string, isPrivate: boolean = false): Promise<Comment> => {
    if (!user) throw new Error('User not authenticated');

    const recipient = await supabaseStorage.getRecipientByUserId(user.id);
    if (!recipient) throw new Error('User recipient record not found');

    // Find if this is a document or approval card
    const card = approvalCards.find(c => c.id === documentId || c.approvalId === documentId);
    
    const comment = await supabaseStorage.createComment({
      document_id: card?.documentId,
      approval_card_id: card?.id,
      author_id: recipient.id,
      author_user_id: user.id,
      author_name: user.name,
      content,
      is_private: isPrivate,
    });

    // Update local state
    setComments(prev => ({
      ...prev,
      [documentId]: [...(prev[documentId] || []), comment],
    }));

    return comment;
  }, [user, approvalCards]);

  // Refetch data
  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    trackDocuments,
    approvalCards,
    approvalHistory,
    comments,
    submitDocument,
    createEmergencyDocument,
    createApprovalChainDocument,
    approveDocument,
    rejectDocument,
    addComment,
    refetch,
    loading,
    error,
    isConnected,
  };
}

export default useSupabaseRealTimeDocuments;
