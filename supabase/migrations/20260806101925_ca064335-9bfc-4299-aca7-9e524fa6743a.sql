REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon;
REVOKE DELETE, TRUNCATE ON public.profiles FROM authenticated;
REVOKE TRUNCATE ON public.withdrawals, public.task_submissions, public.checkin_progress, public.checkin_history FROM anon, authenticated;