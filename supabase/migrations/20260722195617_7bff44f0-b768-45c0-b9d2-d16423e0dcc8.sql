
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric,
  _pix_key text,
  _pix_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF _amount > 100000 THEN
    RAISE EXCEPTION 'Valor máximo por saque é R$ 100.000,00';
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

  -- Rate limit: 1 saque a cada 24h
  SELECT max(created_at) INTO _last_at
  FROM public.withdrawals
  WHERE user_id = _uid
    AND created_at > now() - interval '24 hours';

  IF _last_at IS NOT NULL THEN
    RAISE EXCEPTION 'Você já solicitou um saque nas últimas 24 horas. Tente novamente após %',
      to_char(_last_at + interval '24 hours' AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI');
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

  INSERT INTO public.withdrawals (user_id, amount, fee, net_amount, pix_key, pix_type)
  VALUES (_uid, _amount, _fee, _net, _pix_clean, _pix_type)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;
