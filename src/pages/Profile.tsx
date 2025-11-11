import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Shield, 
  Bell, 
  Palette, 
  Lock, 
  Camera,
  Save,
  Edit,
  Settings,
  Globe,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  MessageCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalInformationForm, PersonalInfoData } from "@/components/PersonalInformationForm";
import { supabaseWorkflowService } from "@/services/SupabaseWorkflowService";

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  
  const [profileData, setProfileData] = useState<PersonalInfoData>({
    name: "",
    email: "",
    phone: "",
    department: "",
    employeeId: "",
    designation: "",
    bio: "",
    avatar: ""
  });

  // Load profile data from Supabase recipients table
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Try to get recipient data from Supabase
        const recipient = await supabaseWorkflowService.getRecipientById(user.id || user.email);
        
        if (recipient) {
          // Map recipient data to profile data
          setProfileData({
            name: recipient.name || user.name || "",
            email: recipient.email || user.email || "",
            phone: recipient.phone || "",
            department: recipient.department || user.department || "",
            employeeId: recipient.user_id || "",
            designation: recipient.role || user.role || "",
            bio: "",
            avatar: ""
          });
        } else {
          // Fallback to user context data
          setProfileData({
            name: user.name || "",
            email: user.email || "",
            phone: "",
            department: user.department || "",
            employeeId: user.id || "",
            designation: user.role || "",
            bio: "",
            avatar: ""
          });
        }
        
        // Check localStorage for additional data (avatar, bio)
        const savedProfile = localStorage.getItem('user-profile');
        if (savedProfile) {
          try {
            const parsedProfile = JSON.parse(savedProfile);
            setProfileData(prev => ({
              ...prev,
              avatar: parsedProfile.avatar || prev.avatar,
              bio: parsedProfile.bio || prev.bio
            }));
          } catch (error) {
            console.error('Error loading saved profile:', error);
          }
        }
      } catch (error) {
        console.error('Error loading recipient data:', error);
        // Fallback to user context data on error
        setProfileData({
          name: user.name || "",
          email: user.email || "",
          phone: "",
          department: user.department || "",
          employeeId: user.id || "",
          designation: user.role || "",
          bio: "",
          avatar: ""
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();

    // Load notification preferences
    const savedNotificationPrefs = localStorage.getItem(`user-preferences-${user?.id || 'default'}`);
    if (savedNotificationPrefs) {
      try {
        const parsedPrefs = JSON.parse(savedNotificationPrefs);
        setNotificationPreferences(parsedPrefs);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }
  }, [user]);

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsAlerts: false,
    whatsappNotifications: false,
    autoSave: true,
    twoFactorAuth: false
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    email: { enabled: true, interval: 15, unit: 'minutes' },
    sms: { enabled: false, interval: 30, unit: 'minutes' },
    push: { enabled: true, interval: 5, unit: 'minutes' },
    whatsapp: { enabled: false, interval: 1, unit: 'hours' }
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleSaveProfile = (data: PersonalInfoData) => {
    setProfileData(data);
    localStorage.setItem('user-profile', JSON.stringify(data));
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handlePreferenceChange = (key: string, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    
    toast({
      title: "Preference Updated",
      description: `${key} has been updated.`,
    });
  };

  const handleNotificationPreferenceChange = (channel: string, field: string, value: any) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel as keyof typeof prev],
        [field]: value
      }
    }));

    // Save to localStorage immediately
    const updated = {
      ...notificationPreferences,
      [channel]: {
        ...notificationPreferences[channel as keyof typeof notificationPreferences],
        [field]: value
      }
    };
    localStorage.setItem(`user-preferences-${user?.id || 'default'}`, JSON.stringify(updated));

    toast({
      title: "Notification Preference Updated",
      description: `${channel} ${field} has been updated.`,
    });
  };

  const handleSignOut = () => {
    toast({
      title: "Signing Out",
      description: "Redirecting to login page...",
    });
    setTimeout(() => {
      navigate("/");
    }, 1000);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileData(prev => ({ ...prev, avatar: result }));
        toast({
          title: "Profile Picture Updated",
          description: "Your profile picture has been updated successfully.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role || 'employee'} onLogout={handleLogout}>
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Loading profile data...</p>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user?.role || 'employee'} onLogout={handleLogout}>
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-12">
            <TabsTrigger value="profile" className="text-sm md:text-base">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="text-sm md:text-base">Preferences</TabsTrigger>
            <TabsTrigger value="security" className="text-sm md:text-base" disabled>Security</TabsTrigger>
            <TabsTrigger value="account" className="text-sm md:text-base">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Header */}
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 md:w-32 md:h-32">
                      <AvatarImage src={profileData.avatar} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {profileData.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-10 h-10"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-xl md:text-2xl font-bold">{profileData.name}</h2>
                    <p className="text-muted-foreground">{profileData.designation}</p>
                    <p className="text-sm text-muted-foreground">{profileData.department}</p>
                    <Badge variant="outline" className="mt-2">
                      Employee ID: {profileData.employeeId}
                    </Badge>
                  </div>
                  
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? "default" : "outline"}
                    className="h-12 px-6"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Profile Information */}
            {isEditing ? (
              <PersonalInformationForm
                onSave={handleSaveProfile}
                initialData={profileData}
              />
            ) : (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <div className="h-12 px-3 py-2 border rounded-md bg-muted flex items-center">
                        {profileData.name || 'Not provided'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <div className="h-12 px-3 py-2 border rounded-md bg-muted flex items-center">
                        {profileData.email || 'Not provided'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="h-12 px-3 py-2 border rounded-md bg-muted flex items-center">
                        {profileData.phone || 'Not provided'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <div className="h-12 px-3 py-2 border rounded-md bg-muted flex items-center">
                        {profileData.department || 'Not provided'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <div className="h-12 px-3 py-2 border rounded-md bg-muted flex items-center">
                        {profileData.employeeId || 'Not provided'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Designation</Label>
                      <div className="h-12 px-3 py-2 border rounded-md bg-muted flex items-center">
                        {profileData.designation || 'Not provided'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <div className="min-h-[100px] px-3 py-2 border rounded-md bg-muted">
                      {profileData.bio || 'No bio provided'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            {/* Notification Preferences */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPreferences.email.enabled}
                      onCheckedChange={(checked) => handleNotificationPreferenceChange('email', 'enabled', checked)}
                    />
                  </div>

                  {/* Push Notifications */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Browser and mobile notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPreferences.push.enabled}
                      onCheckedChange={(checked) => handleNotificationPreferenceChange('push', 'enabled', checked)}
                    />
                  </div>

                  {/* SMS Alerts */}
                  <div className="flex items-center justify-between py-2 opacity-50">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">SMS Alerts</p>
                        <p className="text-sm text-muted-foreground">Critical updates via SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPreferences.sms.enabled}
                      disabled
                    />
                  </div>

                  {/* WhatsApp Notifications */}
                  <div className="flex items-center justify-between py-2 opacity-50">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">WhatsApp Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive updates via WhatsApp</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPreferences.whatsapp.enabled}
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display Preferences */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Display Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {theme === 'dark' ? (
                          <Moon className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Sun className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">Dark Mode</p>
                          <p className="text-sm text-muted-foreground">
                            {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-muted-foreground" />
                      <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      />
                      <Moon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Security Settings - DISABLED */}
            <Card className="shadow-elegant opacity-50 pointer-events-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.twoFactorAuth}
                      disabled
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Change Password</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Enter current password"
                        className="h-12 text-base"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        className="h-12 text-base"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        className="h-12 text-base"
                        disabled
                      />
                    </div>
                    <Button variant="outline" className="h-12 px-6" disabled>
                      Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            {/* Account Management */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Save className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Auto-save Documents</p>
                        <p className="text-sm text-muted-foreground">Automatically save drafts</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.autoSave}
                      onCheckedChange={(checked) => handlePreferenceChange('autoSave', checked)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium text-destructive">Danger Zone</h4>
                  <div className="border border-destructive/20 rounded-lg p-4 space-y-4">
                    <div>
                      <h5 className="font-medium">Sign Out</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        Sign out of your account and return to login page
                      </p>
                      <Button 
                        variant="destructive" 
                        onClick={handleSignOut}
                        className="h-12 px-6"
                      >
                        Sign Out
                      </Button>
                    </div>
                    

                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Profile;