
CREATE TABLE IF NOT EXISTS public.share_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  title text,
  text_content text NOT NULL DEFAULT '',
  file_url text,
  file_type text NOT NULL DEFAULT 'image',
  share_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_campaigns TO authenticated;
GRANT ALL ON public.share_campaigns TO service_role;

ALTER TABLE public.share_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active campaigns" ON public.share_campaigns
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage campaigns" ON public.share_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.share_campaigns TO authenticated;

DROP TRIGGER IF EXISTS update_share_campaigns_updated_at ON public.share_campaigns;
CREATE TRIGGER update_share_campaigns_updated_at
BEFORE UPDATE ON public.share_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_submissions ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.share_campaigns(id) ON DELETE SET NULL;

INSERT INTO public.share_campaigns (platform, title, text_content, file_type, share_url, active)
SELECT 'facebook', 'Campanha Facebook',
'🚀 Ganhe dinheiro todos os dias com a Infinity Gain!

Complete tarefas simples pelo celular e receba via PIX.

Cadastre-se agora e comece a ganhar 👇',
'image', 'https://www.facebook.com/sharer/sharer.php', true
WHERE NOT EXISTS (SELECT 1 FROM public.share_campaigns WHERE platform = 'facebook');

-- Estado da campanha por usuário (disponibilidade + cronômetro)
CREATE OR REPLACE FUNCTION public.share_campaign_state(_platform text)
RETURNS TABLE(
  campaign_id uuid,
  platform text,
  title text,
  text_content text,
  file_url text,
  file_type text,
  share_url text,
  available boolean,
  next_available_at timestamptz,
  last_status submission_status
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _last public.task_submissions%ROWTYPE; _c public.share_campaigns%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO _c FROM public.share_campaigns
   WHERE lower(share_campaigns.platform) = lower(_platform) AND active
   ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO _last FROM public.task_submissions
   WHERE user_id = _uid AND task_type = 'compartilhamento'
     AND lower(coalesce(task_submissions.platform,'')) = lower(_platform)
   ORDER BY created_at DESC LIMIT 1;

  RETURN QUERY SELECT
    _c.id, lower(_platform), _c.title, _c.text_content, _c.file_url,
    coalesce(_c.file_type,'image'), _c.share_url,
    (_last.id IS NULL OR _last.created_at <= now() - interval '24 hours'),
    CASE WHEN _last.id IS NULL THEN NULL ELSE _last.created_at + interval '24 hours' END,
    _last.status;
END $$;

-- Envio com bloqueio de 24h por plataforma
CREATE OR REPLACE FUNCTION public.submit_task_proof(_task_type task_type, _proof_path text, _link text DEFAULT NULL::text, _platform text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID;
  _campaign uuid;
  _last timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  IF _proof_path IS NULL OR length(btrim(_proof_path)) = 0 THEN
    RAISE EXCEPTION 'Comprovante obrigatório';
  END IF;

  IF position((_uid::text || '/') IN _proof_path) <> 1 THEN
    RAISE EXCEPTION 'Caminho de comprovante inválido';
  END IF;

  IF _task_type = 'compartilhamento' THEN
    IF _link IS NULL OR length(btrim(_link)) = 0 THEN
      RAISE EXCEPTION 'Link da publicação obrigatório';
    END IF;
    IF _platform IS NULL OR _platform NOT IN ('facebook','instagram','x','tiktok','kwai') THEN
      RAISE EXCEPTION 'Plataforma inválida';
    END IF;

    SELECT max(created_at) INTO _last FROM public.task_submissions
     WHERE user_id = _uid AND task_type = 'compartilhamento'
       AND lower(coalesce(platform,'')) = _platform
       AND created_at > now() - interval '24 hours';
    IF _last IS NOT NULL THEN
      RAISE EXCEPTION 'Você já enviou esta campanha nas últimas 24 horas. Aguarde a renovação.';
    END IF;

    SELECT id INTO _campaign FROM public.share_campaigns
     WHERE lower(platform) = _platform AND active ORDER BY created_at DESC LIMIT 1;
  END IF;

  INSERT INTO public.task_submissions (user_id, task_type, proof_path, link, platform, campaign_id)
  VALUES (_uid, _task_type, btrim(_proof_path), NULLIF(btrim(_link), ''), _platform, _campaign)
  RETURNING id INTO _id;

  RETURN _id;
END $$;

-- Revisão com valor de recompensa escolhido pelo admin
CREATE OR REPLACE FUNCTION public.review_task_submission(_id uuid, _approve boolean, _reason text DEFAULT NULL::text, _amount numeric DEFAULT NULL::numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.task_submissions%ROWTYPE;
  _reward NUMERIC;
  _label TEXT;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;
  SELECT * INTO _row FROM public.task_submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Envio não encontrado'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'Envio já foi revisado'; END IF;

  _label := CASE
    WHEN _row.task_type = 'compartilhamento'
      THEN initcap(coalesce(_row.platform, 'Rede social')) || ' · Compartilhamento'
    ELSE 'RCS' END;

  IF _approve THEN
    IF _row.task_type = 'compartilhamento' THEN
      _reward := coalesce(_amount, 0.50);
      IF _reward NOT IN (0.30, 0.50, 0.70, 1.00) THEN
        RAISE EXCEPTION 'Valor de recompensa inválido';
      END IF;
    ELSE
      _reward := 0.30;
    END IF;

    UPDATE public.task_submissions
      SET status = 'approved', reward_amount = _reward, reviewed_by = _uid, reviewed_at = now()
      WHERE id = _id;
    PERFORM public.credit_balance(_row.user_id, _reward, 'task_reward', _label || ' · Aprovado');
    PERFORM public.validate_referral_first_task(_row.user_id);
  ELSE
    UPDATE public.task_submissions
      SET status = 'rejected', rejection_reason = NULLIF(btrim(_reason), ''), reviewed_by = _uid, reviewed_at = now()
      WHERE id = _id;
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (_row.user_id, 'adjustment', 0, _label || ' · Reprovado');
  END IF;
END $$;
