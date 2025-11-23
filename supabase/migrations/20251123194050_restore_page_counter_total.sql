-- Migration: Restore full page counter syntax with total pages using modern Typst syntax
-- Uses #context instead of deprecated #locate syntax

UPDATE public.worksheet_templates
SET
    template_content = REPLACE(
        template_content,
        '#align(center)[Page #counter(page).display()]',
        '#context [Page #counter(page).display() sur #counter(page).final().first()]'
    ),
    updated_at = NOW()
WHERE template_content LIKE '%#align(center)[Page #counter(page).display()]%'
  AND template_content NOT LIKE '%#context%';
