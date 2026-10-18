-- Palotin : colonnes de la Constance Royale hebdomadaire, et écritures réservées au serveur
-- =========================================================================================
--
-- Journal : docs/wip/palotin-boucle-progress.md (PR 3). Question d'accès tranchée par
-- David le 2026-10-18 :
--   - personne ne gagne de lecture : les deux colonnes nouvelles se lisent comme le reste
--     de la ligne `student_buddies` (l'élève la sienne, le prof ses élèves, l'admin tout) ;
--   - l'élève perd le droit d'ÉCRIRE directement sa ligne `student_buddies` (création et
--     modification) et ses séances `srs_review_sessions` (création et modification).
--     Toutes ses actions légitimes passent par le serveur, au client service (PR #1475) :
--     choix et changement de Palotin, XP, série, thèmes explorés, séances de révision,
--     forfait de révision (`completed_at`).
--   Les lectures (SELECT) ne changent pas. Aucune donnée n'est supprimée.
--
-- Pourquoi : la policy UPDATE « own » de `student_buddies` (sans WITH CHECK ni
-- restriction de colonnes) laissait un élève réécrire `xp`, `level`, `current_streak`,
-- `palotin_type`, `change_count` hors de l'application ; celle de `srs_review_sessions`
-- lui laissait remettre `completed_at` à vide, donc toucher deux fois le forfait du jour.
--
-- ⚠️ ORDRE : le code qui n'écrit plus au client de l'élève (PR #1475) doit être EN
-- PRODUCTION (`pnpm deploy:prod`) AVANT `db:migrate`, sinon le choix du Palotin, la
-- série et les séances de révision échouent en prod.
--
-- Preuve : tests/integration/palotin-ecritures-eleve.test.ts.
--
-- ROLLBACK (à exécuter tel quel, dans cet ordre) :
--
--   CREATE POLICY "Students can create their own buddy" ON "public"."student_buddies"
--     FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));
--   CREATE POLICY "Students can update their own buddy" ON "public"."student_buddies"
--     FOR UPDATE TO "authenticated" USING (("student_id" = "auth"."uid"()));
--   CREATE POLICY "Users can create their own review sessions" ON "public"."srs_review_sessions"
--     FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
--   CREATE POLICY "Users can update their own review sessions" ON "public"."srs_review_sessions"
--     FOR UPDATE USING (("auth"."uid"() = "user_id"));
--   ALTER TABLE public.student_buddies
--     DROP CONSTRAINT IF EXISTS student_buddies_constance_days_this_week_check;
--   ALTER TABLE public.student_buddies DROP COLUMN IF EXISTS constance_days_this_week;
--   ALTER TABLE public.student_buddies DROP COLUMN IF EXISTS constance_week_start;
--
-- (Définitions des policies copiées du baseline 20260616220000, identiques en prod le
-- 2026-10-18 : les deux de `srs_review_sessions` n'ont pas de clause TO, donc rôle PUBLIC.)

-- 1. Constance Royale hebdomadaire (additif)
ALTER TABLE public.student_buddies
	ADD COLUMN IF NOT EXISTS constance_week_start date,
	ADD COLUMN IF NOT EXISTS constance_days_this_week smallint NOT NULL DEFAULT 0;

ALTER TABLE public.student_buddies
	DROP CONSTRAINT IF EXISTS student_buddies_constance_days_this_week_check;
ALTER TABLE public.student_buddies
	ADD CONSTRAINT student_buddies_constance_days_this_week_check
	CHECK (constance_days_this_week BETWEEN 0 AND 7);

COMMENT ON COLUMN public.student_buddies.constance_week_start IS
	'Constance Royale : lundi de la semaine en cours (NULL tant qu''aucune activité). Écrit par le serveur seul.';
COMMENT ON COLUMN public.student_buddies.constance_days_this_week IS
	'Constance Royale : jours de travail distincts dans la semaine de constance_week_start (0 à 7 ; la règle demande au moins 3). Écrit par le serveur seul.';

-- 2. Écritures réservées au serveur (client service, non soumis à la RLS)
DROP POLICY IF EXISTS "Students can create their own buddy" ON public.student_buddies;
DROP POLICY IF EXISTS "Students can update their own buddy" ON public.student_buddies;
DROP POLICY IF EXISTS "Users can create their own review sessions" ON public.srs_review_sessions;
DROP POLICY IF EXISTS "Users can update their own review sessions" ON public.srs_review_sessions;
