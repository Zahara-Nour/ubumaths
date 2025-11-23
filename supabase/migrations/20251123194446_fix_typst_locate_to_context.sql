-- Migration: Update Typst templates to use modern #context syntax
-- The old #locate(loc => ...) syntax is deprecated and causes errors in newer Typst versions
-- Replace with #context [...] which is the modern equivalent

UPDATE public.worksheet_templates
SET
    template_content = REPLACE(
        template_content,
        '#align(center)[Page #counter(page).display() sur #locate(loc => counter(page).final(loc).first())]',
        '#context [Page #counter(page).display() sur #counter(page).final().first()]'
    ),
    updated_at = NOW()
WHERE template_content LIKE '%#locate(loc => counter(page).final(loc).first())%';
