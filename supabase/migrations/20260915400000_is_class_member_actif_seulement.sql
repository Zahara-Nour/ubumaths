-- is_class_member() : seule une adhésion ACTIVE ouvre le kanban de la classe
-- ===========================================================================
--
-- Même trou que `is_class_student`, bouché ce matin par `20260915220000`, mais
-- celui-ci ouvre L'ÉCRITURE — et sur du contenu collectif.
--
-- La fonction ne testait que l'EXISTENCE de l'adhésion. Or l'adhésion survit au
-- départ depuis le 2026-09-13 : retirer un élève d'une classe, c'est désormais
-- l'archiver, pas le supprimer. Son existence ne dit donc plus qu'il est dans
-- la classe — seul son statut le dit.
--
-- ── Ce qu'un élève archivé pouvait faire ──────────────────────────────────
--
-- Une seule policy la nomme (`kanban_boards_select`), ce qui masquait
-- l'ampleur : la chaîne descend par `can_access_kanban_board`, appelée par
-- `can_access_kanban_column`, qui est le `USING` **et** le `WITH CHECK` de
-- `kanban_cards_insert` / `_update` / `_delete`. Sur le tableau de la classe
-- qu'il avait quittée, l'ancien élève pouvait donc :
--
--   · lire le tableau, ses colonnes, ses cartes et ses étiquettes ;
--   · CRÉER une carte ;
--   · MODIFIER une carte ;
--   · SUPPRIMER une carte ;
--   · s'assigner à une carte et y poser des étiquettes.
--
-- Les trois écritures ont été démontrées en test d'intégration AVANT d'écrire
-- cette migration, pas déduites de la lecture des policies.
--
-- Exposition mesurée en production le 2026-09-14 : 77 adhésions archivées,
-- 1 tableau de classe, 20 anciens élèves concernés, 2 cartes atteignables.
--
-- ── Décision ──────────────────────────────────────────────────────────────
--
-- QUESTION D'ACCÈS, posée et tranchée par David le 2026-09-14 : on coupe TOUT.
-- L'élève archivé ne voit plus le tableau du tout.
--
-- Ce n'est pas le traitement retenu pour la progression des objectifs, qui
-- reste « visible mais gelée » (`20260915240000`), et la différence est de
-- fond : une progression est le travail PERSONNEL de l'élève, alors qu'un
-- tableau de classe est un espace PARTAGÉ qui continue de vivre sans lui.
-- Le lui laisser en lecture lui ferait suivre les échanges de ses anciens
-- camarades.
--
-- ── Portée ────────────────────────────────────────────────────────────────
--
-- `is_class_member` n'est appelée que depuis SQL — les policies et
-- `can_access_kanban_board`. Aucun appel côté TypeScript (`grep -rn
-- "is_class_member" src/` ne rend que la signature générée dans
-- `database.ts`). Rien à changer dans l'application.
--
-- ⚠️ La signature ne bouge pas : `CREATE OR REPLACE` remplace, il ne SURCHARGE
-- pas. Une seconde signature ferait sauter la fonction du générateur de types,
-- en silence.
--
-- ROLLBACK (rend l'accès aux anciens élèves — à n'utiliser que si le kanban
-- devenait inaccessible aux élèves ACTIFS, ce que le test témoin couvre) :
--   create or replace function public.is_class_member(p_class_id uuid)
--   returns boolean language plpgsql stable security definer
--   set search_path to 'public', 'pg_temp' as $$
--   begin
--       return exists (
--           select 1 from public.class_members
--           where class_id = p_class_id and student_id = auth.uid()
--       );
--   exception when others then return false;
--   end;
--   $$;

create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    return exists (
        select 1
        from public.class_members
        where class_id = p_class_id
          and student_id = auth.uid()
          -- L'adhésion survit au départ depuis le 2026-09-13 : son existence ne
          -- dit plus que l'élève est dans la classe, seul son statut le dit.
          and status = 'active'
    );
exception
    -- Le garde d'origine : une panne de lecture refuse l'accès au lieu de le
    -- laisser ouvert. On la garde telle quelle.
    when others then
        return false;
end;
$$;

comment on function public.is_class_member(uuid) is
    'TRUE si auth.uid() est membre ACTIF de la classe. SECURITY DEFINER pour éviter la récursion RLS par class_members. Le filtre sur status est indispensable depuis que retirer un élève l''archive au lieu de le supprimer (2026-09-13) : sans lui, un ancien élève garde l''écriture sur le kanban de la classe.';
