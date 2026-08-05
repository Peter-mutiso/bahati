-- Update handle_new_user function to include signup bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  signup_bonus numeric;
BEGIN
  -- Get signup bonus amount from game_settings
  SELECT COALESCE(signup_bonus_amount, 0) INTO signup_bonus 
  FROM public.game_settings 
  LIMIT 1;

  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.wallets (user_id, wallet_cash, wallet_bonus)
  VALUES (NEW.id, 0.00, signup_bonus);
  
  RETURN NEW;
END;
$$;