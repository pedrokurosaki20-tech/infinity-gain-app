CREATE OR REPLACE FUNCTION public.admin_save_share_campaign(_platform text, _title text, _text_content text, _share_url text, _file_url text, _file_type text, _active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _id uuid; _old public.share_campaigns%ROWTYPE;
        _name text; _actions text[] := ARRAY[]::text[]; _found boolean;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF lower(coalesce(_platform,'')) NOT IN ('facebook','instagram','x','tiktok','kwai') THEN
    RAISE EXCEPTION 'Plataforma inválida';
  END IF;
  IF coalesce(_file_type,'image') NOT IN ('image','video') THEN RAISE EXCEPTION 'Tipo de arquivo inválido'; END IF;

  SELECT name INTO _name FROM public.profiles WHERE id = _uid;
  SELECT * INTO _old FROM public.share_campaigns WHERE lower(platform) = lower(_platform);
  _found := FOUND;

  IF _found THEN
    IF coalesce(_old.text_content,'') IS DISTINCT FROM coalesce(_text_content,'') THEN
      _actions := _actions || 'Substituiu o texto'::text; END IF;
    IF coalesce(_old.file_url,'') IS DISTINCT FROM coalesce(_file_url,'') THEN
      _actions := _actions || (CASE WHEN coalesce(_file_url,'') = '' THEN 'Removeu o arquivo' ELSE 'Trocou o arquivo' END)::text; END IF;
    IF coalesce(_old.share_url,'') IS DISTINCT FROM coalesce(_share_url,'') THEN
      _actions := _actions || 'Alterou o link oficial'::text; END IF;
    IF coalesce(_old.title,'') IS DISTINCT FROM coalesce(_title,'') THEN
      _actions := _actions || 'Alterou o título'::text; END IF;
    IF _old.active IS DISTINCT FROM _active THEN
      _actions := _actions || (CASE WHEN _active THEN 'Ativou a campanha' ELSE 'Desativou a campanha' END)::text; END IF;
    IF coalesce(_old.file_type,'') IS DISTINCT FROM coalesce(_file_type,'image') THEN
      _actions := _actions || 'Alterou o tipo de mídia'::text; END IF;

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
    _actions := _actions || 'Criou a campanha'::text;
  END IF;

  IF coalesce(array_length(_actions, 1), 0) > 0 THEN
    INSERT INTO public.share_campaign_logs (campaign_id, platform, action, admin_id, admin_name)
    VALUES (_id, lower(_platform), array_to_string(_actions, ' • '), _uid, _name);
  END IF;

  RETURN _id;
END $function$;