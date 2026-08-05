-- Enable realtime for profiles table to detect ban status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;