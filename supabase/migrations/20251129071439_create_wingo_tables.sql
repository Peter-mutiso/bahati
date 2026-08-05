CREATE TABLE IF NOT EXISTS public.wingo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_bet NUMERIC NOT NULL DEFAULT 10,
  max_bet NUMERIC NOT NULL DEFAULT 10000,
  betting_duration_seconds INTEGER NOT NULL DEFAULT 30,
  result_duration_seconds INTEGER NOT NULL DEFAULT 5,
  house_edge NUMERIC NOT NULL DEFAULT 3,
  rtp_percentage NUMERIC NOT NULL DEFAULT 97,
  rtp_mode TEXT NOT NULL DEFAULT 'auto',
  auto_rtp_enabled BOOLEAN NOT NULL DEFAULT true,
  manual_result_enabled BOOLEAN NOT NULL DEFAULT false,
  red_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  green_multiplier NUMERIC NOT NULL DEFAULT 4.5,
  violet_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wingo_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number BIGINT NOT NULL DEFAULT 0,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wingo_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  round_id UUID REFERENCES public.wingo_rounds(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  bet_type TEXT,
  result TEXT,
  payout NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wingo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wingo_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wingo_bets ENABLE ROW LEVEL SECURITY;