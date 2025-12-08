import { DashboardLayout } from "@/components/DashboardLayout";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseRealTimeDocuments } from "@/hooks/useSupabaseRealTimeDocuments";
import { ExternalNotificationDispatcher } from "@/services/ExternalNotificationDispatcher";
import { channelAutoCreationService } from "@/services/ChannelAutoCreationService";
import { getRecipientName } from "@/utils/recipientUtils";

const Documents = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Check Supabase connection and get submit function
  const { isConnected: supabaseConnected, submitDocument: submitToSupabase } = useSupabaseRealTimeDocuments();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out", 
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  if (!user) {
    return null; // This should be handled by ProtectedRoute, but adding as safety
  }

  const handleDocumentSubmit = async (data: any) => {
    console.log("Document submitted:", data);
    console.log("🔌 Supabase connected:", supabaseConnected);
    
    // Use auth context directly - NO localStorage
    const currentUserName = user?.name || user?.email?.split('@')[0] || 'User';
    const currentUserDept = user?.department || 'Department';
    const currentUserDesignation = user?.role || 'Employee';
    
    console.log('📝 [Document Submission] User Info:', {
      name: currentUserName,
      department: currentUserDept,
      designation: currentUserDesignation,
      role: user?.role
    });
    
    // Convert files to base64 for storage
    const convertFilesToBase64 = async (files: File[]) => {
      const filePromises = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              data: reader.result // base64 data URL
            });
          };
          reader.readAsDataURL(file);
        });
      });
      return Promise.all(filePromises);
    };
    
    // Serialize uploaded files
    const serializedFiles = data.files && data.files.length > 0 
      ? await convertFilesToBase64(data.files)
      : [];
    
    // Create workflow steps based on selected recipients
    const workflowSteps = [
      { name: 'Submission', status: 'completed', assignee: currentUserName, completedDate: new Date().toISOString().split('T')[0] }
    ];
    
    // Add recipient-based workflow steps in sequence
    data.recipients.forEach((recipientId: string, index: number) => {
      const recipientName = getRecipientName(recipientId);
      const stepName = recipientId.includes('hod') ? 'HOD Review' :
                      recipientId.includes('principal') ? 'Principal Approval' :
                      recipientId.includes('registrar') ? 'Registrar Review' :
                      recipientId.includes('dean') ? 'Dean Review' :
                      recipientId.includes('controller') ? 'Controller Review' :
                      'Department Review';
      
      workflowSteps.push({
        name: stepName,
        status: index === 0 ? 'current' : 'pending',
        assignee: recipientName,
        completedDate: ''
      });
    });

    // Generate common IDs
    const trackingId = `DOC-${Date.now()}`;
    const recipientNames = data.recipients.map((id: string) => getRecipientName(id));

    // ========================================
    // SUPABASE PATH: Use Supabase when connected
    // ========================================
    if (supabaseConnected) {
      console.log('🚀 Using Supabase for document submission');
      
      try {
        // Submit to Supabase - this creates both document and approval cards
        const supabaseDoc = await submitToSupabase({
          trackingId: trackingId,
          title: data.title,
          description: data.description,
          type: data.documentTypes[0]?.charAt(0).toUpperCase() + data.documentTypes[0]?.slice(1) || 'Document',
          priority: data.priority,
          recipients: recipientNames,
          recipientIds: data.recipients,
          routingType: 'sequential',
          isEmergency: false,
          isParallel: false,
          source: 'document-management',
          metadata: {
            assignments: data.assignments,
            files: serializedFiles,
            submittedByDepartment: currentUserDept,
            submittedByDesignation: currentUserDesignation
          },
          workflow: {
            currentStep: workflowSteps.length > 1 ? workflowSteps[1].name : 'Complete',
            progress: 0,
            steps: workflowSteps,
            recipients: data.recipients
          }
        });

        console.log('✅ [Supabase] Document created:', supabaseDoc.id);

        // Create event payloads for UI updates (NO localStorage writes)
        const trackingCard = {
          id: supabaseDoc.trackingId || trackingId,
          title: data.title,
          type: data.documentTypes[0]?.charAt(0).toUpperCase() + data.documentTypes[0]?.slice(1) || 'Document',
          submitter: currentUserName,
          submittedBy: currentUserName,
          submittedByDepartment: currentUserDept,
          submittedByDesignation: currentUserDesignation,
          submittedByRole: user?.role,
          submittedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          priority: data.priority === 'normal' ? 'Normal Priority' : 
                   data.priority === 'medium' ? 'Medium Priority' :
                   data.priority === 'high' ? 'High Priority' : 'Urgent Priority',
          workflow: {
            currentStep: workflowSteps.length > 1 ? workflowSteps[1].name : 'Complete',
            progress: 0,
            steps: workflowSteps,
            recipients: data.recipients
          },
          requiresSignature: true,
          signedBy: [],
          description: data.description,
          files: serializedFiles,
          assignments: data.assignments,
          comments: [],
          supabaseId: supabaseDoc.id // Link to Supabase record
        };

        const approvalCard = {
          id: trackingCard.id,
          title: data.title,
          type: trackingCard.type,
          submitter: currentUserName,
          submittedDate: trackingCard.submittedDate,
          status: 'pending',
          priority: data.priority,
          description: data.description,
          recipients: recipientNames,
          recipientIds: data.recipients,
          files: serializedFiles,
          trackingCardId: trackingCard.id,
          isCustomAssignment: false,
          supabaseId: supabaseDoc.id
        };

        // Dispatch events for real-time UI updates (Supabase handles persistence)
        window.dispatchEvent(new CustomEvent('document-approval-created', {
          detail: { document: trackingCard, approval: approvalCard }
        }));
        window.dispatchEvent(new CustomEvent('approval-card-created', {
          detail: { approval: approvalCard }
        }));
        window.dispatchEvent(new CustomEvent('document-submitted', {
          detail: { trackingCard, approvalCards: [approvalCard] }
        }));

        // Send notifications
        await sendNotifications(data.recipients, data.title, currentUserName, data.priority);

        // Auto-create channel
        createDocumentChannel(trackingCard.id, data.title, currentUserName, data.recipients, recipientNames);

        toast({
          title: "Document Submitted (Supabase)",
          description: `Your document has been submitted to ${data.recipients.length} recipient(s) via Supabase real-time sync.`,
        });

        return;
      } catch (error) {
        console.error('❌ Supabase submission failed:', error);
        toast({
          title: "Submission Failed",
          description: "Failed to submit document. Please check your connection and try again.",
          variant: "destructive"
        });
        return; // No localStorage fallback
      }
    }

    // ========================================
    // NO SUPABASE CONNECTION - Show error
    // ========================================
    console.error('❌ Cannot submit: Supabase not connected');
    toast({
      title: "Not Connected",
      description: "Unable to submit document. Supabase connection is required.",
      variant: "destructive"
    });
  };

  // Helper function to send notifications
  const sendNotifications = async (recipientIds: string[], title: string, submitter: string, priority: string) => {
    console.log('📬 Sending notifications to recipients...');
    
    for (const recipientId of recipientIds) {
      const recipientName = getRecipientName(recipientId);
      
      try {
        const result = await ExternalNotificationDispatcher.notifyRecipient(
          recipientId,
          recipientName,
          {
            type: 'approval',
            documentTitle: title,
            submitter: submitter,
            priority: priority,
            approvalCenterLink: `${window.location.origin}/approvals`,
            recipientName: recipientName
          }
        );
        
        if (result.success) {
          console.log(`✅ Notified ${recipientName} via: ${result.channels.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ Error notifying ${recipientName}:`, error);
      }
    }
  };

  // Helper function to create document channel
  const createDocumentChannel = (docId: string, title: string, submitterName: string, recipientIds: string[], recipientNames: string[]) => {
    try {
      const channel = channelAutoCreationService.createDocumentChannel({
        documentId: docId,
        documentTitle: title,
        submittedBy: user?.id || 'unknown',
        submittedByName: submitterName,
        recipients: recipientIds,
        recipientNames: recipientNames,
        source: 'Document Management',
        submittedAt: new Date()
      });
      
      console.log('✅ Channel auto-created:', channel.id);
    } catch (error) {
      console.error('❌ Failed to auto-create channel:', error);
    }
  };

  return (
    <DashboardLayout userRole={user.role} onLogout={handleLogout}>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Document Management</h1>
            <p className="text-muted-foreground">Submit Your Permission Reports, Letters, and Circulars</p>
          </div>
        </div>

        <div className="space-y-6">
          <DocumentUploader userRole={user.role} onSubmit={handleDocumentSubmit} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Documents;