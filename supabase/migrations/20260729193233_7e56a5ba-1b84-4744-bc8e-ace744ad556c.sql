ALTER TABLE public.withdrawals ALTER COLUMN status SET DEFAULT 'requested'::withdrawal_status;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _pix_key text, _pix_type text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current_balance numeric;
  _fee numeric;
  _net numeric;
  _id uuid;
  _last_at timestamptz;
  _pix_clean text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount < 10 THEN
    RAISE EXCEPTION 'Valor mínimo de saque é R$ 10,00';
  END IF;
  IF _amount > 100 THEN
    RAISE EXCEPTION 'Valor máximo por saque é R$ 100,00';
  END IF;
  IF _pix_key IS NULL OR length(btrim(_pix_key)) = 0 THEN
    RAISE EXCEPTION 'Chave PIX obrigatória';
  END IF;
  IF _pix_type NOT IN ('CPF','Telefone') THEN
    RAISE EXCEPTION 'Tipo de chave PIX inválido';
  END IF;

  _pix_clean := btrim(_pix_key);
  IF _pix_type = 'CPF' AND length(regexp_replace(_pix_clean, '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido: informe 11 dígitos';
  END IF;
  IF _pix_type = 'Telefone' AND length(regexp_replace(_pix_clean, '\D', '', 'g')) NOT BETWEEN 10 AND 13 THEN
    RAISE EXCEPTION 'Telefone inválido: informe DDD + número';
  END IF;

  SELECT max(created_at) INTO _last_at
  FROM public.withdrawals
  WHERE user_id = _uid
    AND created_at > now() - interval '24 hours';

  IF _last_at IS NOT NULL THEN
    RAISE EXCEPTION 'Você já possui um saque recente. Aguarde o término da contagem regressiva para realizar uma nova solicitação.';
  END IF;

  SELECT balance INTO _current_balance
  FROM public.profiles
  WHERE id = _uid
  FOR UPDATE;

  IF _current_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;
  IF _amount > _current_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  _fee := round((_amount * 0.05)::numeric, 2);
  _net := round((_amount - _fee)::numeric, 2);

  UPDATE public.profiles
  SET balance = balance - _amount
  WHERE id = _uid;

  INSERT INTO public.withdrawals (user_id, amount, fee, net_amount, pix_key, pix_type, status)
  VALUES (_uid, _amount, _fee, _net, _pix_clean, _pix_type, 'requested')
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_withdrawal(_id uuid, _status withdrawal_status, _reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.withdrawals%ROWTYPE;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;

  SELECT * INTO _row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF _status = 'rejected' AND (_reason IS NULL OR length(btrim(_reason)) = 0) THEN
    RAISE EXCEPTION 'Motivo da rejeição é obrigatório';
  END IF;

  IF _status = 'rejected' AND _row.status <> 'rejected' THEN
    UPDATE public.profiles SET balance = balance + _row.amount WHERE id = _row.user_id;
  END IF;

  IF _status <> 'rejected' AND _row.status = 'rejected' THEN
    UPDATE public.profiles SET balance = balance - _row.amount WHERE id = _row.user_id;
  END IF;

  UPDATE public.withdrawals
  SET status = _status,
      rejection_reason = CASE WHEN _status = 'rejected' THEN btrim(_reason) ELSE NULL END,
      updated_at = now()
  WHERE id = _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.review_withdrawal(uuid, withdrawal_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_withdrawal(uuid, withdrawal_status, text) TO authenticated;