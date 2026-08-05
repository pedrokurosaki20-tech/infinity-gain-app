CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics(_from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tz text := 'America/Sao_Paulo';
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _f date; _t date; _fs timestamptz; _ts timestamptz;
  _week_start date; _month_start date;
  _res jsonb;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;

  _f := coalesce(_from, _today - 6);
  _t := coalesce(_to, _today);
  IF _f > _t THEN RAISE EXCEPTION 'Período inválido'; END IF;
  _fs := (_f::timestamp) AT TIME ZONE _tz;
  _ts := ((_t + 1)::timestamp) AT TIME ZONE _tz;
  _week_start := date_trunc('week', _today::timestamp)::date;
  _month_start := date_trunc('month', _today::timestamp)::date;

  SELECT jsonb_build_object(
    'range', jsonb_build_object('from', _f, 'to', _t),

    'users', (SELECT jsonb_build_object(
        'total', count(*),
        'in_range', count(*) FILTER (WHERE created_at >= _fs AND created_at < _ts),
        'new_today', count(*) FILTER (WHERE (created_at AT TIME ZONE _tz)::date = _today),
        'blocked', count(*) FILTER (WHERE account_status = 'blocked'),
        'suspended', count(*) FILTER (WHERE account_status = 'suspended')
      ) FROM public.profiles),

    'active_today', (SELECT count(DISTINCT u) FROM (
        SELECT user_id u FROM public.task_submissions WHERE (created_at AT TIME ZONE _tz)::date = _today
        UNION SELECT user_id FROM public.checkin_history WHERE checkin_date = _today
        UNION SELECT user_id FROM public.transactions WHERE (created_at AT TIME ZONE _tz)::date = _today
      ) s),

    'blocked_recent', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'name', name, 'email', email,
          'status', account_status, 'reason', status_reason, 'at', updated_at) ORDER BY updated_at DESC), '[]'::jsonb)
        FROM (SELECT * FROM public.profiles
               WHERE account_status <> 'active' AND updated_at > now() - interval '7 days'
               ORDER BY updated_at DESC LIMIT 10) b),

    'finance', (SELECT jsonb_build_object(
        'distributed', coalesce(sum(total_earnings), 0)
      ) FROM public.profiles),

    'withdrawals', (SELECT jsonb_build_object(
        'total', count(*),
        'in_range', count(*) FILTER (WHERE created_at >= _fs AND created_at < _ts),
        'pending', count(*) FILTER (WHERE status = 'requested'),
        'processing', count(*) FILTER (WHERE status = 'processing'),
        'completed', count(*) FILTER (WHERE status = 'completed'),
        'rejected', count(*) FILTER (WHERE status = 'rejected'),
        'paid_today', coalesce(sum(net_amount) FILTER (WHERE status = 'completed' AND (updated_at AT TIME ZONE _tz)::date = _today), 0),
        'paid_week', coalesce(sum(net_amount) FILTER (WHERE status = 'completed' AND (updated_at AT TIME ZONE _tz)::date >= _week_start), 0),
        'paid_month', coalesce(sum(net_amount) FILTER (WHERE status = 'completed' AND (updated_at AT TIME ZONE _tz)::date >= _month_start), 0),
        'paid_range', coalesce(sum(net_amount) FILTER (WHERE status = 'completed' AND updated_at >= _fs AND updated_at < _ts), 0)
      ) FROM public.withdrawals),

    'tasks', (SELECT jsonb_build_object(
        'share_pending', count(*) FILTER (WHERE task_type = 'compartilhamento' AND status = 'pending'),
        'share_approved', count(*) FILTER (WHERE task_type = 'compartilhamento' AND status = 'approved'),
        'share_rejected', count(*) FILTER (WHERE task_type = 'compartilhamento' AND status = 'rejected'),
        'rcs_pending', count(*) FILTER (WHERE task_type = 'rcs' AND status = 'pending'),
        'rcs_approved', count(*) FILTER (WHERE task_type = 'rcs' AND status = 'approved'),
        'rcs_rejected', count(*) FILTER (WHERE task_type = 'rcs' AND status = 'rejected'),
        'sent_today', count(*) FILTER (WHERE (created_at AT TIME ZONE _tz)::date = _today),
        'sent_range', count(*) FILTER (WHERE created_at >= _fs AND created_at < _ts),
        'pending_total', count(*) FILTER (WHERE status = 'pending')
      ) FROM public.task_submissions),

    'referrals', (SELECT jsonb_build_object(
        'total', count(*),
        'valid', count(*) FILTER (WHERE status = 'valid'),
        'pending', count(*) FILTER (WHERE status = 'pending'),
        'suspicious', count(*) FILTER (WHERE status = 'suspicious'),
        'in_range', count(*) FILTER (WHERE created_at >= _fs AND created_at < _ts)
      ) FROM public.referrals),

    'referral_bonus', (SELECT jsonb_build_object(
        'today', coalesce(sum(amount) FILTER (WHERE (created_at AT TIME ZONE _tz)::date = _today), 0),
        'week', coalesce(sum(amount) FILTER (WHERE (created_at AT TIME ZONE _tz)::date >= _week_start), 0)
      ) FROM public.referral_bonus_claims),

    'checkin', (SELECT jsonb_build_object(
        'today', count(*) FILTER (WHERE checkin_date = _today),
        'total_amount', coalesce(sum(amount), 0),
        'range_amount', coalesce(sum(amount) FILTER (WHERE checkin_date BETWEEN _f AND _t), 0)
      ) FROM public.checkin_history),

    'series', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'users', (SELECT count(*) FROM public.profiles p WHERE (p.created_at AT TIME ZONE _tz)::date = d.day),
        'paid', (SELECT coalesce(sum(w.net_amount), 0) FROM public.withdrawals w
                  WHERE w.status = 'completed' AND (w.updated_at AT TIME ZONE _tz)::date = d.day),
        'withdrawals', (SELECT count(*) FROM public.withdrawals w WHERE (w.created_at AT TIME ZONE _tz)::date = d.day),
        'approved', (SELECT count(*) FROM public.task_submissions t
                      WHERE t.status = 'approved' AND (t.reviewed_at AT TIME ZONE _tz)::date = d.day),
        'rejected', (SELECT count(*) FROM public.task_submissions t
                      WHERE t.status = 'rejected' AND (t.reviewed_at AT TIME ZONE _tz)::date = d.day)
      ) ORDER BY d.day), '[]'::jsonb)
      FROM (SELECT generate_series(greatest(_f, _t - 59), _t, interval '1 day')::date AS day) d
    )
  ) INTO _res;

  RETURN _res;
END $$;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics(date, date) TO authenticated;