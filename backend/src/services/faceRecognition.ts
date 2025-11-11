/**
 * Face Recognition Service
 * Integrates with InsightFace/FaceNet for face embedding generation
 * Uses ONNX Runtime for inference
 */

import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

export class FaceRecognitionService {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;

  constructor(modelPath: string = './models/facenet.onnx') {
    this.modelPath = modelPath;
  }

  async initialize() {
    try {
      this.session = await ort.InferenceSession.create(this.modelPath);
      console.log('✅ Face recognition model loaded');
    } catch (error) {
      console.error('❌ Failed to load face recognition model:', error);
      throw error;
    }
  }

  async generateEmbedding(imageBase64: string): Promise<number[]> {
    if (!this.session) {
      await this.initialize();
    }

    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Preprocess image
      const preprocessed = await this.preprocessImage(imageBuffer);

      // Run inference
      const feeds = { input: new ort.Tensor('float32', preprocessed, [1, 3, 112, 112]) };
      const results = await this.session!.run(feeds);
      
      // Extract embedding
      const embedding = Array.from(results.output.data as Float32Array);
      
      // Normalize embedding
      return this.normalizeEmbedding(embedding);
    } catch (error) {
      console.error('Face embedding generation failed:', error);
      throw error;
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Float32Array> {
    // Resize to 112x112 and normalize
    const { data, info } = await sharp(imageBuffer)
      .resize(112, 112, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Float32Array(3 * 112 * 112);
    
    // Convert RGB to normalized tensor format
    for (let i = 0; i < 112 * 112; i++) {
      pixels[i] = (data[i * 3] - 127.5) / 128.0; // R
      pixels[112 * 112 + i] = (data[i * 3 + 1] - 127.5) / 128.0; // G
      pixels[2 * 112 * 112 + i] = (data[i * 3 + 2] - 127.5) / 128.0; // B
    }

    return pixels;
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  async detectLiveness(frames: string[]): Promise<boolean> {
    // Simple liveness check based on frame differences
    if (frames.length < 2) return false;

    try {
      const embeddings = await Promise.all(
        frames.map(frame => this.generateEmbedding(frame))
      );

      // Check if embeddings are similar (same person) but frames are different
      for (let i = 1; i < embeddings.length; i++) {
        const similarity = this.cosineSimilarity(embeddings[0], embeddings[i]);
        if (similarity < 0.8) return false; // Different person detected
      }

      return true;
    } catch (error) {
      console.error('Liveness detection failed:', error);
      return false;
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
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
}

export const faceRecognitionService = new FaceRecognitionService();
