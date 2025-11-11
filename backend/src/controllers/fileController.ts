import { Request, Response } from 'express';
import { GoogleDriveService } from '../services/googleDriveService';
import { ApiResponse } from '../types';

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided' 
      } as ApiResponse);
    }

    const result = await GoogleDriveService.uploadFile(
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      } as ApiResponse);
    }

    res.json({ 
      success: true, 
      data: result.data 
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'File upload failed' 
    } as ApiResponse);
  }
};