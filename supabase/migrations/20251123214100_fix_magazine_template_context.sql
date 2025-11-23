-- Migration: Fix Magazine template context syntax for page counter
-- Fixes "unclosed delimiter" error in Typst compilation

-- Update Magazine template to use function call syntax for context
UPDATE public.worksheet_templates
SET
    template_content = REPLACE(
        template_content,
        '#context [#counter(page).display()]',
        '#context(counter(page).display())'
    ),
    updated_at = NOW()
WHERE
    name = 'Magazine'
    AND template_content LIKE '%#context [#counter(page).display()]%';

-- Also update any custom templates that might have copied this pattern
UPDATE public.worksheet_templates
SET
    template_content = REPLACE(
        template_content,
        '#context [#counter(page).display()]',
        '#context(counter(page).display())'
    ),
    updated_at = NOW()
WHERE
    template_content LIKE '%#context [#counter(page).display()]%'
    AND name != 'Magazine'; -- Already updated above