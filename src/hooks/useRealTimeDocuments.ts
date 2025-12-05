/**
 * React hook for real-time document management
 * NOW USING SUPABASE - NO MORE localStorage
 * Integrates Track Documents, Approval Center, Document Management, Emergency Management, and Approval Chain
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { realTimeDocumentService, DocumentData } from '@/services/RealTimeDocumentService';
import { supabaseDocumentService } from '@/services/SupabaseDocumentService';

export interface UseRealTimeDocumentsReturn {
  // Data
  trackDocuments: DocumentData[];
  approvalCards: DocumentData[];
  
  // Actions
  submitDocument: (data: Partial<DocumentData>) => Promise<DocumentData>;
  createEmergencyDocument: (data: Partial<DocumentData>) => Promise<DocumentData>;
  createApprovalChainDocument: (data: Partial<DocumentData>) => Promise<DocumentData>;
  approveDocument: (documentId: string, comments?: string) => Promise<void>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  updateRecipients: (documentId: string, recipients: string[], recipientIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Real-time status
  isConnected: boolean;
}

export const useRealTimeDocuments = (): UseRealTimeDocumentsReturn => {
  const { user } = useAuth();
  const [trackDocuments, setTrackDocuments] = useState<DocumentData[]>([]);
  const [approvalCards, setApprovalCards] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    if (!user) {
      setTrackDocuments([]);
      setApprovalCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load track documents from Supabase (documents submitted by current user)
      const docs = await realTimeDocumentService.getDocumentsBySubmitter(user.id);
      setTrackDocuments(docs);
      console.log(`✅ Loaded ${docs.length} tracking documents for:`, user.name);

      // Load approval cards from Supabase (approvals for current user)
      const approvals = await realTimeDocumentService.getApprovalCardsForRecipient(user.id);
      setApprovalCards(approvals);
      console.log(`✅ Loaded ${approvals.length} approval cards for:`, user.name);

      setIsConnected(true);
    } catch (err) {
      console.error('❌ Error loading documents from Supabase:', err);
      setError('Failed to load documents');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refetch data
  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Real-time event handlers
  useEffect(() => {
    const handleDocumentSubmitted = () => {
      console.log('📄 Document submitted - reloading');
      loadData();
    };

    const handleDocumentApproved = () => {
      console.log('✅ Document approved - reloading');
      loadData();
    };

    const handleDocumentRejected = () => {
      console.log('❌ Document rejected - reloading');
      loadData();
    };

    const handleEmergencyDocument = () => {
      console.log('🚨 Emergency document - reloading');
      loadData();
    };

    const handleApprovalChainCreated = () => {
      console.log('🔗 Approval chain created - reloading');
      loadData();
    };

    const handleRecipientsUpdated = () => {
      console.log('👥 Recipients updated - reloading');
      loadData();
    };

    const handleSupabaseChange = () => {
      console.log('📡 Supabase change detected - reloading');
      loadData();
    };

    // Register event listeners for window events
    window.addEventListener('document-submitted', handleDocumentSubmitted);
    window.addEventListener('document-approved', handleDocumentApproved);
    window.addEventListener('document-rejected', handleDocumentRejected);
    window.addEventListener('emergency-document-created', handleEmergencyDocument);
    window.addEventListener('approval-chain-created', handleApprovalChainCreated);
    window.addEventListener('recipients-updated', handleRecipientsUpdated);
    window.addEventListener('supabase-change', handleSupabaseChange);
    window.addEventListener('approval-change', handleSupabaseChange);

    // Real-time service events
    realTimeDocumentService.on('document-created', loadData);
    realTimeDocumentService.on('document-updated', loadData);
    realTimeDocumentService.on('approval-required', loadData);
    realTimeDocumentService.on('supabase-change', loadData);
    realTimeDocumentService.on('approval-change', loadData);

    // Subscribe to Supabase realtime
    const docSubscription = supabaseDocumentService.subscribeToDocuments(() => loadData());
    const approvalSubscription = supabaseDocumentService.subscribeToApprovals(() => loadData());

    return () => {
      window.removeEventListener('document-submitted', handleDocumentSubmitted);
      window.removeEventListener('document-approved', handleDocumentApproved);
      window.removeEventListener('document-rejected', handleDocumentRejected);
      window.removeEventListener('emergency-document-created', handleEmergencyDocument);
      window.removeEventListener('approval-chain-created', handleApprovalChainCreated);
      window.removeEventListener('recipients-updated', handleRecipientsUpdated);
      window.removeEventListener('supabase-change', handleSupabaseChange);
      window.removeEventListener('approval-change', handleSupabaseChange);
      
      // Cleanup Supabase subscriptions
      docSubscription.unsubscribe();
      approvalSubscription.unsubscribe();
    };
  }, [loadData, user]);

  // Load data on mount and user change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const submitDocument = useCallback(async (data: Partial<DocumentData>): Promise<DocumentData> => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const document = await realTimeDocumentService.submitDocument(data, user);
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createEmergencyDocument = useCallback(async (data: Partial<DocumentData>): Promise<DocumentData> => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const document = await realTimeDocumentService.createEmergencyDocument(data, user);
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create emergency document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createApprovalChainDocument = useCallback(async (data: Partial<DocumentData>): Promise<DocumentData> => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const document = await realTimeDocumentService.createApprovalChainDocument(data, user);
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create approval chain document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const approveDocument = useCallback(async (documentId: string, comments?: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      await realTimeDocumentService.approveDocument(documentId, user, comments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const rejectDocument = useCallback(async (documentId: string, reason: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      await realTimeDocumentService.rejectDocument(documentId, user, reason);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateRecipients = useCallback(async (documentId: string, recipients: string[], recipientIds: string[]): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await realTimeDocumentService.updateRecipients(documentId, recipients, recipientIds);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recipients';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Data
    trackDocuments,
    approvalCards,
    
    // Actions
    submitDocument,
    createEmergencyDocument,
    createApprovalChainDocument,
    approveDocument,
    rejectDocument,
    updateRecipients,
    refetch: loadData,
    
    // State
    loading,
    error,
    
    // Real-time status
    isConnected
  };
};