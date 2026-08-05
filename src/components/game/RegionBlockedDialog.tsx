import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegionBlockedDialog = () => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Restricted Region</AlertTitle>
          <AlertDescription className="mt-2 text-base">
            We're sorry, but our services are not available in your region due to local regulations.
            Betting has been disabled for your location.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default RegionBlockedDialog;
