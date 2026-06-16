-- Add XSS protection to profiles table
-- Prevents HTML tags and HTML entities in names

-- Add CHECK constraint for firstname
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS firstname_no_html;

ALTER TABLE public.profiles
ADD CONSTRAINT firstname_no_html CHECK (
  firstname !~ '<[^>]+>' AND
  firstname !~ '&[a-z]+;' AND
  firstname !~ 'javascript:' AND
  LENGTH(firstname) <= 50
);

-- Add CHECK constraint for lastname
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS lastname_no_html;

ALTER TABLE public.profiles
ADD CONSTRAINT lastname_no_html CHECK (
  lastname !~ '<[^>]+>' AND
  lastname !~ '&[a-z]+;' AND
  lastname !~ 'javascript:' AND
  LENGTH(lastname) <= 50
);

-- Add comments
COMMENT ON CONSTRAINT firstname_no_html ON public.profiles IS
'Prevents HTML tags, entities, and javascript: protocol in firstname for XSS protection';

COMMENT ON CONSTRAINT lastname_no_html ON public.profiles IS
'Prevents HTML tags, entities, and javascript: protocol in lastname for XSS protection';
