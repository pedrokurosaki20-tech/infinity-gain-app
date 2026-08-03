
-- settings (single row)
CREATE TABLE public.checkin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  active boolean NOT NULL DEFAULT true,
  rewards numeric[] NOT NULL DEFAULT ARRAY[0.05,0.05,0.05,0.05,0.10,0.10,1.00]::numeric[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checkin_settings TO authenticated;
GRANT ALL ON public.checkin_settings TO service_role;
ALTER TABLE public.checkin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view checkin settings" ON public.checkin_settings
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.checkin_settings (id) VALUES (true);

CREATE TRIGGER update_checkin_settings_updated_at BEFORE UPDATE ON public.checkin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- progress
CREATE TABLE public.checkin_progress (
  user_id uuid PRIMARY KEY,
  current_day int NOT NULL DEFAULT 1,
  last_checkin_date date,
  cycles_completed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checkin_progress TO authenticated;
GRANT ALL ON public.checkin_progress TO service_role;
ALTER TABLE public.checkin_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own checkin progress" ON public.checkin_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all checkin progress" ON public.checkin_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_checkin_progress_updated_at BEFORE UPDATE ON public.checkin_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- history
CREATE TABLE public.checkin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day int NOT NULL,
  amount numeric NOT NULL,
  checkin_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
CREATE INDEX checkin_history_user_idx ON public.checkin_history (user_id, created_at DESC);
GRANT SELECT ON public.checkin_history TO authenticated;
GRANT ALL ON public.checkin_history TO service_role;
ALTER TABLE public.checkin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own checkin history" ON public.checkin_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all checkin history" ON public.checkin_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- state for current user
CREATE OR REPLACE FUNCTION public.checkin_state()
RETURNS TABLE(active boolean, rewards numeric[], current_day int, cycles_completed int,
              claimed_today boolean, last_checkin_date date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _s public.checkin_settings%ROWTYPE;
        _p public.checkin_progress%ROWTYPE; _today date;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  _today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  SELECT * INTO _s FROM public.checkin_settings WHERE id;
  SELECT * INTO _p FROM public.checkin_progress WHERE user_id = _uid;
  RETURN QUERY SELECT
    coalesce(_s.active, true),
    coalesce(_s.rewards, ARRAY[0.05,0.05,0.05,0.05,0.10,0.10,1.00]::numeric[]),
    coalesce(_p.current_day, 1),
    coalesce(_p.cycles_completed, 0),
    (_p.last_checkin_date IS NOT NULL AND _p.last_checkin_date = _today),
    _p.last_checkin_date;
END $$;

-- claim
CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS TABLE(amount numeric, day int, cycle_completed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _s public.checkin_settings%ROWTYPE;
        _p public.checkin_progress%ROWTYPE; _today date; _day int; _amount numeric;
        _completed boolean := false; _next int; _cycles int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _s FROM public.checkin_settings WHERE id;
  IF NOT coalesce(_s.active, true) THEN RAISE EXCEPTION 'Check-in diário indisponível no momento'; END IF;

  _today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  INSERT INTO public.checkin_progress (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO _p FROM public.checkin_progress WHERE user_id = _uid FOR UPDATE;

  IF _p.last_checkin_date = _today THEN RAISE EXCEPTION 'Check-in já realizado hoje'; END IF;

  _day := least(greatest(coalesce(_p.current_day, 1), 1), 7);
  -- quebra de sequência reinicia o ciclo
  IF _p.last_checkin_date IS NOT NULL AND _p.last_checkin_date < _today - 1 THEN
    _day := 1;
  END IF;

  _amount := coalesce(_s.rewards[_day], 0.05);
  _cycles := coalesce(_p.cycles_completed, 0);
  IF _day >= 7 THEN
    _completed := true; _next := 1; _cycles := _cycles + 1;
  ELSE
    _next := _day + 1;
  END IF;

  INSERT INTO public.checkin_history (user_id, day, amount, checkin_date)
  VALUES (_uid, _day, _amount, _today);

  UPDATE public.checkin_progress
     SET current_day = _next, last_checkin_date = _today, cycles_completed = _cycles
   WHERE user_id = _uid;

  PERFORM public.credit_balance(_uid, _amount, 'bonus_expired', NULL);
  DELETE FROM public.transactions
   WHERE user_id = _uid AND type = 'bonus_expired' AND description IS NULL
     AND created_at > now() - interval '1 minute';
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (_uid, 'adjustment', _amount, 'Check-in Diário · Dia ' || _day);

  RETURN QUERY SELECT _amount, _day, _completed;
END $$;

REVOKE EXECUTE ON FUNCTION public.checkin_state() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_daily_checkin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.checkin_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;

-- admin: save settings
CREATE OR REPLACE FUNCTION public.admin_save_checkin_settings(_rewards numeric[], _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF _rewards IS NULL OR array_length(_rewards, 1) <> 7 THEN RAISE EXCEPTION 'Informe exatamente 7 valores'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_rewards) v WHERE v < 0 OR v > 100) THEN
    RAISE EXCEPTION 'Valor de recompensa inválido';
  END IF;
  UPDATE public.checkin_settings SET rewards = _rewards, active = coalesce(_active, true) WHERE id;
END $$;

-- admin: stats
CREATE OR REPLACE FUNCTION public.admin_checkin_overview()
RETURNS TABLE(user_id uuid, name text, email text, current_day int, cycles_completed int,
              last_checkin_date date, total_checkins int, total_amount numeric, checkins_today int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.user_id, pr.name, pr.email, p.current_day, p.cycles_completed, p.last_checkin_date,
         coalesce(h.cnt, 0)::int, coalesce(h.sum_amount, 0),
         (SELECT count(*) FROM public.checkin_history
           WHERE checkin_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int
    FROM public.checkin_progress p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    LEFT JOIN (SELECT checkin_history.user_id AS uid, count(*) cnt, sum(amount) sum_amount
                 FROM public.checkin_history GROUP BY 1) h ON h.uid = p.user_id
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY p.updated_at DESC;
$$;

-- admin: reset a user
CREATE OR REPLACE FUNCTION public.admin_reset_checkin(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  UPDATE public.checkin_progress
     SET current_day = 1, last_checkin_date = NULL, cycles_completed = 0
   WHERE user_id = _user_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_save_checkin_settings(numeric[], boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_checkin_overview() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reset_checkin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_save_checkin_settings(numeric[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_checkin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_checkin(uuid) TO authenticated;
