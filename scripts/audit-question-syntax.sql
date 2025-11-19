-- ============================================================================
-- Question Template Syntax Audit
-- ============================================================================
--
-- Analyzes question templates in the database to determine which syntax
-- is used (old Questions syntax vs new Markdown syntax).
--
-- Run with: psql $DATABASE_URL -f scripts/audit-question-syntax.sql
-- Or via Supabase Studio SQL editor
--
-- ============================================================================

-- Summary statistics
SELECT
  'Total Questions' as metric,
  COUNT(*) as count
FROM question_templates

UNION ALL

SELECT
  'Published Questions' as metric,
  COUNT(*) as count
FROM question_templates
WHERE status = 'published'

UNION ALL

SELECT
  'Draft Questions' as metric,
  COUNT(*) as count
FROM question_templates
WHERE status = 'draft';

-- ============================================================================
-- Syntax Detection
-- ============================================================================

WITH syntax_analysis AS (
  SELECT
    id,
    title,
    status,
    theme,
    domain,
    -- Check for old syntax patterns
    (
      variations::text LIKE '%{@:%' OR  -- Old variable syntax
      variations::text LIKE '%{#:%'     -- Old random syntax
    ) as has_old_syntax,
    -- Check for new syntax patterns
    (
      variations::text LIKE '%{{%' AND  -- Has double braces
      variations::text NOT LIKE '%{{{%' -- But not triple (would be error)
    ) as has_new_syntax,
    created_at,
    updated_at
  FROM question_templates
)
SELECT
  CASE
    WHEN has_old_syntax AND NOT has_new_syntax THEN 'Old Syntax Only'
    WHEN has_new_syntax AND NOT has_old_syntax THEN 'New Syntax Only'
    WHEN has_old_syntax AND has_new_syntax THEN 'Mixed Syntax'
    ELSE 'No Variable Syntax'
  END as syntax_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM syntax_analysis
GROUP BY syntax_type
ORDER BY count DESC;

-- ============================================================================
-- Details by Syntax Type
-- ============================================================================

-- Old syntax questions
SELECT
  'OLD SYNTAX QUESTIONS' as section;

SELECT
  id,
  title,
  theme,
  domain,
  status,
  DATE(created_at) as created,
  DATE(updated_at) as updated
FROM question_templates
WHERE (
  variations::text LIKE '%{@:%' OR
  variations::text LIKE '%{#:%'
) AND variations::text NOT LIKE '%{{%'
ORDER BY updated_at DESC
LIMIT 20;

-- New syntax questions
SELECT
  'NEW SYNTAX QUESTIONS' as section;

SELECT
  id,
  title,
  theme,
  domain,
  status,
  DATE(created_at) as created,
  DATE(updated_at) as updated
FROM question_templates
WHERE variations::text LIKE '%{{%'
  AND variations::text NOT LIKE '%{{{%'
  AND variations::text NOT LIKE '%{@:%'
  AND variations::text NOT LIKE '%{#:%'
ORDER BY updated_at DESC
LIMIT 20;

-- Mixed syntax questions (needs attention)
SELECT
  'MIXED SYNTAX QUESTIONS (ATTENTION REQUIRED)' as section;

SELECT
  id,
  title,
  theme,
  domain,
  status,
  DATE(created_at) as created,
  DATE(updated_at) as updated
FROM question_templates
WHERE (
  variations::text LIKE '%{@:%' OR
  variations::text LIKE '%{#:%'
) AND variations::text LIKE '%{{%'
ORDER BY updated_at DESC;

-- ============================================================================
-- Syntax by Creation Date
-- ============================================================================

SELECT
  'SYNTAX EVOLUTION OVER TIME' as section;

WITH syntax_by_month AS (
  SELECT
    DATE_TRUNC('month', created_at) as month,
    CASE
      WHEN (variations::text LIKE '%{@:%' OR variations::text LIKE '%{#:%')
           AND variations::text NOT LIKE '%{{%' THEN 'Old'
      WHEN variations::text LIKE '%{{%'
           AND variations::text NOT LIKE '%{@:%'
           AND variations::text NOT LIKE '%{#:%' THEN 'New'
      WHEN (variations::text LIKE '%{@:%' OR variations::text LIKE '%{#:%')
           AND variations::text LIKE '%{{%' THEN 'Mixed'
      ELSE 'None'
    END as syntax_type,
    COUNT(*) as count
  FROM question_templates
  GROUP BY month, syntax_type
)
SELECT
  TO_CHAR(month, 'YYYY-MM') as month,
  syntax_type,
  count,
  SUM(count) OVER (PARTITION BY month) as total_month
FROM syntax_by_month
WHERE month IS NOT NULL
ORDER BY month DESC, count DESC;

-- ============================================================================
-- Problematic Patterns
-- ============================================================================

SELECT
  'POTENTIAL ISSUES' as section;

-- Questions with triple braces (error pattern)
SELECT
  'Triple Braces (Parse Errors)' as issue_type,
  COUNT(*) as count
FROM question_templates
WHERE variations::text LIKE '%{{{%';

-- Questions with very long variable names (potential issues)
SELECT
  'Long Variable Names (>20 chars)' as issue_type,
  COUNT(*) as count
FROM question_templates
WHERE variations::text ~ '\{\{[a-zA-Z_][a-zA-Z0-9_]{20,}\}\}';

-- ============================================================================
-- Recommendations
-- ============================================================================

SELECT
  'MIGRATION RECOMMENDATIONS' as section;

WITH totals AS (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN variations::text LIKE '%{@:%' OR variations::text LIKE '%{#:%' THEN 1 ELSE 0 END) as old_count
  FROM question_templates
)
SELECT
  CASE
    WHEN old_count = 0 THEN 'All questions use new syntax. Safe to remove syntax adapter.'
    WHEN old_count < 10 THEN 'Very few old syntax questions. Consider manual migration.'
    WHEN old_count < 50 THEN 'Moderate old syntax usage. Batch migration recommended.'
    ELSE 'Significant old syntax usage. Gradual migration strategy recommended.'
  END as recommendation,
  old_count as questions_to_migrate,
  total as total_questions,
  ROUND(100.0 * old_count / NULLIF(total, 0), 2) as percentage_old
FROM totals;
