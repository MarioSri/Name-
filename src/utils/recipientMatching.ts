/**
 * Utility functions for matching users with recipients in document workflows
 */

export interface User {
  id?: string;
  name?: string;
  role?: string;
  department?: string;
  branch?: string;
  designation?: string;
}

export interface RecipientMatchOptions {
  user: User;
  recipients?: string[];
  recipientIds?: string[];
  workflowSteps?: Array<{ assignee: string; status: string }>;
}

/**
 * Check if a user matches any recipient in the list
 */
export const isUserInRecipients = (options: RecipientMatchOptions): boolean => {
  const { user, recipients, recipientIds, workflowSteps } = options;
  
  if (!user) return false;
  
  const currentUserName = user.name?.toLowerCase() || '';
  const currentUserRole = user.role?.toLowerCase() || '';
  
  // If no recipients specified, show to everyone (backward compatibility)
  if ((!recipients || recipients.length === 0) && 
      (!recipientIds || recipientIds.length === 0) && 
      (!workflowSteps || workflowSteps.length === 0)) {
    return true;
  }
  
  // Check recipient IDs first (most reliable)
  if (recipientIds && recipientIds.length > 0) {
    // First check for exact user.id match (most reliable)
    if (user.id && recipientIds.some((recipientId: string) => recipientId === user.id)) {
      return true;
    }
    
    // Then check fuzzy matching for backward compatibility
    const matchesRecipientId = recipientIds.some((recipientId: string) => {
      const recipientLower = recipientId.toLowerCase();
      
      return (
        // Direct role matching
        recipientLower.includes(currentUserRole) ||
        // Name matching with various formats
        (currentUserName.length > 2 && recipientLower.includes(currentUserName.replace(/\s+/g, '-'))) ||
        (currentUserName.length > 2 && recipientLower.includes(currentUserName.replace(/\s+/g, ''))) ||
        // Department/Branch matching
        (user.department && recipientLower.includes(user.department.toLowerCase())) ||
        (user.branch && recipientLower.includes(user.branch.toLowerCase())) ||
        // Role variations
        (currentUserRole === 'principal' && recipientLower.includes('principal')) ||
        (currentUserRole === 'registrar' && recipientLower.includes('registrar')) ||
        (currentUserRole === 'dean' && recipientLower.includes('dean')) ||
        (currentUserRole === 'hod' && recipientLower.includes('hod')) ||
        (currentUserRole === 'program head' && recipientLower.includes('program')) ||
        (currentUserRole === 'program-head' && recipientLower.includes('program')) ||
        (currentUserRole === 'controller' && recipientLower.includes('controller')) ||
        (currentUserRole === 'cdc' && recipientLower.includes('cdc')) ||
        (currentUserRole === 'employee' && (recipientLower.includes('employee') || recipientLower.includes('staff') || recipientLower.includes('faculty'))) ||
        (currentUserRole === 'faculty' && recipientLower.includes('faculty'))
      );
    });
    
    if (matchesRecipientId) return true;
  }
  
  // Check workflow steps
  if (workflowSteps && workflowSteps.length > 0) {
    const matchesWorkflowStep = workflowSteps.some((step) => {
      const assigneeLower = step.assignee.toLowerCase();
      
      return (
        // Direct role matching
        assigneeLower.includes(currentUserRole) ||
        // Name matching (partial)
        (currentUserName.length > 2 && assigneeLower.includes(currentUserName)) ||
        // Name parts matching
        currentUserName.split(' ').some(namePart => 
          namePart.length > 2 && assigneeLower.includes(namePart)
        ) ||
        // Department/Branch matching
        (user.department && assigneeLower.includes(user.department.toLowerCase())) ||
        (user.branch && assigneeLower.includes(user.branch.toLowerCase())) ||
        (user.designation && assigneeLower.includes(user.designation.toLowerCase()))
      );
    });
    
    if (matchesWorkflowStep) return true;
  }
  
  // Check display names (legacy support)
  if (recipients && recipients.length > 0) {
    const matchesDisplayName = recipients.some((recipient: string) => {
      const recipientLower = recipient.toLowerCase();
      
      return (
        // Direct name match (partial)
        (currentUserName.length > 2 && recipientLower.includes(currentUserName)) ||
        // Role-based matching with known patterns
        (currentUserRole === 'principal' && (recipientLower.includes('principal') || recipientLower.includes('dr. robert'))) ||
        (currentUserRole === 'registrar' && (recipientLower.includes('registrar') || recipientLower.includes('prof. sarah'))) ||
        (currentUserRole === 'dean' && (recipientLower.includes('dean') || recipientLower.includes('dr. maria'))) ||
        (currentUserRole === 'hod' && (recipientLower.includes('hod') || recipientLower.includes('head of department'))) ||
        (currentUserRole === 'employee' && (recipientLower.includes('employee') || recipientLower.includes('staff') || recipientLower.includes('faculty') || recipientLower.includes('mr. john'))) ||
        // Generic role matching
        recipientLower.includes(currentUserRole) ||
        // Name parts matching
        currentUserName.split(' ').some(namePart => 
          namePart.length > 2 && recipientLower.includes(namePart)
        )
      );
    });
    
    if (matchesDisplayName) return true;
  }
  
  return false;
};

/**
 * Check if user is involved in a document workflow (submitter or recipient)
 */
export const isUserInvolvedInDocument = (options: RecipientMatchOptions & {
  submittedBy?: string;
  submittedByRole?: string;
  submittedByDesignation?: string;
}): boolean => {
  const { user, submittedBy, submittedByRole, submittedByDesignation } = options;
  
  if (!user) return false;
  
  // Check if user is the submitter
  const isSubmitter = (
    submittedBy === user.name ||
    submittedBy === user.role ||
    submittedByRole === user.role ||
    submittedByDesignation === user.role ||
    submittedByDesignation === user.designation
  );
  
  if (isSubmitter) return true;
  
  // Check if user is a recipient
  return isUserInRecipients(options);
};

/**
 * Find user's step in a workflow
 */
export const findUserStepInWorkflow = (
  user: User,
  workflowSteps: Array<{ assignee: string; status: string }>
): { stepIndex: number; step: any } | null => {
  if (!user || !workflowSteps) return null;
  
  const currentUserName = user.name?.toLowerCase() || '';
  const currentUserRole = user.role?.toLowerCase() || '';
  
  const stepIndex = workflowSteps.findIndex((step) => {
    const assigneeLower = step.assignee.toLowerCase();
    
    return (
      // Direct role matching
      assigneeLower.includes(currentUserRole) ||
      // Name matching (partial)
      (currentUserName.length > 2 && assigneeLower.includes(currentUserName)) ||
      // Name parts matching
      currentUserName.split(' ').some(namePart => 
        namePart.length > 2 && assigneeLower.includes(namePart)
      ) ||
      // Department/Branch matching
      (user.department && assigneeLower.includes(user.department.toLowerCase())) ||
      (user.branch && assigneeLower.includes(user.branch.toLowerCase())) ||
      (user.designation && assigneeLower.includes(user.designation.toLowerCase()))
    );
  });
  
  if (stepIndex !== -1) {
    return { stepIndex, step: workflowSteps[stepIndex] };
  }
  
  return null;
};