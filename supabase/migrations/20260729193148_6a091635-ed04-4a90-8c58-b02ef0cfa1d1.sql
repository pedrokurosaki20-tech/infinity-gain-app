ALTER TYPE public.withdrawal_status ADD VALUE IF NOT EXISTS 'requested' BEFORE 'processing';
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS rejection_reason text;