-- Create function to update profile total deposited for VIP tier tracking
CREATE OR REPLACE FUNCTION public.update_profile_total_deposited(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_deposited = total_deposited + p_amount
  WHERE id = p_user_id;
END;
$$;