import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ApiResponse, Document } from '../types';

export const createDocument = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    const user = (req as any).user;

    const { data, error } = await supabase
      .from('documents')
      .insert([{ title, content, user_id: user.id, status: 'draft' }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create document' } as ApiResponse);
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch documents' } as ApiResponse);
  }
};