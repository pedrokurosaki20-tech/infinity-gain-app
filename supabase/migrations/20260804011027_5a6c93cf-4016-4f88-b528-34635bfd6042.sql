
-- 1. Tabela
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'platform',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  icon text,
  priority text NOT NULL DEFAULT 'normal',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Helper
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _category text, _title text, _body text,
  _icon text DEFAULT NULL, _priority text DEFAULT 'normal', _link text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, category, title, body, icon, priority, link)
  VALUES (_user_id, coalesce(_category,'platform'), _title, coalesce(_body,''), _icon,
          coalesce(_priority,'normal'), _link)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- 3. Ações do usuário
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.notifications SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.clear_notifications()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  DELETE FROM public.notifications WHERE user_id = auth.uid();
$$;

-- 4. Envio pelo admin
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  _title text, _body text, _category text DEFAULT 'platform',
  _icon text DEFAULT NULL, _priority text DEFAULT 'normal',
  _user_id uuid DEFAULT NULL, _created_at timestamptz DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _count int := 0;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF _title IS NULL OR btrim(_title) = '' THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
  IF _priority NOT IN ('low','normal','high') THEN RAISE EXCEPTION 'Prioridade inválida'; END IF;

  IF _user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, category, title, body, icon, priority, created_at)
    VALUES (_user_id, coalesce(_category,'platform'), btrim(_title), coalesce(_body,''),
            NULLIF(btrim(coalesce(_icon,'')), ''), _priority, coalesce(_created_at, now()));
    _count := 1;
  ELSE
    INSERT INTO public.notifications (user_id, category, title, body, icon, priority, created_at)
    SELECT p.id, coalesce(_category,'platform'), btrim(_title), coalesce(_body,''),
           NULLIF(btrim(coalesce(_icon,'')), ''), _priority, coalesce(_created_at, now())
      FROM public.profiles p;
    GET DIAGNOSTICS _count = ROW_COUNT;
  END IF;
  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users_basic()
