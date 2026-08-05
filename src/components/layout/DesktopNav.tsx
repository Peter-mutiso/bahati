import { NavLink, useNavigate } from "react-router-dom";
import { Gamepad2, Wallet, History, Shield, Receipt, Gift, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

interface DesktopNavProps {
  onAuthRequired?: () => void;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}

const DesktopNav = ({ onAuthRequired, isAuthenticated, isAdmin }: DesktopNavProps) => {
  const navigate = useNavigate();
  const { websiteName, websiteLogoUrl } = useWebsiteSettings();
  const { symbol } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("wallet_cash, wallet_bonus")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setWalletBalance(Number(data.wallet_cash) + Number(data.wallet_bonus));
      }
    };

    fetchBalance();

    const channel = supabase
      .channel(`desknav-wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new) {
            setWalletBalance(Number(payload.new.wallet_cash) + Number(payload.new.wallet_bonus));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navLinks = [
    { to: "/", icon: Gamepad2, label: "Home" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/history", icon: History, label: "History" },
    { to: "/transactions", icon: Receipt, label: "Transactions" },
    { to: "/referrals", icon: Gift, label: "Referrals" },
  ];

  if (isAdmin) {
    navLinks.push({ to: "/adminct", icon: Shield, label: "Admin" });
  }

  const handleClick = (e: React.MouseEvent, to: string) => {
    if (!isAuthenticated && to !== "/") {
      e.preventDefault();
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-b border-border z-30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {websiteLogoUrl ? (
              <img src={websiteLogoUrl} alt={websiteName} className="w-6 h-6 object-contain" />
            ) : (
              <Gamepad2 className="w-6 h-6 text-primary" />
            )}
            <span className="text-xl font-bold text-gradient">{websiteName}</span>
          </div>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={(e) => handleClick(e, link.to)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/wallet")}
                  className="font-semibold"
                >
                  <Wallet className="w-4 h-4 mr-1" />
                  {symbol}{walletBalance.toFixed(2)}
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/wallet")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Deposit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Create Account
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNav;
