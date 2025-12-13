/**
 * Zustand Document State Store
 * Manages in-memory document and approval state
 * Supabase handles persistence - this is only for runtime UI state
 */

import { create } from 'zustand';

export interface DocumentCard {
  id: string;
  trackingId: string;
  title: string;
  type: string;
  submitter: string;
  submittedDate: string;
  status: string;
  priority: string;
  workflow?: any;
  description?: string;
  files?: any[];
  assignments?: Record<string, string[]>;
  comments?: any[];
  supabaseId?: string;
  [key: string]: any;
}

export interface ApprovalCard {
  id: string;
  title: string;
  type: string;
  submitter: string;
  submittedDate: string;
  status: string;
  priority: string;
  description?: string;
  recipients: string[];
  recipientIds: string[];
  files?: any[];
  trackingCardId: string;
  supabaseId?: string;
  [key: string]: any;
}

interface DocumentStore {
  // Document tracking cards (in-memory cache)
  trackingCards: DocumentCard[];
  setTrackingCards: (cards: DocumentCard[]) => void;
  addTrackingCard: (card: DocumentCard) => void;
  updateTrackingCard: (id: string, updates: Partial<DocumentCard>) => void;
  removeTrackingCard: (id: string) => void;

  // Approval cards (in-memory cache)
  approvalCards: ApprovalCard[];
  setApprovalCards: (cards: ApprovalCard[]) => void;
  addApprovalCard: (card: ApprovalCard) => void;
  updateApprovalCard: (id: string, updates: Partial<ApprovalCard>) => void;
  removeApprovalCard: (id: string) => void;

  // Comments cache (in-memory)
  comments: Record<string, any[]>;
  setComments: (documentId: string, comments: any[]) => void;
  addComment: (documentId: string, comment: any) => void;
  removeComment: (documentId: string, commentId: string) => void;

  // Approval history cache (in-memory)
  approvalHistory: Record<string, any[]>;
  setApprovalHistory: (documentId: string, history: any[]) => void;
  addApprovalHistory: (documentId: string, historyItem: any) => void;

  // Reset all document state
  reset: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  // Tracking cards
  trackingCards: [],
  setTrackingCards: (cards) => set({ trackingCards: cards }),
  addTrackingCard: (card) =>
    set((state) => ({
      trackingCards: [card, ...state.trackingCards],
    })),
  updateTrackingCard: (id, updates) =>
    set((state) => ({
      trackingCards: state.trackingCards.map((card) =>
        card.id === id ? { ...card, ...updates } : card
      ),
    })),
  removeTrackingCard: (id) =>
    set((state) => ({
      trackingCards: state.trackingCards.filter((card) => card.id !== id),
    })),

  // Approval cards
  approvalCards: [],
  setApprovalCards: (cards) => set({ approvalCards: cards }),
  addApprovalCard: (card) =>
    set((state) => ({
      approvalCards: [card, ...state.approvalCards],
    })),
  updateApprovalCard: (id, updates) =>
    set((state) => ({
      approvalCards: state.approvalCards.map((card) =>
        card.id === id ? { ...card, ...updates } : card
      ),
    })),
  removeApprovalCard: (id) =>
    set((state) => ({
      approvalCards: state.approvalCards.filter((card) => card.id !== id),
    })),

  // Comments
  comments: {},
  setComments: (documentId, comments) =>
    set((state) => ({
      comments: { ...state.comments, [documentId]: comments },
    })),
  addComment: (documentId, comment) =>
    set((state) => ({
      comments: {
        ...state.comments,
        [documentId]: [...(state.comments[documentId] || []), comment],
      },
    })),
  removeComment: (documentId, commentId) =>
    set((state) => ({
      comments: {
        ...state.comments,
        [documentId]: (state.comments[documentId] || []).filter(
          (c) => c.id !== commentId
        ),
      },
    })),

  // Approval history
  approvalHistory: {},
  setApprovalHistory: (documentId, history) =>
    set((state) => ({
      approvalHistory: { ...state.approvalHistory, [documentId]: history },
    })),
  addApprovalHistory: (documentId, historyItem) =>
    set((state) => ({
      approvalHistory: {
        ...state.approvalHistory,
        [documentId]: [...(state.approvalHistory[documentId] || []), historyItem],
      },
    })),

  // Reset all
  reset: () =>
    set({
      trackingCards: [],
      approvalCards: [],
      comments: {},
      approvalHistory: {},
    }),
}));

