-- Migration: Restore full page counter syntax with total pages
-- The previous migration accidentally simplified "Page X sur Y" to just "Page X"

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
