-- garante 1 campanha por plataforma
DELETE FROM public.share_campaigns a
 USING public.share_campaigns b
 WHERE lower(a.platform) = lower(b.platform) AND a.created_at < b.created_at;
UPDATE public.share_campaigns SET platform = lower(platform);
CREATE UNIQUE INDEX IF NOT EXISTS share_campaigns_platform_key ON public.share_campaigns (lower(platform));

CREATE TABLE IF NOT EXISTS public.share_campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.share_campaigns(id) ON DELETE SET NULL,
  platform text NOT NULL,
  action text NOT NULL,
  admin_id uuid,
  admin_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_campaign_logs TO authenticated;
GRANT ALL ON public.share_campaign_logs TO service_role;

ALTER TABLE public.share_campaign_logs ENABLE ROW LEVEL SECURITY;

DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                  AND tablename='share_campaign_logs' AND policyname='Admins view campaign logs') THEN
    CREATE POLICY "Admins view campaign logs" ON public.share_campaign_logs
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $pol$;

DROP FUNCTION IF EXISTS public.admin_list_share_campaigns();
DROP FUNCTION IF EXISTS public.admin_save_share_campaign(text,text,text,text,text,text,boolean);

CREATE OR REPLACE FUNCTION public.admin_list_share_campaigns()
RETURNS TABLE(id uuid, platform text, title text, text_content text, file_url text,
              file_type text, share_url text, active boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, lower(c.platform), c.title, c.text_content, c.file_url,
         c.file_type, c.share_url, c.active, c.updated_at
    FROM public.share_campaigns c
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY c.platform;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_share_campaign(
  _platform text, _title text, _text_content text, _share_url text,
  _file_url text, _file_type text, _active boolean)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _id uuid; _old public.share_campaigns%ROWTYPE;
        _name text; _actions text[] := '{}';
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF lower(coalesce(_platform,'')) NOT IN ('facebook','instagram','x','tiktok','kwai') THEN
    RAISE EXCEPTION 'Plataforma inválida';
  END IF;
  IF coalesce(_file_type,'image') NOT IN ('image','video') THEN RAISE EXCEPTION 'Tipo de arquivo inválido'; END IF;

  SELECT name INTO _name FROM public.profiles WHERE id = _uid;
  SELECT * INTO _old FROM public.share_campaigns WHERE lower(platform) = lower(_platform);

  IF FOUND THEN
    IF coalesce(_old.text_content,'') IS DISTINCT FROM coalesce(_text_content,'') THEN
      _actions := _actions || 'Substituiu o texto'; END IF;
    IF coalesce(_old.file_url,'') IS DISTINCT FROM coalesce(_file_url,'') THEN
      _actions := _actions || CASE WHEN coalesce(_file_url,'') = '' THEN 'Removeu o arquivo' ELSE 'Trocou o arquivo' END; END IF;
    IF coalesce(_old.share_url,'') IS DISTINCT FROM coalesce(_share_url,'') THEN
      _actions := _actions || 'Alterou o link oficial'; END IF;
    IF coalesce(_old.title,'') IS DISTINCT FROM coalesce(_title,'') THEN
      _actions := _actions || 'Alterou o título'; END IF;
    IF _old.active IS DISTINCT FROM _active THEN
      _actions := _actions || CASE WHEN _active THEN 'Ativou a campanha' ELSE 'Desativou a campanha' END; END IF;
    IF coalesce(_old.file_type,'') IS DISTINCT FROM coalesce(_file_type,'image') THEN
      _actions := _actions || 'Alterou o tipo de mídia'; END IF;

    UPDATE public.share_campaigns
       SET title = NULLIF(btrim(_title), ''),
           text_content = coalesce(_text_content, ''),
           share_url = NULLIF(btrim(_share_url), ''),
           file_url = NULLIF(btrim(_file_url), ''),
           file_type = coalesce(_file_type, 'image'),
           active = coalesce(_active, true),
           updated_at = now()
     WHERE id = _old.id
     RETURNING id INTO _id;
  ELSE
    INSERT INTO public.share_campaigns (platform, title, text_content, share_url, file_url, file_type, active)
    VALUES (lower(_platform), NULLIF(btrim(_title), ''), coalesce(_text_content, ''),
            NULLIF(btrim(_share_url), ''), NULLIF(btrim(_file_url), ''),
            coalesce(_file_type, 'image'), coalesce(_active, true))
    RETURNING id INTO _id;
    _actions := _actions || 'Criou a campanha';
  END IF;

  IF array_length(_actions, 1) > 0 THEN
    INSERT INTO public.share_campaign_logs (campaign_id, platform, action, admin_id, admin_name)
    VALUES (_id, lower(_platform), array_to_string(_actions, ' • '), _uid, _name);
  END IF;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_share_campaigns() FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_save_share_campaign(text,text,text,text,text,text,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_share_campaigns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_share_campaign(text,text,text,text,text,text,boolean) TO authenticated;