-- Migration: Add week configuration and timezone to schools
-- Description: Adds timezone column and extends timetable JSONB to include week_config
--              Supports different calendar systems (Israeli Sunday-Thursday, Western Monday-Friday, etc.)
-- Author: Claude Code
-- Date: 2025-11-13

-- =====================================================
-- PART 1: Add timezone column
-- =====================================================

-- Add timezone column to schools table
-- Default to Europe/Paris (UbuMaths' primary timezone for French schools)
ALTER TABLE schools
ADD COLUMN timezone TEXT DEFAULT 'Europe/Paris' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN schools.timezone IS 'IANA timezone identifier (e.g., Europe/Paris, America/New_York, Asia/Jerusalem). Used for scheduling and date/time calculations.';

-- Create index for timezone queries (useful for filtering by timezone in multi-timezone deployments)
CREATE INDEX idx_schools_timezone ON schools(timezone);

-- =====================================================
-- PART 2: Update timetable structure with week_config
-- =====================================================

-- Add week_config to existing timetable JSONB structure
-- Structure:
-- {
--   "periods": [...],  // Existing periods array
--   "week_config": {
--     "first_day": 0,              // First day of school week (0=Sunday, 1=Monday)
--     "last_day": 6,               // Last day of school week (0=Sunday, 6=Saturday)
--     "school_days": [0,1,2,3,4],  // Array of school days (0=Sunday...6=Saturday)
--     "weekend_days": [5,6]        // Array of weekend days
--   }
-- }

-- Update existing schools with default Israeli calendar configuration
-- (Sunday-Thursday school week, Friday-Saturday weekend)
UPDATE schools
SET timetable = jsonb_set(
  -- Handle NULL timetable case: convert to default structure
  COALESCE(timetable, '{"periods": []}'::jsonb),
  -- Path: add week_config key at root level
  '{week_config}',
  -- Default Israeli school week configuration
  '{
    "first_day": 0,
    "last_day": 6,
    "school_days": [0, 1, 2, 3, 4],
    "weekend_days": [5, 6]
  }'::jsonb,
  -- Only create if doesn't exist (false = don't overwrite existing)
  false
)
WHERE
  -- Only update schools that don't have week_config yet
  timetable IS NULL
  OR NOT (timetable ? 'week_config');

-- =====================================================
-- PART 3: Data validation and constraints
-- =====================================================

-- Add CHECK constraint to ensure timezone is not empty
ALTER TABLE schools
ADD CONSTRAINT chk_schools_timezone_not_empty
CHECK (timezone IS NOT NULL AND length(trim(timezone)) > 0);

-- Add validation comment
COMMENT ON CONSTRAINT chk_schools_timezone_not_empty ON schools
IS 'Ensures timezone is a non-empty string. Should be a valid IANA timezone identifier (e.g., Europe/Paris).';

-- =====================================================
-- PART 4: Verification and reporting
-- =====================================================

DO $$
DECLARE
  total_schools INTEGER;
  schools_with_week_config INTEGER;
  schools_with_timezone INTEGER;
BEGIN
  -- Count total schools
  SELECT COUNT(*) INTO total_schools FROM schools;

  -- Count schools with week_config
  SELECT COUNT(*) INTO schools_with_week_config
  FROM schools
  WHERE timetable ? 'week_config';

  -- Count schools with timezone set
  SELECT COUNT(*) INTO schools_with_timezone
  FROM schools
  WHERE timezone IS NOT NULL;

  -- Report migration results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Week Config & Timezone';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total schools: %', total_schools;
  RAISE NOTICE 'Schools with week_config: %', schools_with_week_config;
  RAISE NOTICE 'Schools with timezone: %', schools_with_timezone;
  RAISE NOTICE '========================================';

  -- Verify all schools have both fields
  IF schools_with_week_config = total_schools AND schools_with_timezone = total_schools THEN
    RAISE NOTICE 'SUCCESS: All schools have week_config and timezone';
  ELSE
    RAISE WARNING 'INCOMPLETE: Some schools missing week_config or timezone';
  END IF;
END;
$$ LANGUAGE plpgsql;
