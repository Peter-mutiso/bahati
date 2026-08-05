import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Lock } from "lucide-react";
import { z } from "zod";
const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters").trim(),
});

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roles) {
        navigate("/adminct");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = loginSchema.parse({ email, password });

      // Attempt login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Login failed");
      }

      // Verify admin role
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Role check error:", roleError);
        throw new Error("Authorization failed");
      }

      if (!roles) {
        // User is not an admin, sign them out
        await supabase.auth.signOut();
        throw new Error("Access denied. Admin credentials required.");
      }

      toast.success("Welcome, Administrator!");
      navigate("/adminct");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md p-8 bg-slate-900/90 border-slate-700 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-sm text-muted-foreground">Authorized Access Only</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              Admin Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 pl-10"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Access Admin Panel
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/game")}
            className="text-slate-400 hover:text-white text-sm"
          >
            Back to Main Site
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700">
          <p className="text-xs text-center text-slate-500">
            All administrative actions are logged and monitored.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
