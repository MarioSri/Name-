import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';
import { toast } from 'sonner';

export interface User {
  id: string;          // user_id from recipients table (e.g., "principal-001")
  supabaseUuid?: string; // UUID from recipients.id column (for foreign keys)
  name: string;
  email: string;
  role: 'principal' | 'registrar' | 'hod' | 'program-head' | 'employee';
  department?: string;
  branch?: string;
  avatar?: string;
  google_id?: string;
  permissions: {
    canApprove: boolean;
    canViewAllDepartments: boolean;
    canManageWorkflows: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string) => Promise<void>;
  logout: () => void;
  syncUserWithSupabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const getUserPermissions = (role: string) => {
  const permissions = {
    principal: {
      canApprove: true,
      canViewAllDepartments: true,
      canManageWorkflows: true,
      canViewAnalytics: true,
      canManageUsers: true,
    },
    registrar: {
      canApprove: true,
      canViewAllDepartments: true,
      canManageWorkflows: true,
      canViewAnalytics: true,
      canManageUsers: false,
    },
    hod: {
      canApprove: true,
      canViewAllDepartments: false,
      canManageWorkflows: true,
      canViewAnalytics: true,
      canManageUsers: false,
    },
    'program-head': {
      canApprove: true,
      canViewAllDepartments: false,
      canManageWorkflows: true,
      canViewAnalytics: true,
      canManageUsers: false,
    },
    employee: {
      canApprove: true,
      canViewAllDepartments: false,
      canManageWorkflows: true,
      canViewAnalytics: true,
      canManageUsers: false,
    },
  };

  return permissions[role as keyof typeof permissions] || permissions.employee;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Track if user was loaded from sessionStorage
  const [initialUserLoaded, setInitialUserLoaded] = useState(false);
  
  // Initialize user from sessionStorage immediately to avoid loading state
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('iaoms-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Update permissions to ensure they match current configuration
        const updatedUser = {
          ...parsedUser,
          permissions: getUserPermissions(parsedUser.role)
        };
        // Save updated user back to sessionStorage
        sessionStorage.setItem('iaoms-user', JSON.stringify(updatedUser));
        return updatedUser;
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        sessionStorage.removeItem('iaoms-user');
        return null;
      }
    }
    return null;
  });
  
  // Check if this is an OAuth callback (has hash or code in URL)
  const isOAuthCallback = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('access_token') || search.includes('code=');
  };
  
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!user;

  // Sync user data with Supabase recipient
  const syncUserWithSupabase = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const recipient = await supabaseWorkflowService.getRecipientById(user.email);
      if (recipient) {
        const updatedUser: User = {
          id: recipient.user_id,
          name: recipient.name,
          email: recipient.email,
          role: (recipient.role_type?.toLowerCase().replace(' ', '-') || 'employee') as User['role'],
          department: recipient.department,
          branch: recipient.branch,
          avatar: recipient.avatar || user.avatar,
          google_id: recipient.google_id,
          permissions: getUserPermissions(recipient.role_type?.toLowerCase().replace(' ', '-') || 'employee')
        };
        setUser(updatedUser);
        sessionStorage.setItem('iaoms-user', JSON.stringify(updatedUser));
        console.log('✅ User synced with Supabase:', updatedUser.name);
      }
    } catch (error) {
      console.error('Failed to sync user with Supabase:', error);
    }
  };

  // Login with Google OAuth
  const loginWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      console.log('✅ Google OAuth initiated');
      // Note: User will be redirected, so we don't set loading to false here
    } catch (error) {
      console.error('Google login failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  // Login with email (finds existing recipient in Supabase)
  const loginWithEmail = async (email: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Find recipient by email in Supabase
      const recipient = await supabaseWorkflowService.getRecipientById(email);
      
      if (!recipient) {
        throw new Error(`No institutional user found with email: ${email}. Please contact admin.`);
      }
      
      // Create user object from Supabase recipient data
      const roleKey = recipient.role_type?.toLowerCase().replace(' ', '-') || 'employee';
      const authenticatedUser: User = {
        id: recipient.user_id,          // user_id like "principal-001"
        supabaseUuid: recipient.id,     // UUID for foreign key references
        name: recipient.name,
        email: recipient.email,
        role: roleKey as User['role'],
        department: recipient.department,
        branch: recipient.branch,
        avatar: recipient.avatar,
        google_id: recipient.google_id,
        permissions: getUserPermissions(roleKey)
      };

      console.log('✅ [AuthContext] User authenticated via email:', {
        id: authenticatedUser.id,
        supabaseUuid: authenticatedUser.supabaseUuid,
        name: authenticatedUser.name,
        role: authenticatedUser.role
      });

      setUser(authenticatedUser);
      sessionStorage.setItem('iaoms-user', JSON.stringify(authenticatedUser));
      
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with role (demo/development mode)
  const login = async (role: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Fallback demo users - always available
      const fallbackUsers: { [key: string]: Partial<User> } = {
        'principal': {
          id: 'principal-001',
          name: 'Dr. Principal (Demo)',
          email: 'principal@demo.edu',
          department: 'Administration',
          branch: 'Main Campus',
        },
        'registrar': {
          id: 'registrar-001',
          name: 'Prof. Registrar (Demo)',
          email: 'registrar@demo.edu',
          department: 'Administration',
          branch: 'Main Campus',
        },
        'hod': {
          id: 'hod-cse-001',
          name: 'Dr. HOD CSE (Demo)',
          email: 'hod.cse@demo.edu',
          department: 'Computer Science',
          branch: 'Main Campus',
        },
        'program-head': {
          id: 'program-head-cse-001',
          name: 'Prof. Program Head (Demo)',
          email: 'ph.cse@demo.edu',
          department: 'Computer Science',
          branch: 'Main Campus',
        },
        'employee': {
          id: 'faculty-cse-001',
          name: 'Mr. Faculty (Demo)',
          email: 'faculty.cse@demo.edu',
          department: 'Computer Science',
          branch: 'Main Campus',
        },
      };
      
      const fallback = fallbackUsers[role] || fallbackUsers['employee'];
      
      const authenticatedUser: User = {
        id: fallback.id!,
        name: fallback.name!,
        email: fallback.email!,
        role: role as User['role'],
        department: fallback.department,
        branch: fallback.branch,
        permissions: getUserPermissions(role)
      };

      console.log('✅ [AuthContext] User authenticated:', {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        role: authenticatedUser.role
      });

      setUser(authenticatedUser);
      sessionStorage.setItem('iaoms-user', JSON.stringify(authenticatedUser));
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 [AuthContext] Logging out...');
    
    // Clear state first
    setUser(null);
    setIsLoading(false);
    
    // Clear all session storage
    sessionStorage.removeItem('iaoms-user');
    sessionStorage.clear();
    
    // Also clear any localStorage auth data
    localStorage.removeItem('iaoms-user');
    localStorage.removeItem('iaoms-redirect-path');
    
    try {
      // Sign out from Supabase auth if using Google OAuth
      await supabase.auth.signOut();
      console.log('✅ [AuthContext] Supabase signout successful');
    } catch (error) {
      console.error('⚠️ [AuthContext] Supabase signout error:', error);
      // Continue anyway - local state is already cleared
    }
    
    console.log('✅ [AuthContext] Logout complete');
  };

  // Listen for Supabase auth state changes (Google OAuth callback)
  useEffect(() => {
    setIsLoading(false);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const googleUser = session.user;
        
        // Get the pending role selected before OAuth redirect
        const pendingRole = sessionStorage.getItem('pending-role') || 'employee';
        sessionStorage.removeItem('pending-role');
        
        try {
          // Check if user exists in recipients table by email
          let recipient = await supabaseWorkflowService.getRecipientById(googleUser.email || '');
          
          if (!recipient) {
            // User not in system - deny access (no signup)
            console.error('❌ User not found in institutional database:', googleUser.email);
            await supabase.auth.signOut();
            setUser(null);
            sessionStorage.removeItem('iaoms-user');
            toast.error('Access Denied', {
              description: `${googleUser.email} is not registered in the institutional system. Please contact the administrator.`,
              duration: 8000,
            });
            setIsLoading(false);
            return;
          }
          
          // Update google_id if not set (first time Google login for existing user)
          if (!recipient.google_id) {
            try {
              await supabaseWorkflowService.updateRecipient(recipient.email, {
                google_id: googleUser.id,
                avatar: recipient.avatar || googleUser.user_metadata?.avatar_url,
              });
              console.log('✅ Updated recipient with Google ID');
            } catch (updateError) {
              // Don't fail login if update fails - just log it
              console.warn('⚠️ Could not update recipient google_id (RLS policy may need update):', updateError);
            }
          }
          
          // Use role from recipient (ignore pending role - use institutional role)
          const roleKey = recipient.role_type?.toLowerCase().replace(' ', '-') || 'employee';
          const authenticatedUser: User = {
            id: recipient.user_id,
            supabaseUuid: recipient.id,   // UUID for foreign key references
            name: recipient.name,
            email: recipient.email,
            role: roleKey as User['role'],
            department: recipient.department,
            branch: recipient.branch,
            avatar: recipient.avatar || googleUser.user_metadata?.avatar_url,
            google_id: googleUser.id,
            permissions: getUserPermissions(roleKey)
          };
          
          setUser(authenticatedUser);
          sessionStorage.setItem('iaoms-user', JSON.stringify(authenticatedUser));
          console.log('✅ Google user authenticated:', authenticatedUser.name, 'Role:', authenticatedUser.role);
          
          // Show success toast
          toast.success('Login Successful!', {
            description: `Welcome, ${authenticatedUser.name}!`,
          });
          
        } catch (error: any) {
          console.error('Failed to process Google login:', error);
          // Sign out on error and show toast
          await supabase.auth.signOut();
          setUser(null);
          sessionStorage.removeItem('iaoms-user');
          toast.error('Login Failed', {
            description: error?.message || 'Failed to authenticate. Please try again.',
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        sessionStorage.removeItem('iaoms-user');
      }
      
      setIsLoading(false);
      
      // Clear OAuth hash from URL after processing
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Clean up any old localStorage sessions on mount
  useEffect(() => {
    localStorage.removeItem('iaoms-user');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      loginWithGoogle,
      loginWithEmail,
      logout,
      syncUserWithSupabase
    }}>
      {children}
    </AuthContext.Provider>
  );
};