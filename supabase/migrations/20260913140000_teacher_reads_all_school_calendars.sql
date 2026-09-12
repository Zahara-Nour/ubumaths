-- Le professeur voit le calendrier de toutes ses écoles
-- =====================================================
--
-- Le modèle est mono-professeur : un seul enseignant, dont toutes les écoles
-- sont les siennes. Ses CLASSES lui sont d'ailleurs déjà visibles sans
-- condition d'école — `classes / view_own_classes` vaut `is_teacher_or_admin()`.
--
-- Son CALENDRIER ne l'était pas : années scolaires, vacances et périodes
-- restaient filtrées sur `profiles.school_id`, qui ne porte qu'une école. Un
-- professeur tenant un second établissement — accueil, groupe de cours
-- particuliers — ne voyait donc ni son année ni ses vacances. Le calendrier de
-- séances du cahier de texte ne proposait alors aucune échéance pour les
-- classes de cette école, et n'excluait pas ses congés.
--
-- C'est cette incohérence, et non l'existence de plusieurs écoles, qui posait
-- problème : les classes ignoraient déjà l'école, le calendrier non.
--
-- QUI GAGNE QUOI : le PROFESSEUR et l'ADMINISTRATEUR lisent désormais les
-- années, vacances et périodes de toutes les écoles. En mono-professeur, ce
-- sont toutes les siennes.
--
-- ⚠️ CE QUI NE BOUGE PAS : la frontière ÉLÈVE. `Students can read their school
-- years` et `Students can read their school periods` restent inchangées — un
-- élève ne voit que le calendrier de SON école. C'est la frontière
-- safeguarding, et les tests la vérifient dans les deux sens.
--
-- À noter, constaté et non modifié : `school_holidays` n'a AUCUNE policy
-- élève. Les élèves n'en voient aucune, même de leur propre école. Le
-- calendrier de séances est calculé côté serveur, donc cela ne les gêne pas
-- aujourd'hui.
--
-- L'INVARIANT DONT TOUT CECI DÉPEND : `trg_enforce_single_teacher` sur
-- `profiles` interdit qu'un second compte prenne le rôle `teacher`. « Toutes
-- les écoles sont les siennes » n'est donc pas une convention mais une
-- contrainte de base. Si ce trigger disparaît un jour, ces trois policies sont
-- à revoir en premier.
--
-- ⚠️ POURQUOI `is_teacher_or_admin()` ET NON `using (true)` : le raccourci
-- « de toute façon il n'y a qu'un professeur » ferait tomber la frontière pour
-- les 81 élèves, puisque les policies permissives se combinent en OU. La garde
-- par rôle rend la disjonction inoffensive — `student_policy OR false` vaut
-- `student_policy`.
--
-- AUCUNE DONNÉE PERSONNELLE n'est élargie : ces trois tables ne portent que des
-- noms de périodes et des dates. Les deux colonnes `metadata` sont vides en
-- production.
--
-- COHÉRENCE : `class_schedules`, la quatrième table du calendrier de séances,
-- est DÉJÀ en `is_teacher_or_admin()` sans condition d'école. Cette migration
-- aligne les trois dernières, et l'ensemble devient homogène.
--
-- ROLLBACK — le texte exact des trois policies d'origine. Noter que celle de
-- `school_years` n'avait AUCUNE jointure, contrairement aux deux autres :
--
--   drop policy if exists "Teachers can read their school years" on public.school_years;
--   create policy "Teachers can read their school years" on public.school_years for select
--     using (exists (select 1 from public.profiles
--       where profiles.id = auth.uid()
--         and profiles.school_id = school_years.school_id
--         and profiles.role = any (array['teacher'::user_role, 'admin'::user_role])));
--
--   drop policy if exists "Teachers can read school holidays" on public.school_holidays;
--   create policy "Teachers can read school holidays" on public.school_holidays for select
--     using (exists (select 1 from public.profiles p
--       join public.school_years sy on sy.school_id = p.school_id
--       where p.id = auth.uid()
--         and p.role = any (array['teacher'::user_role, 'admin'::user_role])
--         and sy.id = school_holidays.school_year_id));
--
--   drop policy if exists "Teachers can read academic periods" on public.academic_periods;
--   create policy "Teachers can read academic periods" on public.academic_periods for select
--     using (exists (select 1 from public.profiles p
--       join public.school_years sy on sy.school_id = p.school_id
--       where p.id = auth.uid()
--         and p.role = any (array['teacher'::user_role, 'admin'::user_role])
--         and sy.id = academic_periods.school_year_id));

-- 1. Les années scolaires.
drop policy if exists "Teachers can read their school years" on public.school_years;
create policy "Teachers can read their school years"
	on public.school_years
	for select
	-- `to authenticated` : `anon` détient un GRANT SELECT hérité sur ces trois
	-- tables. Le prédicat le repousse déjà — `auth.uid()` y est nul — mais
	-- écarter la requête anonyme AVANT son évaluation est une barrière de plus,
	-- et c'est ce que fait déjà `classes`, la table sœur. Les policies élèves et
	-- administrateur restent en `{public}` : les toucher sortirait du périmètre.
	to authenticated
	using (public.is_teacher_or_admin());

-- 2. Les vacances — celles qu'exclut le calendrier de séances.
drop policy if exists "Teachers can read school holidays" on public.school_holidays;
create policy "Teachers can read school holidays"
	on public.school_holidays
	for select
	-- `to authenticated` : `anon` détient un GRANT SELECT hérité sur ces trois
	-- tables. Le prédicat le repousse déjà — `auth.uid()` y est nul — mais
	-- écarter la requête anonyme AVANT son évaluation est une barrière de plus,
	-- et c'est ce que fait déjà `classes`, la table sœur. Les policies élèves et
	-- administrateur restent en `{public}` : les toucher sortirait du périmètre.
	to authenticated
	using (public.is_teacher_or_admin());

-- 3. Les périodes — trimestres et semestres.
drop policy if exists "Teachers can read academic periods" on public.academic_periods;
create policy "Teachers can read academic periods"
	on public.academic_periods
	for select
	-- `to authenticated` : `anon` détient un GRANT SELECT hérité sur ces trois
	-- tables. Le prédicat le repousse déjà — `auth.uid()` y est nul — mais
	-- écarter la requête anonyme AVANT son évaluation est une barrière de plus,
	-- et c'est ce que fait déjà `classes`, la table sœur. Les policies élèves et
	-- administrateur restent en `{public}` : les toucher sortirait du périmètre.
	to authenticated
	using (public.is_teacher_or_admin());
