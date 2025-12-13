/**
 * Zustand UI State Store
 * Manages all UI-related state (modals, filters, loading, selected recipients, temporary comments)
 * NO persistence - all in-memory only
 */

import { create } from 'zustand';

interface ModalState {
  showAssignmentModal: boolean;
  showWatermarkModal: boolean;
  showFileViewer: boolean;
  showWorkflowModal: boolean;
  showEmergencyModal: boolean;
  showApprovalModal: boolean;
  showCommentModal: boolean;
  [key: string]: boolean; // Allow dynamic modal states
}

interface FilterState {
  documentType: string[];
  priority: string[];
  status: string[];
  dateRange: { start: string | null; end: string | null };
  searchQuery: string;
}

interface UIStore {
  // Modal states
  modals: ModalState;
  setModal: (modalName: string, isOpen: boolean) => void;
  closeAllModals: () => void;

  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, isLoading: boolean) => void;

  // Selected recipients (temporary selection before submission)
  selectedRecipients: string[];
  setSelectedRecipients: (recipients: string[]) => void;
  addRecipient: (recipientId: string) => void;
  removeRecipient: (recipientId: string) => void;
  clearRecipients: () => void;

  // Temporary comments (draft comments before submission)
  temporaryComments: Record<string, string>;
  setTemporaryComment: (documentId: string, comment: string) => void;
  clearTemporaryComment: (documentId: string) => void;
  clearAllTemporaryComments: () => void;

  // Filters
  filters: FilterState;
  setFilter: (filterType: keyof FilterState, value: any) => void;
  resetFilters: () => void;

  // Viewing file state
  viewingFile: File | null;
  setViewingFile: (file: File | null) => void;

  // Pending submission data (before watermark/confirmation)
  pendingSubmissionData: any | null;
  setPendingSubmissionData: (data: any | null) => void;

  // Document assignments (temporary before submission)
  documentAssignments: Record<string, string[]>;
  setDocumentAssignments: (assignments: Record<string, string[]>) => void;
  clearDocumentAssignments: () => void;

  // Reset all UI state
  reset: () => void;
}

const initialModalState: ModalState = {
  showAssignmentModal: false,
  showWatermarkModal: false,
  showFileViewer: false,
  showWorkflowModal: false,
  showEmergencyModal: false,
  showApprovalModal: false,
  showCommentModal: false,
};

const initialFilterState: FilterState = {
  documentType: [],
  priority: [],
  status: [],
  dateRange: { start: null, end: null },
  searchQuery: '',
};

export const useUIStore = create<UIStore>((set) => ({
  // Modal states
  modals: initialModalState,
  setModal: (modalName, isOpen) =>
    set((state) => ({
      modals: { ...state.modals, [modalName]: isOpen },
    })),
  closeAllModals: () =>
    set({
      modals: initialModalState,
    }),

  // Loading states
  loading: {},
  setLoading: (key, isLoading) =>
    set((state) => ({
      loading: { ...state.loading, [key]: isLoading },
    })),

  // Selected recipients
  selectedRecipients: [],
  setSelectedRecipients: (recipients) =>
    set({ selectedRecipients: recipients }),
  addRecipient: (recipientId) =>
    set((state) => ({
      selectedRecipients: state.selectedRecipients.includes(recipientId)
        ? state.selectedRecipients
        : [...state.selectedRecipients, recipientId],
    })),
  removeRecipient: (recipientId) =>
    set((state) => ({
      selectedRecipients: state.selectedRecipients.filter((id) => id !== recipientId),
    })),
  clearRecipients: () => set({ selectedRecipients: [] }),

  // Temporary comments
  temporaryComments: {},
  setTemporaryComment: (documentId, comment) =>
    set((state) => ({
      temporaryComments: { ...state.temporaryComments, [documentId]: comment },
    })),
  clearTemporaryComment: (documentId) =>
    set((state) => {
      const { [documentId]: _, ...rest } = state.temporaryComments;
      return { temporaryComments: rest };
    }),
  clearAllTemporaryComments: () => set({ temporaryComments: {} }),

  // Filters
  filters: initialFilterState,
  setFilter: (filterType, value) =>
    set((state) => ({
      filters: { ...state.filters, [filterType]: value },
    })),
  resetFilters: () => set({ filters: initialFilterState }),

  // Viewing file
  viewingFile: null,
  setViewingFile: (file) => set({ viewingFile: file }),

  // Pending submission data
  pendingSubmissionData: null,
  setPendingSubmissionData: (data) => set({ pendingSubmissionData: data }),

  // Document assignments
  documentAssignments: {},
  setDocumentAssignments: (assignments) => set({ documentAssignments: assignments }),
  clearDocumentAssignments: () => set({ documentAssignments: {} }),

  // Reset all
  reset: () =>
    set({
      modals: initialModalState,
      loading: {},
      selectedRecipients: [],
      temporaryComments: {},
      filters: initialFilterState,
      viewingFile: null,
      pendingSubmissionData: null,
      documentAssignments: {},
    }),
}));

