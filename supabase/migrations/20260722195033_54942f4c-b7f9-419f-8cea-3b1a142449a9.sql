
-- 1) Prevent client-side edits to balance/total_earnings on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    NEW.balance := OLD.balance;
  END IF;
  IF NEW.total_earnings IS DISTINCT FROM OLD.total_earnings THEN
    NEW.total_earnings := OLD.total_earnings;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_balance ON public.profiles;
CREATE TRIGGER protect_profile_balance
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_balance_change();

-- 2) Server-side withdrawal request with atomic balance check + deduction
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount < 10 THEN
    RAISE EXCEPTION 'Valor mínimo de saque é R$ 10,00';
  END IF;
  IF _pix_key IS NULL OR length(btrim(_pix_key)) = 0 THEN
    RAISE EXCEPTION 'Chave PIX obrigatória';
  END IF;
  IF _pix_type NOT IN ('CPF','Telefone') THEN
    RAISE EXCEPTION 'Tipo de chave PIX inválido';
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
  VALUES (_uid, _amount, _fee, _net, btrim(_pix_key), _pix_type)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;

-- Remove client insert path so withdrawals must go through the function
DROP POLICY IF EXISTS "Users insert own withdrawals" ON public.withdrawals;

-- 3) Switch has_role to SECURITY INVOKER (relies on user_roles own-row select policy)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
