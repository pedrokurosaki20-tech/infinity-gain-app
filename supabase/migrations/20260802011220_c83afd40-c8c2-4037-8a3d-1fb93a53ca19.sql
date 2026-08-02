-- unique active campaign per platform helper
CREATE UNIQUE INDEX IF NOT EXISTS share_campaigns_platform_uidx ON public.share_campaigns (lower(platform));

INSERT INTO public.share_campaigns (platform, title, text_content, file_type, active)
SELECT p, initcap(p) || ' · Campanha oficial', '', 'image', true
FROM unnest(ARRAY['facebook','instagram','x','tiktok','kwai']) AS p
WHERE NOT EXISTS (SELECT 1 FROM public.share_campaigns c WHERE lower(c.platform) = p);

CREATE TABLE IF NOT EXISTS public.share_campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.share_campaigns(id) ON DELETE SET NULL,
  platform text NOT NULL,
  admin_id uuid,
  admin_name text,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_campaign_logs TO authenticated;
GRANT ALL ON public.share_campaign_logs TO service_role;
ALTER TABLE public.share_campaign_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view campaign logs" ON public.share_campaign_logs;
CREATE POLICY "Admins view campaign logs" ON public.share_campaign_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_save_share_campaign(
  _platform text,
  _title text,
  _text_content text,
  _share_url text,
  _file_url text,
  _file_type text,
  _active boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _p text := lower(btrim(_platform));
  _old public.share_campaigns%ROWTYPE;
  _id uuid;
  _actions text[] := '{}';
  _name text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF _p NOT IN ('facebook','instagram','x','tiktok','kwai') THEN RAISE EXCEPTION 'Plataforma inválida'; END IF;
  IF coalesce(_file_type,'image') NOT IN ('image','video') THEN RAISE EXCEPTION 'Tipo de arquivo inválido'; END IF;

  SELECT name INTO _name FROM public.profiles WHERE id = _uid;
  SELECT * INTO _old FROM public.share_campaigns WHERE lower(platform) = _p LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.share_campaigns (platform, title, text_content, share_url, file_url, file_type, active)
    VALUES (_p, NULLIF(btrim(_title),''), coalesce(_text_content,''), NULLIF(btrim(_share_url),''),
            NULLIF(btrim(_file_url),''), coalesce(_file_type,'image'), coalesce(_active,true))
    RETURNING id INTO _id;
    _actions := _actions || 'criou a campanha';
  ELSE
    _id := _old.id;
    IF coalesce(_old.title,'') IS DISTINCT FROM coalesce(NULLIF(btrim(_title),''),'') THEN _actions := _actions || 'alterou o título'; END IF;
    IF coalesce(_old.text_content,'') IS DISTINCT FROM coalesce(_text_content,'') THEN _actions := _actions || 'substituiu o texto'; END IF;
    IF coalesce(_old.share_url,'') IS DISTINCT FROM coalesce(NULLIF(btrim(_share_url),''),'') THEN _actions := _actions || 'alterou o link oficial'; END IF;
    IF coalesce(_old.file_url,'') IS DISTINCT FROM coalesce(NULLIF(btrim(_file_url),''),'') THEN
      IF NULLIF(btrim(coalesce(_file_url,'')),'') IS NULL THEN _actions := _actions || 'removeu o arquivo';
      ELSE _actions := _actions || ('trocou o ' || coalesce(_file_type,'image')); END IF;
    END IF;
    IF _old.file_type IS DISTINCT FROM coalesce(_file_type,'image') THEN _actions := _actions || ('definiu o formato como ' || coalesce(_file_type,'image')); END IF;
    IF _old.active IS DISTINCT FROM coalesce(_active,true) THEN
      _actions := _actions || CASE WHEN coalesce(_active,true) THEN 'ativou a campanha' ELSE 'desativou a campanha' END;
    END IF;

    UPDATE public.share_campaigns
       SET title = NULLIF(btrim(_title),''),
           text_content = coalesce(_text_content,''),
           share_url = NULLIF(btrim(_share_url),''),
           file_url = NULLIF(btrim(_file_url),''),
           file_type = coalesce(_file_type,'image'),
           active = coalesce(_active,true),
           updated_at = now()
     WHERE id = _id;
  END IF;

  IF array_length(_actions,1) > 0 THEN
    INSERT INTO public.share_campaign_logs (campaign_id, platform, admin_id, admin_name, action, details)
    VALUES (_id, _p, _uid, _name, array_to_string(_actions, ' • '),
            'Administrador ' || coalesce(_name,'') || ' ' || array_to_string(_actions, ' • ') || ' de ' || initcap(_p));
  END IF;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.admin_save_share_campaign(text,text,text,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_share_campaign(text,text,text,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_share_campaigns()
RETURNS SETOF public.share_campaigns
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM public.share_campaigns
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY platform;
$$;

REVOKE ALL ON FUNCTION public.admin_list_share_campaigns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_share_campaigns() TO authenticated;