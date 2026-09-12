-- Les deux gardes de rôle passent `stable` et ferment `pg_temp`
-- =============================================================
--
-- `is_teacher_or_admin()` porte **103 policies** et `is_admin()` en porte
-- **74** : ce sont les deux fonctions les plus sollicitées de la base, et
-- elles sont évaluées ligne à ligne.
--
-- Elles étaient pourtant les seules de leur famille à rester en défaut :
--
--   fonction                 volatilité   search_path
--   is_my_student            stable       public, pg_temp
--   is_student_in_class      stable       public, pg_temp
--   is_in_assigned_class     stable       public, pg_temp
--   is_admin                 VOLATILE     public
--   is_teacher_or_admin      VOLATILE     public
--
-- DEUX CORRECTIONS, aucun changement de comportement :
--
-- 1. `stable` — une fonction VOLATILE est réévaluée à chaque ligne et ne peut
--    être remontée par le planificateur. Ces deux-là ne lisent que `profiles`
--    et `auth.uid()`, constants le temps d'une requête : `stable` est exact,
--    et permet de mutualiser l'appel.
--
-- 2. `pg_temp` en FIN de `search_path` — sans lui, PostgreSQL consulte le
--    schéma temporaire EN PREMIER pour résoudre les relations. Une session
--    capable de créer une table temporaire `profiles` pouvait faire mentir une
--    fonction qui s'exécute avec les droits de son propriétaire. Le corps
--    qualifie déjà `public.profiles`, donc le risque était théorique — mais
--    c'est la forme retenue partout ailleurs.
--
-- ⚠️ `create or replace function` RÉINITIALISE tout attribut non répété. Les
-- deux définitions ci-dessous sont donc recopiées à l'identique depuis la
-- production, corps compris, avec les seuls attributs modifiés. Un test
-- d'intégration vérifie désormais `stable`, `security definer` et `pg_temp`
-- pour rattraper une future réécriture qui les oublierait.
--
-- Les GRANT sont conservés par `create or replace` : `authenticated` et
-- `service_role`, jamais `anon` — vérifié avant et après.
--
-- ROLLBACK : rejouer les deux fonctions avec `search_path to 'public'` et sans
-- le mot-clé `stable` (le défaut étant VOLATILE).

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$function$;

create or replace function public.is_teacher_or_admin()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
  );
END;
$function$;
