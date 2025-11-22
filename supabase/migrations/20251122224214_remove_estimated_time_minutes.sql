-- Migration: Remove estimated_time_minutes column from exercises table
-- This field was deemed unnecessary and is being removed to simplify the schema

-- Drop the column (if it exists)
ALTER TABLE exercises DROP COLUMN IF EXISTS estimated_time_minutes;
