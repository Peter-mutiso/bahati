import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, X, User } from "lucide-react";

interface Cyclist {
  number: number;
  name: string;
  flag: string;
}

interface CycleRaceCyclistCustomizerProps {
  open: boolean;
  onClose: () => void;
  cyclists: Cyclist[];
  customNames: Record<number, string>;
  saveCustomName: (cyclistNumber: number, name: string) => Promise<{ error: string | null }>;
  clearCustomName: (cyclistNumber: number) => Promise<{ error: string | null }>;
}

const MAX_NAME_LENGTH = 20;

// Receives the SAME useCyclistCustomNames() instance the parent CycleRace
// page uses (via props) instead of calling the hook again here. Two separate
// hook calls would each hold their own independent customNames state, so a
// save in this dialog would never be visible to the parent's state that
// actually drives the rendered race UI - this is what previously caused the
// already-mounted race UI to keep showing the old name until a full refresh.
const CycleRaceCyclistCustomizer = ({
  open,
  onClose,
  cyclists,
  customNames,
  saveCustomName,
  clearCustomName,
}: CycleRaceCyclistCustomizerProps) => {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingNumber, setSavingNumber] = useState<number | null>(null);

  // Seed the editable drafts from the saved custom names whenever the
  // dialog opens, so it always reflects what's actually persisted.
  useEffect(() => {
    if (open) {
      const seeded: Record<number, string> = {};
      cyclists.forEach((c) => {
        seeded[c.number] = customNames[c.number] || "";
      });
      setDrafts(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async (cyclistNumber: number) => {
    const trimmed = (drafts[cyclistNumber] || "").trim();

    if (!trimmed) {
      toast.error("Enter a name before saving");
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      toast.error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
      return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      toast.error("Name can only contain letters, numbers, spaces, - and _");
      return;
    }

    setSavingNumber(cyclistNumber);
    const { error } = await saveCustomName(cyclistNumber, trimmed);
    setSavingNumber(null);

    if (error) {
      toast.error(error);
      return;
    }
    setDrafts((prev) => ({ ...prev, [cyclistNumber]: trimmed }));
    toast.success(`Cyclist ${cyclistNumber} renamed to "${trimmed}"`);
  };

  const handleClear = async (cyclistNumber: number) => {
    setSavingNumber(cyclistNumber);
    const { error } = await clearCustomName(cyclistNumber);
    setSavingNumber(null);

    if (error) {
      toast.error(error);
      return;
    }
    setDrafts((prev) => ({ ...prev, [cyclistNumber]: "" }));
    toast.success(`Cyclist ${cyclistNumber} reset to default name`);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Customize Cyclists
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Give any cyclist your own name. Only you will see it - everyone else keeps seeing the
          normal name, including if that cyclist wins.
        </p>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-3">
            {cyclists.map((cyclist) => {
              const isSaving = savingNumber === cyclist.number;
              const hasCustomName = !!customNames[cyclist.number];
              return (
                <div key={cyclist.number} className="space-y-1.5">
                  <Label htmlFor={`cyclist-name-${cyclist.number}`} className="text-xs text-muted-foreground">
                    Cyclist {cyclist.number} {cyclist.flag} (default: {cyclist.name})
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`cyclist-name-${cyclist.number}`}
                      value={drafts[cyclist.number] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [cyclist.number]: e.target.value }))
                      }
                      placeholder={cyclist.name}
                      maxLength={MAX_NAME_LENGTH}
                      disabled={isSaving}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSave(cyclist.number)}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                    {hasCustomName && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Reset to default name"
                        onClick={() => handleClear(cyclist.number)}
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CycleRaceCyclistCustomizer;
