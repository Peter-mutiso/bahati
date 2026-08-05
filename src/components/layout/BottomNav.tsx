import { NavLink, useNavigate } from "react-router-dom";
import { Gamepad2, History, User, Gift, Receipt, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onAuthRequired?: () => void;
  isAuthenticated: boolean;
}

const BottomNav = ({ onAuthRequired, isAuthenticated }: BottomNavProps) => {
  const navigate = useNavigate();
  const links = [
    { to: "/", icon: Gamepad2, label: "Home" },
    { to: "/wallet?tab=deposit", icon: PlusCircle, label: "Deposit" },
    { to: "/history", icon: History, label: "History" },
    { to: "/transactions", icon: Receipt, label: "Transactions" },
    { to: "/referrals", icon: Gift, label: "Rewards" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const handleClick = (e: React.MouseEvent, to: string) => {
    if (!isAuthenticated && to !== "/") {
      e.preventDefault();
      navigate("/auth");
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
      <div className="relative bg-gradient-to-t from-card via-card/95 to-card/90 backdrop-blur-2xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="flex justify-around items-center h-[72px] px-2 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={(e) => handleClick(e, link.to)}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-2xl transition-all duration-300 min-w-0 px-1",
                  "active:scale-95",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/10 to-transparent rounded-2xl" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full shadow-[0_0_12px_hsl(var(--primary))]" />
                    </>
                  )}
                  <div className={cn(
                    "relative p-2 rounded-xl transition-all duration-300",
                    isActive && "bg-primary/10"
                  )}>
                    <link.icon 
                      className={cn(
                        "w-5 h-5 transition-all duration-300 flex-shrink-0",
                        isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))] scale-110"
                      )} 
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium transition-all duration-300 truncate max-w-full text-center leading-tight px-0.5",
                    isActive && "font-bold text-shadow-sm"
                  )}>
                    {link.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;