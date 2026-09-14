-- On n'assigne plus une carte à un élève qui a quitté la classe
-- ==============================================================
--
-- Suite de `20260915400000`, qui a fermé l'ACCÈS de l'élève archivé au kanban.
-- Il restait un chemin en sens inverse : le professeur pouvait encore lui
-- ASSIGNER une carte.
--
-- `can_assign_kanban_card` vérifie que l'assigné est membre du tableau via
-- `is_kanban_board_member`, qui refait le test d'adhésion À LA MAIN :
--
--     select exists (
--         select 1 from public.class_members
--         where class_id = v_class and student_id = p_user_id
--     )
--
-- Aucun filtre de statut, et surtout : la fonction ne NOMME PAS
-- `is_class_member`. Un inventaire par `grep is_class_member` ne pouvait donc
-- pas la voir — c'est `security-auditor` qui l'a trouvée, en lisant les corps.
--
-- Effet concret : le sélecteur d'assignés proposait les 77 adhésions archivées
-- à côté des membres actuels, et une assignation posée sur un ancien élève
-- restait — il apparaissait sur la carte sans jamais pouvoir ouvrir le
-- tableau. Le trigger `cleanup_kanban_assignees_on_move` ne rattrape pas ce
-- cas : il ne se déclenche que sur la TRANSITION active → archived, pas sur
-- une assignation créée APRÈS l'archivage.
--
-- ── Pourquoi une nouvelle fonction, et pas un filtre dans l'existante ─────
--
-- ⚠️ DEUX pièges, et les deux sont coûteux :
--
-- 1. Ajouter `and status = 'active'` dans `is_kanban_board_member` casserait le
--    RETRAIT. La même fonction est le `USING` de `kanban_card_assignees_delete`
--    (via `can_assign_kanban_card`) : le professeur deviendrait incapable de
--    retirer l'assignation d'un élève archivé — un verrou fail-closed sur
--    exactement la ligne qu'on veut pouvoir nettoyer.
--
-- 2. Ajouter un paramètre à `is_kanban_board_member` créerait une SURCHARGE, et
--    une fonction SQL surchargée est sautée EN SILENCE par le générateur de
--    types. Le dépôt a déjà payé ça.
--
-- D'où une fonction dédiée au seul chemin d'OCTROI. Le retrait continue de
-- passer par `can_assign_kanban_card`, inchangée.
--
-- QUESTION D'ACCÈS : tranchée par David le 2026-09-14 — on coupe tout pour
-- l'élève archivé. Ceci en est le corollaire côté professeur : on ne peut plus
-- donner du travail à quelqu'un qui ne peut plus le voir.
--
-- CE QUI N'EST PAS RETIRÉ : le retrait d'une assignation existante, et la
-- lecture. Le professeur garde le moyen de nettoyer.
--
-- ROLLBACK :
--   drop policy if exists "kanban_card_assignees_insert" on public.kanban_card_assignees;
--   create policy "kanban_card_assignees_insert" on public.kanban_card_assignees
--       for insert to authenticated
--       with check (can_assign_kanban_card(card_id, user_id));
--   drop function if exists public.can_grant_kanban_card_assignment(uuid, uuid);

create or replace function public.can_grant_kanban_card_assignment(
    p_card_id uuid,
    p_assignee uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_board uuid;
    v_owner uuid;
    v_class uuid;
begin
    -- Toutes les règles d'octroi existantes s'appliquent d'abord : accès de
    -- l'acteur au tableau, et règle « le propriétaire assigne qui il veut,
    -- les autres ne s'assignent qu'eux-mêmes ».
    if not public.can_assign_kanban_card(p_card_id, p_assignee) then
        return false;
    end if;

    select col.board_id into v_board
    from public.kanban_cards c
    join public.kanban_columns col on col.id = c.column_id
    where c.id = p_card_id;

    select owner_id, class_id into v_owner, v_class
    from public.kanban_boards
    where id = v_board;

    -- Le propriétaire du tableau reste assignable : il n'est pas membre de la
    -- classe au sens de `class_members`, c'est le professeur.
    if p_assignee = v_owner then
        return true;
    end if;

    -- Tableau personnel : `can_assign_kanban_card` a déjà tout tranché, il n'y
    -- a pas de classe dont on pourrait être archivé.
    if v_class is null then
        return true;
    end if;

    -- Le seul ajout : l'adhésion doit être ACTIVE.
    return exists (
        select 1 from public.class_members
        where class_id = v_class
          and student_id = p_assignee
          and status = 'active'
    );
exception
    -- Même garde fail-closed que ses voisines : une panne refuse l'octroi.
    when others then
        return false;
end;
$$;

comment on function public.can_grant_kanban_card_assignment(uuid, uuid) is
    'Peut-on ASSIGNER cette carte à cet utilisateur ? Ajoute à can_assign_kanban_card l''exigence d''une adhésion ACTIVE. Volontairement distincte : le RETRAIT d''une assignation doit rester possible sur un élève archivé, donc kanban_card_assignees_delete garde can_assign_kanban_card.';

alter function public.can_grant_kanban_card_assignment(uuid, uuid) owner to postgres;
revoke all on function public.can_grant_kanban_card_assignment(uuid, uuid) from public, anon;
grant execute on function public.can_grant_kanban_card_assignment(uuid, uuid) to authenticated, service_role;

-- Seul l'OCTROI change. Le `USING` du DELETE n'est pas touché.
drop policy if exists "kanban_card_assignees_insert" on public.kanban_card_assignees;
create policy "kanban_card_assignees_insert"
    on public.kanban_card_assignees for insert to authenticated
    with check (public.can_grant_kanban_card_assignment(card_id, user_id));
