/**
 * React hook for real-time document management
 * NOW USING SUPABASE - NO MORE localStorage
 * Integrates Track Documents, Approval Center, Document Management, Emergency Management, and Approval Chain
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Refs for debouncing and preventing concurrent loads
  const loadDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const hasInitialLoadRef = useRef(false);

  // Load data from Supabase ONLY - NO localStorage
  const loadData = useCallback(async () => {
    if (!user) {
      // Only clear if we haven't loaded yet
      if (!hasInitialLoadRef.current) {
        setTrackDocuments([]);
        setApprovalCards([]);
      }
      setLoading(false);
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('⏳ Load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setError(null);

      // Get user's Supabase UUID for proper filtering
      const supabaseUuid = (user as any).supabaseUuid || user.id;

      // Load track documents from Supabase (documents submitted by current user)
      const docs = await realTimeDocumentService.getDocumentsBySubmitter(supabaseUuid);
      
      // Load approval cards from Supabase (approvals for current user)
      const approvals = await realTimeDocumentService.getApprovalCardsForRecipient(supabaseUuid);
      
      // Update state - SUPABASE DATA ONLY
      setTrackDocuments(docs);
      setApprovalCards(approvals);
      
      console.log(`✅ [RealTime] Loaded ${docs.length} documents, ${approvals.length} approval cards for:`, user.name);

      setIsConnected(true);
      hasInitialLoadRef.current = true;
    } catch (err) {
      console.error('❌ Error loading documents from Supabase:', err);
      setError('Failed to load documents');
      setIsConnected(false);
      
      // On error, only clear if no initial load yet
      if (!hasInitialLoadRef.current) {
        setTrackDocuments([]);
        setApprovalCards([]);
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id]); // Only depend on user.id, not the full user object

  // Debounced load function to prevent rapid re-fetches causing flickering
  const debouncedLoadData = useCallback(() => {
    if (loadDataTimeoutRef.current) {
      clearTimeout(loadDataTimeoutRef.current);
    }
    loadDataTimeoutRef.current = setTimeout(() => {
      loadData();
    }, 500); // 500ms debounce for stability
  }, [loadData]);

  // Store refs to avoid stale closures in event handlers
  const loadDataRef = useRef(loadData);
  const debouncedLoadDataRef = useRef(debouncedLoadData);
  
  useEffect(() => {
    loadDataRef.current = loadData;
    debouncedLoadDataRef.current = debouncedLoadData;
  }, [loadData, debouncedLoadData]);

  // Refetch data
  const refetch = useCallback(async () => {
    await loadDataRef.current();
  }, []);

  // Combined effect for initial load and subscriptions - only depends on user.id
  useEffect(() => {
    if (!user?.id) return;

    // Load initial data
    loadDataRef.current();

    const handleDocumentSubmitted = () => {
      console.log('📄 Document submitted - reloading');
      debouncedLoadDataRef.current();
    };

    const handleDocumentApproved = () => {
      console.log('✅ Document approved - reloading');
      debouncedLoadDataRef.current();
    };

    const handleDocumentRejected = () => {
      console.log('❌ Document rejected - reloading');
      debouncedLoadDataRef.current();
    };

    const handleEmergencyDocument = () => {
      console.log('🚨 Emergency document - reloading');
      debouncedLoadDataRef.current();
    };

    const handleApprovalChainCreated = () => {
      console.log('🔗 Approval chain created - reloading');
      debouncedLoadDataRef.current();
    };

    const handleRecipientsUpdated = () => {
      console.log('👥 Recipients updated - reloading');
      debouncedLoadDataRef.current();
    };

    const handleSupabaseChange = () => {
      console.log('📡 Supabase change detected - reloading');
      debouncedLoadDataRef.current();
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
    const handleServiceChange = () => debouncedLoadDataRef.current();
    realTimeDocumentService.on('document-created', handleServiceChange);
    realTimeDocumentService.on('document-updated', handleServiceChange);
    realTimeDocumentService.on('approval-required', handleServiceChange);
    realTimeDocumentService.on('supabase-change', handleServiceChange);
    realTimeDocumentService.on('approval-change', handleServiceChange);

    // Subscribe to Supabase realtime
    const docSubscription = supabaseDocumentService.subscribeToDocuments(() => debouncedLoadDataRef.current());
    const approvalSubscription = supabaseDocumentService.subscribeToApprovals(() => debouncedLoadDataRef.current());

    return () => {
      // Clear debounce timeout
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
      }
      
      window.removeEventListener('document-submitted', handleDocumentSubmitted);
      window.removeEventListener('document-approved', handleDocumentApproved);
      window.removeEventListener('document-rejected', handleDocumentRejected);
      window.removeEventListener('emergency-document-created', handleEmergencyDocument);
      window.removeEventListener('approval-chain-created', handleApprovalChainCreated);
      window.removeEventListener('recipients-updated', handleRecipientsUpdated);
      window.removeEventListener('supabase-change', handleSupabaseChange);
      window.removeEventListener('approval-change', handleSupabaseChange);
      
      // Cleanup service events
      realTimeDocumentService.off('document-created', handleServiceChange);
      realTimeDocumentService.off('document-updated', handleServiceChange);
      realTimeDocumentService.off('approval-required', handleServiceChange);
      realTimeDocumentService.off('supabase-change', handleServiceChange);
      realTimeDocumentService.off('approval-change', handleServiceChange);
      
      // Cleanup Supabase subscriptions
      docSubscription.unsubscribe();
      approvalSubscription.unsubscribe();
    };
  }, [user?.id]);

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