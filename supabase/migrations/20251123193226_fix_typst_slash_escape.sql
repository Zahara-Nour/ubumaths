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

-- Restore the full page counter syntax that was accidentally simplified in previous migration
-- The original had "Page X sur Y" (page X of Y) functionality
UPDATE public.worksheet_templates
SET
    template_content = REPLACE(
        template_content,
        '#align(center)[Page #counter(page).display()]',
        '#align(center)[Page #counter(page).display() sur #locate(loc => counter(page).final(loc).first())]'
    ),
    updated_at = NOW()
WHERE template_content LIKE '%#align(center)[Page #counter(page).display()]%'
  AND template_content NOT LIKE '%#locate(loc => counter(page).final(loc).first())%';
