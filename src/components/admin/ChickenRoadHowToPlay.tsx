import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, BookOpen, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HowToPlayData {
  id: string;
  title: string;
  content: string;
  rules: string[];
}

export function ChickenRoadHowToPlay() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HowToPlayData | null>(null);

  // Form state
  const [title, setTitle] = useState("How to Play");
  const [content, setContent] = useState("");
  const [rules, setRules] = useState<string[]>([]);

  useEffect(() => {
    fetchHowToPlay();
  }, []);

  const fetchHowToPlay = async () => {
    try {
      const { data: howToPlayData, error } = await supabase
        .from("chicken_road_how_to_play")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      if (howToPlayData) {
        setData(howToPlayData as HowToPlayData);
        setTitle(howToPlayData.title);
        setContent(howToPlayData.content);
        setRules(howToPlayData.rules as string[] || []);
      }
    } catch (error) {
      console.error("Error fetching how to play:", error);
      toast.error("Failed to load How to Play content");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("chicken_road_how_to_play")
        .update({
          title,
          content,
          rules,
        })
        .eq("id", data.id);

      if (error) throw error;

      toast.success("How to Play content saved successfully");
      fetchHowToPlay();
    } catch (error) {
      console.error("Error saving how to play:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    setRules([...rules, ""]);
  };

  const updateRule = (index: number, value: string) => {
    const newRules = [...rules];
    newRules[index] = value;
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-blue-500" />
            How to Play Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modal Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How to Play"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Introduction/Description</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the main description..."
              className="bg-background/50 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              Game Rules (Step by Step)
            </div>
            <Button onClick={addRule} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No rules added. Click "Add Rule" to add game instructions.
            </p>
          ) : (
            rules.map((rule, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <Textarea
                  value={rule}
                  onChange={(e) => updateRule(index, e.target.value)}
                  placeholder={`Step ${index + 1} instruction...`}
                  className="bg-background/50 min-h-[60px] flex-1"
                />
                <Button
                  onClick={() => removeRule(index)}
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive/80 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#3a3a3a] rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4">{title || "How to Play"}</h3>
            {content && (
              <p className="text-gray-300 mb-4">{content}</p>
            )}
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex gap-3">
                  <span className="font-bold text-white min-w-[24px]">{index + 1}.</span>
                  <span className="text-gray-300">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save How to Play Content
      </Button>
    </div>
  );
}
