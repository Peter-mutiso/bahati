-- Create custom_themes table to store user-created themes
CREATE TABLE IF NOT EXISTS custom_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('dark', 'light')),
  preview JSONB NOT NULL,
  colors JSONB NOT NULL,
  gradients JSONB NOT NULL,
  shadows JSONB NOT NULL,
  radius TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE custom_themes ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage custom themes
CREATE POLICY "Admins can manage custom themes"
  ON custom_themes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow everyone to view custom themes
CREATE POLICY "Everyone can view custom themes"
  ON custom_themes
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_custom_themes_created_at ON custom_themes(created_at DESC);