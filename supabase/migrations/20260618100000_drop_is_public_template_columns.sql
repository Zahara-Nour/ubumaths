-- Drop the now-unused is_public columns on the two template families
-- ===================================================================
--
-- Inter-teacher content sharing was removed (RLS + app code) in migration
-- 20260618093000 + PR #26, which is deployed. No code reads or writes these
-- columns anymore. This destructive cleanup runs AFTER that deploy
-- (additive-before / destructive-after). See docs/wip/option-b-unification-progress.md.

-- A public-library leftover #26 missed: this policy grants teachers cross-creator
-- access to versions of PUBLIC published templates (it references chapter_templates.is_public,
-- which also blocks the column drop). The owner-scoped "Teachers can view versions of
-- their templates" (ct.created_by = auth.uid()) remains, so a teacher keeps access to
-- versions of their OWN templates.
DROP POLICY IF EXISTS "Teachers can view versions of public templates" ON public.chapter_template_versions;

-- Indexes (idx_chapter_templates_public_status, idx_worksheet_templates_is_public) and
-- column defaults auto-drop with the columns.
ALTER TABLE public.chapter_templates DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.worksheet_templates DROP COLUMN IF EXISTS is_public;

-- Cosmetic: the is_admin() COMMENT wrongly said "admin or teacher"; the body
-- checks role = 'admin' only. Fix it while we're here (flagged in #26 review).
COMMENT ON FUNCTION public.is_admin() IS 'True when the current user has role = admin.';
