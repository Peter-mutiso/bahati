-- Backfill wallets for all profiles that don't have one yet.
-- Root cause: the handle_new_user trigger was inserting into 'balance' column
-- which no longer exists (renamed to wallet_cash), causing silent failures.

INSERT INTO public.wallets (user_id, wallet_cash, wallet_bonus, tenant_id)
SELECT
  p.id,
  0.00,
  0.00,
  p.tenant_id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w WHERE w.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
