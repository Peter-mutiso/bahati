-- Add is_banned column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Add banned_at timestamp column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone DEFAULT NULL;