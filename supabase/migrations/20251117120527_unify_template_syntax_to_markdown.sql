-- ============================================================================
-- Migration: Unify Template Syntax to Markdown (Double-Brace)
-- ============================================================================
-- Date: 2025-11-17
-- Phase: 2 of Template System Unification
-- Author: Claude (Supabase Expert)
--
-- Purpose:
-- Convert all template syntax from Questions format (single-brace/hybrid) to
-- pure Markdown format (double-brace) to eliminate the need for runtime adapters.
--
-- Current State (Mixed):
-- - Variables: {@:var} or {{@:var}} → {{var}}
-- - Random: {#:1-10} → {{1-10}} or {{random:1-10}}
-- - Eval: {eval:expr} → {{eval:expr}}
-- - Colors: {#color:palette.index} → {{color:palette.index}}
--
-- Target State (Pure Markdown):
-- - Variables: {{var}}
-- - Random: {{1-10}} or {{random:1-10}}
-- - Eval: {{eval:expr}}
-- - Colors: {{color:palette.index}}
--
-- CRITICAL BACKUP INSTRUCTIONS:
-- Before running this migration, create a backup:
-- pg_dump -h [host] -U [user] -d [database] --data-only -t question_templates > backup_templates_$(date +%Y%m%d_%H%M%S).sql
--
-- ROLLBACK INSTRUCTIONS:
-- If migration fails or causes issues, use the rollback function at the end of this file.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE MIGRATION TRACKING
-- ============================================================================

-- Create migration metadata table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  migration_version TEXT NOT NULL DEFAULT '1.0.0',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'rolled_back')) DEFAULT 'running',
  rows_affected JSONB,
  backup_info JSONB,
  error_message TEXT,
  created_by TEXT DEFAULT 'system'
);

-- ============================================================================
-- 2. CREATE CONVERSION FUNCTIONS
-- ============================================================================

