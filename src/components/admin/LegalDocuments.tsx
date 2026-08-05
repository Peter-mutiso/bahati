import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
}

const LegalDocuments = () => {
  const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null);
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .in("document_type", ["terms_of_service", "privacy_policy"]);

      if (error) throw error;

      const terms = data?.find((doc) => doc.document_type === "terms_of_service");
      const privacy = data?.find((doc) => doc.document_type === "privacy_policy");

      setTermsDoc(terms || null);
      setPrivacyDoc(privacy || null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to load legal documents: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (documentType: string) => {
    setSaving(true);
    try {
      const doc = documentType === "terms_of_service" ? termsDoc : privacyDoc;
      if (!doc) return;

      const { error } = await supabase
        .from("legal_documents")
        .update({
          title: doc.title,
          content: doc.content,
          updated_at: new Date().toISOString(),
        })
        .eq("document_type", documentType);

      if (error) throw error;

      toast.success("Document saved successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to save document: " + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Legal Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terms-title">Title</Label>
              <Input
                id="terms-title"
                value={termsDoc?.title || ""}
                onChange={(e) =>
                  setTermsDoc((prev) => prev ? { ...prev, title: e.target.value } : null)
                }
                placeholder="Terms of Service"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms-content">Content</Label>
              <Textarea
                id="terms-content"
                value={termsDoc?.content || ""}
                onChange={(e) =>
                  setTermsDoc((prev) => prev ? { ...prev, content: e.target.value } : null)
                }
                placeholder="Enter your terms of service content..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <Button
              onClick={() => handleSave("terms_of_service")}
              disabled={saving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Terms of Service"}
            </Button>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privacy-title">Title</Label>
              <Input
                id="privacy-title"
                value={privacyDoc?.title || ""}
                onChange={(e) =>
                  setPrivacyDoc((prev) => prev ? { ...prev, title: e.target.value } : null)
                }
                placeholder="Privacy Policy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy-content">Content</Label>
              <Textarea
                id="privacy-content"
                value={privacyDoc?.content || ""}
                onChange={(e) =>
                  setPrivacyDoc((prev) => prev ? { ...prev, content: e.target.value } : null)
                }
                placeholder="Enter your privacy policy content..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <Button
              onClick={() => handleSave("privacy_policy")}
              disabled={saving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Privacy Policy"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LegalDocuments;
