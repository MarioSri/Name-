import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// Face verification endpoint
router.post('/verify', async (req, res) => {
  try {
    const { userId, capturedImage } = req.body;

    if (!userId || !capturedImage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch stored face embedding from Supabase
    const { data: userData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('face_embedding')
      .eq('id', userId)
      .single();

    if (fetchError || !userData?.face_embedding) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Convert captured image to embedding (using face recognition service)
    const capturedEmbedding = await generateFaceEmbedding(capturedImage);

    // Compare embeddings
    const similarity = cosineSimilarity(userData.face_embedding, capturedEmbedding);
    const threshold = 0.6; // Adjust based on accuracy requirements

    const matched = similarity >= threshold;

    // Log verification attempt
    await supabase.from('face_auth_logs').insert({
      user_id: userId,
      matched,
      similarity_score: similarity,
      timestamp: new Date().toISOString()
    });

    res.json({
      matched,
      similarity,
      message: matched ? 'Face verified successfully' : 'Face verification failed'
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Face verification failed' });
  }
});

// Generate face embedding from image (placeholder - integrate with InsightFace/FaceNet)
async function generateFaceEmbedding(imageBase64: string): Promise<number[]> {
  // TODO: Integrate with face recognition model (InsightFace/FaceNet)
  // For now, return mock embedding
  return Array(128).fill(0).map(() => Math.random());
}

// Calculate cosine similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default router;
