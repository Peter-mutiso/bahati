-- Create table for legal documents
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE CHECK (document_type IN ('terms_of_service', 'privacy_policy')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can view legal documents)
CREATE POLICY "Anyone can view legal documents"
  ON public.legal_documents
  FOR SELECT
  USING (true);

-- Policy for admin update
CREATE POLICY "Admins can update legal documents"
  ON public.legal_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy for admin insert
CREATE POLICY "Admins can insert legal documents"
  ON public.legal_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default documents
INSERT INTO public.legal_documents (document_type, title, content)
VALUES 
  ('terms_of_service', 'Terms of Service', 'Please configure your Terms of Service content in the admin panel.'),
  ('privacy_policy', 'Privacy Policy', 'Please configure your Privacy Policy content in the admin panel.')
ON CONFLICT (document_type) DO NOTHING;

-- Create trigger to update timestamp
CREATE TRIGGER update_legal_documents_timestamp
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();