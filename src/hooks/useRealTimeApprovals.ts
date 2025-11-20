/**
 * useRealTimeApprovals Hook
 * React hook for real-time approval card synchronization with Supabase
 * Replaces localStorage['pending-approvals'] with real-time database
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseDocumentService, type ApprovalCard } from '@/services/SupabaseDocumentService';
import { useAuth } from '@/contexts/AuthContext';

interface UseRealTimeApprovalsReturn {
    approvals: ApprovalCard[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateApprovalStatus: (approvalId: string, status: string) => Promise<void>;
    deleteApproval: (approvalId: string) => Promise<void>;
    deleteApprovalsByTrackingId: (trackingCardId: string) => Promise<void>;
}

/**
 * Hook to manage approval cards with real-time updates
 * @param recipientId - Optional recipient ID to filter approvals
 */
export function useRealTimeApprovals(recipientId?: string): UseRealTimeApprovalsReturn {
    const { user } = useAuth();
    const [approvals, setApprovals] = useState<ApprovalCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Determine which recipient ID to use
    const effectiveRecipientId = recipientId || user?.id;

    // Fetch approvals
    const fetchApprovals = useCallback(async () => {
        if (!effectiveRecipientId) {
            setApprovals([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let data: ApprovalCard[];

            // Fetch approvals for the specific recipient
            data = await supabaseDocumentService.getApprovalsByRecipient(effectiveRecipientId);

            setApprovals(data);
            console.log(`✅ Loaded ${data.length} approval cards for recipient:`, effectiveRecipientId);
        } catch (err) {
            console.error('❌ Error fetching approvals:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
        } finally {
            setLoading(false);
        }
    }, [effectiveRecipientId]);

    // Initial fetch
    useEffect(() => {
        fetchApprovals();
    }, [fetchApprovals]);

    // Subscribe to real-time changes
    useEffect(() => {
        if (!effectiveRecipientId) return;

        const channel = supabaseDocumentService.subscribeToApprovals((payload) => {
            console.log('📡 Real-time approval update:', payload);

            if (payload.eventType === 'INSERT') {
                const newApproval = payload.new as ApprovalCard;

                // Only add if it's for the current recipient
                if (newApproval.recipient_ids?.includes(effectiveRecipientId)) {
                    setApprovals((prev) => {
                        // Check if already exists to avoid duplicates
                        const exists = prev.some(a => a.approval_id === newApproval.approval_id);
                        if (exists) return prev;
                        return [newApproval, ...prev];
                    });
                }
            } else if (payload.eventType === 'UPDATE') {
                const updatedApproval = payload.new as ApprovalCard;

                // Update if it's for the current recipient
                if (updatedApproval.recipient_ids?.includes(effectiveRecipientId)) {
                    setApprovals((prev) =>
                        prev.map((approval) =>
                            approval.approval_id === updatedApproval.approval_id ? updatedApproval : approval
                        )
                    );
                }
            } else if (payload.eventType === 'DELETE') {
                const deletedApproval = payload.old as ApprovalCard;

                setApprovals((prev) =>
                    prev.filter((approval) => approval.approval_id !== deletedApproval.approval_id)
                );
            }
        });

        // Cleanup subscription on unmount
        return () => {
            if (channel) {
                supabaseDocumentService.unsubscribeAll();
            }
        };
    }, [effectiveRecipientId]);

    // Update approval status
    const updateApprovalStatus = useCallback(async (approvalId: string, status: string): Promise<void> => {
        try {
            await supabaseDocumentService.updateApprovalStatus(approvalId, status);
            // Update will be reflected via real-time subscription
            console.log('✅ Approval status updated:', approvalId, status);
        } catch (err) {
            console.error('❌ Error updating approval status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update approval status');
            throw err;
        }
    }, []);

    // Delete approval
    const deleteApproval = useCallback(async (approvalId: string): Promise<void> => {
        try {
            await supabaseDocumentService.deleteApprovalCard(approvalId);
            // Deletion will be reflected via real-time subscription
            console.log('✅ Approval deleted:', approvalId);
        } catch (err) {
            console.error('❌ Error deleting approval:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete approval');
            throw err;
        }
    }, []);

    // Delete approvals by tracking card ID
    const deleteApprovalsByTrackingId = useCallback(async (trackingCardId: string): Promise<void> => {
        try {
            await supabaseDocumentService.deleteApprovalsByTrackingId(trackingCardId);
            // Deletion will be reflected via real-time subscription
            console.log('✅ Approvals deleted for tracking card:', trackingCardId);
        } catch (err) {
            console.error('❌ Error deleting approvals:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete approvals');
            throw err;
        }
    }, []);

    return {
        approvals,
        loading,
        error,
        refetch: fetchApprovals,
        updateApprovalStatus,
        deleteApproval,
        deleteApprovalsByTrackingId
    };
}

export default useRealTimeApprovals;
