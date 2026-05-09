-- Add avatar_url column to profiles for profile picture storage (base64 data URL)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
