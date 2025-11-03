import { DashboardLayout } from "@/components/DashboardLayout";
import { DocumentUploader } from "@/components/DocumentUploader";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
    const currentUserName = userProfile.name || user?.name || 'User';
    const currentUserDept = userProfile.department || user?.department || 'Department';
    const currentUserDesignation = userProfile.designation || user?.role || 'Employee';
    
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
      submittedBy: currentUserName,
      submittedByDepartment: currentUserDept,
      submittedByDesignation: currentUserDesignation,
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
    
    // Create approval card for Approval Center
    console.log('📄 Creating Document Management Approval Card');
    console.log('  📋 Selected recipient IDs:', data.recipients);
    
    // Convert recipient IDs to names for display, but keep original IDs for matching
    const recipientNames = data.recipients.map((id: string) => {
      const name = getRecipientName(id);
      console.log(`  🔄 Converting: ${id} → ${name}`);
      return name;
    });
    
    const approvalCard = {
      id: trackingCard.id,
      title: data.title,
      type: data.documentTypes[0]?.charAt(0).toUpperCase() + data.documentTypes[0]?.slice(1) || 'Document',
      submitter: currentUserName,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      priority: data.priority,
      description: data.description,
      recipients: recipientNames, // Display names for UI
      recipientIds: data.recipients, // Original IDs for matching
      files: serializedFiles
    };

    console.log('✅ Approval card created:', {
      id: approvalCard.id,
      title: approvalCard.title,
      recipients: approvalCard.recipients,
      recipientIds: approvalCard.recipientIds,
      recipientCount: approvalCard.recipients.length
    });
    
    // Save to localStorage for approvals
    const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
    existingApprovals.unshift(approvalCard);
    localStorage.setItem('pending-approvals', JSON.stringify(existingApprovals));
    
    console.log('✅ Approval card saved to localStorage. Total cards:', existingApprovals.length);
    
    // Dispatch events for real-time updates
    console.log('📢 Dispatching document-approval-created event for tracking');
    window.dispatchEvent(new CustomEvent('document-approval-created', {
      detail: { document: trackingCard }
    }));
    
    console.log('📢 Dispatching approval-card-created event for approvals');
    window.dispatchEvent(new CustomEvent('approval-card-created', {
      detail: { approval: approvalCard }
    }));
    
    // Additional event for immediate UI updates
    window.dispatchEvent(new CustomEvent('document-submitted', {
      detail: { trackingCard, approvalCard }
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
    
    console.log('✅ Document Management submission complete:', {
      trackingCardId: trackingCard.id,
      approvalCardId: approvalCard.id,
      recipientCount: data.recipients.length,
      eventsDispatched: ['document-approval-created', 'approval-card-created', 'document-submitted']
    });
    
    // Create channel for document collaboration
    const channelName = `${data.title.substring(0, 30)}${data.title.length > 30 ? '...' : ''}`;
    const newChannel = {
      id: `doc-${trackingCard.id}`,
      name: channelName,
      members: [user?.id, ...data.recipients],
      isPrivate: true,
      createdAt: new Date().toISOString(),
      createdBy: user?.id,
      documentId: trackingCard.id,
      documentTitle: data.title
    };
    
    // Save channel to localStorage
    const existingChannels = JSON.parse(localStorage.getItem('document-channels') || '[]');
    existingChannels.unshift(newChannel);
    localStorage.setItem('document-channels', JSON.stringify(existingChannels));
    
    toast({
      title: "Document Submitted",
      description: `Your document has been submitted to ${data.recipients.length} recipient(s) and is now being tracked. A collaboration channel has been created.`,
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