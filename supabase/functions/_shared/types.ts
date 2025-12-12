// Shared types for Supabase Edge Functions

export interface Document {
  id: string;
  tracking_id: string;
  title: string;
  description?: string;
  type: 'Letter' | 'Circular' | 'Report' | 'Other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'pending' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'partially-approved' | 'cancelled';
  submitter_id: string;
  submitter_name: string;
  submitter_role: string;
  submitted_date: string;
  routing_type: 'sequential' | 'parallel' | 'reverse' | 'bidirectional';
  is_emergency: boolean;
  is_parallel: boolean;
  source?: string;
  workflow?: any;
  metadata?: any;
}

export interface ApprovalCard {
  id: string;
  approval_id: string;
  tracking_card_id: string;
  document_id: string;
  title: string;
  status: string;
  current_recipient_id?: string;
  recipient_ids: string[];
  routing_type: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

