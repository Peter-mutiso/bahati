-- Fix handle_new_user function to use correct wallet columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.wallets (user_id, wallet_cash, wallet_bonus)
  VALUES (NEW.id, 1000.00, 0.00);
  
  RETURN NEW;
END;
$function$;