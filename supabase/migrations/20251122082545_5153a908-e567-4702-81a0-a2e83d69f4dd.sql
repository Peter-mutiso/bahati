-- Create spin wheel settings table
CREATE TABLE IF NOT EXISTS public.spin_wheel_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_wheel_prizes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view spin prizes"
  ON public.spin_wheel_prizes
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert spin prizes"
  ON public.spin_wheel_prizes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update spin prizes"
  ON public.spin_wheel_prizes
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete spin prizes"
  ON public.spin_wheel_prizes
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default prizes
INSERT INTO public.spin_wheel_prizes (label, amount, color, position) VALUES
  ('0', 0, '#1e293b', 0),
  ('$1', 1, '#059669', 1),
  ('0', 0, '#1e293b', 2),
  ('$5', 5, '#2563eb', 3),
  ('0', 0, '#1e293b', 4),
  ('$10', 10, '#7c3aed', 5),
  ('0', 0, '#1e293b', 6),
  ('$20', 20, '#ca8a04', 7),
  ('0', 0, '#1e293b', 8),
  ('$80', 80, '#ea580c', 9),
  ('0', 0, '#1e293b', 10),
  ('$150', 150, '#db2777', 11),
  ('0', 0, '#1e293b', 12),
  ('$200', 200, '#dc2626', 13),
  ('0', 0, '#1e293b', 14),
  ('$500', 500, '#d97706', 15);

-- Add trigger for updated_at
CREATE TRIGGER update_spin_wheel_prizes_updated_at
  BEFORE UPDATE ON public.spin_wheel_prizes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();