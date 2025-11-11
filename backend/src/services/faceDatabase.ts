import { supabase } from '../config/supabase';

export interface FaceRecord {
  user_id: string;
  ipfs_hash: string;
  created_at: string;
  updated_at: string;
}

export class FaceDatabase {
  async storeFaceMapping(userId: string, ipfsHash: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('face_database')
        .upsert({
          user_id: userId,
          ipfs_hash: ipfsHash,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log(`✅ Face mapping stored: ${userId} → ${ipfsHash}`);
    } catch (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to store face mapping: ${error}`);
    }
  }

  async getFaceHash(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('face_database')
        .select('ipfs_hash')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No record found
        throw error;
      }

      return data?.ipfs_hash || null;
    } catch (error) {
      console.error('❌ Database error:', error);
      return null;
    }
  }

  async getAllFaceMappings(): Promise<FaceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('face_database')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Database error:', error);
      return [];
    }
  }

  async deleteFaceMapping(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('face_database')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      console.log(`✅ Face mapping deleted: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Database error:', error);
      return false;
    }
  }
}

export const faceDatabase = new FaceDatabase();