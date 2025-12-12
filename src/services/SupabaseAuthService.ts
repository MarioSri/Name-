/**
 * Supabase Authentication Service
 * Handles Google OAuth, Email/Password, and session management
 */

import { supabase } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

class SupabaseAuthService {
  /**
   * Sign in with email and password
   */
  async signInWithPassword(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { user: null, session: null, error };
      }

      console.log('✅ Signed in successfully:', data.user?.email);
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError,
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
            ...credentials.metadata,
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        return { user: null, session: null, error };
      }

      console.log('✅ Signed up successfully:', data.user?.email);
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError,
      };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(redirectTo?: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        return { error };
      }

      console.log('✅ Google OAuth initiated');
      return { error: null };
    } catch (error) {
      console.error('❌ Google OAuth exception:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        return { error };
      }

      console.log('✅ Signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Get session error:', error);
        return null;
      }

      return data.session;
    } catch (error) {
      console.error('❌ Get session exception:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error('❌ Get user error:', error);
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('❌ Get user exception:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, redirectTo?: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('❌ Reset password error:', error);
        return { error };
      }

      console.log('✅ Password reset email sent');
      return { error: null };
    } catch (error) {
      console.error('❌ Reset password exception:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('❌ Update password error:', error);
        return { error };
      }

      console.log('✅ Password updated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Update password exception:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(metadata: Record<string, any>): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: metadata,
      });

      if (error) {
        console.error('❌ Update metadata error:', error);
        return { error };
      }

      console.log('✅ User metadata updated');
      return { error: null };
    } catch (error) {
      console.error('❌ Update metadata exception:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(
    callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      callback(event as any, session);
    });
  }
}

export const supabaseAuthService = new SupabaseAuthService();
export default supabaseAuthService;

