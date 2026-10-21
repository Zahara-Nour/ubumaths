-- Mathoux : mémoire du meilleur stade atteint et des étoiles par niveau
-- ==============================================================================
--
-- Conception : docs/wip/mathoux-conception.md § 9, « Changement d'année et oubli »
-- (règles validées par David le 2026-10-18). Un Mathou ne rapetisse jamais : on
-- garde le meilleur stade atteint par notion, et une étoile par niveau où la notion
-- a été entièrement acquise. Le calcul (PR 1) se refait à chaque affichage ; cette
-- table retient ce qu'il ne peut pas retrouver une fois des points oubliés ou le
-- niveau changé.
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-10-18) :
--   - l'élève LIT ses propres lignes, jamais celles d'un autre élève ;
--   - le prof lit celles de ses élèves (`is_my_student`), l'admin celles de tous
--     (`is_teacher_or_admin`) : calque exact des deux policies SELECT de
--     `student_buddies` ;
--   - le visiteur non connecté (`anon`) n'a AUCUN droit ;
--   - personne n'écrit au client connecté : aucune policy INSERT / UPDATE / DELETE,
--     et `authenticated` n'a que SELECT. Seul le serveur écrit, au client service
--     (non soumis à la RLS).
--   Personne ne perd d'accès : la table est neuve.
--
-- Contenu : par élève et par notion, un stade (chaton / matou / grand matou), une
-- liste de niveaux étoilés, deux dates. Aucun texte libre.
--
-- Effacement RGPD : `student_id` en ON DELETE CASCADE vers `profiles`, lui-même en
-- cascade depuis `auth.users` : supprimer le compte supprime les lignes.
--
-- Additive : une table neuve, rien d'existant n'est modifié.
--
-- Preuve : tests/integration/mathoux-memoire.test.ts.
--
-- ROLLBACK (à exécuter tel quel) :
--   drop table if exists public.student_mathoux;
--   (le trigger, l'index, les policies et les droits partent avec la table ;
--   `update_updated_at_column` est partagée et n'est pas touchée.)

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table public.student_mathoux (
	student_id uuid not null references public.profiles (id) on delete cascade,
	-- RESTRICT, comme les autres clés vers l'arbre : un nœud s'archive, il ne se supprime pas.
	notion_id uuid not null references public.classification_nodes (id) on delete restrict,
	best_stage text not null,
	starred_grades text[] not null default '{}',
	first_seen_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint student_mathoux_pkey primary key (student_id, notion_id),
	constraint student_mathoux_best_stage_check
		check (best_stage in ('chaton', 'matou', 'grand_matou')),
	constraint student_mathoux_starred_grades_check
		-- array_position(…, NULL) : is_valid_grade_array ignore un élément NULL ; l'unicité des
		-- niveaux est garantie par le serveur, seul à écrire (un CHECK ne peut pas compter les distincts).
		check (
			cardinality(starred_grades) <= 20
			and array_position(starred_grades, null) is null
			and public.is_valid_grade_array(starred_grades)
		)
);

comment on table public.student_mathoux is
	'Mémoire des Mathoux (la Chatterie) : meilleur stade atteint par élève et par notion, et niveaux étoilés. Un Mathou ne rapetisse jamais. Lecture : l''élève les siennes, le prof et l''admin celles des élèves. Écriture : serveur seul (client service).';
comment on column public.student_mathoux.student_id is
	'Élève (profiles.id). Supprimer le compte supprime ses lignes (cascade, effacement RGPD).';
comment on column public.student_mathoux.notion_id is
	'Notion de l''arbre (classification_nodes.id, genre notion) que représente le Mathou.';
comment on column public.student_mathoux.best_stage is
	'Meilleur stade jamais atteint : chaton, matou ou grand_matou. Ne redescend jamais.';
comment on column public.student_mathoux.starred_grades is
	'Niveaux (codes de grade) où la notion a été entièrement acquise : une étoile chacun. 20 au plus.';
comment on column public.student_mathoux.first_seen_at is
	'Naissance du Mathou : première réussite sur un point de la notion.';
comment on column public.student_mathoux.updated_at is
	'Dernière modification de la ligne (posée par trigger).';

-- La clé primaire (student_id, notion_id) sert déjà la lecture par élève (préfixe) ;
-- cet index sert la clé étrangère vers l'arbre (vérification du RESTRICT).
create index idx_student_mathoux_notion on public.student_mathoux (notion_id);

create trigger update_student_mathoux_updated_at
	before update on public.student_mathoux
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. Droits : anon rien, authenticated lecture seule (filtrée par la RLS)
-- ---------------------------------------------------------------------------
-- Les privilèges par défaut du schéma donnent TOUT à authenticated sur une table
-- neuve (et `revoke from public` ne retire pas ces entrées) : on repart de zéro.
-- Sans UPDATE / INSERT / DELETE, une écriture au client connecté rend 42501
-- « permission denied » avant même la RLS. service_role garde ses droits.

revoke all on public.student_mathoux from public, anon, authenticated;
grant select on public.student_mathoux to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS : lecture seulement, aucune policy d'écriture
-- ---------------------------------------------------------------------------

alter table public.student_mathoux enable row level security;

create policy "Students can view their own mathoux" on public.student_mathoux
	for select to authenticated using (student_id = auth.uid());

create policy "Teachers can view mathoux of their students" on public.student_mathoux
	for select to authenticated using (public.is_my_student(student_id));

create policy "Teachers and admins can view all mathoux" on public.student_mathoux
	for select to authenticated using (public.is_teacher_or_admin());
