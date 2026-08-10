import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Presentation-only per-player cyclist renaming. This never reads or writes
// cycling_race_races/cycling_race_bets/cycling_race_settings - it only
// resolves a display name for the CURRENT user's own rows in
// cycling_race_cyclist_names (RLS-restricted to auth.uid() = user_id). The
// real cyclist_number/winner_cyclist values used elsewhere are untouched.
export const useCyclistCustomNames = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [customNames, setCustomNames] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // One query for all of this user's rows (never once per cyclist).
  const loadCustomNames = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("cycling_race_cyclist_names")
      .select("cyclist_number, custom_name")
      .eq("user_id", uid);

    if (!error && data) {
      const map: Record<number, string> = {};
      data.forEach((row) => {
        map[row.cyclist_number] = row.custom_name;
      });
      setCustomNames(map);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (user) {
        setUserId(user.id);
        await loadCustomNames(user.id);
      }
      if (isMounted) setIsLoading(false);
    };
    init();

    // Re-load if the authenticated user changes (e.g. logout/login) without
    // a full page reload.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null;
      setUserId(newUserId);
      if (newUserId) {
        loadCustomNames(newUserId);
      } else {
        setCustomNames({});
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadCustomNames]);

  const getDisplayName = useCallback(
    (cyclistNumber: number, defaultName: string) => customNames[cyclistNumber] || defaultName,
    [customNames]
  );

  const saveCustomName = useCallback(async (cyclistNumber: number, name: string): Promise<{ error: string | null }> => {
    if (!userId) return { error: "You must be logged in to customize a cyclist name." };

    // tenant_id is resolved from the caller's own profile row (own-row read,
    // allowed by player_select_own_profile), matching exactly what
    // my_tenant_id() computes server-side - never trusted from elsewhere.
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) {
      return { error: "Unable to determine your site. Please try again." };
    }

    const { error } = await supabase
      .from("cycling_race_cyclist_names")
      .upsert(
        {
          user_id: userId,
          cyclist_number: cyclistNumber,
          custom_name: name,
          tenant_id: profile.tenant_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,cyclist_number,tenant_id" }
      );

    if (error) return { error: error.message };

    setCustomNames((prev) => ({ ...prev, [cyclistNumber]: name }));
    return { error: null };
  }, [userId]);

  const clearCustomName = useCallback(async (cyclistNumber: number): Promise<{ error: string | null }> => {
    if (!userId) return { error: "You must be logged in." };

    const { error } = await supabase
      .from("cycling_race_cyclist_names")
      .delete()
      .eq("user_id", userId)
      .eq("cyclist_number", cyclistNumber);

    if (error) return { error: error.message };

    setCustomNames((prev) => {
      const next = { ...prev };
      delete next[cyclistNumber];
      return next;
    });
    return { error: null };
  }, [userId]);

  return { customNames, isLoading, getDisplayName, saveCustomName, clearCustomName };
};
