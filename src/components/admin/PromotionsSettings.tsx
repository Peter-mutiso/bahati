import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, GripVertical, Sparkles, Zap, Trophy, Gift, Flame, Star } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string | null;
  icon_type: string;
  badge_text: string;
  badge_color: string;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  sort_order: number;
}

const iconTypes = [
  { value: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { value: 'zap', label: 'Lightning', Icon: Zap },
  { value: 'trophy', label: 'Trophy', Icon: Trophy },
  { value: 'gift', label: 'Gift', Icon: Gift },
  { value: 'flame', label: 'Flame', Icon: Flame },
  { value: 'star', label: 'Star', Icon: Star },
];

const badgeColors = [
  { value: 'primary', label: 'Primary' },
  { value: 'accent', label: 'Accent' },
  { value: 'success', label: 'Success' },
  { value: 'destructive', label: 'Destructive' },
];

export const PromotionsSettings = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("exclusive_promotions")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleAdd = () => {
    const newPromotion: Promotion = {
      id: `temp-${Date.now()}`,
      title: "New Promotion",
      subtitle: "Subtitle",
      description: "Description here",
      button_text: "Action",
      button_link: null,
      icon_type: "sparkles",
      badge_text: "NEW",
      badge_color: "primary",
      gradient_from: "220 14% 80%",
      gradient_to: "220 14% 96%",
      is_active: true,
      sort_order: promotions.length,
    };
    setPromotions([...promotions, newPromotion]);
    setEditingId(newPromotion.id);
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith("temp-")) {
      setPromotions(promotions.filter((p) => p.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from("exclusive_promotions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Promotion deleted");
      fetchPromotions();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Failed to delete promotion");
    }
  };

  const handleSave = async (promotion: Promotion) => {
    setSaving(true);
    try {
      const isNew = promotion.id.startsWith("temp-");
      
      if (isNew) {
        const { id, ...promotionData } = promotion;
        const { error } = await supabase
          .from("exclusive_promotions")
          .insert([promotionData]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("exclusive_promotions")
          .update(promotion)
          .eq("id", promotion.id);
        
        if (error) throw error;
      }

      toast.success("Promotion saved");
      setEditingId(null);
      fetchPromotions();
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error("Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(promotions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setPromotions(updatedItems);

    try {
      const updates = updatedItems
        .filter(item => !item.id.startsWith("temp-"))
        .map(item => 
          supabase
            .from("exclusive_promotions")
            .update({ sort_order: item.sort_order })
            .eq("id", item.id)
        );

      await Promise.all(updates);
      toast.success("Order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      fetchPromotions();
    }
  };

  const updatePromotion = (id: string, field: keyof Promotion, value: string | boolean | number | null) => {
    setPromotions(promotions.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exclusive Promotions</h2>
          <p className="text-muted-foreground">Manage homepage promotional cards</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Promotion
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="promotions">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {promotions.map((promotion, index) => (
                <Draggable
                  key={promotion.id}
                  draggableId={promotion.id}
                  index={index}
                >
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div {...provided.dragHandleProps} className="mt-2">
                          <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{promotion.title}</h3>
                            <div className="flex items-center gap-2">
                              <Label>Active</Label>
                              <Switch
                                checked={promotion.is_active}
                                onCheckedChange={(checked) =>
                                  updatePromotion(promotion.id, "is_active", checked)
                                }
                              />
                            </div>
                          </div>

                          {editingId === promotion.id ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                  value={promotion.title}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "title", e.target.value)
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Subtitle</Label>
                                <Input
                                  value={promotion.subtitle}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "subtitle", e.target.value)
                                  }
                                />
                              </div>

                              <div className="col-span-2 space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={promotion.description}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "description", e.target.value)
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Button Text</Label>
                                <Input
                                  value={promotion.button_text}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "button_text", e.target.value)
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Button Link (optional)</Label>
                                <Input
                                  value={promotion.button_link || ""}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "button_link", e.target.value || null)
                                  }
                                  placeholder="/game"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Icon Type</Label>
                                <Select
                                  value={promotion.icon_type}
                                  onValueChange={(value) =>
                                    updatePromotion(promotion.id, "icon_type", value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {iconTypes.map((icon) => (
                                      <SelectItem key={icon.value} value={icon.value}>
                                        <div className="flex items-center gap-2">
                                          <icon.Icon className="w-4 h-4" />
                                          {icon.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Badge Color</Label>
                                <Select
                                  value={promotion.badge_color}
                                  onValueChange={(value) =>
                                    updatePromotion(promotion.id, "badge_color", value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {badgeColors.map((color) => (
                                      <SelectItem key={color.value} value={color.value}>
                                        {color.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Badge Text</Label>
                                <Input
                                  value={promotion.badge_text}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "badge_text", e.target.value)
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Gradient From (HSL)</Label>
                                <Input
                                  value={promotion.gradient_from}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "gradient_from", e.target.value)
                                  }
                                  placeholder="220 14% 80%"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Gradient To (HSL)</Label>
                                <Input
                                  value={promotion.gradient_to}
                                  onChange={(e) =>
                                    updatePromotion(promotion.id, "gradient_to", e.target.value)
                                  }
                                  placeholder="220 14% 96%"
                                />
                              </div>

                              <div className="col-span-2 flex gap-2">
                                <Button
                                  onClick={() => handleSave(promotion)}
                                  disabled={saving}
                                  className="flex-1"
                                >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDelete(promotion.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                <p>{promotion.subtitle} - {promotion.badge_text}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingId(promotion.id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(promotion.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
