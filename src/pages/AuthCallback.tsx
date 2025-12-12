import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { HITAMTreeLoading } from '@/components/ui/loading-animation';

/**
 * AuthCallback page handles the OAuth callback from Supabase/Google
 * It processes the authentication tokens and redirects to dashboard
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash or code
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth callback error:', error);
          navigate('/', { replace: true });
          return;
        }

        if (data.session) {
          console.log('✅ Auth callback successful, redirecting to dashboard');
          // The AuthContext will handle the session and set the user
          navigate('/dashboard', { replace: true });
        } else {
          console.log('⚠️ No session found in callback, redirecting to login');
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('❌ Auth callback exception:', error);
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="text-center">
        <HITAMTreeLoading size="lg" />
        <p className="mt-4 text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
