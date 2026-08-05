import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Rocket, Gift, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useTenantId } from "@/contexts/TenantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const countryCodes = [
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [countryCode, setCountryCode] = useState("+254");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { websiteName, websiteLogoUrl } = useWebsiteSettings();
  const tenantId = useTenantId();
  
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    if (referralCode) {
      setIsLogin(false);
      toast.info(`Signing up with referral code: ${referralCode}`, {
        description: "You and your friend will both earn bonus credits!"
      });
    }
  }, [referralCode]);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(pwd)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(pwd)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(pwd)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      setPasswordError("Password must contain at least one special character");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 6 && cleanPhone.length <= 15;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login with tenant-scoped identifier
        const loginIdentifier = `${tenantId}_${countryCode.replace('+', '')}${phoneNumber.replace(/\D/g, '')}@mobile.com`;
        const { error } = await supabase.auth.signInWithPassword({
          email: loginIdentifier,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        // Validate phone number
        if (!validatePhoneNumber(phoneNumber)) {
          toast.error("Please enter a valid phone number");
          setLoading(false);
          return;
        }

        // Validate nickname
        if (!nickname.trim()) {
          toast.error("Nickname is required");
          setLoading(false);
          return;
        }

        if (nickname.length < 3) {
          toast.error("Nickname must be at least 3 characters");
          setLoading(false);
          return;
        }

        // Validate password strength
        if (!validatePassword(password)) {
          setLoading(false);
          return;
        }

        // Validate confirm password
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }

        // Validate terms agreement
        if (!agreedToTerms) {
          toast.error("Please agree to the Terms and Conditions");
          setLoading(false);
          return;
        }

        // Tenant-scoped email for Supabase auth (allows same phone on different sites)
        const phoneEmail = `${tenantId}_${countryCode.replace('+', '')}${phoneNumber.replace(/\D/g, '')}@mobile.com`;
        
        const { data, error } = await supabase.auth.signUp({
          email: phoneEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: nickname.trim(),
              phone: `${countryCode}${phoneNumber.replace(/\D/g, '')}`,
              real_email: email.trim() || null,
              tenant_id: tenantId,
            }
          },
        });
        if (error) throw error;

        // Update profile with nickname and phone
        if (data.user) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              username: nickname.trim(),
              email: email.trim() || phoneEmail,
            })
            .eq('id', data.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
            await new Promise(resolve => setTimeout(resolve, 500));
            await supabase
              .from('profiles')
              .update({ 
                username: nickname.trim(),
                email: email.trim() || phoneEmail,
              })
              .eq('id', data.user.id);
          }
        }
        
        // Process referral code if present
        if (referralCode && data.user) {
          try {
            const { data: referralResult, error: referralError } = await supabase.functions.invoke(
              'process-referral',
              {
                body: { 
                  referralCode: referralCode,
                  newUserId: data.user.id 
                }
              }
            );

            if (referralError) {
              console.error('Referral processing error:', referralError);
            } else if (referralResult?.success) {
              toast.success(`${referralResult.message}`, {
                description: "Bonus credits added to your account!"
              });
            }
          } catch (refError) {
            console.error('Failed to process referral:', refError);
          }
        }
        
        toast.success("Account created! Welcome!");
        navigate("/");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (errorMessage.includes('User already registered')) {
        toast.error("This phone number is already registered. Please login instead.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 card-shadow">
        <div className="flex items-center justify-center gap-2 mb-2">
          {websiteLogoUrl ? (
            <img src={websiteLogoUrl} alt={websiteName} className="w-8 h-8 object-contain" />
          ) : (
            <Rocket className="w-8 h-8 text-primary" />
          )}
          <h1 className="text-3xl font-bold text-gradient">{websiteName}</h1>
        </div>
        
        {referralCode && (
          <Badge variant="default" className="w-full justify-center mb-4 py-2 bg-gradient-to-r from-primary to-accent">
            <Gift className="w-4 h-4 mr-2" />
            Sign up with code {referralCode} to earn bonus credits!
          </Badge>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                required
                disabled={loading}
                className="flex-1"
              />
            </div>
          </div>

          {/* Nickname - Only for signup */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required={!isLogin}
                disabled={loading}
                className="w-full"
              />
            </div>
          )}

          {/* Email - Optional, only for signup */}
          {/* {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
          )} */}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!isLogin && e.target.value) {
                  validatePassword(e.target.value);
                }
              }}
              required
              disabled={loading}
            />
            {!isLogin && passwordError && (
              <p className="text-xs text-destructive mt-1">{passwordError}</p>
            )}
            {!isLogin && !passwordError && password && (
              <p className="text-xs text-muted-foreground mt-1">
                8+ chars with uppercase, lowercase, number & special character
              </p>
            )}
          </div>

          {/* Confirm Password - Only for signup */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                disabled={loading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Terms and Conditions - Only for signup */}
          {!isLogin && (
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-tight cursor-pointer"
              >
                I have read and agree to the{" "}
                <span className="text-primary underline">Terms and Conditions</span>
              </label>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 glow-primary mt-4"
            disabled={loading || (!isLogin && !agreedToTerms) || !tenantId}
          >
            {loading ? "Loading..." : !tenantId ? "Loading..." : isLogin ? "Login" : "Create Account"}
          </Button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