-- Function to convert Questions syntax to pure Markdown syntax
CREATE OR REPLACE FUNCTION convert_questions_to_markdown_syntax(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  temp_text TEXT;
  pos INTEGER;
  end_pos INTEGER;
  brace_count INTEGER;
  content TEXT;
BEGIN
  -- Handle NULL or empty input
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;

  result := input_text;

  -- Step 1: Convert hybrid {{@:var}} to {{var}} (remove @: inside double braces)
  result := regexp_replace(result, '\{\{@:(\w+)\}\}', '{{\1}}', 'g');

  -- Step 2: Convert single-brace variables {@:var} to {{var}}
  result := regexp_replace(result, '\{@:(\w+)\}', '{{\1}}', 'g');

  -- Step 3: Convert color references {#color:palette.index} to {{color:palette.index}}
  result := regexp_replace(result, '\{#color:([^}]+)\}', '{{color:\1}}', 'g');

  -- Step 4: Convert random expressions {#:spec} to {{spec}}
  -- This is more complex due to nested braces, so we use a loop
  temp_text := result;
  result := '';
  pos := 1;

  WHILE pos <= length(temp_text) LOOP
    -- Find next {#:
    end_pos := position('{#:' IN substring(temp_text FROM pos));

    IF end_pos = 0 THEN
      -- No more {#: found, append rest of string
      result := result || substring(temp_text FROM pos);
      EXIT;
    END IF;

    -- Append text before {#:
    result := result || substring(temp_text FROM pos FOR end_pos - 1);
    pos := pos + end_pos + 2; -- Move past {#:

    -- Find matching closing brace, handling nested braces
    brace_count := 1;
    end_pos := pos;

    WHILE end_pos <= length(temp_text) AND brace_count > 0 LOOP
      IF substring(temp_text FROM end_pos FOR 1) = '{' THEN
        brace_count := brace_count + 1;
      ELSIF substring(temp_text FROM end_pos FOR 1) = '}' THEN
        brace_count := brace_count - 1;
      END IF;
      end_pos := end_pos + 1;
    END LOOP;

    IF brace_count = 0 THEN
      -- Extract content between {#: and }
      content := substring(temp_text FROM pos FOR end_pos - pos - 1);
      -- Replace with {{content}}
      result := result || '{{' || content || '}}';
      pos := end_pos;
    ELSE
      -- Unmatched braces, keep original
      result := result || '{#:';
    END IF;
  END LOOP;

  -- Step 5: Convert eval expressions {eval:expr} to {{eval:expr}}
  temp_text := result;
  result := '';
  pos := 1;

  WHILE pos <= length(temp_text) LOOP
    -- Find next {eval:
    end_pos := position('{eval:' IN substring(temp_text FROM pos));

    IF end_pos = 0 THEN
      -- No more {eval: found, append rest of string
      result := result || substring(temp_text FROM pos);
      EXIT;
    END IF;

    -- Append text before {eval:
    result := result || substring(temp_text FROM pos FOR end_pos - 1);
    pos := pos + end_pos + 5; -- Move past {eval:

    -- Find matching closing brace, handling nested braces
    brace_count := 1;
    end_pos := pos;

    WHILE end_pos <= length(temp_text) AND brace_count > 0 LOOP
      IF substring(temp_text FROM end_pos FOR 1) = '{' THEN
        brace_count := brace_count + 1;
      ELSIF substring(temp_text FROM end_pos FOR 1) = '}' THEN
        brace_count := brace_count - 1;
      END IF;
      end_pos := end_pos + 1;
    END LOOP;

    IF brace_count = 0 THEN
      -- Extract content between {eval: and }
      content := substring(temp_text FROM pos FOR end_pos - pos - 1);
      -- Replace with {{eval:content}}
      result := result || '{{eval:' || content || '}}';
      pos := end_pos;
    ELSE
      -- Unmatched braces, keep original
      result := result || '{eval:';
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert JSONB arrays recursively
CREATE OR REPLACE FUNCTION convert_jsonb_array_syntax(input_jsonb JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  elem JSONB;
  converted_elem JSONB;
  array_result JSONB[];
BEGIN
  -- Handle NULL
  IF input_jsonb IS NULL THEN
    RETURN NULL;
  END IF;

  -- If it's an array
  IF jsonb_typeof(input_jsonb) = 'array' THEN
    array_result := ARRAY[]::JSONB[];

    FOR elem IN SELECT * FROM jsonb_array_elements(input_jsonb)
    LOOP
      converted_elem := convert_jsonb_array_syntax(elem);
      array_result := array_append(array_result, converted_elem);
    END LOOP;

    RETURN to_jsonb(array_result);

  -- If it's an object
  ELSIF jsonb_typeof(input_jsonb) = 'object' THEN
    result := '{}'::JSONB;

    FOR elem IN SELECT * FROM jsonb_each(input_jsonb)
    LOOP
      -- Special handling for known text fields
      IF (elem->>'key') IN ('content', 'expression', 'answer', 'statement') AND
         jsonb_typeof(elem->'value') = 'string' THEN
        result := jsonb_set(
          result,
          ARRAY[elem->>'key'],
          to_jsonb(convert_questions_to_markdown_syntax(elem->>'value'))
        );
      ELSE
        result := jsonb_set(
          result,
          ARRAY[elem->>'key'],
          convert_jsonb_array_syntax(elem->'value')
        );
      END IF;
    END LOOP;

    RETURN result;

  -- If it's a string
  ELSIF jsonb_typeof(input_jsonb) = 'string' THEN
    RETURN to_jsonb(convert_questions_to_markdown_syntax(input_jsonb::TEXT));

  -- For other types (number, boolean, null), return as-is
  ELSE
    RETURN input_jsonb;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Inverse function for rollback: Convert Markdown back to Questions syntax
CREATE OR REPLACE FUNCTION convert_markdown_to_questions_syntax(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;

  result := input_text;

  -- Convert {{eval:expr}} to {eval:expr}
  result := regexp_replace(result, '\{\{eval:([^}]+)\}\}', '{eval:\1}', 'g');

  -- Convert {{color:palette.index}} to {#color:palette.index}
  result := regexp_replace(result, '\{\{color:([^}]+)\}\}', '{#color:\1}', 'g');

  -- Convert {{random:spec}} to {#:spec}
  result := regexp_replace(result, '\{\{random:([^}]+)\}\}', '{#:\1}', 'g');

  -- Convert shorthand random {{spec}} to {#:spec} (only if it looks like a random spec)
  result := regexp_replace(result, '\{\{([\d.-]+(?:![\d.,]+)*)\}\}', '{#:\1}', 'g');

  -- Convert variable references {{var}} to {@:var} (last to avoid interfering)
  result := regexp_replace(result, '\{\{(\w+)\}\}', '{@:\1}', 'g');

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. BACKUP CURRENT STATE & EXECUTE MIGRATION
-- ============================================================================

-- Create backup table with current data
CREATE TABLE question_templates_backup_20251117 AS
SELECT * FROM question_templates;

-- ============================================================================
-- 4. PERFORM MIGRATION WITH TRACKING
-- ============================================================================

DO $$
DECLARE
  v_migration_id UUID;
  v_remaining_questions_syntax INTEGER;
  v_total_templates INTEGER;
  v_validation_errors TEXT[];
  v_sample_unconverted TEXT;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
BEGIN
  -- Store start time
  v_start_time := clock_timestamp();

  -- Record migration start
  INSERT INTO migration_metadata (migration_name, migration_version, created_by)
  VALUES ('unify_template_syntax_to_markdown', '2.0.0', 'Phase 2 - Database Migration')
  RETURNING id INTO v_migration_id;

  -- Store backup info in metadata
  UPDATE migration_metadata
  SET backup_info = jsonb_build_object(
    'backup_table', 'question_templates_backup_20251117',
    'original_count', (SELECT COUNT(*) FROM question_templates),
    'timestamp', NOW()
  )
  WHERE id = v_migration_id;

  RAISE NOTICE 'Starting template syntax conversion (migration ID: %)', v_migration_id;

  -- Update statement field (JSONB array of content objects)
  UPDATE question_templates
  SET statement = convert_jsonb_array_syntax(statement)
  WHERE statement IS NOT NULL
    AND (
      statement::TEXT LIKE '%{@:%' OR
      statement::TEXT LIKE '%{#:%' OR
      statement::TEXT LIKE '%{eval:%' OR
      statement::TEXT LIKE '%{{@:%'
    );

  -- Update variables field (JSONB array of variable objects with expressions)
  UPDATE question_templates
  SET variables = convert_jsonb_array_syntax(variables)
  WHERE variables IS NOT NULL
    AND (
      variables::TEXT LIKE '%{@:%' OR
      variables::TEXT LIKE '%{#:%' OR
      variables::TEXT LIKE '%{eval:%' OR
      variables::TEXT LIKE '%{{@:%'
    );

  -- Update answer field (can be string or array)
  UPDATE question_templates
  SET answer = convert_jsonb_array_syntax(answer)
  WHERE answer IS NOT NULL
    AND (
      answer::TEXT LIKE '%{@:%' OR
      answer::TEXT LIKE '%{#:%' OR
      answer::TEXT LIKE '%{eval:%' OR
      answer::TEXT LIKE '%{{@:%'
    );

  -- Update choices field (array of strings for multiple choice)
  UPDATE question_templates
  SET choices = convert_jsonb_array_syntax(choices)
  WHERE choices IS NOT NULL
    AND (
      choices::TEXT LIKE '%{@:%' OR
      choices::TEXT LIKE '%{#:%' OR
      choices::TEXT LIKE '%{eval:%' OR
      choices::TEXT LIKE '%{{@:%'
    );

  -- Update correction field (JSONB array of content objects)
  UPDATE question_templates
  SET correction = convert_jsonb_array_syntax(correction)
  WHERE correction IS NOT NULL
    AND (
      correction::TEXT LIKE '%{@:%' OR
      correction::TEXT LIKE '%{#:%' OR
      correction::TEXT LIKE '%{eval:%' OR
      correction::TEXT LIKE '%{{@:%'
    );

  -- Update exercise_instruction field (simple text)
  UPDATE question_templates
  SET exercise_instruction = convert_questions_to_markdown_syntax(exercise_instruction)
  WHERE exercise_instruction IS NOT NULL
    AND (
      exercise_instruction LIKE '%{@:%' OR
      exercise_instruction LIKE '%{#:%' OR
      exercise_instruction LIKE '%{eval:%'
    );

  RAISE NOTICE 'Template updates completed, starting validation...';

  -- ============================================================================
  -- 5. VALIDATION
  -- ============================================================================

  -- Count total templates
  SELECT COUNT(*) INTO v_total_templates FROM question_templates;

  -- Check if any Questions syntax remains
  SELECT COUNT(*) INTO v_remaining_questions_syntax
  FROM question_templates
  WHERE
    statement::TEXT LIKE '%{@:%' OR
    statement::TEXT LIKE '%{#:%' OR
    statement::TEXT LIKE '%{eval:%' OR
    statement::TEXT LIKE '%{{@:%' OR
    variables::TEXT LIKE '%{@:%' OR
    variables::TEXT LIKE '%{#:%' OR
    variables::TEXT LIKE '%{eval:%' OR
    variables::TEXT LIKE '%{{@:%' OR
    answer::TEXT LIKE '%{@:%' OR
    answer::TEXT LIKE '%{#:%' OR
    answer::TEXT LIKE '%{eval:%' OR
    answer::TEXT LIKE '%{{@:%' OR
    (choices IS NOT NULL AND (
      choices::TEXT LIKE '%{@:%' OR
      choices::TEXT LIKE '%{#:%' OR
      choices::TEXT LIKE '%{eval:%' OR
      choices::TEXT LIKE '%{{@:%'
    )) OR
    (correction IS NOT NULL AND (
      correction::TEXT LIKE '%{@:%' OR
      correction::TEXT LIKE '%{#:%' OR
      correction::TEXT LIKE '%{eval:%' OR
      correction::TEXT LIKE '%{{@:%'
    )) OR
    (exercise_instruction IS NOT NULL AND (
      exercise_instruction LIKE '%{@:%' OR
      exercise_instruction LIKE '%{#:%' OR
      exercise_instruction LIKE '%{eval:%'
    ));

  IF v_remaining_questions_syntax > 0 THEN
    -- Get a sample of unconverted syntax for debugging
    SELECT substring(statement::TEXT FROM 1 FOR 200) INTO v_sample_unconverted
    FROM question_templates
    WHERE statement::TEXT LIKE '%{@:%' OR statement::TEXT LIKE '%{#:%'
    LIMIT 1;

    v_validation_errors := array_append(v_validation_errors,
      format('Migration incomplete: %s templates still have Questions syntax. Sample: %s',
        v_remaining_questions_syntax, v_sample_unconverted));
  END IF;

  -- Log validation results
  IF array_length(v_validation_errors, 1) > 0 THEN
    UPDATE migration_metadata
    SET
      status = 'failed',
      completed_at = NOW(),
      error_message = array_to_string(v_validation_errors, '; '),
      rows_affected = jsonb_build_object(
        'total_templates', v_total_templates,
        'unconverted_remaining', v_remaining_questions_syntax
      )
    WHERE id = v_migration_id;

    RAISE EXCEPTION 'Migration validation failed: %', array_to_string(v_validation_errors, '; ');
  END IF;

  -- Update metadata with success
  UPDATE migration_metadata
  SET
    status = 'completed',
    completed_at = NOW(),
    rows_affected = jsonb_build_object(
      'total_templates', v_total_templates,
      'templates_converted', v_total_templates - v_remaining_questions_syntax,
      'validation', 'All templates successfully converted to Markdown syntax'
    )
  WHERE id = v_migration_id;

  -- Log completion
  v_end_time := clock_timestamp();
  RAISE NOTICE 'Migration successful: % templates converted to Markdown syntax in % seconds',
    v_total_templates,
    EXTRACT(EPOCH FROM (v_end_time - v_start_time));
END $$;

-- ============================================================================
-- 5. CREATE ROLLBACK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_template_syntax_migration()
RETURNS VOID AS $$
DECLARE
  backup_exists BOOLEAN;
BEGIN
  -- Check if backup table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'question_templates_backup_20251117'
  ) INTO backup_exists;

  IF NOT backup_exists THEN
    RAISE EXCEPTION 'Backup table question_templates_backup_20251117 not found. Cannot rollback.';
  END IF;

  -- Restore from backup
  TRUNCATE question_templates;
  INSERT INTO question_templates SELECT * FROM question_templates_backup_20251117;

  -- Update migration metadata
  UPDATE migration_metadata
  SET
    status = 'rolled_back',
    error_message = 'Manually rolled back'
  WHERE migration_name = 'unify_template_syntax_to_markdown'
    AND status = 'completed';

  RAISE NOTICE 'Rollback successful. Templates restored from backup.';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create indexes to speed up future template queries
CREATE INDEX IF NOT EXISTS idx_question_templates_statement_gin
ON question_templates USING gin (statement);

CREATE INDEX IF NOT EXISTS idx_question_templates_variables_gin
ON question_templates USING gin (variables);

-- Update table statistics for query planner
ANALYZE question_templates;

-- ============================================================================
-- 7. CLEANUP (Optional - run after verification)
-- ============================================================================

-- To remove backup table after verification (DO NOT RUN IMMEDIATELY):
-- DROP TABLE IF EXISTS question_templates_backup_20251117;

-- To remove conversion functions (keep for potential future use):
-- DROP FUNCTION IF EXISTS convert_questions_to_markdown_syntax(TEXT);
-- DROP FUNCTION IF EXISTS convert_markdown_to_questions_syntax(TEXT);
-- DROP FUNCTION IF EXISTS convert_jsonb_array_syntax(JSONB);
-- DROP FUNCTION IF EXISTS rollback_template_syntax_migration();

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration:
-- 1. Connect to database
-- 2. Run: SELECT rollback_template_syntax_migration();
-- 3. Verify data is restored: SELECT * FROM question_templates LIMIT 5;
--
-- MANUAL ROLLBACK (if function fails):
-- BEGIN;
-- TRUNCATE question_templates;
-- INSERT INTO question_templates SELECT * FROM question_templates_backup_20251117;
-- COMMIT;
-- ============================================================================

-- ============================================================================
-- POST-MIGRATION CHECKLIST
-- ============================================================================
-- After running this migration:
--
-- 1. Verify conversion success:
--    SELECT COUNT(*) FROM question_templates
--    WHERE statement::TEXT LIKE '%{@:%' OR statement::TEXT LIKE '%{#:%';
--    -- Should return 0
--
-- 2. Test a few templates:
--    SELECT id, statement, variables, answer
--    FROM question_templates
--    LIMIT 5;
--    -- Should show {{var}}, {{1-10}}, {{eval:expr}} syntax
--
-- 3. Test question generation in application
--
-- 4. Update application code:
--    - Remove or disable syntax adapter
--    - Update any hardcoded syntax references
--
-- 5. After 1 week of stable operation:
--    DROP TABLE question_templates_backup_20251117;
-- ============================================================================