import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Globe, Gamepad2, LayoutGrid } from "lucide-react";

const MASTER_PIN = "53207610";

const ALL_GAMES = [
  { id: "chicken-road", name: "Chicken Road", route: "/chicken-road" },
];

const ALL_CATEGORIES = [
  { id: "trending", name: "Trending" },
  { id: "instant", name: "Instant Win" },
  { id: "classic", name: "Classic" },
  { id: "skill", name: "Skill Based" },
  { id: "high-win", name: "High Win" },
];

const MasterPanel = () => {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [countryBlockingEnabled, setCountryBlockingEnabled] = useState(false);
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  const [hiddenGames, setHiddenGames] = useState<string[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePinSubmit = async () => {
    if (pin === MASTER_PIN) {
      setIsAuthenticated(true);
      await loadSettings();
      toast({
        title: "Access Granted",
        description: "Welcome to Master Panel",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid PIN",
        variant: "destructive",
      });
    }
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("game_settings")
      .select("country_blocking_enabled, blocked_countries, hidden_games, hidden_categories")
      .single();

    if (error) {
      console.error("Error loading settings:", error);
      return;
    }

    if (data) {
      setCountryBlockingEnabled(data.country_blocking_enabled || false);
      setBlockedCountries(data.blocked_countries || []);
      setHiddenGames(data.hidden_games || []);
      setHiddenCategories(data.hidden_categories || []);
    }
  };

  const handleToggleCountryBlocking = async (enabled: boolean) => {
    setIsLoading(true);
    const { error } = await supabase
      .from("game_settings")
      .update({ country_blocking_enabled: enabled })
      .eq("id", (await supabase.from("game_settings").select("id").single()).data?.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update country blocking",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setCountryBlockingEnabled(enabled);
    setIsLoading(false);
    toast({
      title: "Success",
      description: `Country blocking ${enabled ? "enabled" : "disabled"}`,
    });
  };

  const handleToggleCountry = async (countryCode: string, add: boolean) => {
    setIsLoading(true);
    const newBlockedCountries = add
      ? [...blockedCountries, countryCode]
      : blockedCountries.filter((c) => c !== countryCode);

    const { error } = await supabase
      .from("game_settings")
      .update({ blocked_countries: newBlockedCountries })
      .eq("id", (await supabase.from("game_settings").select("id").single()).data?.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update blocked countries",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setBlockedCountries(newBlockedCountries);
    setIsLoading(false);
    toast({
      title: "Success",
      description: `${countryCode} ${add ? "blocked" : "unblocked"}`,
    });
  };

  const handleToggleGame = async (gameId: string, hide: boolean) => {
    setIsLoading(true);
    const newHiddenGames = hide
      ? [...hiddenGames, gameId]
      : hiddenGames.filter((g) => g !== gameId);

    const { error } = await supabase
      .from("game_settings")
      .update({ hidden_games: newHiddenGames })
      .eq("id", (await supabase.from("game_settings").select("id").single()).data?.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setHiddenGames(newHiddenGames);
    setIsLoading(false);
    toast({ title: "Success", description: `Game ${hide ? "hidden" : "visible"}` });
  };

  const handleToggleCategory = async (categoryId: string, hide: boolean) => {
    setIsLoading(true);
    const newHiddenCategories = hide
      ? [...hiddenCategories, categoryId]
      : hiddenCategories.filter((c) => c !== categoryId);

    const { error } = await supabase
      .from("game_settings")
      .update({ hidden_categories: newHiddenCategories })
      .eq("id", (await supabase.from("game_settings").select("id").single()).data?.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setHiddenCategories(newHiddenCategories);
    setIsLoading(false);
    toast({ title: "Success", description: `Category ${hide ? "hidden" : "visible"}` });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-primary" />
              <CardTitle>Master Panel Access</CardTitle>
            </div>
            <CardDescription>Enter PIN to access master controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handlePinSubmit()}
              />
            </div>
            <Button onClick={handlePinSubmit} className="w-full">
              Access Panel
            </Button>
            <Button variant="outline" onClick={() => navigate("/game")} className="w-full">
              Back to Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <CardTitle>Master Panel</CardTitle>
            </div>
            <CardDescription>Advanced system controls</CardDescription>
          </CardHeader>
        </Card>

        {/* Game Visibility */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <CardTitle>Game Visibility</CardTitle>
            </div>
            <CardDescription>Hide games from homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_GAMES.map((game) => (
              <div key={game.id} className="flex items-center justify-between">
                <span>{game.name}</span>
                <Switch
                  checked={!hiddenGames.includes(game.id)}
                  onCheckedChange={(checked) => handleToggleGame(game.id, !checked)}
                  disabled={isLoading}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Category Visibility */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <CardTitle>Category Visibility</CardTitle>
            </div>
            <CardDescription>Hide categories from homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <span>{category.name}</span>
                <Switch
                  checked={!hiddenCategories.includes(category.id)}
                  onCheckedChange={(checked) => handleToggleCategory(category.id, !checked)}
                  disabled={isLoading}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Country Blocking */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle>Country Blocking</CardTitle>
            </div>
            <CardDescription>Manage regional access restrictions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Country Blocking</Label>
                <p className="text-sm text-muted-foreground">
                  Block users from specific countries
                </p>
              </div>
              <Switch
                checked={countryBlockingEnabled}
                onCheckedChange={handleToggleCountryBlocking}
                disabled={isLoading}
              />
            </div>

            {countryBlockingEnabled && (
              <div className="space-y-4 pt-4 border-t">
                <Label>Blocked Countries</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇮🇳</span>
                      <span>India (IN)</span>
                    </div>
                    <Switch
                      checked={blockedCountries.includes("IN")}
                      onCheckedChange={(checked) => handleToggleCountry("IN", checked)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => navigate("/admin")} className="w-full">
          Back to Admin Panel
        </Button>
      </div>
    </div>
  );
};

export default MasterPanel;
