-- Suppression de la colonne historique worksheet_assignments.class_id
-- ===================================================================
--
-- ⚠️ MIGRATION DESTRUCTIVE. La PR #213, qui fait cesser toute lecture et écriture
-- de cette colonne, est déployée en production depuis le 2026-09-11. Jouée avant
-- elle, six requêtes auraient répondu 500 : leurs jointures PostgREST `classes(...)`
-- se résolvent par la clé étrangère supprimée ici avec la colonne.
--
-- CE QUI DISPARAÎT :
--   - la colonne `class_id` (11 lignes renseignées, 0 orpheline, vérifié en
--     production le 2026-09-12 juste avant exécution) ;
--   - l'index partiel `idx_worksheet_assignments_class_id` ;
--   - la contrainte `worksheet_assignments_class_id_fkey` (ON DELETE CASCADE).
-- Les deux derniers tombent d'eux-mêmes avec la colonne.
--
-- CE QUI NE DISPARAÎT PAS : la colonne ne portait que la PREMIÈRE classe de
-- l'affectation, et cette classe figure déjà dans `worksheet_assignment_classes`,
-- qui porte toutes les autres. La garde ci-dessous le vérifie plutôt que de le
-- supposer.
--
-- ROLLBACK (la colonne est reconstructible, puisqu'elle était redondante) :
--   alter table public.worksheet_assignments add column class_id uuid
--     references public.classes(id) on delete cascade;
--   update public.worksheet_assignments wa
--      set class_id = (
--        select wac.class_id from public.worksheet_assignment_classes wac
--        where wac.assignment_id = wa.id
--        order by wac.created_at, wac.id
--        limit 1
--      );
--   create index idx_worksheet_assignments_class_id
--     on public.worksheet_assignments (class_id) where class_id is not null;

-- Garde : une affectation dont la classe n'est PAS dans la jonction perdrait
-- réellement une distribution. Refuser plutôt que de la perdre en silence.
do $$
declare
  v_orphelines integer;
begin
  select count(*) into v_orphelines
  from public.worksheet_assignments wa
  where wa.class_id is not null
    and not exists (
      select 1
      from public.worksheet_assignment_classes wac
      where wac.assignment_id = wa.id
        and wac.class_id = wa.class_id
    );

  if v_orphelines > 0 then
    raise exception
      'Migration refusée : % affectation(s) portent dans class_id une classe absente de worksheet_assignment_classes. Recopier ces classes dans la jonction avant de relancer.',
      v_orphelines;
  end if;
end $$;

alter table public.worksheet_assignments drop column class_id;
