-- Migration: Fix Typst templates - escape leading slash in content blocks
-- The pattern [/ text] is interpreted as a term list in Typst, causing "expected colon" error
-- Fix by escaping: [\/ text]

-- Update all templates that have the problematic pattern
UPDATE public.worksheet_templates
SET
    template_content = REPLACE(template_content, '#text(size: 14pt)[/ {{total_points}}]', '#text(size: 14pt)[\/ {{total_points}}]'),
    updated_at = NOW()
WHERE template_content LIKE '%#text(size: 14pt)[/ {{total_points}}]%';

-- Also fix any pattern where a content block starts with just [/
-- This is a more general fix for any future templates
UPDATE public.worksheet_templates
SET
    template_content = REPLACE(template_content, ')[/ ', ')[\/ '),
    updated_at = NOW()
WHERE template_content LIKE '%)[/ %';

-- Note: Page counter restore moved to separate migration 20251123194050_restore_page_counter_total.sql
