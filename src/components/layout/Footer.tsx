import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Gamepad2, Mail, MessageCircle, Shield, FileText, Trophy, Gift, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
}

const Footer = () => {
  const navigate = useNavigate();
  const { websiteName } = useWebsiteSettings();
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null);
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null);

  useEffect(() => {
    loadLegalDocuments();
  }, []);

  const loadLegalDocuments = async () => {
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
    } catch (error) {
      console.error("Failed to load legal documents:", error);
    }
  };

  const footerLinks = {
    support: [
      { label: "Live Chat", path: "/live-chat" },
      { label: "Help Center", path: "/" },
      { label: "Contact Us", path: "/" },
    ],
    legal: [
      { label: "Terms of Service", path: "/" },
      { label: "Privacy Policy", path: "/" },
      { label: "Responsible Gaming", path: "/" },
      { label: "Provably Fair", path: "/" },
    ],
  };

  return (
    <footer className="relative bg-card/50 backdrop-blur-xl border-t border-border/50 mt-12">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-2">
...
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-success" />
              Support
            </h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.path)}
                    className="text-sm text-muted-foreground hover:text-success transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setTermsOpen(true)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => setPrivacyOpen(true)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              {footerLinks.legal.slice(2).map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.path)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} {websiteName}. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="font-medium text-success">Secure & Fair</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Shield className="w-3 h-3 text-primary" />
                <span className="font-medium text-primary">Licensed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

      {/* Terms of Service Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{termsDoc?.title || "Terms of Service"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {termsDoc?.content || "Loading..."}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{privacyDoc?.title || "Privacy Policy"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {privacyDoc?.content || "Loading..."}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;
