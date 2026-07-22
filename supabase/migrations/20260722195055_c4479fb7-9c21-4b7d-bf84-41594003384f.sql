
REVOKE ALL ON FUNCTION public.prevent_profile_balance_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
