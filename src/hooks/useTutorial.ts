import { useState, useEffect } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your central hub for quick access to key metrics, recent activities, and important notifications.',
    route: '/dashboard',
    icon: 'LayoutDashboard'
  },
  {
    id: 'track-documents',
    title: 'Track Documents',
    description: 'Monitor the status and progress of all your documents in real-time.',
    route: '/track-documents',
    icon: 'Eye'
  },
  {
    id: 'approval-center',
    title: 'Approval Center',
    description: 'Review and approve pending documents that require your authorization.',
    route: '/approvals',
    icon: 'CheckSquare'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Schedule meetings, view appointments, and manage your time effectively.',
    route: '/calendar',
    icon: 'Calendar'
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Communicate with colleagues and stay updated on important conversations.',
    route: '/messages',
    icon: 'MessageSquare'
  },
  {
    id: 'document-management',
    title: 'Document Management',
    description: 'Upload, organize, and manage all your institutional documents.',
    route: '/documents',
    icon: 'FileText'
  },
  {
    id: 'emergency-management',
    title: 'Emergency Management',
    description: 'Handle urgent matters and emergency workflows when immediate action is required.',
    route: '/emergency',
    icon: 'AlertTriangle'
  },
  {
    id: 'approval-chain',
    title: 'Approval Chain with Bypass',
    description: 'Configure and manage approval workflows with bypass options for urgent cases.',
    route: '/approval-routing',
    icon: 'ArrowRightLeft'
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'View detailed reports and analytics about document processing and system usage.',
    route: '/analytics',
    icon: 'BarChart3'
  },
  {
    id: 'profile',
    title: 'Profile Settings',
    description: 'Manage your account settings, preferences, and personal information.',
    route: '/profile',
    icon: 'Settings'
  }
];

// In-memory tutorial state (replaces localStorage)
let tutorialCompletedState = false;
let isFirstLoginState = false;

// Set first login state (called from auth context)
export function setFirstLogin(isFirst: boolean) {
  isFirstLoginState = isFirst;
}

export function useTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if tutorial should be shown on mount
  useEffect(() => {
    if (!tutorialCompletedState && isFirstLoginState) {
      setIsActive(true);
      isFirstLoginState = false;
    } else {
      setIsCompleted(tutorialCompletedState);
    }
  }, []);

  const startTutorial = () => {
    setIsActive(true);
    setCurrentStep(0);
    setIsCompleted(false);
    tutorialCompletedState = false;
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const completeTutorial = () => {
    setIsActive(false);
    setIsCompleted(true);
    tutorialCompletedState = true;
  };

  const getCurrentStep = () => TUTORIAL_STEPS[currentStep];
  
  const isCurrentRoute = (route: string) => {
    return isActive && getCurrentStep()?.route === route;
  };

  const navigateToCurrentStep = (navigate: (path: string) => void) => {
    if (isActive && TUTORIAL_STEPS[currentStep]) {
      navigate(TUTORIAL_STEPS[currentStep].route);
    }
  };

  return {
    isActive,
    currentStep,
    totalSteps: TUTORIAL_STEPS.length,
    isCompleted,
    getCurrentStep,
    isCurrentRoute,
    navigateToCurrentStep,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    steps: TUTORIAL_STEPS
  };
}