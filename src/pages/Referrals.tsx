import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { ReferralSection } from "@/components/profile/ReferralSection";

const Referrals = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setIsAuthenticated(true);
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-20">
      <DesktopNav 
        isAuthenticated={isAuthenticated}
        onAuthRequired={() => setShowAuthDrawer(true)}
      />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
          <Gift className="w-8 h-8" />
          Referrals
        </h1>

        <ReferralSection />
      </div>
      
      <BottomNav 
        isAuthenticated={isAuthenticated}
        onAuthRequired={() => setShowAuthDrawer(true)}
      />
    </div>
  );
};

export default Referrals;
