-- Migration: Add timetable configuration to schools
-- Description: Each school can define standardized periods that teachers must use for schedules
-- Author: Claude Code
-- Date: 2025-10-17

-- Add timetable column to schools table
-- JSONB structure: { "periods": [{ "number": 1, "name": "Period 1", "start_time": "07:00:00", "end_time": "08:00:00" }] }
ALTER TABLE schools
ADD COLUMN timetable JSONB DEFAULT '{"periods": []}'::jsonb;

-- Add index for timetable queries
CREATE INDEX idx_schools_timetable ON schools USING gin(timetable);

-- Add period_number column to class_schedules (links to school timetable period)
ALTER TABLE class_schedules
ADD COLUMN period_number INTEGER;

-- Create index for period lookups
CREATE INDEX idx_class_schedules_period ON class_schedules(period_number);

-- Function to migrate existing schedules to periods
CREATE OR REPLACE FUNCTION migrate_schedules_to_periods()
RETURNS void AS $$
DECLARE
  school_record RECORD;
  schedule_record RECORD;
  unique_times RECORD;
  period_num INTEGER;
  periods_json JSONB;
BEGIN
  -- For each school
  FOR school_record IN
    SELECT DISTINCT s.id, s.name
    FROM schools s
    INNER JOIN classes c ON c.school_id = s.id
    INNER JOIN class_schedules cs ON cs.class_id = c.id
  LOOP
    RAISE NOTICE 'Processing school: %', school_record.name;

    -- Extract unique time ranges for this school
    period_num := 0;
    periods_json := '{"periods": []}'::jsonb;

    FOR unique_times IN
      SELECT DISTINCT cs.start_time, cs.end_time
      FROM class_schedules cs
      INNER JOIN classes c ON c.id = cs.class_id
      WHERE c.school_id = school_record.id
      ORDER BY cs.start_time, cs.end_time
    LOOP
      period_num := period_num + 1;

      -- Add period to JSON array
      periods_json := jsonb_set(
        periods_json,
        array['periods', (period_num - 1)::text],
        jsonb_build_object(
          'number', period_num,
          'start_time', unique_times.start_time::text,
          'end_time', unique_times.end_time::text
        )
      );

      -- Update schedules with matching times to reference this period
      UPDATE class_schedules cs
      SET period_number = period_num
      FROM classes c
      WHERE cs.class_id = c.id
        AND c.school_id = school_record.id
        AND cs.start_time = unique_times.start_time
        AND cs.end_time = unique_times.end_time;

      RAISE NOTICE '  Created Period %: % - %', period_num, unique_times.start_time, unique_times.end_time;
    END LOOP;

    -- Update school's timetable
    UPDATE schools
    SET timetable = periods_json
    WHERE id = school_record.id;

    RAISE NOTICE '  Updated school timetable with % periods', period_num;
  END LOOP;

  RAISE NOTICE 'Migration complete!';
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_schedules_to_periods();

-- Drop the migration function (no longer needed)
DROP FUNCTION migrate_schedules_to_periods();

-- Add constraint to ensure period_number exists in school's timetable
-- Note: This is a soft constraint via application logic, not enforced at DB level
-- because JSONB validation is complex and we want flexibility

-- Comments
COMMENT ON COLUMN schools.timetable IS 'School-level timetable configuration (JSONB): defines standardized periods for class schedules';
COMMENT ON COLUMN class_schedules.period_number IS 'Links to period number in school timetable (source of truth for times)';
