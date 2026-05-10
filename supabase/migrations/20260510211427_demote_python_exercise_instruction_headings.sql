-- Migration: Demote heading levels in python_exercises.instructions
-- Created: 2026-05-10
--
-- The consultation page (/python-exercises/[id]) renders the exercise title
-- as `<h1 class="text-2xl">` (the page's H1). The markdown instructions
-- previously used `# Énoncé` (also H1) which made the section heading
-- visually larger than the page title — inverted hierarchy.
--
-- Shift every heading down one level so the page title remains the only H1
-- and markdown sections start at H2:
--   `# X`   → `## X`
--   `## X`  → `### X`
--   `### X` → `#### X`
--   etc.
--
-- The regex matches `(start-of-string|newline)(#+) ` and prepends one extra
-- `#`. Mid-line `# ` (e.g., a comment in a code block) is unaffected
-- because the lookbehind requires a line start.
--
-- Idempotent: running again would shift again, so this migration must run
-- exactly once. Future seed migrations should use `## Énoncé` directly.

UPDATE python_exercises
SET instructions = regexp_replace(instructions, '(^|\n)(#+) ', E'\\1#\\2 ', 'g')
WHERE instructions IS NOT NULL;
