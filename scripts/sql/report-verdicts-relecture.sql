-- Report des 41 verdicts de relecture vers leur colonne dédiée
-- ============================================================
--
-- ⚠️ À LANCER À LA MAIN, ET SEULEMENT AVANT LA PREMIÈRE PUBLICATION.
--
-- Ce fichier n'est VOLONTAIREMENT pas dans `supabase/migrations/` : il y
-- serait appliqué au prochain `pnpm db:migrate`, c'est-à-dire à l'occasion
-- d'un changement sans rapport. Il ne publie rien — la publication reste le
-- script `migrate-questions-phase1.ts --publier` — mais il rend les 41
-- questions ÉLIGIBLES à la publication. Tant qu'il n'est pas passé, elles
-- restent invisibles pour le script, ce qui est exactement l'effet voulu.
--
-- Contexte : l'interface de relecture écrivait le verdict humain dans
-- `migration_status`, la colonne qui décrit l'avancement TECHNIQUE. Le mot
-- `validated` y portait donc deux sens : « l'enseignant approuve » (écrit par
-- la relecture) et « les tests de génération du template importé passent »
-- (écrit par `scripts/validate-phase1-questions.ts`).
--
-- Les colonnes `review_status` / `reviewed_at` existaient déjà et n'étaient
-- écrites par personne. Le code les utilise désormais ; cette migration y
-- reporte les 41 verdicts existants pour qu'ils ne soient pas perdus.
--
-- Ces 41 lignes n'ont jamais été importées : `new_template_id`, `converted_at`
-- et `imported_at` y sont NULL. Leur avancement technique réel est donc
-- `pending`, quel que soit le mot qu'elles portaient.
--
-- ⚠️ NON DESTRUCTIVE mais elle RÉÉCRIT un enregistrement de travail.
-- Rollback :
--   update migration_tracking
--      set migration_status = case when review_status = 'approved'
--                                  then 'validated' else 'converted' end,
--          validated_at = reviewed_at,
--          review_status = 'pending',
--          reviewed_at = null
--    where reviewed_at is not null and new_template_id is null;

update migration_tracking
   set review_status = 'approved',
       reviewed_at = validated_at,
       migration_status = 'pending',
       validated_at = null
 where migration_status = 'validated'
   and new_template_id is null;

-- La ligne `converted` a été créée par la route d'édition comme simple support
-- de l'édition : rien n'a été converti. Son avancement technique retombe sur
-- `pending`, et son verdict reste `pending` — elle n'a pas été approuvée.
update migration_tracking
   set migration_status = 'pending'
 where migration_status = 'converted'
   and new_template_id is null
   and converted_at is null;
