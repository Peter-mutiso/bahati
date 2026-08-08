import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { toast } from "sonner";
import { User, LogOut, Mail, Crown, Volume2, Zap, Bell, Palette, MessageCircle, Phone } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [vipTier, setVipTier] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  });
  const [performanceMode, setPerformanceMode] = useState(() => {
    return localStorage.getItem('performanceMode') === 'true';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  
  const navigate = useNavigate();
  const { volume, setVolume } = useGameSounds();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      // Fetch user profile with VIP tier first — phone_number is the source of truth
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, vip_tiers(*)')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setUsernameInput(profile.username || "");
        setAvatarUrl(profile.avatar_url);
        if (profile.vip_tiers) {
          setVipTier(profile.vip_tiers);
        }
        // Use stored phone_number — never parse the auth email
        if (profile.phone_number) {
          setPhoneNumber(profile.phone_number);
        } else {
          // Fallback to user_metadata phone for accounts created before the fix
          const metaPhone = session.user.user_metadata?.phone || "";
          setPhoneNumber(metaPhone.replace(/^\+/, ''));
        }
      }

      // Real email from metadata (optional field users can provide)
      const realEmail = session.user.user_metadata?.real_email;
      if (realEmail) setEmail(realEmail);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    setSoundEnabled(volume > 0);
  }, [volume]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();

    if (!trimmed) {
      toast.error("Username cannot be empty");
      return;
    }
    if (trimmed.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (trimmed.length > 20) {
      toast.error("Username must be 20 characters or fewer");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }
    if (trimmed === username) {
      return;
    }

    setIsSavingUsername(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to update your username");
        return;
      }

      // Only ever updates the username column for the caller's own row -
      // player_update_own_profile already restricts this to auth.uid() = id.
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("That username is already taken.");
        } else {
          console.error("Error updating username:", error);
          toast.error("Failed to update username. Please try again.");
        }
        return;
      }

      setUsername(trimmed);
      setUsernameInput(trimmed);
      toast.success("Username updated successfully!");
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username. Please try again.");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    const newVolume = enabled ? 0.5 : 0;
    setVolume(newVolume);
    localStorage.setItem('gameVolume', newVolume.toString());
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('volumeChanged'));
    toast.success(enabled ? "Sounds enabled" : "Sounds disabled");
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setSoundEnabled(value[0] > 0);
    localStorage.setItem('gameVolume', value[0].toString());
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('volumeChanged'));
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('notificationsEnabled', enabled.toString());
    window.dispatchEvent(new Event('settingsChanged'));
    toast.success(enabled ? "Notifications enabled" : "Notifications disabled");
  };

  const handlePerformanceModeToggle = (enabled: boolean) => {
    setPerformanceMode(enabled);
    localStorage.setItem('performanceMode', enabled.toString());
    window.dispatchEvent(new Event('settingsChanged'));
    toast.success(enabled ? "Performance mode enabled" : "Performance mode disabled");
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new Event('settingsChanged'));
    toast.success(`Theme changed to ${newTheme}`);
  };

  const avatarOptions = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ruby",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mason"
  ];

  const handleAvatarSelect = async (avatar: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatar })
        .eq("id", user.id);

      if (error) throw error;

      setAvatarUrl(avatar);
      setIsAvatarDialogOpen(false);
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Failed to update avatar");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with uploaded avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setIsAvatarDialogOpen(false);
      toast.success("Avatar uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-20">
      <DesktopNav isAuthenticated={true} />
      
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient flex items-center gap-2">
          <User className="w-6 h-6 sm:w-8 sm:h-8" />
          Profile & Settings
        </h1>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <button className="relative group flex flex-col items-center gap-1">
                    <Avatar className="w-20 h-20 border-4 border-primary/50 shadow-lg cursor-pointer transition-all hover:scale-105 hover:border-primary">
                      {avatarUrl ? (
                        avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') ? (
                          <>
                            <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-2xl">
                              {username?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-4xl">
                            {avatarUrl}
                          </div>
                        )
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-2xl">
                          {username?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center" style={{ width: '5rem', height: '5rem' }}>
                      <span className="text-white text-xs font-semibold">Change</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Tap to Change</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose Your Avatar</DialogTitle>
                  </DialogHeader>
                  
                  {/* Upload Custom Avatar */}
                  <div className="space-y-4 p-4 border-b border-border">
                    <div className="flex items-center gap-2 text-primary">
                      <User className="w-5 h-5" />
                      <h3 className="font-semibold">Upload Custom Avatar</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload your own profile picture (max 5MB, JPG/PNG)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="flex-1"
                      />
                      {isUploading && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Human Avatars */}
                  <div className="space-y-4 p-4">
                    <h3 className="font-semibold">Choose a Human Avatar</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {avatarOptions.map((avatar, index) => (
                        <button
                          key={index}
                          onClick={() => handleAvatarSelect(avatar)}
                          className={`
                            w-full aspect-square rounded-xl
                            flex items-center justify-center
                            border-2 transition-all overflow-hidden
                            hover:scale-110 hover:shadow-lg
                            ${avatarUrl === avatar 
                              ? 'border-primary bg-primary/20 scale-105' 
                              : 'border-border bg-card hover:border-primary/50'
                            }
                          `}
                        >
                          <img 
                            src={avatar} 
                            alt={`Avatar ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex-1 space-y-3">
                {phoneNumber && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Mobile Number</p>
                      <p className="font-medium text-sm">{phoneNumber}</p>
                    </div>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-sm">{email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {vipTier && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
                <Crown className="w-5 h-5" style={{ color: vipTier.color }} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">VIP Tier</p>
                  <p className="font-bold" style={{ color: vipTier.color }}>{vipTier.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bonus: {vipTier.bonus_percentage}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Username */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Username
            </CardTitle>
            <CardDescription>This is the name shown when your identity is displayed in-game</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username"
                disabled={isSavingUsername}
                maxLength={20}
                className="flex-1"
              />
              <Button
                onClick={handleSaveUsername}
                disabled={isSavingUsername || usernameInput.trim() === username}
              >
                {isSavingUsername ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Sound Settings
            </CardTitle>
            <CardDescription>Control game sounds and volume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-toggle" className="text-sm font-medium">
                  Game Sounds
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable all game sounds
                </p>
              </div>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>

            {soundEnabled && (
              <div className="space-y-3">
                <Label htmlFor="volume-slider" className="text-sm">
                  Volume: {Math.round(volume * 100)}%
                </Label>
                <Slider
                  id="volume-slider"
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Performance
            </CardTitle>
            <CardDescription>Optimize app performance for your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="performance-mode" className="text-sm font-medium">
                  Performance Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reduce animations for smoother gameplay
                </p>
              </div>
              <Switch
                id="performance-mode"
                checked={performanceMode}
                onCheckedChange={handlePerformanceModeToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-toggle" className="text-sm font-medium">
                  Enable Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive alerts for deposits, withdrawals, and wins
                </p>
              </div>
              <Switch
                id="notifications-toggle"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize your app theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('dark')}
                className="w-full"
              >
                Dark Theme
              </Button>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('light')}
                className="w-full"
              >
                Light Theme
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customer Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Customer Support
            </CardTitle>
            <CardDescription>Get help from our support team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Need assistance? Chat with our support team for help with any questions or issues.
            </p>
            <Button 
              onClick={() => navigate("/live-chat")} 
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Open Live Chat
            </Button>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Logout */}
        <Button
          onClick={handleLogout}
          disabled={loading}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
      <BottomNav isAuthenticated={true} />
    </div>
  );
};

export default Profile;