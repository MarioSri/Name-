import React, { createContext, useContext, useState, useEffect } from 'react';

interface WorkflowStep {
  name: string;
  status: 'completed' | 'current' | 'pending';
  assignee: string;
  completedDate?: string;
  recipientId?: string;
}

interface DocumentWorkflow {
  id: string;
  title: string;
  currentStep: string;
  progress: number;
  steps: WorkflowStep[];
  recipients: string[];
  signedBy: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in-review';
}

interface DocumentWorkflowContextType {
  workflows: DocumentWorkflow[];
  updateWorkflow: (docId: string, updates: Partial<DocumentWorkflow>) => void;
  signDocument: (docId: string, signerName: string) => void;
  rejectDocument: (docId: string) => void;
  getNextRecipient: (docId: string) => string | null;
}

const DocumentWorkflowContext = createContext<DocumentWorkflowContextType | undefined>(undefined);

export const useDocumentWorkflow = () => {
  const context = useContext(DocumentWorkflowContext);
  if (!context) {
    throw new Error('useDocumentWorkflow must be used within a DocumentWorkflowProvider');
  }
  return context;
};

export const DocumentWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workflows, setWorkflows] = useState<DocumentWorkflow[]>([]);

  useEffect(() => {
    // Listen for workflow updates via custom events (data comes from Supabase via hooks)
    const handleWorkflowUpdated = (e: CustomEvent) => {
      if (e.detail?.documents) {
        const workflowData = e.detail.documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          currentStep: doc.workflow?.currentStep || 'Submission',
          progress: doc.workflow?.progress || 0,
          steps: doc.workflow?.steps || [],
          recipients: doc.workflow?.recipients || [],
          signedBy: doc.signedBy || [],
          status: doc.status || 'pending'
        }));
        setWorkflows(workflowData);
      }
    };

    window.addEventListener('submitted-documents-updated', handleWorkflowUpdated as EventListener);
    window.addEventListener('workflow-updated', handleWorkflowUpdated as EventListener);
    
    return () => {
      window.removeEventListener('submitted-documents-updated', handleWorkflowUpdated as EventListener);
      window.removeEventListener('workflow-updated', handleWorkflowUpdated as EventListener);
    };
  }, []);

  const updateWorkflow = (docId: string, updates: Partial<DocumentWorkflow>) => {
    setWorkflows(prev => prev.map(workflow => 
      workflow.id === docId ? { ...workflow, ...updates } : workflow
    ));

    // Broadcast update via events (Supabase handles persistence)
    window.dispatchEvent(new CustomEvent('workflow-update-requested', {
      detail: { docId, updates }
    }));
  };

  const signDocument = (docId: string, signerName: string) => {
    const workflow = workflows.find(w => w.id === docId);
    if (!workflow) return;

    const currentStepIndex = workflow.steps.findIndex(step => step.status === 'current');
    const isLastStep = currentStepIndex === workflow.steps.length - 1;

    const updatedSteps = workflow.steps.map((step, index) => {
      if (index === currentStepIndex) {
        return { ...step, status: 'completed' as const, completedDate: new Date().toISOString().split('T')[0] };
      } else if (index === currentStepIndex + 1) {
        return { ...step, status: 'current' as const };
      }
      return step;
    });

    const newSignedBy = [...workflow.signedBy, signerName];
    const newProgress = isLastStep ? 100 : Math.round(((currentStepIndex + 1) / workflow.steps.length) * 100);
    const newCurrentStep = isLastStep ? 'Complete' : updatedSteps[currentStepIndex + 1]?.name;
    const newStatus = isLastStep ? 'approved' : 'pending';

    updateWorkflow(docId, {
      steps: updatedSteps,
      signedBy: newSignedBy,
      progress: newProgress,
      currentStep: newCurrentStep,
      status: newStatus
    });
  };

  const rejectDocument = (docId: string) => {
    updateWorkflow(docId, {
      status: 'rejected',
      currentStep: 'Rejected',
      progress: 0
    });
  };

  const getNextRecipient = (docId: string): string | null => {
    const workflow = workflows.find(w => w.id === docId);
    if (!workflow) return null;

    const currentStepIndex = workflow.steps.findIndex(step => step.status === 'current');
    if (currentStepIndex === -1 || currentStepIndex === workflow.steps.length - 1) return null;

    return workflow.steps[currentStepIndex + 1]?.recipientId || null;
  };

  return (
    <DocumentWorkflowContext.Provider value={{
      workflows,
      updateWorkflow,
      signDocument,
      rejectDocument,
      getNextRecipient
    }}>
      {children}
    </DocumentWorkflowContext.Provider>
  );
};