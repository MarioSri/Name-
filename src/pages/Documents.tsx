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
    
    // Load user profile from Personal Information
    const userProfile = JSON.parse(localStorage.getItem('user-profile') || '{}');
    const currentUserName = userProfile.name || user?.name || user?.email?.split('@')[0] || 'User';
    const currentUserDept = userProfile.department || user?.department || 'Department';
    const currentUserDesignation = userProfile.designation || user?.role || 'Employee';
    
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

        // Also save to localStorage for backward compatibility with other components
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

        // Save to localStorage for Track Documents page compatibility
        const existingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
        existingCards.unshift(trackingCard);
        localStorage.setItem('submitted-documents', JSON.stringify(existingCards));

        // Create approval card for localStorage (for backward compatibility)
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

        const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
        existingApprovals.unshift(approvalCard);
        localStorage.setItem('pending-approvals', JSON.stringify(existingApprovals));

        // Dispatch events for real-time UI updates
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
        console.error('❌ Supabase submission failed, falling back to localStorage:', error);
        toast({
          title: "Supabase Error",
          description: "Falling back to local storage. Your document will still be tracked.",
          variant: "destructive"
        });
        // Fall through to localStorage path
      }
    }

    // ========================================
    // LOCALSTORAGE PATH: Fallback when Supabase not connected
    // ========================================
    console.log('📦 Using localStorage for document submission');
    
    // Create tracking card data
    const trackingCard = {
      id: trackingId,
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
      comments: []
    };
    
    // Save to localStorage for tracking
    const existingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
    existingCards.unshift(trackingCard);
    localStorage.setItem('submitted-documents', JSON.stringify(existingCards));
    
    console.log('✅ [localStorage] Tracking card created:', trackingCard.id);
    
    // Create approval cards
    const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
    const approvalCards: any[] = [];
    
    const hasCustomAssignments = data.assignments && Object.keys(data.assignments).length > 0;
    
    if (hasCustomAssignments) {
      // Group files by their assigned recipients
      const filesByRecipients: { [key: string]: any[] } = {};
      
      serializedFiles.forEach((file: any) => {
        const assignedRecipients = data.assignments[file.name] || data.recipients;
        const recipientKey = assignedRecipients.sort().join(',');
        
        if (!filesByRecipients[recipientKey]) {
          filesByRecipients[recipientKey] = [];
        }
        filesByRecipients[recipientKey].push(file);
      });
      
      Object.entries(filesByRecipients).forEach(([recipientKey, files]) => {
        const assignedRecipientIds = recipientKey.split(',');
        const assignedRecipientNames = assignedRecipientIds.map((id: string) => getRecipientName(id));
        
        const approvalCard = {
          id: `${trackingCard.id}-${assignedRecipientIds.join('-')}`,
          title: files.length === serializedFiles.length ? data.title : `${data.title} (${files.map((f: any) => f.name).join(', ')})`,
          type: trackingCard.type,
          submitter: currentUserName,
          submittedDate: trackingCard.submittedDate,
          status: 'pending',
          priority: data.priority,
          description: data.description,
          recipients: assignedRecipientNames,
          recipientIds: assignedRecipientIds,
          files: files,
          trackingCardId: trackingCard.id,
          parentDocId: trackingCard.id,
          isCustomAssignment: true
        };
        
        approvalCards.push(approvalCard);
        existingApprovals.unshift(approvalCard);
      });
    } else {
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
        isCustomAssignment: false
      };
      
      approvalCards.push(approvalCard);
      existingApprovals.unshift(approvalCard);
    }
    
    // Save approval cards
    localStorage.setItem('pending-approvals', JSON.stringify(existingApprovals));
    
    // Dispatch events
    window.dispatchEvent(new CustomEvent('document-approval-created', {
      detail: { document: trackingCard }
    }));
    
    approvalCards.forEach((card) => {
      window.dispatchEvent(new CustomEvent('approval-card-created', {
        detail: { approval: card }
      }));
    });
    
    window.dispatchEvent(new CustomEvent('document-submitted', {
      detail: { trackingCard, approvalCards }
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'submitted-documents',
      newValue: JSON.stringify(existingCards)
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'pending-approvals', 
      newValue: JSON.stringify(existingApprovals)
    }));
    
    // Send notifications
    await sendNotifications(data.recipients, data.title, currentUserName, data.priority);
    
    // Auto-create channel
    createDocumentChannel(trackingCard.id, data.title, currentUserName, data.recipients, recipientNames);
    
    toast({
      title: "Document Submitted",
      description: `Your document has been submitted to ${data.recipients.length} recipient(s) and is now being tracked.`,
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