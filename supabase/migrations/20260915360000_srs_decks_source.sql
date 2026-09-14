-- La copie d'un deck sait de quel deck elle vient
-- ================================================
--
-- Assigner un deck crée une COPIE par élève. `srs_deck_assignments` garde
-- `source_deck_id` et `assigned_to` — mais PAS l'identifiant de la copie. Pour
-- retrouver la copie d'un élève à partir du deck source, il fallait donc
-- apparier sur le nom du deck : fragile dès que deux decks portent le même, et
-- impossible à garantir.
--
-- C'est le préalable au rattachement d'un deck à un chapitre : le chapitre
-- désigne le deck SOURCE (celui du professeur), et chaque élève doit pouvoir
-- résoudre SA copie.
--
-- QUESTION D'ACCÈS : personne ne gagne d'accès. La colonne ne fait que nommer
-- un lien qui existait déjà de fait ; elle est lue sous les policies existantes
-- de `srs_decks`, inchangées.
--
-- ADDITIVE : une colonne nullable. `null` = deck d'origine, pas une copie.
--
-- ROLLBACK :
--   alter table public.srs_decks drop column if exists source_deck_id;

alter table public.srs_decks
	add column if not exists source_deck_id uuid references public.srs_decks(id) on delete set null;

comment on column public.srs_decks.source_deck_id is
	'Deck dont celui-ci est une copie, posé à l''assignation. NULL = deck d''origine. Permet à un élève de retrouver SA copie d''un deck assigné sans apparier sur le nom.';

create index if not exists idx_srs_decks_source on public.srs_decks (source_deck_id, owner_id);

-- Rattrapage des copies existantes.
--
-- Elles sont reconnaissables : `is_assigned` vrai, et une ligne d'assignation
-- porte leur propriétaire. Quand plusieurs decks sources ont été assignés au
-- même élève, le nom départage — c'est précisément la fragilité que cette
-- colonne supprime pour l'avenir, et le seul recours pour le passé.
update public.srs_decks copie
set source_deck_id = a.source_deck_id
from public.srs_deck_assignments a
join public.srs_decks source on source.id = a.source_deck_id
where copie.is_assigned
	and copie.source_deck_id is null
	and copie.owner_id = a.assigned_to
	and copie.name = source.name
	-- Un deck ne peut pas être sa propre copie. Sans ça, un professeur qui
	-- s'assignerait un deck à lui-même verrait son deck SOURCE satisfaire les
	-- quatre conditions — même propriétaire, même nom que lui-même.
	and copie.id <> a.source_deck_id
	and copie.owner_id <> source.owner_id;
