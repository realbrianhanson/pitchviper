import { useState, useEffect } from "react";
import { 
  User, 
  Bell, 
  Palette, 
  Volume2, 
  Shield, 
  Link, 
  LogOut,
  Moon,
  Sun,
  Save,
  HelpCircle,
  Mic,
  Phone,
  Building2
} from "lucide-react";
import { ViperCard } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperInput } from "@/components/ui/viper-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingTour } from "@/components/onboarding/OnboardingTour";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { AlowareConnectionCard } from "@/components/settings/AlowareConnectionCard";
import { CompanyProfileCard } from "@/components/settings/CompanyProfileCard";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/page-transition";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { startTour } = useOnboardingTour();
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [title, setTitle] = useState(profile?.title || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  
  // Preferences state
  const [darkMode, setDarkMode] = useState(true);
  const [celebrationSounds, setCelebrationSounds] = useState(true);
  const [notificationSounds, setNotificationSounds] = useState(true);
  const [voiceCommands, setVoiceCommands] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setTitle(profile.title || "");
      setAvatarUrl(profile.avatar_url || "");
    }

    // Load preferences
    const loadPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCelebrationSounds(data.celebration_sounds_enabled);
        setNotificationSounds(data.notification_sounds_enabled);
        setVoiceCommands((data as { voice_commands_enabled?: boolean }).voice_commands_enabled || false);
      }
    };

    loadPreferences();
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          title,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          celebration_sounds_enabled: celebrationSounds,
          notification_sounds_enabled: notificationSounds,
          voice_commands_enabled: voiceCommands,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Preferences saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = () => {
    return fullName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Phone</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Display</span>
            </TabsTrigger>
            <TabsTrigger value="sounds" className="gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">Sounds</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ViperCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
              
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <ViperButton variant="outline" size="sm">
                    Change Photo
                  </ViperButton>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <ViperInput
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <ViperInput
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Sales Representative"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <ViperInput
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="opacity-60"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <ViperButton onClick={handleSaveProfile} disabled={isLoading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </ViperButton>
              </div>

              <Separator className="my-6" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-destructive">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">Sign out of your account</p>
                </div>
                <ViperButton variant="outline" onClick={handleSignOut} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </ViperButton>
              </div>
            </ViperCard>
          </TabsContent>

          {/* Company Profile Tab */}
          <TabsContent value="company">
            <CompanyProfileCard />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <ViperCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
              <NotificationSettings />
            </ViperCard>
          </TabsContent>

          {/* Phone System Tab */}
          <TabsContent value="phone">
            <AlowareConnectionCard />
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display">
            <ViperCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Display Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Use dark theme (recommended)</p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base">Voice Commands</Label>
                      <p className="text-sm text-muted-foreground">Enable voice control (experimental)</p>
                    </div>
                  </div>
                  <Switch checked={voiceCommands} onCheckedChange={setVoiceCommands} />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <ViperButton onClick={handleSavePreferences} disabled={isLoading} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Preferences
                </ViperButton>
              </div>
            </ViperCard>
          </TabsContent>

          {/* Sounds Tab */}
          <TabsContent value="sounds">
            <ViperCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Sound Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Celebration Sounds</Label>
                    <p className="text-sm text-muted-foreground">Play sounds for achievements and wins</p>
                  </div>
                  <Switch checked={celebrationSounds} onCheckedChange={setCelebrationSounds} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notification Sounds</Label>
                    <p className="text-sm text-muted-foreground">Play sounds for new notifications</p>
                  </div>
                  <Switch checked={notificationSounds} onCheckedChange={setNotificationSounds} />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <ViperButton onClick={handleSavePreferences} disabled={isLoading} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Preferences
                </ViperButton>
              </div>
            </ViperCard>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <ViperCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Help & Support</h2>
              
              <div className="space-y-4">
                <ViperButton
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={startTour}
                >
                  <HelpCircle className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Take a Guided Tour</p>
                    <p className="text-sm text-muted-foreground">Learn the basics of Viper Sales</p>
                  </div>
                </ViperButton>

                <ViperButton
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => window.open("https://docs.lovable.dev", "_blank")}
                >
                  <Link className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Documentation</p>
                    <p className="text-sm text-muted-foreground">Read the full documentation</p>
                  </div>
                </ViperButton>
              </div>
            </ViperCard>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
