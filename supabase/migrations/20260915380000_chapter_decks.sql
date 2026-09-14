-- Rattacher un deck de révision à un chapitre
-- ===========================================
--
-- Un chapitre range déjà documents, exercices, objectifs et fiches. Il lui
-- manquait de quoi dire « pour réviser ce chapitre, travaille CE deck » —
-- avec, au choix, la sélection par l'algorithme de répétition espacée, ou la
-- révision forcée de toutes les cartes (migration `20260915300000`).
--
-- DÉCISIONS de David :
--   · séries d'évaluation et decks de révision sont DEUX choses distinctes, on
--     garde les deux (les premières viendront dans `chapter_assessments`) ;
--   · deux modes : sélection par l'algorithme, ou toutes les cartes.
--
-- QUESTION D'ACCÈS, posée et tranchée par David : rien de nouveau. Un élève
-- voit le rattachement dans un chapitre VISIBLE dont il est membre ACTIF, et
-- seulement si le deck lui a été ASSIGNÉ. Double garde, sur le modèle des
-- fiches : ranger un deck dans un chapitre ne le distribue pas.
--
-- ⚠️ Le chapitre désigne le deck SOURCE (celui du professeur). Chaque élève
-- résout SA copie par `srs_decks.source_deck_id` (migration `20260915360000`) :
-- c'est cette copie qui porte SON avancement.
--
-- ADDITIVE : une table neuve.
--
-- ROLLBACK :
--   drop table if exists public.chapter_decks;
--   alter table public.srs_deck_sections
--     drop constraint if exists srs_deck_sections_id_deck_unique;

-- Cible de la clé composite posée plus bas : sans elle, `chapter_decks` ne peut
-- pas exiger que la section appartienne au deck.
alter table public.srs_deck_sections
	drop constraint if exists srs_deck_sections_id_deck_unique,
	add constraint srs_deck_sections_id_deck_unique unique (id, deck_id);

create table if not exists public.chapter_decks (
	id uuid primary key default gen_random_uuid(),
	chapter_id uuid not null references public.class_chapters(id) on delete cascade,

	-- Le deck SOURCE. `cascade` : un deck supprimé n'a plus rien à faire dans un
	-- chapitre, et le rattachement seul n'a aucune valeur.
	deck_id uuid not null references public.srs_decks(id) on delete cascade,

	-- Une section du deck, ou le deck entier si `null`.
	deck_section_id uuid,

	-- `algorithme` = ce que la répétition espacée juge dû ; `force` = toutes les
	-- cartes, pour la veille d'un contrôle.
	mode text not null default 'algorithme' check (mode in ('algorithme', 'force')),

	display_order integer not null default 0,

	-- Le rangement dans le plan du chapitre, comme les cinq autres contenus.
	section_id uuid,
	section_order integer not null default 0,

	-- Mise à disposition des élèves. NULL = préparé, invisible.
	published_at timestamptz,

	created_at timestamptz not null default now(),

	-- Un deck ne se range qu'une fois dans un chapitre : deux entrées pour le
	-- même deck donneraient deux fois la même révision.
	constraint chapter_decks_unique unique (chapter_id, deck_id),

	-- La section doit appartenir AU DECK désigné, et pas à un autre — ni, cas
	-- réaliste, à la copie d'un élève. Même famille de garde que ci-dessous, et
	-- posée maintenant parce que la table n'a encore aucun consommateur : une
	-- fois des lignes en production, l'ajouter demanderait un nettoyage.
	--
	-- `set null` ciblé et non `cascade` : supprimer une sous-section ne retire
	-- pas le deck du chapitre, elle le ramène au deck entier.
	constraint chapter_decks_deck_section_fkey
		foreign key (deck_section_id, deck_id)
		references public.srs_deck_sections(id, deck_id)
		on delete set null (deck_section_id),

	-- La MÊME garde composite que les cinq autres contenus : une ressource ne
	-- pointe que vers une section de SON chapitre, et la base le tient.
	constraint chapter_decks_section_fkey
		foreign key (section_id, chapter_id)
		references public.chapter_sections(id, chapter_id)
		on delete set null (section_id)
);

create index if not exists idx_chapter_decks_chapter on public.chapter_decks (chapter_id, display_order);
create index if not exists idx_chapter_decks_section on public.chapter_decks (section_id, section_order);

comment on table public.chapter_decks is
	'Decks de révision rattachés à un chapitre. Le chapitre désigne le deck SOURCE ; chaque élève travaille SA copie, résolue par srs_decks.source_deck_id.';
comment on column public.chapter_decks.mode is
	'algorithme = sélection par la répétition espacée ; force = toutes les cartes (révision de veille de contrôle).';
comment on column public.chapter_decks.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible. Ne remplace PAS l''assignation du deck : les deux conditions valent.';

alter table public.chapter_decks enable row level security;

drop policy if exists "Admins can manage all chapter decks" on public.chapter_decks;
create policy "Admins can manage all chapter decks"
	on public.chapter_decks for all to authenticated
	using (is_admin()) with check (is_admin());

drop policy if exists "Teachers can manage decks of their chapters" on public.chapter_decks;
create policy "Teachers can manage decks of their chapters"
	on public.chapter_decks for all to authenticated
	using (
		exists (select 1 from public.class_chapters ch
			where ch.id = chapter_decks.chapter_id and is_teacher_or_admin())
	)
	with check (
		exists (select 1 from public.class_chapters ch
			where ch.id = chapter_decks.chapter_id and is_teacher_or_admin())
	);

-- ⚠️ TROIS conditions cumulées, et aucune n'est redondante :
--   · le chapitre est visible ET l'élève en est membre ACTIF (`is_class_student`
--     filtre `status = 'active'` depuis `20260915220000`) ;
--   · le rattachement est publié ;
--   · le deck lui a été ASSIGNÉ — il en possède une copie.
-- Retirer la troisième montrerait à l'élève un deck qu'il ne peut pas ouvrir :
-- `get_due_cards_for_deck` refuse depuis `20260915320000` un deck qui ne lui
-- appartient pas.
drop policy if exists "Students can view assigned decks of visible chapters" on public.chapter_decks;
create policy "Students can view assigned decks of visible chapters"
	on public.chapter_decks for select to authenticated
	using (
		exists (
			select 1 from public.class_chapters ch
			where ch.id = chapter_decks.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		and published_at <= now()
		-- ⚠️ DEUX conditions, et la seconde n'est pas redondante.
		--
		-- `srs_decks.source_deck_id` est écrit par l'ÉLÈVE : la policy INSERT de
		-- `srs_decks` est `auth.uid() = owner_id`, sans restriction de colonne.
		-- Un élève peut donc fabriquer un deck en déclarant n'importe quelle
		-- source. Cette condition dit « l'élève affirme un lien », pas « le
		-- professeur le lui a donné ».
		--
		-- `srs_deck_assignments`, elle, n'accepte l'INSERT que d'un professeur ou
		-- d'un admin : c'est la seule preuve d'assignation. On garde les deux —
		-- la copie porte l'avancement, l'assignation porte le droit.
		and exists (
			select 1 from public.srs_decks copie
			where copie.source_deck_id = chapter_decks.deck_id
				and copie.owner_id = auth.uid()
		)
		and exists (
			select 1 from public.srs_deck_assignments a
			where a.source_deck_id = chapter_decks.deck_id
				and a.assigned_to = auth.uid()
		)
	);

revoke all on public.chapter_decks from anon;
