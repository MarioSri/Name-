import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      } as ApiResponse);
    }

    res.status(201).json({ 
      success: true, 
      data: data.user,
      message: 'User created successfully' 
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ 
        success: false, 
        error: error.message 
      } as ApiResponse);
    }

    res.json({ 
      success: true, 
      data: { user: data.user, session: data.session } 
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
};