-- 1) Profiles: restrict column-level writes (balance/total_earnings not writable)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, phone, pix_key, pix_type, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) Tables whose writes must go only through SECURITY DEFINER RPCs
REVOKE INSERT, UPDATE, DELETE ON public.checkin_progress FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.checkin_history FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.checkin_settings FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.task_submissions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.withdrawals FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.referrals FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.referral_bonus_claims FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.share_campaign_logs FROM authenticated, anon;
REVOKE INSERT ON public.notifications FROM authenticated, anon;

GRANT ALL ON public.checkin_progress TO service_role;
GRANT ALL ON public.checkin_history TO service_role;
GRANT ALL ON public.checkin_settings TO service_role;
GRANT ALL ON public.task_submissions TO service_role;
GRANT ALL ON public.withdrawals TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.referrals TO service_role;
GRANT ALL ON public.referral_bonus_claims TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.share_campaign_logs TO service_role;
GRANT ALL ON public.notifications TO service_role;

-- 3) No unauthenticated execution of any public routine
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- 4) Internal-only routines: not callable by signed-in users either
REVOKE ALL ON FUNCTION public.credit_balance(uuid, numeric, txn_type, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.validate_referral_first_task(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.gen_invite_code() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_balance_change() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;