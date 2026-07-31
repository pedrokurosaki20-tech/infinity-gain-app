
-- ========== ENUMS ==========
DO $$ BEGIN CREATE TYPE public.account_status AS ENUM ('active','suspended','blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_status AS ENUM ('pending','valid','rejected','suspicious'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.txn_type AS ENUM ('referral_commission','referral_bonus','task_reward','withdrawal','withdrawal_refund','bonus_expired','adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== PROFILES ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS signup_ip text,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE OR REPLACE FUNCTION public.gen_invite_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _code text; _i int := 0;
BEGIN
  LOOP
    _code := 'INFX' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = _code);
    _i := _i + 1;
    IF _i > 50 THEN _code := 'INFX' || upper(substr(md5(gen_random_uuid()::text), 1, 8)); EXIT; END IF;
  END LOOP;
  RETURN _code;
END $$;

UPDATE public.profiles SET invite_code = public.gen_invite_code()
WHERE invite_code IS NULL OR invite_code NOT LIKE 'INFX%';

ALTER TABLE public.profiles ALTER COLUMN invite_code SET DEFAULT public.gen_invite_code();
CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_key ON public.profiles (invite_code);

-- ========== REFERRALS ==========
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL,
  status public.referral_status NOT NULL DEFAULT 'pending',
  fraud_reason text,
  review_reason text,
  commission_amount numeric NOT NULL DEFAULT 0,
  first_task_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Admins view all referrals" ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id, status);

-- ========== TRANSACTIONS ==========
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.txn_type NOT NULL,
  amount numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions (user_id, created_at DESC);

