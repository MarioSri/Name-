import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';

export interface User {
  id: string;
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
  const [isLoading, setIsLoading] = useState(true);

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
          redirectTo: window.location.origin + '/dashboard',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      console.log('✅ Google OAuth initiated');
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
        id: recipient.user_id,
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
      // Get all recipients from Supabase and find one matching the role
      const recipients = await supabaseWorkflowService.getRecipients();
      
      // Map role to role_type in database
      const roleTypeMap: { [key: string]: string } = {
        'principal': 'Principal',
        'registrar': 'Registrar',
        'hod': 'HOD',
        'program-head': 'Program Head',
        'employee': 'EMPLOYEE'
      };
      
      const roleType = roleTypeMap[role] || 'EMPLOYEE';
      
      // Find a recipient matching the role
      const recipient = recipients.find(r => 
        r.role === roleType || 
        r.role_type === roleType ||
        (roleType === 'EMPLOYEE' && r.role_type === 'EMPLOYEE')
      );
      
      if (!recipient) {
        throw new Error(`No user found with role: ${role}. Please seed the database first.`);
      }
      
      // Create user object from Supabase data
      const authenticatedUser: User = {
        id: recipient.user_id,
        name: recipient.name,
        email: recipient.email,
        role: role as User['role'],
        department: recipient.department,
        branch: recipient.branch,
        avatar: recipient.avatar,
        google_id: recipient.google_id,
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
    try {
      // Sign out from Supabase auth if using Google OAuth
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase signout error:', error);
    }
    
    setUser(null);
    setIsLoading(false);
    sessionStorage.removeItem('iaoms-user');
    sessionStorage.clear();
  };

  // Listen for Supabase auth state changes (Google OAuth callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const googleUser = session.user;
        
        try {
          // Check if user exists in recipients table
          let recipient = await supabaseWorkflowService.getRecipientById(googleUser.email || '');
          
          if (!recipient) {
            // Create new recipient for this Google user (default to employee)
            console.log('📝 Creating new recipient for Google user:', googleUser.email);
            recipient = await supabaseWorkflowService.createRecipient({
              user_id: googleUser.id,
              google_id: googleUser.id,
              name: googleUser.user_metadata?.full_name || googleUser.email?.split('@')[0] || 'User',
              email: googleUser.email || '',
              role: 'EMPLOYEE',
              role_type: 'EMPLOYEE',
              avatar: googleUser.user_metadata?.avatar_url,
            });
          } else {
            // Update google_id if not set
            if (!recipient.google_id) {
              await supabaseWorkflowService.updateRecipient(recipient.email, {
                google_id: googleUser.id,
                avatar: recipient.avatar || googleUser.user_metadata?.avatar_url,
              });
            }
          }
          
          // Create authenticated user
          const roleKey = recipient.role_type?.toLowerCase().replace(' ', '-') || 'employee';
          const authenticatedUser: User = {
            id: recipient.user_id,
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
          console.log('✅ Google user authenticated:', authenticatedUser.name);
          
        } catch (error) {
          console.error('Failed to process Google login:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        sessionStorage.removeItem('iaoms-user');
      }
      
      setIsLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !sessionStorage.getItem('iaoms-user')) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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