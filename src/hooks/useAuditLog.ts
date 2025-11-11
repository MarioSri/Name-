// Hook for recording actions to Sigstore Rekor + Supabase
import { recordAction } from '@/lib/auditLogger';

export const useAuditLog = () => {
  const logAction = async (
    documentId: string,
    recipientId: string,
    recipientName: string,
    recipientRole: string,
    actionType: 'approve' | 'reject',
    signatureData?: any
  ) => {
    try {
      const result = await recordAction({
        documentId,
        recipientId,
        recipientName,
        recipientRole,
        actionType,
        signatureData
      });
      
      console.log(`✅ Action logged to Rekor: ${result.rekorUUID}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to log action:', error);
      throw error;
    }
  };

  return { logAction };
};
