-- Migration: Add tutor configuration to classes table
-- Description: Enables per-class AI tutor settings including schedules, retention policies, and access controls
-- Created: 2025-11-26

-- Add tutor_config column to classes table
-- This JSONB column stores all tutor-related settings for each class
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS tutor_config JSONB DEFAULT '{
  "enabled": true,
  "schedule": {
    "monday": {"start": "07:00", "end": "22:00"},
    "tuesday": {"start": "07:00", "end": "22:00"},
    "wednesday": {"start": "07:00", "end": "22:00"},
    "thursday": {"start": "07:00", "end": "22:00"},
    "friday": {"start": "07:00", "end": "22:00"},
    "saturday": {"start": "09:00", "end": "18:00"},
    "sunday": {"start": "09:00", "end": "18:00"}
  },
  "historyRetentionDays": 30,
  "allowFreeChat": true,
  "maxHelpLevel": 7
}'::jsonb;

-- Add helpful documentation
COMMENT ON COLUMN classes.tutor_config IS 'AI tutor configuration for this class:
  - enabled (boolean): Whether tutor is active for this class
  - schedule (object): Weekly availability by day with start/end times (24h format)
  - historyRetentionDays (integer): How many days to keep conversation history
  - allowFreeChat (boolean): Allow students to chat without an active exercise
  - maxHelpLevel (integer): Maximum help level allowed (1-7, where 7 is highest assistance)';

-- Create index for querying tutor-enabled classes
CREATE INDEX IF NOT EXISTS idx_classes_tutor_enabled
ON classes ((tutor_config->>'enabled'))
WHERE (tutor_config->>'enabled')::boolean = true;

-- Grant necessary permissions (students/teachers need to read config)
-- Note: RLS policies on classes table already handle access control
