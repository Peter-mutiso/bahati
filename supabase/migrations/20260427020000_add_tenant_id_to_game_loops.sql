-- Add tenant_id to game_rounds and game_stats

-- 1. game_rounds
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='game_rounds') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_rounds' AND column_name='tenant_id') THEN
      ALTER TABLE public.game_rounds ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
      
      -- Backfill with Default Site
      UPDATE public.game_rounds SET tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
      
      -- Index
      CREATE INDEX idx_game_rounds_tenant_id ON public.game_rounds(tenant_id);
      
      -- RLS
      ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "player_select_own_tenant_rounds" ON public.game_rounds;
      CREATE POLICY "player_select_own_tenant_rounds"
        ON public.game_rounds FOR SELECT
        TO authenticated, anon
        USING (tenant_id = public.my_tenant_id() OR public.my_tenant_id() IS NULL);
    END IF;
  END IF;
END;
$$;

-- 2. game_stats
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='game_stats') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_stats' AND column_name='tenant_id') THEN
      ALTER TABLE public.game_stats ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
      
      -- Backfill with Default Site
      UPDATE public.game_stats SET tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
      
      -- Index
      CREATE INDEX idx_game_stats_tenant_id ON public.game_stats(tenant_id);
      
      -- RLS (Service role only needed for game_stats, but just in case)
      ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
    END IF;
  END IF;
END;
$$;

-- Note: The UNIQUE constraint on game_stats(date) needs to be updated to be UNIQUE(date, tenant_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='game_stats') THEN
    -- Drop the old constraint if it exists. We might not know its exact name, but often it's game_stats_date_key
    ALTER TABLE public.game_stats DROP CONSTRAINT IF EXISTS game_stats_date_key;
    
    -- Add the new composite constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'game_stats_date_tenant_id_key'
    ) THEN
      ALTER TABLE public.game_stats ADD CONSTRAINT game_stats_date_tenant_id_key UNIQUE (date, tenant_id);
    END IF;
  END IF;
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
