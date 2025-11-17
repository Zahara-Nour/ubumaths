-- ============================================================================
-- Test Script for Template Syntax Migration
-- ============================================================================
-- Purpose: Validate the template syntax conversion functions before running
-- the actual migration on production data.
--
-- Usage:
-- 1. Run this script in a test database or transaction
-- 2. Review the test results
-- 3. If all tests pass, proceed with migration
-- ============================================================================

BEGIN;

-- Create test conversion functions (same as in migration)
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
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;

  result := input_text;

  -- Step 1: Convert hybrid {{@:var}} to {{var}}
  result := regexp_replace(result, '\{\{@:(\w+)\}\}', '{{\1}}', 'g');

  -- Step 2: Convert single-brace variables {@:var} to {{var}}
  result := regexp_replace(result, '\{@:(\w+)\}', '{{\1}}', 'g');

  -- Step 3: Convert color references
  result := regexp_replace(result, '\{#color:([^}]+)\}', '{{color:\1}}', 'g');

  -- Step 4: Convert random expressions {#:spec} to {{spec}}
  temp_text := result;
  result := '';
  pos := 1;

  WHILE pos <= length(temp_text) LOOP
    end_pos := position('{#:' IN substring(temp_text FROM pos));

    IF end_pos = 0 THEN
      result := result || substring(temp_text FROM pos);
      EXIT;
    END IF;

    result := result || substring(temp_text FROM pos FOR end_pos - 1);
    pos := pos + end_pos + 2;

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
      content := substring(temp_text FROM pos FOR end_pos - pos - 1);
      result := result || '{{' || content || '}}';
      pos := end_pos;
    ELSE
      result := result || '{#:';
    END IF;
  END LOOP;

  -- Step 5: Convert eval expressions {eval:expr} to {{eval:expr}}
  temp_text := result;
  result := '';
  pos := 1;

  WHILE pos <= length(temp_text) LOOP
    end_pos := position('{eval:' IN substring(temp_text FROM pos));

    IF end_pos = 0 THEN
      result := result || substring(temp_text FROM pos);
      EXIT;
    END IF;

    result := result || substring(temp_text FROM pos FOR end_pos - 1);
    pos := pos + end_pos + 5;

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
      content := substring(temp_text FROM pos FOR end_pos - pos - 1);
      result := result || '{{eval:' || content || '}}';
      pos := end_pos;
    ELSE
      result := result || '{eval:';
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TEST CASES
-- ============================================================================

DO $$
DECLARE
  test_count INTEGER := 0;
  pass_count INTEGER := 0;
  fail_count INTEGER := 0;
  test_input TEXT;
  expected TEXT;
  actual TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Running Template Syntax Conversion Tests';
  RAISE NOTICE '========================================';

  -- Test 1: Simple variable conversion
  test_count := test_count + 1;
  test_input := '{@:a}';
  expected := '{{a}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Simple variable', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Simple variable - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 2: Hybrid variable conversion (current seed format)
  test_count := test_count + 1;
  test_input := '{{@:num1}}';
  expected := '{{num1}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Hybrid variable', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Hybrid variable - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 3: Random expression
  test_count := test_count + 1;
  test_input := '{#:1-10}';
  expected := '{{1-10}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Random expression', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Random expression - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 4: Nested random with variable
  test_count := test_count + 1;
  test_input := '{#:1-{@:max}}';
  expected := '{{1-{{max}}}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Nested random', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Nested random - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 5: Eval expression
  test_count := test_count + 1;
  test_input := '{eval:a+b}';
  expected := '{{eval:a+b}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Eval expression', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Eval expression - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 6: Complex eval with variables
  test_count := test_count + 1;
  test_input := '{eval:({@:a}+{@:b})/{@:c}}';
  expected := '{{eval:({{a}}+{{b}})/{{c}}}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Complex eval', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Complex eval - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 7: Mixed content in statement
  test_count := test_count + 1;
  test_input := 'Calculer : $$\frac{{@:num1}}{{@:den}} + \frac{{@:num2}}{{@:den}}$$';
  expected := 'Calculer : $$\frac{{num1}}{{den}} + \frac{{num2}}{{den}}$$';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Mixed LaTeX content', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Mixed LaTeX content - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 8: Random with exclusions
  test_count := test_count + 1;
  test_input := '{#:1-10!5,7}';
  expected := '{{1-10!5,7}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Random with exclusions', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Random with exclusions - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 9: Color reference
  test_count := test_count + 1;
  test_input := '{#color:red_palette.2}';
  expected := '{{color:red_palette.2}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Color reference', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Color reference - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 10: Already converted (should not change)
  test_count := test_count + 1;
  test_input := '{{a}} + {{b}} = {{eval:{{a}}+{{b}}}}';
  expected := '{{a}} + {{b}} = {{eval:{{a}}+{{b}}}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Already converted', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Already converted - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Test 11: NULL input
  test_count := test_count + 1;
  test_input := NULL;
  expected := NULL;
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual IS NULL THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: NULL input', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: NULL input - Expected: NULL, Got: %', test_count, actual;
  END IF;

  -- Test 12: Empty string
  test_count := test_count + 1;
  test_input := '';
  expected := '';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Empty string', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Empty string - Expected: empty, Got: %', test_count, actual;
  END IF;

  -- Test 13: Real-world example from seed data
  test_count := test_count + 1;
  test_input := '{eval:({@:num1}+{@:num2})/{@:den}}';
  expected := '{{eval:({{num1}}+{{num2}})/{{den}}}}';
  actual := convert_questions_to_markdown_syntax(test_input);
  IF actual = expected THEN
    pass_count := pass_count + 1;
    RAISE NOTICE '✓ Test %: Real seed example', test_count;
  ELSE
    fail_count := fail_count + 1;
    RAISE NOTICE '✗ Test %: Real seed example - Expected: %, Got: %', test_count, expected, actual;
  END IF;

  -- Summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Results:';
  RAISE NOTICE 'Total Tests: %', test_count;
  RAISE NOTICE 'Passed: %', pass_count;
  RAISE NOTICE 'Failed: %', fail_count;
  RAISE NOTICE 'Success Rate: %%%', (pass_count::FLOAT / test_count::FLOAT * 100)::INTEGER;
  RAISE NOTICE '========================================';

  IF fail_count > 0 THEN
    RAISE EXCEPTION 'Tests failed! Do not proceed with migration until all tests pass.';
  ELSE
    RAISE NOTICE 'All tests passed! Safe to proceed with migration.';
  END IF;
END $$;

-- Test on actual table data (if exists)
DO $$
DECLARE
  sample_count INTEGER;
  sample_statement TEXT;
  converted_statement TEXT;
BEGIN
  -- Check if question_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_templates') THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Testing on actual data samples:';
    RAISE NOTICE '--------------------------------';

    -- Test a sample from actual data
    SELECT COUNT(*) INTO sample_count FROM question_templates;
    RAISE NOTICE 'Found % templates in database', sample_count;

    IF sample_count > 0 THEN
      -- Get a sample with Questions syntax
      SELECT statement::TEXT INTO sample_statement
      FROM question_templates
      WHERE statement::TEXT LIKE '%{@:%'
         OR statement::TEXT LIKE '%{#:%'
         OR statement::TEXT LIKE '%{{@:%'
      LIMIT 1;

      IF sample_statement IS NOT NULL THEN
        RAISE NOTICE 'Sample before: %', substring(sample_statement FROM 1 FOR 100);
        converted_statement := convert_questions_to_markdown_syntax(sample_statement);
        RAISE NOTICE 'Sample after:  %', substring(converted_statement FROM 1 FOR 100);
      ELSE
        RAISE NOTICE 'No templates found with Questions syntax to convert';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'question_templates table not found - skipping actual data tests';
  END IF;
END $$;

ROLLBACK;

-- ============================================================================
-- Instructions:
-- 1. Run this test script: psql -f scripts/test-template-migration.sql
-- 2. Review all test results
-- 3. If all tests pass, run the migration: pnpm db:migrate
-- 4. If tests fail, do not proceed with migration - fix issues first
-- ============================================================================