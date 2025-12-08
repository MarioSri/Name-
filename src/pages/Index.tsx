import { useEffect, useState } from "react";
import { AuthenticationCard } from "@/components/AuthenticationCard";
import { HITAMTreeLoading } from "@/components/ui/loading-animation";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Index = () => {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(0);

  // Generate new loading key whenever isLoading changes to true
  useEffect(() => {
    if (isLoading) {
      setLoadingKey(Date.now());
    }
  }, [isLoading]);

  const handleLogin = async (role: string) => {
    try {
      await login(role);
      
      // Show success message with role information
      const roleNames = {
        'principal': 'Principal',
        'registrar': 'Registrar', 
        'hod': 'Head of Department',
        'program-head': 'Program Department Head',
        'employee': 'Employee'
      };
      
      toast.success(`Welcome to IAOMS!`, {
        description: `Successfully logged in as ${roleNames[role as keyof typeof roleNames]}`,
        duration: 3000,
      });
      
      // Navigation will be handled by useEffect above
    } catch (error) {
      toast.error('Login Failed', {
        description: 'Unable to authenticate. Please try again.',
      });
    }
  };

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      // Always redirect to dashboard after login (no localStorage redirect path)
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <HITAMTreeLoading key={loadingKey} size="lg" />
      </div>
    );
  }

  // Show authentication card only for unauthenticated users
  return <AuthenticationCard onLogin={handleLogin} />;
};

export default Index;