
REVOKE EXECUTE ON FUNCTION public.referral_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_referral_bonus(text, int, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_referral(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid, public.account_status, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_referrals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.gen_invite_code() FROM anon, authenticated;
