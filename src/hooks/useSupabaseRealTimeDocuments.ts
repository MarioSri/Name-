/**
 * React hook for real-time document management using Supabase Realtime
 * Integrates Track Documents, Approval Center, Document Management, Emergency Management, and Approval Chain
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  documentsRealtimeService, 
  Document, 
  ApprovalCard 
} from '@/services/DocumentsRealtimeService';
import { RealtimeSubscription } from '@/services/SupabaseRealtimeService';

export interface UseSupabaseRealTimeDocumentsReturn {
  // Data
  trackDocuments: Document[];
  approvalCards: ApprovalCard[];
  
  // Actions
  submitDocument: (data: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => Promise<Document>;
  approveDocument: (cardId: string, comments?: string) => Promise<void>;
  rejectDocument: (cardId: string, reason: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Real-time status
  isConnected: boolean;
}

export const useSupabaseRealTimeDocuments = (): UseSupabaseRealTimeDocumentsReturn => {
  const { user } = useAuth();
  const [trackDocuments, setTrackDocuments] = useState<Document[]>([]);
  const [approvalCards, setApprovalCards] = useState<ApprovalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<RealtimeSubscription[]>([]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch track documents (documents submitted by current user)
      const docs = await documentsRealtimeService.fetchDocuments(user.id, 'sender');
      setTrackDocuments(docs);

      // Fetch approval cards (cards assigned to current user)
      const cards = await documentsRealtimeService.fetchApprovalCards(user.id);
      setApprovalCards(cards);

      setIsConnected(true);
    } catch (err) {
      console.error('[useSupabaseRealTimeDocuments] Error loading documents:', err);
      setError('Failed to load documents');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const subs: RealtimeSubscription[] = [];

    // Subscribe to documents submitted by current user
    const docSub = documentsRealtimeService.subscribeToDocumentsByRole(
      user.id,
      'sender',
      {
        onInsert: (doc) => {
          console.log('[useSupabaseRealTimeDocuments] Document inserted:', doc);
          setTrackDocuments(prev => [doc, ...prev]);
        },
        onUpdate: (doc) => {
          console.log('[useSupabaseRealTimeDocuments] Document updated:', doc);
          setTrackDocuments(prev => 
            prev.map(d => d.id === doc.id ? doc : d)
          );
        },
        onDelete: (doc) => {
          console.log('[useSupabaseRealTimeDocuments] Document deleted:', doc);
          setTrackDocuments(prev => 
            prev.filter(d => d.id !== doc.id)
          );
        }
      }
    );
    subs.push(docSub);

    // Subscribe to approval cards assigned to current user
    const cardSub = documentsRealtimeService.subscribeToApprovalCards(
      user.id,
      {
        onInsert: (card) => {
          console.log('[useSupabaseRealTimeDocuments] Approval card inserted:', card);
          setApprovalCards(prev => [card, ...prev]);
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Approval Required', {
              body: `You have a new document awaiting approval`,
              icon: '/logo.png'
            });
          }
        },
        onUpdate: (card) => {
          console.log('[useSupabaseRealTimeDocuments] Approval card updated:', card);
          setApprovalCards(prev => 
            prev.map(c => c.id === card.id ? card : c)
          );
        },
        onDelete: (card) => {
          console.log('[useSupabaseRealTimeDocuments] Approval card deleted:', card);
          setApprovalCards(prev => 
            prev.filter(c => c.id !== card.id)
          );
        }
      }
    );
    subs.push(cardSub);

    setSubscriptions(subs);
    setIsConnected(true);

    // Load initial data
    loadData();

    // Cleanup subscriptions on unmount
    return () => {
      subs.forEach(sub => sub.unsubscribe());
      setIsConnected(false);
    };
  }, [user?.id, loadData]);

  // Submit a new document
  const submitDocument = useCallback(async (
    data: Omit<Document, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Document> => {
    try {
      setLoading(true);
      setError(null);

      const document = await documentsRealtimeService.createDocument(data);
      
      // Create approval cards for each recipient
      if (data.recipients && data.recipients.length > 0) {
        await Promise.all(
          data.recipients.map(recipientId =>
            documentsRealtimeService.updateApprovalCard(document.id, {
              document_id: document.id,
              sender_id: data.sender_id,
              recipient_id: recipientId,
              status: 'pending'
            } as any)
          )
        );
      }

      return document;
    } catch (err) {
      console.error('[useSupabaseRealTimeDocuments] Error submitting document:', err);
      setError('Failed to submit document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve a document
  const approveDocument = useCallback(async (
    cardId: string,
    comments?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await documentsRealtimeService.updateApprovalCard(cardId, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        metadata: comments ? { comments } : undefined
      });

      // Update the related document status if all approvals are complete
      // (This logic depends on your business rules)
      
    } catch (err) {
      console.error('[useSupabaseRealTimeDocuments] Error approving document:', err);
      setError('Failed to approve document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reject a document
  const rejectDocument = useCallback(async (
    cardId: string,
    reason: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await documentsRealtimeService.updateApprovalCard(cardId, {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_reason: reason
      });

      // Update the related document status
      const card = approvalCards.find(c => c.id === cardId);
      if (card?.document_id) {
        await documentsRealtimeService.updateDocument(card.document_id, {
          status: 'rejected'
        });
      }
      
    } catch (err) {
      console.error('[useSupabaseRealTimeDocuments] Error rejecting document:', err);
      setError('Failed to reject document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [approvalCards]);

  // Update a document
  const updateDocument = useCallback(async (
    id: string,
    updates: Partial<Document>
  ): Promise<Document> => {
    try {
      setLoading(true);
      setError(null);

      return await documentsRealtimeService.updateDocument(id, updates);
    } catch (err) {
      console.error('[useSupabaseRealTimeDocuments] Error updating document:', err);
      setError('Failed to update document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a document
  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await documentsRealtimeService.deleteDocument(id);
    } catch (err) {
      console.error('[useSupabaseRealTimeDocuments] Error deleting document:', err);
      setError('Failed to delete document');
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
    approveDocument,
    rejectDocument,
    updateDocument,
    deleteDocument,
    
    // State
    loading,
    error,
    
    // Real-time status
    isConnected
  };
};
