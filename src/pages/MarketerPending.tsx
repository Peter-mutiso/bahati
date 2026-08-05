import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 5000;

const MarketerPending = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setTimeout>;
    let tickTimer: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/marketer-login"); return; }

      const { data: marketer } = await supabase
        .from("marketers")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!marketer) { navigate("/marketer-login"); return; }

      if (marketer.status === "approved") {
        setStatus("approved");
        toast.success("Your account has been approved! Redirecting…");
        clearInterval(tickTimer);
        setTimeout(() => navigate("/marketer"), 1500);
        return;
      }

      if (marketer.status === "rejected") {
        setStatus("rejected");
        clearInterval(tickTimer);
        return;
      }

      // Still pending — schedule next poll
      setCountdown(POLL_INTERVAL_MS / 1000);
      pollTimer = setTimeout(checkStatus, POLL_INTERVAL_MS);
    };

    // Start first check immediately
    checkStatus();

    // Countdown ticker so the user sees "checking in Xs"
    tickTimer = setInterval(() => {
      setCountdown(c => (c > 1 ? c - 1 : POLL_INTERVAL_MS / 1000));
    }, 1000);

    return () => {
      clearTimeout(pollTimer);
      clearInterval(tickTimer);
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/marketer-login");
  };

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <CardTitle className="text-xl text-green-400">Account Approved!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Redirecting you to your dashboard…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-xl">Application Rejected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your marketer application was not approved. Please contact the platform administrator for more information.
            </p>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="relative">
              <TrendingUp className="w-10 h-10 text-primary" />
              <Clock className="w-5 h-5 text-yellow-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-xl">Application Under Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your marketer account application has been submitted and is pending admin approval.
            You will be automatically redirected once your account is approved.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Checking status in {countdown}s…
          </div>
          <p className="text-xs text-muted-foreground">
            If you have questions, please contact the platform administrator.
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketerPending;
