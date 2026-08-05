import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";

interface Prize {
  id: string;
  label: string;
  amount: number;
  color: string;
  position: number;
}

const SpinWheelSettings = () => {
  const queryClient = useQueryClient();
  const [editingPrizes, setEditingPrizes] = useState<Prize[]>([]);

  const { data: prizes, isLoading } = useQuery({
    queryKey: ["spin-wheel-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spin_wheel_prizes")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;
      return data as Prize[];
    },
  });

  useEffect(() => {
    if (prizes) {
      setEditingPrizes(prizes);
    }
  }, [prizes]);

  const updatePrizesMutation = useMutation({
    mutationFn: async (prizes: Prize[]) => {
      // Delete all existing prizes
      await supabase.from("spin_wheel_prizes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      // Insert new prizes
      const { error } = await supabase
        .from("spin_wheel_prizes")
        .insert(prizes.map((p, idx) => ({
          label: p.label,
          amount: p.amount,
          color: p.color,
          position: idx,
        })));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spin-wheel-prizes"] });
      toast.success("Spin wheel prizes updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update prizes: " + error.message);
    },
  });

  const handleAddPrize = () => {
    setEditingPrizes([
      ...editingPrizes,
      {
        id: crypto.randomUUID(),
        label: "$0",
        amount: 0,
        color: "#1e293b",
        position: editingPrizes.length,
      },
    ]);
  };

  const handleRemovePrize = (id: string) => {
    setEditingPrizes(editingPrizes.filter((p) => p.id !== id));
  };

  const handleUpdatePrize = (id: string, field: keyof Prize, value: string | number) => {
    setEditingPrizes(
      editingPrizes.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSave = () => {
    if (editingPrizes.length < 4) {
      toast.error("Please add at least 4 prize segments");
      return;
    }

    updatePrizesMutation.mutate(editingPrizes);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading prizes...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Spin Wheel Prize Configuration
        </CardTitle>
        <CardDescription>
          Configure prize segments for the daily spin wheel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {editingPrizes.map((prize) => (
            <div
              key={prize.id}
              className="grid grid-cols-12 gap-4 items-center p-4 bg-muted/30 rounded-lg border border-border"
            >
              <div className="col-span-3">
                <Label className="text-xs mb-1">Label</Label>
                <Input
                  value={prize.label}
                  onChange={(e) => handleUpdatePrize(prize.id, "label", e.target.value)}
                  placeholder="$10"
                />
              </div>

              <div className="col-span-3">
                <Label className="text-xs mb-1">Amount</Label>
                <Input
                  type="number"
                  value={prize.amount}
                  onChange={(e) => handleUpdatePrize(prize.id, "amount", parseFloat(e.target.value))}
                  placeholder="10"
                />
              </div>

              <div className="col-span-4">
                <Label className="text-xs mb-1">Color (Hex)</Label>
                <div className="flex gap-2">
                  <Input
                    value={prize.color}
                    onChange={(e) => handleUpdatePrize(prize.id, "color", e.target.value)}
                    placeholder="#059669"
                  />
                  <div
                    className="w-10 h-10 rounded border border-border"
                    style={{ backgroundColor: prize.color }}
                  />
                </div>
              </div>

              <div className="col-span-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePrize(prize.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleAddPrize}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Prize Segment
        </Button>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> The wheel requires at least 4 segments. For better balance,
            use 8-16 segments. Use "0" amount for "Better luck next time" segments.
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Prize Configuration
        </Button>
      </CardContent>
    </Card>
  );
};

export default SpinWheelSettings;
