-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add constraint to ensure username is not empty when set
ALTER TABLE public.profiles
ADD CONSTRAINT username_not_empty CHECK (username IS NULL OR length(trim(username)) > 0);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);