RETURNS TABLE(id uuid, name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, p.name, p.email FROM public.profiles p
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY p.created_at DESC LIMIT 500;
$$;

-- 5. Hooks nos fluxos existentes
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _pix_key text, _pix_type text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current_balance numeric; _fee numeric; _net numeric; _id uuid;
  _last_at timestamptz; _pix_clean text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 10 THEN RAISE EXCEPTION 'Valor mínimo de saque é R$ 10,00'; END IF;
  IF _amount > 100 THEN RAISE EXCEPTION 'Valor máximo por saque é R$ 100,00'; END IF;
  IF _pix_key IS NULL OR length(btrim(_pix_key)) = 0 THEN RAISE EXCEPTION 'Chave PIX obrigatória'; END IF;
  IF _pix_type NOT IN ('CPF','Telefone') THEN RAISE EXCEPTION 'Tipo de chave PIX inválido'; END IF;

  _pix_clean := btrim(_pix_key);
  IF _pix_type = 'CPF' AND length(regexp_replace(_pix_clean, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido: informe 11 dígitos'; END IF;
  IF _pix_type = 'Telefone' AND length(regexp_replace(_pix_clean, '\D', '', 'g')) NOT BETWEEN 10 AND 13 THEN
    RAISE EXCEPTION 'Telefone inválido: informe DDD + número'; END IF;

  SELECT max(created_at) INTO _last_at FROM public.withdrawals
   WHERE user_id = _uid AND created_at > now() - interval '24 hours';
  IF _last_at IS NOT NULL THEN
    RAISE EXCEPTION 'Você já possui um saque recente. Aguarde o término da contagem regressiva para realizar uma nova solicitação.';
  END IF;

  SELECT balance INTO _current_balance FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _current_balance IS NULL THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  IF _amount > _current_balance THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  _fee := round((_amount * 0.05)::numeric, 2);
  _net := round((_amount - _fee)::numeric, 2);

  UPDATE public.profiles SET balance = balance - _amount WHERE id = _uid;

  INSERT INTO public.withdrawals (user_id, amount, fee, net_amount, pix_key, pix_type, status)
  VALUES (_uid, _amount, _fee, _net, _pix_clean, _pix_type, 'requested')
  RETURNING id INTO _id;

  PERFORM public.notify_user(_uid, 'withdrawal', 'Saque solicitado',
    'Sua solicitação de R$ ' || to_char(_amount, 'FM999990.00') || ' foi registrada e está em análise.',
    'withdrawal', 'normal', NULL);

  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_withdrawal(_id uuid, _status withdrawal_status, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _row public.withdrawals%ROWTYPE; _title text; _body text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  SELECT * INTO _row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Saque não encontrado'; END IF;
  IF _status = 'rejected' AND (_reason IS NULL OR length(btrim(_reason)) = 0) THEN
    RAISE EXCEPTION 'Motivo da rejeição é obrigatório'; END IF;

  IF _status = 'rejected' AND _row.status <> 'rejected' THEN
    UPDATE public.profiles SET balance = balance + _row.amount WHERE id = _row.user_id; END IF;
  IF _status <> 'rejected' AND _row.status = 'rejected' THEN
    UPDATE public.profiles SET balance = balance - _row.amount WHERE id = _row.user_id; END IF;

  UPDATE public.withdrawals
     SET status = _status,
         rejection_reason = CASE WHEN _status = 'rejected' THEN btrim(_reason) ELSE NULL END,
         updated_at = now()
   WHERE id = _id;

  IF _status IS DISTINCT FROM _row.status THEN
    IF _status = 'processing' THEN
      _title := 'Saque aprovado'; _body := 'Seu saque de R$ ' || to_char(_row.amount, 'FM999990.00') || ' foi aprovado e está em processamento.';
    ELSIF _status = 'completed' THEN
      _title := 'Saque concluído'; _body := 'Seu saque foi enviado via PIX com sucesso.';
    ELSIF _status = 'rejected' THEN
      _title := 'Saque rejeitado'; _body := 'Seu saque foi rejeitado. Motivo: ' || btrim(_reason) || '. O valor retornou ao seu saldo.';
    ELSE
      _title := 'Saque solicitado'; _body := 'O status do seu saque foi atualizado.';
    END IF;
    PERFORM public.notify_user(_row.user_id, 'withdrawal', _title, _body, 'withdrawal',
      CASE WHEN _status = 'rejected' THEN 'high' ELSE 'normal' END, NULL);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_task_submission(_id uuid, _approve boolean, _reason text DEFAULT NULL::text, _amount numeric DEFAULT NULL::numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _row public.task_submissions%ROWTYPE;
  _reward NUMERIC; _label TEXT; _cat text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  SELECT * INTO _row FROM public.task_submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Envio não encontrado'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'Envio já foi revisado'; END IF;

  _label := CASE
    WHEN _row.task_type = 'compartilhamento'
      THEN initcap(coalesce(_row.platform, 'Rede social')) || ' · Compartilhamento'
    ELSE 'RCS' END;
  _cat := CASE WHEN _row.task_type = 'compartilhamento' THEN 'share' ELSE 'rcs' END;

  IF _approve THEN
    IF _row.task_type = 'compartilhamento' THEN
      _reward := coalesce(_amount, 0.50);
      IF _reward NOT IN (0.30, 0.50, 0.70, 1.00) THEN RAISE EXCEPTION 'Valor de recompensa inválido'; END IF;
    ELSE
      _reward := 0.30;
    END IF;

    UPDATE public.task_submissions
      SET status = 'approved', reward_amount = _reward, reviewed_by = _uid, reviewed_at = now()
      WHERE id = _id;
    PERFORM public.credit_balance(_row.user_id, _reward, 'task_reward', _label || ' · Aprovado');
    PERFORM public.notify_user(_row.user_id, _cat, 'Tarefa aprovada',
      'Sua tarefa ' || _label || ' foi aprovada. R$ ' || to_char(_reward, 'FM999990.00') || ' foram adicionados ao seu saldo.',
      'task_approved', 'normal', NULL);
    PERFORM public.validate_referral_first_task(_row.user_id);
  ELSE
    UPDATE public.task_submissions
      SET status = 'rejected', rejection_reason = NULLIF(btrim(_reason), ''), reviewed_by = _uid, reviewed_at = now()
      WHERE id = _id;
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (_row.user_id, 'adjustment', 0, _label || ' · Reprovado');
    PERFORM public.notify_user(_row.user_id, _cat, 'Tarefa reprovada',
      'Sua tarefa ' || _label || ' foi reprovada.' ||
      CASE WHEN NULLIF(btrim(coalesce(_reason,'')),'') IS NULL THEN '' ELSE ' Motivo: ' || btrim(_reason) END,
      'task_rejected', 'high', NULL);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.submit_task_proof(_task_type task_type, _proof_path text, _link text DEFAULT NULL::text, _platform text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid(); _id UUID; _campaign uuid; _last timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _proof_path IS NULL OR length(btrim(_proof_path)) = 0 THEN RAISE EXCEPTION 'Comprovante obrigatório'; END IF;
  IF position((_uid::text || '/') IN _proof_path) <> 1 THEN RAISE EXCEPTION 'Caminho de comprovante inválido'; END IF;

  IF _task_type = 'compartilhamento' THEN
    IF _link IS NULL OR length(btrim(_link)) = 0 THEN RAISE EXCEPTION 'Link da publicação obrigatório'; END IF;
    IF _platform IS NULL OR _platform NOT IN ('facebook','instagram','x','tiktok','kwai') THEN
      RAISE EXCEPTION 'Plataforma inválida'; END IF;

    SELECT max(created_at) INTO _last FROM public.task_submissions
     WHERE user_id = _uid AND task_type = 'compartilhamento'
       AND lower(coalesce(platform,'')) = _platform
       AND created_at > now() - interval '24 hours';
    IF _last IS NOT NULL THEN
      RAISE EXCEPTION 'Você já enviou esta campanha nas últimas 24 horas. Aguarde a renovação.'; END IF;

    SELECT id INTO _campaign FROM public.share_campaigns
     WHERE lower(platform) = _platform AND active ORDER BY created_at DESC LIMIT 1;
  END IF;

  INSERT INTO public.task_submissions (user_id, task_type, proof_path, link, platform, campaign_id)
  VALUES (_uid, _task_type, btrim(_proof_path), NULLIF(btrim(_link), ''), _platform, _campaign)
  RETURNING id INTO _id;

  PERFORM public.notify_user(_uid,
    CASE WHEN _task_type = 'compartilhamento' THEN 'share' ELSE 'rcs' END,
    'Tarefa enviada para análise',
    CASE WHEN _task_type = 'compartilhamento'
      THEN 'Seu comprovante de ' || initcap(_platform) || ' foi enviado e está em análise.'
      ELSE 'Seu comprovante da tarefa RCS foi enviado e está em análise.' END,
    'task_pending', 'normal', NULL);

  RETURN _id;
END $function$;

CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
 RETURNS TABLE(amount numeric, day integer, cycle_completed boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _s public.checkin_settings%ROWTYPE;
        _p public.checkin_progress%ROWTYPE; _today date; _day int; _amount numeric;
        _completed boolean := false; _next int; _cycles int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _s FROM public.checkin_settings WHERE id;
  IF NOT coalesce(_s.active, true) THEN RAISE EXCEPTION 'Check-in diário indisponível no momento'; END IF;

  _today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  INSERT INTO public.checkin_progress (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO _p FROM public.checkin_progress WHERE user_id = _uid FOR UPDATE;

  IF _p.last_checkin_date = _today THEN RAISE EXCEPTION 'Check-in já realizado hoje'; END IF;

  _day := least(greatest(coalesce(_p.current_day, 1), 1), 7);
  IF _p.last_checkin_date IS NOT NULL AND _p.last_checkin_date < _today - 1 THEN _day := 1; END IF;

  _amount := coalesce(_s.rewards[_day], 0.05);
  _cycles := coalesce(_p.cycles_completed, 0);
  IF _day >= 7 THEN _completed := true; _next := 1; _cycles := _cycles + 1;
  ELSE _next := _day + 1; END IF;

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

  PERFORM public.notify_user(_uid, 'checkin', 'Check-in realizado',
    'Você recebeu R$ ' || to_char(_amount, 'FM999990.00') || ' pelo check-in diário (Dia ' || _day || ').',
    'checkin', 'normal', NULL);
  IF _completed THEN
    PERFORM public.notify_user(_uid, 'checkin', 'Sequência de 7 dias concluída',
      'Parabéns! Você completou o ciclo de 7 dias. Seu ciclo foi reiniciado no Dia 1.',
      'checkin', 'normal', NULL);
  END IF;

  RETURN QUERY SELECT _amount, _day, _completed;
END $function$;

CREATE OR REPLACE FUNCTION public.validate_referral_first_task(_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _r public.referrals%ROWTYPE; _referred_name text;
BEGIN
  SELECT * INTO _r FROM public.referrals WHERE referred_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF _r.first_task_at IS NULL THEN
    UPDATE public.referrals SET first_task_at = now() WHERE id = _r.id; END IF;
  IF _r.status <> 'pending' THEN RETURN; END IF;

  SELECT name INTO _referred_name FROM public.profiles WHERE id = _user_id;
  UPDATE public.referrals
     SET status = 'valid', validated_at = now(), commission_amount = 0.50,
         first_task_at = coalesce(first_task_at, now())
   WHERE id = _r.id;
  PERFORM public.credit_balance(_r.referrer_id, 0.50, 'referral_commission',
    'Comissão por indicação válida: ' || coalesce(_referred_name, 'novo usuário'));
  PERFORM public.notify_user(_r.referrer_id, 'referral', 'Novo indicado aprovado',
    'Um novo indicado válido foi contabilizado (' || coalesce(_referred_name, 'novo usuário') || '). R$ 0,50 de comissão creditados.',
    'referral', 'normal', NULL);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_review_referral(_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    PERFORM public.notify_user(_r.referrer_id, 'referral', 'Indicação aprovada',
      'Sua indicação (' || coalesce(_name, 'novo usuário') || ') foi aprovada. R$ 0,50 creditados no saldo.',
      'referral', 'normal', NULL);
  ELSIF _action = 'reject' THEN
    IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
    IF _r.status = 'valid' THEN
      PERFORM public.credit_balance(_r.referrer_id, -_r.commission_amount, 'adjustment',
        'Estorno de comissão de indicação rejeitada');
    END IF;
    UPDATE public.referrals SET status = 'rejected', review_reason = btrim(_reason),
      commission_amount = 0, validated_at = NULL WHERE id = _id;
    PERFORM public.notify_user(_r.referrer_id, 'referral', 'Indicação rejeitada',
      'Uma indicação sua foi rejeitada. Motivo: ' || btrim(_reason), 'referral', 'high', NULL);
  ELSE
    RAISE EXCEPTION 'Ação inválida';
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.claim_referral_bonus(_period text, _target integer, _amount numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  PERFORM public.notify_user(_uid, 'referral', 'Bônus resgatado',
    'Você resgatou o bônus ' || CASE WHEN _period = 'daily' THEN 'diário' ELSE 'semanal' END ||
    ' de ' || _target || ' convites: R$ ' || to_char(_amount, 'FM999990.00') || '.',
    'bonus', 'normal', NULL);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status account_status, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF _status <> 'active' AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RAISE EXCEPTION 'Motivo obrigatório'; END IF;
  UPDATE public.profiles SET account_status = _status, status_reason = NULLIF(btrim(_reason), '')
   WHERE id = _user_id;

  IF _status = 'active' THEN
    PERFORM public.notify_user(_user_id, 'account', 'Conta desbloqueada',
      'Sua conta foi reativada. Você já pode voltar a realizar tarefas.', 'account', 'high', NULL);
  ELSE
    PERFORM public.notify_user(_user_id, 'account',
      CASE WHEN _status = 'suspended' THEN 'Conta suspensa' ELSE 'Conta bloqueada' END,
      'Motivo: ' || btrim(_reason), 'account', 'high', NULL);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _code text := upper(btrim(coalesce(NEW.raw_user_meta_data->>'invite','')));
  _ip text := NULLIF(btrim(coalesce(NEW.raw_user_meta_data->>'ip','')), '');
  _device text := NULLIF(btrim(coalesce(NEW.raw_user_meta_data->>'device','')), '');
  _ua text := NULLIF(btrim(coalesce(NEW.raw_user_meta_data->>'ua','')), '');
  _phone text := NULLIF(regexp_replace(coalesce(NEW.raw_user_meta_data->>'phone',''), '\D', '', 'g'), '');
  _referrer uuid; _reasons text[] := '{}'; _recent int; _new_name text;
BEGIN
  INSERT INTO public.profiles (id, name, phone, referred_by, email, signup_ip, device_id, user_agent)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'phone',
          NULLIF(_code, ''), NEW.email, _ip, _device, _ua);

  PERFORM public.notify_user(NEW.id, 'account', 'Cadastro concluído',
    'Bem-vindo à Infinity Gain! Conclua sua primeira tarefa para começar a ganhar.', 'account', 'normal', NULL);

  IF _code <> '' THEN
    SELECT id INTO _referrer FROM public.profiles WHERE upper(invite_code) = _code AND id <> NEW.id LIMIT 1;
    IF _referrer IS NOT NULL THEN
      IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id <> NEW.id AND signup_ip = _ip) THEN
        _reasons := _reasons || 'Mesmo endereço IP'; END IF;
      IF _device IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id <> NEW.id AND device_id = _device) THEN
        _reasons := _reasons || 'Mesmo dispositivo'; END IF;
      IF _phone IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id <> NEW.id AND regexp_replace(coalesce(phone,''), '\D', '', 'g') = _phone
      ) THEN _reasons := _reasons || 'Mesmo telefone'; END IF;
      IF _ip IS NOT NULL THEN
        SELECT count(*) INTO _recent FROM public.profiles
         WHERE id <> NEW.id AND signup_ip = _ip AND created_at > now() - interval '24 hours';
        IF _recent >= 3 THEN _reasons := _reasons || 'Muitas contas criadas rapidamente'; END IF;
      END IF;

      INSERT INTO public.referrals (referrer_id, referred_id, invite_code, status, fraud_reason)
      VALUES (_referrer, NEW.id, _code,
              CASE WHEN array_length(_reasons,1) > 0 THEN 'suspicious'::public.referral_status ELSE 'pending'::public.referral_status END,
              CASE WHEN array_length(_reasons,1) > 0 THEN array_to_string(_reasons, ' • ') ELSE NULL END);

      _new_name := coalesce(NEW.raw_user_meta_data->>'name', 'novo usuário');
      PERFORM public.notify_user(_referrer, 'referral', 'Novo indicado cadastrado',
        _new_name || ' se cadastrou com seu código. A indicação fica pendente até a primeira tarefa aprovada.',
        'referral', 'normal', NULL);
    END IF;
  END IF;
  RETURN NEW;
END $function$;
