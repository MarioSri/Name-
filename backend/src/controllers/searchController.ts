import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';

export const searchAll = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    
    // Search documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, content, status, created_at')
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .limit(10);

    // Search users (for approvals/meetings)
    const { data: users } = await supabase
      .from('users')
      .select('id, email, role')
      .ilike('email', searchTerm)
      .limit(5);

    const results = [
      ...(documents || []).map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.content?.substring(0, 100) || '',
        type: 'document',
        section: 'Track Documents',
        path: `/track-documents#${doc.id}`,
        status: doc.status
      })),
      ...(users || []).map(user => ({
        id: user.id,
        title: user.email,
        description: `Role: ${user.role}`,
        type: 'user',
        section: 'Team Members',
        path: `/team#${user.id}`
      }))
    ];

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};