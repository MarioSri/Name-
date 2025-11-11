// Audit logger for recording actions to Rekor + Supabase
import { supabase } from './supabase';
import { submitToRekor } from './rekor';

interface ActionData {
  documentId: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  actionType: 'approve' | 'reject';
  signatureData?: any;
}

export async function recordAction(actionData: ActionData): Promise<{ success: boolean; rekorUUID: string }> {
  const timestamp = new Date().toISOString();
  
  const payload = {
    ...actionData,
    timestamp
  };

  // Submit to Sigstore Rekor
  const { uuid, logIndex } = await submitToRekor(payload);

  // Store in Supabase
  const { error } = await supabase.from('document_action_logs').insert({
    document_id: actionData.documentId,
    recipient_id: actionData.recipientId,
    recipient_name: actionData.recipientName,
    recipient_role: actionData.recipientRole,
    action_type: actionData.actionType,
    timestamp,
    rekor_uuid: uuid,
    rekor_log_index: logIndex,
    signature_data: actionData.signatureData || null,
    verification_url: `https://search.sigstore.dev/?logIndex=${logIndex}`
  });

  if (error) {
    throw new Error(`Failed to store audit log: ${error.message}`);
  }

  return { success: true, rekorUUID: uuid };
}
