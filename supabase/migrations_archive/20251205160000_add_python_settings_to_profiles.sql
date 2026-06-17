-- Add python_settings JSONB column to profiles table
-- Stores Python playground preferences (theme, fontSize, pedagogicErrors)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS python_settings JSONB
DEFAULT '{"editorTheme":"default","fontSize":14,"showPedagogicErrors":true}'::jsonb;

COMMENT ON COLUMN profiles.python_settings IS 'Python playground preferences (editorTheme, fontSize, showPedagogicErrors)';
