import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, Info } from "lucide-react";

const RTPSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            RTP Control System
          </CardTitle>
          <CardDescription>
            RTP settings are managed individually for each game in their respective settings panels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <Info className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Configure RTP for Chicken Road in the <strong>Chicken Road Settings</strong> tab.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RTPSettings;
