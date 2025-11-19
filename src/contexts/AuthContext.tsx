import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'principal' | 'registrar' | 'hod' | 'program-head' | 'employee';
  department?: string;
  branch?: string;
  avatar?: string;
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
  logout: () => void;
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
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!user;


  const login = async (role: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
        throw new Error(`No user found with role: ${role}`);
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
        permissions: getUserPermissions(role)
      };

      console.log('✅ [AuthContext] User authenticated:', {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        role: authenticatedUser.role
      });

      setUser(authenticatedUser);
      
      // Store in sessionStorage for persistence during browser session only
      sessionStorage.setItem('iaoms-user', JSON.stringify(authenticatedUser));
      
      // Check if this is the first login for tutorial
      const hasLoggedInBefore = localStorage.getItem('hasLoggedInBefore');
      if (!hasLoggedInBefore) {
        localStorage.setItem('isFirstLogin', 'true');
        localStorage.setItem('hasLoggedInBefore', 'true');
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoading(false); // Ensure loading state is reset
    sessionStorage.removeItem('iaoms-user');
    // Clear any cached data that might persist
    sessionStorage.clear();
    // Navigation will be handled by individual components
  };

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
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};