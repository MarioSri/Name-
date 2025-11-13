import { DashboardLayout } from "@/components/DashboardLayout";
import { DocumentUploader } from "@/components/DocumentUploader";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalNotificationDispatcher } from "@/services/ExternalNotificationDispatcher";
import { channelAutoCreationService } from "@/services/ChannelAutoCreationService";

const Documents = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
    
    // Convert files to base64 for localStorage storage
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
    
    // Map recipient IDs to names for workflow steps
    const getRecipientName = (recipientId: string) => {
      // Map of common recipient IDs to their display names
      const recipientMap: { [key: string]: string } = {
        // Leadership
        'principal-dr.-robert-principal': 'Dr. Robert Principal',
        'registrar-prof.-sarah-registrar': 'Prof. Sarah Registrar',
        'dean-dr.-maria-dean': 'Dr. Maria Dean',
        'chairman-mr.-david-chairman': 'Mr. David Chairman',
        'director-(for-information)-ms.-lisa-director': 'Ms. Lisa Director',
        'leadership-prof.-leadership-officer': 'Prof. Leadership Officer',
        
        // CDC Employees
        'cdc-head-dr.-cdc-head': 'Dr. CDC Head',
        'cdc-coordinator-prof.-cdc-coordinator': 'Prof. CDC Coordinator',
        'cdc-executive-ms.-cdc-executive': 'Ms. CDC Executive',
        
        // Administrative
        'controller-of-examinations-dr.-robert-controller': 'Dr. Robert Controller',
        'asst.-dean-iiic-prof.-asst-dean': 'Prof. Asst Dean',
        'head-operations-mr.-michael-operations': 'Mr. Michael Operations',
        'librarian-ms.-jennifer-librarian': 'Ms. Jennifer Librarian',
        'ssg-prof.-william-ssg': 'Prof. William SSG',
        
        // HODs
        'hod-dr.-eee-hod-eee': 'Dr. EEE HOD',
        'hod-dr.-mech-hod-mech': 'Dr. MECH HOD',
        'hod-dr.-cse-hod-cse': 'Dr. CSE HOD',
        'hod-dr.-ece-hod-ece': 'Dr. ECE HOD',
        'hod-dr.-csm-hod-csm': 'Dr. CSM HOD',
        'hod-dr.-cso-hod-cso': 'Dr. CSO HOD',
        'hod-dr.-csd-hod-csd': 'Dr. CSD HOD',
        'hod-dr.-csc-hod-csc': 'Dr. CSC HOD',
        
        // Program Department Heads
        'program-department-head-prof.-eee-head-eee': 'Prof. EEE Head',
        'program-department-head-prof.-mech-head-mech': 'Prof. MECH Head',
        'program-department-head-prof.-cse-head-cse': 'Prof. CSE Head',
        'program-department-head-prof.-ece-head-ece': 'Prof. ECE Head',
        'program-department-head-prof.-csm-head-csm': 'Prof. CSM Head',
        'program-department-head-prof.-cso-head-cso': 'Prof. CSO Head',
        'program-department-head-prof.-csd-head-csd': 'Prof. CSD Head',
        'program-department-head-prof.-csc-head-csc': 'Prof. CSC Head'
      };
      
      // If we have a mapping, use it
      if (recipientMap[recipientId]) {
        return recipientMap[recipientId];
      }
      
      // Otherwise, try to extract the name from the ID
      // IDs are typically formatted like: 'role-name-branch-year'
      // e.g., 'faculty-dr.-cse-faculty-cse-1st'
      const parts = recipientId.split('-');
      
      // Try to find name pattern (usually contains Dr., Prof., Mr., Ms., etc.)
      let name = '';
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].match(/^(dr\.|prof\.|mr\.|ms\.|dr|prof|mr|ms)$/i)) {
          // Found a title, collect the name parts
          const titleIndex = i;
          name = parts.slice(titleIndex).join(' ');
          // Clean up and capitalize
          name = name.replace(/-/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
          break;
        }
      }
      
      // If we couldn't extract a proper name, use the whole ID cleaned up
      if (!name) {
        name = recipientId.replace(/-/g, ' ')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
      }
      
      return name;
    };
    
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
    
    // Create tracking card data
    const trackingCard = {
      id: `DOC-${Date.now()}`,
      title: data.title,
      type: data.documentTypes[0]?.charAt(0).toUpperCase() + data.documentTypes[0]?.slice(1) || 'Document',
      submitter: currentUserName,  // ✅ Use 'submitter' field for consistency
      submittedBy: currentUserName,
      submittedByDepartment: currentUserDept,
      submittedByDesignation: currentUserDesignation,
      submittedByRole: user?.role, // Add role for matching
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
      files: serializedFiles, // Store base64 serialized files for preview
      assignments: data.assignments,
      comments: []
    };
    
    // Save to localStorage for tracking
    const existingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
    existingCards.unshift(trackingCard);
    localStorage.setItem('submitted-documents', JSON.stringify(existingCards));
    
    console.log('✅ [Document Submission] Tracking card created:', {
      id: trackingCard.id,
      title: trackingCard.title,
      submittedBy: trackingCard.submittedBy,
      submittedByDesignation: trackingCard.submittedByDesignation,
      submittedByRole: trackingCard.submittedByRole
    });
    
    // Create approval card(s) for Approval Center
    console.log('\n' + '='.repeat(80));
    console.log('📄 CREATING APPROVAL CARDS');
    console.log('='.repeat(80));
    console.log('📋 Selected recipient IDs:', data.recipients);
    console.log('📎 Document assignments:', data.assignments);
    console.log('👤 Current user:', currentUserName, '(', currentUserDesignation, ')');
    
    const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
    const approvalCards: any[] = [];
    
    // Check if custom assignments exist and are not empty
    const hasCustomAssignments = data.assignments && Object.keys(data.assignments).length > 0;
    
    if (hasCustomAssignments) {
      // ENFORCE CUSTOM ASSIGNMENTS: Create separate approval cards per file
      console.log('✨ Custom assignments detected - creating file-specific approval cards');
      
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
      
      // Create one approval card per unique recipient combination
      Object.entries(filesByRecipients).forEach(([recipientKey, files]) => {
        const assignedRecipientIds = recipientKey.split(',');
        const recipientNames = assignedRecipientIds.map((id: string) => getRecipientName(id));
        
        const approvalCard = {
          id: `${trackingCard.id}-${assignedRecipientIds.join('-')}`,
          title: files.length === serializedFiles.length ? data.title : `${data.title} (${files.map((f: any) => f.name).join(', ')})`,
          type: data.documentTypes[0]?.charAt(0).toUpperCase() + data.documentTypes[0]?.slice(1) || 'Document',
          submitter: currentUserName,
          submittedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          priority: data.priority,
          description: data.description,
          recipients: recipientNames,
          recipientIds: assignedRecipientIds,
          files: files, // Only assigned files
          trackingCardId: trackingCard.id, // Link to tracking card for sequential flow
          parentDocId: trackingCard.id,
          isCustomAssignment: true
        };
        
        approvalCards.push(approvalCard);
        existingApprovals.unshift(approvalCard);
        
        console.log(`✅ Approval card created for recipients: ${recipientNames.join(', ')}`);
        console.log(`   📎 Files: ${files.map((f: any) => f.name).join(', ')}`);
      });
    } else {
      // DEFAULT: All files go to all recipients (backward compatibility)
      console.log('📋 No custom assignments - creating single approval card for all recipients');
      
      const recipientNames = data.recipients.map((id: string) => {
        const name = getRecipientName(id);
        console.log(`🔄 Converting recipient ID: ${id} → ${name}`);
        return name;
      });
      
      console.log('\n✅ All recipient names:', recipientNames);
      
      const approvalCard = {
        id: trackingCard.id,
        title: data.title,
        type: data.documentTypes[0]?.charAt(0).toUpperCase() + data.documentTypes[0]?.slice(1) || 'Document',
        submitter: currentUserName,
        submittedDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        priority: data.priority,
        description: data.description,
        recipients: recipientNames,
        recipientIds: data.recipients,
        files: serializedFiles,
        trackingCardId: trackingCard.id, // Link to tracking card for sequential flow
        isCustomAssignment: false
      };
      
      approvalCards.push(approvalCard);
      existingApprovals.unshift(approvalCard);
      
      console.log('\n✅ APPROVAL CARD CREATED:');
      console.log('   ID:', approvalCard.id);
      console.log('   Title:', approvalCard.title);
      console.log('   Recipients (names):', approvalCard.recipients);
      console.log('   Recipient IDs:', approvalCard.recipientIds);
      console.log('   Total recipients:', approvalCard.recipients.length);
      console.log('   Files:', approvalCard.files?.length || 0);
    }
    
    // Save all approval cards to localStorage
    localStorage.setItem('pending-approvals', JSON.stringify(existingApprovals));
    
    console.log('\n💾 SAVED TO LOCALSTORAGE:');
    console.log(`   New cards created: ${approvalCards.length}`);
    console.log(`   Total cards in storage: ${existingApprovals.length}`);
    console.log('\n📋 All approval card IDs:', approvalCards.map(c => c.id));
    console.log('='.repeat(80));
    
    // Dispatch events for real-time updates
    console.log('📢 Dispatching document-approval-created event for tracking');
    window.dispatchEvent(new CustomEvent('document-approval-created', {
      detail: { document: trackingCard }
    }));
    
    // Dispatch event for each approval card created
    approvalCards.forEach((card) => {
      console.log('📢 Dispatching approval-card-created event for:', card.id);
      window.dispatchEvent(new CustomEvent('approval-card-created', {
        detail: { approval: card }
      }));
    });
    
    // Additional event for immediate UI updates
    window.dispatchEvent(new CustomEvent('document-submitted', {
      detail: { trackingCard, approvalCards }
    }));
    
    // Force storage event for cross-tab updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'submitted-documents',
      newValue: JSON.stringify(existingCards)
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'pending-approvals', 
      newValue: JSON.stringify(existingApprovals)
    }));
    
    console.log('\n✅ SUBMISSION COMPLETE:');
    console.log('   Tracking Card ID:', trackingCard.id);
    console.log('   Approval Cards Created:', approvalCards.length);
    console.log('   Approval Card IDs:', approvalCards.map(c => c.id));
    console.log('   Total Recipients:', data.recipients.length);
    console.log('   Events Dispatched: document-approval-created, approval-card-created, document-submitted');
    console.log('='.repeat(80) + '\n');
    
    // Send notifications to recipients based on their preferences
    console.log('📬 Sending notifications to recipients...');
    const allRecipientIds = [...new Set(approvalCards.flatMap(card => card.recipientIds))];
    const notificationResults: { [key: string]: { success: boolean; channels: string[] } } = {};
    
    for (const recipientId of allRecipientIds) {
      const recipientName = getRecipientName(recipientId);
      
      try {
        const result = await ExternalNotificationDispatcher.notifyRecipient(
          recipientId,
          recipientName,
          {
            type: 'approval',
            documentTitle: data.title,
            submitter: currentUserName,
            priority: data.priority,
            approvalCenterLink: `${window.location.origin}/approvals`,
            recipientName: recipientName
          }
        );
        
        notificationResults[recipientId] = result;
        
        if (result.success) {
          console.log(`✅ Notified ${recipientName} via: ${result.channels.join(', ')}`);
        } else {
          console.log(`⚠️ No notifications sent to ${recipientName} (preferences disabled or not found)`);
        }
      } catch (error) {
        console.error(`❌ Error notifying ${recipientName}:`, error);
        notificationResults[recipientId] = { success: false, channels: [] };
      }
    }
    
    const totalNotified = Object.values(notificationResults).filter(r => r.success).length;
    console.log(`📬 Notification Summary: ${totalNotified} of ${allRecipientIds.length} recipients notified`);
    
    // 🆕 AUTO-CREATE CHANNEL using ChannelAutoCreationService
    console.log('📢 Auto-creating channel for Document Management submission...');
    
    try {
      const recipientNames = data.recipients.map((id: string) => getRecipientName(id));
      
      const channel = channelAutoCreationService.createDocumentChannel({
        documentId: trackingCard.id,
        documentTitle: data.title,
        submittedBy: user?.id || 'unknown',
        submittedByName: currentUserName,
        recipients: data.recipients,
        recipientNames: recipientNames,
        source: 'Document Management',
        submittedAt: new Date()
      });
      
      console.log('✅ Channel auto-created:', {
        channelId: channel.id,
        channelName: channel.name,
        members: channel.members.length,
        documentId: channel.documentId
      });
    } catch (error) {
      console.error('❌ Failed to auto-create channel:', error);
    }
    
    toast({
      title: "Document Submitted",
      description: `Your document has been submitted to ${data.recipients.length} recipient(s) and is now being tracked. A collaboration channel has been created in Department Chat.`,
    });
  };

  return (
    <DashboardLayout userRole={user.role} onLogout={handleLogout}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Document Management</h1>
          <p className="text-muted-foreground">Submit Your Permission Reports, Letters, and Circulars</p>
        </div>

        <div className="space-y-6">
          <DocumentUploader userRole={user.role} onSubmit={handleDocumentSubmit} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Documents;