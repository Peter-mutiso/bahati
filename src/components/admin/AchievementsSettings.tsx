import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Trophy, Plus, Trash2 } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  achievement_type: string;
  criteria_value: number;
  badge_color: string;
}

const AchievementsSettings = () => {
  const queryClient = useQueryClient();
  const [editingAchievements, setEditingAchievements] = useState<Achievement[]>([]);

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["spin-achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spin_achievements")
        .select("*")
        .order("criteria_value", { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });

  useEffect(() => {
    if (achievements) {
      setEditingAchievements(achievements);
    }
  }, [achievements]);

  const updateAchievementMutation = useMutation({
    mutationFn: async (achievement: Achievement) => {
      const { error } = await supabase
        .from("spin_achievements")
        .update({
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          achievement_type: achievement.achievement_type,
          criteria_value: achievement.criteria_value,
          badge_color: achievement.badge_color,
        })
        .eq("id", achievement.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spin-achievements"] });
      toast.success("Achievement updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update achievement: " + error.message);
    },
  });

  const deleteAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("spin_achievements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spin-achievements"] });
      toast.success("Achievement deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete achievement: " + error.message);
    },
  });

  const addAchievementMutation = useMutation({
    mutationFn: async (achievement: Omit<Achievement, 'id'>) => {
      const { error } = await supabase
        .from("spin_achievements")
        .insert([achievement]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spin-achievements"] });
      toast.success("Achievement added successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to add achievement: " + error.message);
    },
  });

  const handleUpdateAchievement = (id: string, field: keyof Achievement, value: string | number) => {
    setEditingAchievements(
      editingAchievements.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  };

  const handleSaveAchievement = (achievement: Achievement) => {
    updateAchievementMutation.mutate(achievement);
  };

  const handleDeleteAchievement = (id: string) => {
    if (confirm("Are you sure you want to delete this achievement?")) {
      deleteAchievementMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    const newAchievement = {
      name: "New Achievement",
      description: "Description",
      icon: "🏆",
      achievement_type: "total_spins",
      criteria_value: 10,
      badge_color: "#10b981",
    };
    addAchievementMutation.mutate(newAchievement);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading achievements...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Spin Wheel Achievements
        </CardTitle>
        <CardDescription>
          Configure achievements and milestones for the spin wheel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {editingAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="grid gap-4 p-4 bg-muted/30 rounded-lg border border-border"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs mb-1">Icon</Label>
                  <Input
                    value={achievement.icon}
                    onChange={(e) => handleUpdateAchievement(achievement.id, "icon", e.target.value)}
                    placeholder="🏆"
                    className="text-2xl text-center"
                    maxLength={2}
                  />
                </div>

                <div className="md:col-span-1 lg:col-span-2">
                  <Label className="text-xs mb-1">Name</Label>
                  <Input
                    value={achievement.name}
                    onChange={(e) => handleUpdateAchievement(achievement.id, "name", e.target.value)}
                    placeholder="Achievement Name"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1">Type</Label>
                  <Select
                    value={achievement.achievement_type}
                    onValueChange={(value) => handleUpdateAchievement(achievement.id, "achievement_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="streak">Streak</SelectItem>
                      <SelectItem value="win_amount">Win Amount</SelectItem>
                      <SelectItem value="total_spins">Total Spins</SelectItem>
                      <SelectItem value="total_earnings">Total Earnings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs mb-1">Description</Label>
                  <Input
                    value={achievement.description}
                    onChange={(e) => handleUpdateAchievement(achievement.id, "description", e.target.value)}
                    placeholder="Achievement description"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1">Criteria Value</Label>
                  <Input
                    type="number"
                    value={achievement.criteria_value}
                    onChange={(e) => handleUpdateAchievement(achievement.id, "criteria_value", parseFloat(e.target.value))}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Badge Color</Label>
                  <Input
                    type="color"
                    value={achievement.badge_color}
                    onChange={(e) => handleUpdateAchievement(achievement.id, "badge_color", e.target.value)}
                    className="w-20 h-8"
                  />
                  <span className="text-xs text-muted-foreground">{achievement.badge_color}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveAchievement(achievement)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAchievement(achievement.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleAddNew}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Achievement
        </Button>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">Achievement Types</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Streak:</strong> Days in a row user spins</li>
            <li><strong>Win Amount:</strong> Single spin win amount</li>
            <li><strong>Total Spins:</strong> Lifetime spin count</li>
            <li><strong>Total Earnings:</strong> Cumulative earnings from all spins</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementsSettings;
