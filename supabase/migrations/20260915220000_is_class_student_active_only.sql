-- is_class_student() : seule une adhésion ACTIVE ouvre le chapitre
-- =================================================================
--
-- La fonction ne testait que l'EXISTENCE de l'adhésion. Elle garde NEUF
-- policies en production : le chapitre, ses cinq contenus, deux policies INSERT
-- (`chapter_quiz_results`, `student_checklist_progress`) et la lecture des PDF
-- (`storage.objects` / « Students can read visible chapter documents »). Un
-- élève archivé continuait donc de lire tout le cours de la classe qu'il a
-- quittée — fichiers compris — et d'y écrire ses résultats de quiz.
--
-- ⚠️ En base LOCALE elles ne sont que HUIT : le baseline ne contient pas la
-- policy storage élève (ni « Admins can manage all chapter documents »), alors
-- que la prod les a. Cette migration corrige donc en prod un chemin qu'AUCUN
-- test local ne peut exercer — même mode de panne que `on_auth_user_created`
-- disparu à la migration EU. Divergence relevée le 2026-09-14, à réconcilier
-- séparément dans le baseline.
--
-- Ce n'était pas un choix : `student_has_worksheet_access`, sa voisine, teste
-- bien `cm.status = 'active'`. Le trou ne s'est ouvert vraiment que le
-- 2026-09-13, quand retirer un élève est devenu « l'archiver » au lieu de le
-- supprimer (pour qu'il relise ses fiches) : l'adhésion survit désormais au
-- départ, donc la garde doit regarder son statut.
--
-- QUESTION D'ACCÈS, posée et tranchée par David le 2026-09-14 : un élève
-- archivé ne doit plus voir les documents, exercices, objectifs ni questions de
-- quiz du chapitre de son ancienne classe.
--
-- CE QUI N'EST PAS RETIRÉ : la relecture rétroactive de ses fiches
-- (`had_class_access_to_assignment`, bornée par `left_at`). L'élève perd la
-- vitrine du chapitre, pas son classeur — c'est exactement la décision du
-- 2026-09-13, et `archived-member-chapter-access.test.ts` la protège par un cas
-- dédié, vert AVANT comme APRÈS cette migration.
--
-- VOLONTAIREMENT ABSENT : aucune condition sur `classes.is_active`. Un élève
-- ACTIF d'une année clôturée doit garder ses supports de cours ; l'ajouter
-- retirerait un accès légitime.
--
-- Portée mesurée en production le 2026-09-14 : 77 adhésions archivées, mais
-- 0 chapitre et 0 document atteignables (les 77 sont dans une autre école que
-- l'unique chapitre existant). Personne ne perd donc d'accès aujourd'hui —
-- cette migration ferme une porte avant qu'on ne la franchisse.
--
-- ROLLBACK — rétablir la version sans filtre de statut :
--
--   create or replace function public.is_class_student(p_class_id uuid)
--   returns boolean language plpgsql security definer set search_path to 'public'
--   -- (la version d'origine était VOLATILE : ne pas remettre `stable`)
--   as $rollback$
--   begin
--       return exists (
--           select 1 from public.class_members
--           where class_id = p_class_id
--           and student_id = auth.uid()
--       );
--   exception
--       when others then
--           return false;
--   end;
--   $rollback$;

create or replace function public.is_class_student(p_class_id uuid)
returns boolean
-- `stable` : la fonction ne fait que lire, et elle est appelée dans le `using`
-- de neuf policies. Elle était la seule VOLATILE de sa famille
-- (`is_class_member`, `is_teacher_or_admin`, `student_has_worksheet_access`,
-- `is_admin` sont toutes STABLE), donc ré-évaluée ligne à ligne. Correction
-- gratuite puisqu'on réécrit la fonction ; rollback : retirer le mot.
stable
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    return exists (
        select 1 from public.class_members
        where class_id = p_class_id
        and student_id = auth.uid()
        -- L'adhésion survit au départ depuis le 2026-09-13 : son existence ne
        -- dit plus que l'élève est dans la classe, seul son statut le dit.
        and status = 'active'
    );
exception
    when others then
        return false;
end;
$function$;

comment on function public.is_class_student(uuid) is
	'L''utilisateur courant est-il un élève ACTIF de cette classe ? Une adhésion archivée ne compte pas : elle ouvre la relecture des fiches déjà distribuées (had_class_access_to_assignment), pas le chapitre.';
