import express from 'express';
import { supabase } from '../config/supabase';
import { pinataStorage } from '../services/pinataService';
import { faceDatabase } from '../services/faceDatabase';
import axios from 'axios';

const router = express.Router();

// Face verification endpoint with IPFS
router.post('/verify', async (req, res) => {
  try {
    const { userId, capturedImage } = req.body;

    if (!userId || !capturedImage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get IPFS hash for user
    const ipfsHash = await faceDatabase.getFaceHash(userId);
    if (!ipfsHash) {
      return res.status(404).json({ error: 'No face data found for user' });
    }

    // Call DeepFace IPFS server for verification
    const deepfaceResponse = await axios.post('http://localhost:5000/verify', {
      img1_path: capturedImage,
      user_id: userId,
      model_name: 'VGG-Face',
      detector_backend: 'opencv'
    });

    const { verified, distance, threshold } = deepfaceResponse.data;

    // Log verification attempt
    await supabase.from('face_auth_logs').insert({
      user_id: userId,
      matched: verified,
      distance: distance,
      threshold: threshold,
      ipfs_hash: ipfsHash,
      timestamp: new Date().toISOString()
    });

    res.json({
      verified,
      distance,
      threshold,
      ipfsHash,
      message: verified ? 'Face verified successfully' : 'Face verification failed'
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Face verification failed' });
  }
});

// Face registration endpoint with IPFS
router.post('/register', async (req, res) => {
  try {
    const { userId, imageData } = req.body;

    if (!userId || !imageData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Upload to Pinata IPFS
    const ipfsHash = await pinataStorage.uploadFaceImage(userId, imageBuffer);

    // Store mapping in database
    await faceDatabase.storeFaceMapping(userId, ipfsHash);

    res.json({
      success: true,
      message: `Face registered for user ${userId}`,
      ipfsHash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    });
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ error: 'Face registration failed' });
  }
});

// List all registered faces
router.get('/list', async (req, res) => {
  try {
    const faces = await faceDatabase.getAllFaceMappings();
    res.json({
      success: true,
      faces
    });
  } catch (error) {
    console.error('List faces error:', error);
    res.status(500).json({ error: 'Failed to list faces' });
  }
});

// Delete face data
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get IPFS hash
    const ipfsHash = await faceDatabase.getFaceHash(userId);
    
    if (ipfsHash) {
      // Delete from Pinata
      await pinataStorage.deleteFaceImage(ipfsHash);
    }
    
    // Delete from database
    await faceDatabase.deleteFaceMapping(userId);
    
    res.json({
      success: true,
      message: `Face data deleted for user ${userId}`
    });
  } catch (error) {
    console.error('Delete face error:', error);
    res.status(500).json({ error: 'Failed to delete face data' });
  }
});

export default router;
