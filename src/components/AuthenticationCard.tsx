import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building2, Shield, Users, FileText } from "lucide-react";
import { HITAMTreeLoading } from "@/components/ui/loading-animation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface AuthenticationCardProps {
  onLogin: (role: string) => void;
}

export function AuthenticationCard({ onLogin }: AuthenticationCardProps) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [hitamId, setHitamId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showHitamLogin, setShowHitamLogin] = useState(false);
  const { toast } = useToast();

  const carouselImages = [
    '/carousel-1.jpg',
    '/carousel-3.png',
    '/carousel-4.webp'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const roles = [
    { value: "principal", label: "Principal", icon: Building2 },
    { value: "registrar", label: "Registrar", icon: Shield },
    { value: "hod", label: "HOD", icon: Users },
    { value: "program-head", label: "Program Department Head", icon: Users },
    { value: "employee", label: "Employee", icon: FileText },
  ];

  // HITAM ID Login - Connects to Supabase Auth
  const handleHitamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select your role before logging in.",
        variant: "destructive",
      });
      return;
    }

    if (!hitamId || !password) {
      toast({
        title: "Credentials Required",
        description: "Please enter your HITAM ID and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Format email - if just ID, append @hitam.org
      const email = hitamId.includes('@') ? hitamId : `${hitamId}@hitam.org`;
      
      // DEMO LOGIN - Quick access for testing
      if (email === 'demo@hitam.org' && password === 'demo123') {
        sessionStorage.setItem('user-role', selectedRole);
        sessionStorage.setItem('demo-user', 'true');
        sessionStorage.setItem('user-email', email);
        sessionStorage.setItem('user-name', 'Demo User');
        
        toast({
          title: "Demo Login Successful",
          description: "Welcome, Demo User!",
        });
        onLogin(selectedRole);
        return;
      }

      // Step 1: Check if user exists in recipients table
      const { data: recipient, error: recipientError } = await supabase
        .from('recipients')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (recipientError || !recipient) {
        throw new Error('User not found. Please contact administrator for access.');
      }

      // Step 2: Try to sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If user doesn't exist in Auth, try to sign up first
        if (error.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: recipient.name,
                role: selectedRole,
                department: recipient.department,
              }
            }
          });

          if (signUpError) throw signUpError;

          if (signUpData.user) {
            // Update recipient with auth user_id
            await supabase
              .from('recipients')
              .update({ user_id: signUpData.user.id })
              .eq('email', email);

            toast({
              title: "Account Created",
              description: "Your account has been set up. Please check your email to verify.",
            });
            setIsLoading(false);
            return;
          }
        }
        throw error;
      }

      // Step 3: Login successful
      if (data.user) {
        // Store role in session
        sessionStorage.setItem('user-role', selectedRole);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${recipient.name}!`,
        });
        onLogin(selectedRole);
      }
    } catch (error: any) {
      console.error('HITAM login failed:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid HITAM ID or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    if (!selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select your role before logging in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Store selected role for after OAuth callback
      sessionStorage.setItem('pending-role', selectedRole);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Shows account picker
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google login failed:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Failed to initiate Google login",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <HITAMTreeLoading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-4xl shadow-elegant overflow-hidden">
        <div className="flex">
          {/* Image Carousel */}
          <div className="hidden lg:block flex-1 relative bg-gray-100">
            {carouselImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={image}
                  alt={`Carousel ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
            
            {/* Dot Navigation */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-white scale-110'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Login Form */}
          <div className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">IAOMS Login</CardTitle>
            <CardDescription>
              Hyderabad Institute of Technology and Management
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Select Your Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="w-4 h-4" />
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Two Horizontal Buttons - Google and HITAM ID */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant={!showHitamLogin ? "outline" : "gradient"}
                className="flex-1 flex items-center justify-center gap-2"
                disabled={!selectedRole}
                onClick={() => {
                  if (showHitamLogin) {
                    setShowHitamLogin(false);
                  } else {
                    handleGoogleLogin();
                  }
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant={showHitamLogin ? "outline" : "gradient"}
                className="flex-1 flex items-center justify-center gap-2"
                disabled={!selectedRole}
                onClick={() => setShowHitamLogin(true)}
              >
                <Building2 className="w-5 h-5" />
                HITAM ID
              </Button>
            </div>

            {/* HITAM ID Login Form - Shows when HITAM ID button is clicked */}
            {showHitamLogin && (
            <form onSubmit={handleHitamLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hitamId">HITAM ID</Label>
                <Input
                  id="hitamId"
                  type="text"
                  placeholder="Enter your HITAM ID"
                  value={hitamId}
                  onChange={(e) => setHitamId(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={!selectedRole || !hitamId || !password}
              >
                Log In
              </Button>

              {/* Demo Login Credentials */}
              <div className="border rounded-lg p-3 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Demo Credentials:</p>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p><span className="text-muted-foreground">HITAM ID:</span> <code className="bg-background px-1 rounded">demo@hitam.org</code></p>
                    <p><span className="text-muted-foreground">Password:</span> <code className="bg-background px-1 rounded">demo123</code></p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHitamId('demo@hitam.org');
                      setPassword('demo123');
                    }}
                  >
                    Use Demo
                  </Button>
                </div>
              </div>
            </form>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Only institutional accounts (@hitam.org) are allowed
            </p>
          </div>

          <Separator />

          <div className="text-center text-sm text-muted-foreground">
            <p>Institutional Activity Oversight and Management System</p>
            <p className="text-xs mt-1">© 2025 HITAM. All rights reserved.</p>
          </div>
        </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}