-- ========== BONUS CLAIMS ==========
CREATE TABLE IF NOT EXISTS public.referral_bonus_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('daily','weekly')),
  period_key text NOT NULL,
  target int NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period, period_key, target)
);
GRANT SELECT ON public.referral_bonus_claims TO authenticated;
GRANT ALL ON public.referral_bonus_claims TO service_role;
ALTER TABLE public.referral_bonus_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bonus claims" ON public.referral_bonus_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bonus claims" ON public.referral_bonus_claims FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========== BALANCE GUARD (allow system credits) ==========
CREATE OR REPLACE FUNCTION public.prevent_profile_balance_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR coalesce(current_setting('app.allow_balance', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN NEW.balance := OLD.balance; END IF;
  IF NEW.total_earnings IS DISTINCT FROM OLD.total_earnings THEN NEW.total_earnings := OLD.total_earnings; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.credit_balance(_user_id uuid, _amount numeric, _type public.txn_type, _description text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.allow_balance', 'on', true);
  UPDATE public.profiles
     SET balance = balance + _amount,
         total_earnings = total_earnings + GREATEST(_amount, 0)
   WHERE id = _user_id;
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (_user_id, _type, _amount, _description);
  PERFORM set_config('app.allow_balance', 'off', true);
END $$;

-- ========== SIGNUP + FRAUD ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _code text := upper(btrim(coalesce(NEW.raw_user_meta_data->>'invite','')));
  _ip text := NULLIF(btrim(coalesce(NEW.raw_user_meta_data->>'ip','')), '');
  _device text := NULLIF(btrim(coalesce(NEW.raw_user_meta_data->>'device','')), '');
  _ua text := NULLIF(btrim(coalesce(NEW.raw_user_meta_data->>'ua','')), '');
  _phone text := NULLIF(regexp_replace(coalesce(NEW.raw_user_meta_data->>'phone',''), '\D', '', 'g'), '');
  _referrer uuid;
  _reasons text[] := '{}';
  _recent int;
BEGIN
  INSERT INTO public.profiles (id, name, phone, referred_by, email, signup_ip, device_id, user_agent)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'phone',
          NULLIF(_code, ''), NEW.email, _ip, _device, _ua);

  IF _code <> '' THEN
    SELECT id INTO _referrer FROM public.profiles WHERE upper(invite_code) = _code AND id <> NEW.id LIMIT 1;
    IF _referrer IS NOT NULL THEN
      IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id <> NEW.id AND signup_ip = _ip) THEN
        _reasons := _reasons || 'Mesmo endereço IP';
      END IF;
      IF _device IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id <> NEW.id AND device_id = _device) THEN
        _reasons := _reasons || 'Mesmo dispositivo';
      END IF;
      IF _phone IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id <> NEW.id AND regexp_replace(coalesce(phone,''), '\D', '', 'g') = _phone
      ) THEN
        _reasons := _reasons || 'Mesmo telefone';
      END IF;
      IF _ip IS NOT NULL THEN
        SELECT count(*) INTO _recent FROM public.profiles
         WHERE id <> NEW.id AND signup_ip = _ip AND created_at > now() - interval '24 hours';
        IF _recent >= 3 THEN _reasons := _reasons || 'Muitas contas criadas rapidamente'; END IF;
      END IF;

      INSERT INTO public.referrals (referrer_id, referred_id, invite_code, status, fraud_reason)
      VALUES (_referrer, NEW.id, _code,
              CASE WHEN array_length(_reasons,1) > 0 THEN 'suspicious'::public.referral_status ELSE 'pending'::public.referral_status END,
              CASE WHEN array_length(_reasons,1) > 0 THEN array_to_string(_reasons, ' • ') ELSE NULL END);
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ========== VALIDATION ON FIRST TASK ==========
CREATE OR REPLACE FUNCTION public.validate_referral_first_task(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.referrals%ROWTYPE; _referred_name text;
BEGIN
  SELECT * INTO _r FROM public.referrals WHERE referred_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF _r.first_task_at IS NULL THEN
    UPDATE public.referrals SET first_task_at = now() WHERE id = _r.id;
  END IF;
  IF _r.status <> 'pending' THEN RETURN; END IF;

  SELECT name INTO _referred_name FROM public.profiles WHERE id = _user_id;
  UPDATE public.referrals
     SET status = 'valid', validated_at = now(), commission_amount = 0.50,
         first_task_at = coalesce(first_task_at, now())
   WHERE id = _r.id;
  PERFORM public.credit_balance(_r.referrer_id, 0.50, 'referral_commission',
    'Comissão por indicação válida: ' || coalesce(_referred_name, 'novo usuário'));
END $$;

CREATE OR REPLACE FUNCTION public.review_task_submission(_id uuid, _approve boolean, _reason text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.task_submissions%ROWTYPE;
  _reward NUMERIC;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;
  SELECT * INTO _row FROM public.task_submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Envio não encontrado'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'Envio já foi revisado'; END IF;

  IF _approve THEN
    _reward := CASE _row.task_type WHEN 'rcs' THEN 0.30 WHEN 'compartilhamento' THEN 0.50 END;
    UPDATE public.task_submissions
      SET status = 'approved', reward_amount = _reward, reviewed_by = _uid, reviewed_at = now()
      WHERE id = _id;
    PERFORM public.credit_balance(_row.user_id, _reward, 'task_reward', 'Tarefa aprovada: ' || _row.task_type::text);
    PERFORM public.validate_referral_first_task(_row.user_id);
  ELSE
    UPDATE public.task_submissions
      SET status = 'rejected', rejection_reason = NULLIF(btrim(_reason), ''), reviewed_by = _uid, reviewed_at = now()
      WHERE id = _id;
  END IF;
END $$;

-- ========== STATS ==========
CREATE OR REPLACE FUNCTION public.referral_stats()
RETURNS TABLE (valid_total int, pending_total int, daily_valid int, weekly_valid int, total_commission numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE status = 'valid')::int,
    count(*) FILTER (WHERE status IN ('pending','suspicious'))::int,
    count(*) FILTER (WHERE status = 'valid' AND (validated_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int,
    count(*) FILTER (WHERE status = 'valid' AND date_trunc('week', validated_at AT TIME ZONE 'America/Sao_Paulo') = date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo'))::int,
    coalesce(sum(commission_amount) FILTER (WHERE status = 'valid'), 0)
  FROM public.referrals WHERE referrer_id = auth.uid();
$$;

-- ========== CLAIM BONUS ==========
CREATE OR REPLACE FUNCTION public.claim_referral_bonus(_period text, _target int, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _key text; _count int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _period NOT IN ('daily','weekly') THEN RAISE EXCEPTION 'Período inválido'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100 THEN RAISE EXCEPTION 'Valor de bônus inválido'; END IF;

  IF _period = 'daily' THEN
    _key := to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD');
    SELECT count(*) INTO _count FROM public.referrals
      WHERE referrer_id = _uid AND status = 'valid'
        AND (validated_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  ELSE
    _key := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'IYYY-"W"IW');
    SELECT count(*) INTO _count FROM public.referrals
      WHERE referrer_id = _uid AND status = 'valid'
        AND date_trunc('week', validated_at AT TIME ZONE 'America/Sao_Paulo') = date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  IF _count < _target THEN RAISE EXCEPTION 'Meta ainda não atingida'; END IF;
  IF EXISTS (SELECT 1 FROM public.referral_bonus_claims
              WHERE user_id = _uid AND period = _period AND period_key = _key AND target = _target) THEN
    RAISE EXCEPTION 'Bônus já resgatado';
  END IF;

  INSERT INTO public.referral_bonus_claims (user_id, period, period_key, target, amount)
  VALUES (_uid, _period, _key, _target, _amount);
  PERFORM public.credit_balance(_uid, _amount, 'referral_bonus',
    'Bônus ' || CASE WHEN _period = 'daily' THEN 'diário' ELSE 'semanal' END || ' de ' || _target || ' convites');
END $$;

-- ========== ADMIN ACTIONS ==========
CREATE OR REPLACE FUNCTION public.admin_review_referral(_id uuid, _action text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r public.referrals%ROWTYPE; _name text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  SELECT * INTO _r FROM public.referrals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Indicação não encontrada'; END IF;

  IF _action = 'approve' THEN
    IF _r.status = 'valid' THEN RETURN; END IF;
    SELECT name INTO _name FROM public.profiles WHERE id = _r.referred_id;
    UPDATE public.referrals SET status = 'valid', review_reason = NULLIF(btrim(_reason), ''),
      validated_at = now(), commission_amount = 0.50, first_task_at = coalesce(first_task_at, now())
      WHERE id = _id;
    PERFORM public.credit_balance(_r.referrer_id, 0.50, 'referral_commission',
      'Comissão por indicação aprovada: ' || coalesce(_name, 'novo usuário'));
  ELSIF _action = 'reject' THEN
    IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
    IF _r.status = 'valid' THEN
      PERFORM public.credit_balance(_r.referrer_id, -_r.commission_amount, 'adjustment',
        'Estorno de comissão de indicação rejeitada');
    END IF;
    UPDATE public.referrals SET status = 'rejected', review_reason = btrim(_reason),
      commission_amount = 0, validated_at = NULL WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Ação inválida';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status public.account_status, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF _status <> 'active' AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RAISE EXCEPTION 'Motivo obrigatório';
  END IF;
  UPDATE public.profiles SET account_status = _status, status_reason = NULLIF(btrim(_reason), '')
   WHERE id = _user_id;
END $$;

-- admin listing with names
CREATE OR REPLACE FUNCTION public.admin_list_referrals()
RETURNS TABLE (
  id uuid, referrer_id uuid, referrer_name text, invite_code text,
  referred_id uuid, referred_name text, referred_phone text, referred_email text,
  status public.referral_status, fraud_reason text, review_reason text,
  created_at timestamptz, first_task_at timestamptz,
  account_status public.account_status, status_reason text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.referrer_id, pr.name, r.invite_code,
         r.referred_id, pd.name, pd.phone, pd.email,
         r.status, r.fraud_reason, r.review_reason,
         r.created_at, r.first_task_at, pd.account_status, pd.status_reason
    FROM public.referrals r
    LEFT JOIN public.profiles pr ON pr.id = r.referrer_id
    LEFT JOIN public.profiles pd ON pd.id = r.referred_id
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.credit_balance(uuid, numeric, public.txn_type, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_referral_first_task(uuid) FROM public, anon, authenticated;

-- ========== REALTIME ==========
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_bonus_claims;
