-- Drop the old constraint and add updated one with all statuses
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'completed', 'rejected', 'requires_approval', 'failed'));