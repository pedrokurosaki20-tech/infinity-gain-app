
-- Enums
CREATE TYPE public.task_type AS ENUM ('rcs', 'compartilhamento');
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Table
CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type public.task_type NOT NULL,
  proof_path TEXT NOT NULL,
  link TEXT,
  platform TEXT,
  status public.submission_status NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.task_submissions TO authenticated;
GRANT ALL ON public.task_submissions TO service_role;

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions"
  ON public.task_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all submissions"
  ON public.task_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserts and updates go through SECURITY DEFINER RPCs; no direct INSERT/UPDATE/DELETE.

CREATE TRIGGER update_task_submissions_updated_at
  BEFORE UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_task_submissions_type_status ON public.task_submissions (task_type, status, created_at DESC);
CREATE INDEX idx_task_submissions_user ON public.task_submissions (user_id, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;

-- Submit RPC
CREATE OR REPLACE FUNCTION public.submit_task_proof(
  _task_type public.task_type,
  _proof_path TEXT,
  _link TEXT DEFAULT NULL,
  _platform TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF _proof_path IS NULL OR length(btrim(_proof_path)) = 0 THEN
    RAISE EXCEPTION 'Comprovante obrigatório';
  END IF;

  -- Enforce path prefix so we can't spoof another user's file
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
  END IF;

  INSERT INTO public.task_submissions (user_id, task_type, proof_path, link, platform)
  VALUES (_uid, _task_type, btrim(_proof_path), NULLIF(btrim(_link), ''), _platform)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_task_proof(public.task_type, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_task_proof(public.task_type, TEXT, TEXT, TEXT) TO authenticated;

-- Review RPC (admin only). Credits balance atomically on approval.
CREATE OR REPLACE FUNCTION public.review_task_submission(
  _id UUID,
  _approve BOOLEAN,
  _reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.task_submissions%ROWTYPE;
  _reward NUMERIC;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;

  SELECT * INTO _row FROM public.task_submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Envio não encontrado';
  END IF;
  IF _row.status <> 'pending' THEN
    RAISE EXCEPTION 'Envio já foi revisado';
  END IF;

  IF _approve THEN
    _reward := CASE _row.task_type
      WHEN 'rcs' THEN 0.30
      WHEN 'compartilhamento' THEN 0.50
    END;

    UPDATE public.task_submissions
      SET status = 'approved',
          reward_amount = _reward,
          reviewed_by = _uid,
          reviewed_at = now()
      WHERE id = _id;

    UPDATE public.profiles
      SET balance = balance + _reward,
          total_earnings = total_earnings + _reward
      WHERE id = _row.user_id;
  ELSE
    UPDATE public.task_submissions
      SET status = 'rejected',
          rejection_reason = NULLIF(btrim(_reason), ''),
          reviewed_by = _uid,
          reviewed_at = now()
      WHERE id = _id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_task_submission(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_task_submission(UUID, BOOLEAN, TEXT) TO authenticated;

-- Storage policies for task-proofs bucket
-- Path convention: <user_id>/<filename>
CREATE POLICY "Users upload own task proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own task proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all task proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-proofs'
    AND public.has_role(auth.uid(), 'admin')
  );
