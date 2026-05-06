-- Add department / title field to profiles
-- Allows any company member to record their team/role label for task reports.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';
