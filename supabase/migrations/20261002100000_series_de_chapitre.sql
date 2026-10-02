-- =============================================================================
-- Séries de chapitre : relier un chapitre de « Mon cours » à une série
-- =============================================================================
--
-- Questions de cours, étape 2 (docs/wip/questions-de-cours-progress.md,
-- décisions de David du 2026-10-02 : S1–S10, Q123 corrigée, Q124 a, Q125).
-- Le chapitre est relié à une SÉRIE composée au panier (ex. Fonctions › Étude
-- de fonction › Méthode), publiée comme les autres contenus (ADR 0005), rangée
-- dans le plan (section), et lancée par l'élève dans la forme choisie au
-- rattachement (flash-cards par défaut, ou entraînement), sans note.
--
-- ── QUESTION D'ACCÈS (Q123, tranchée par David) ──────────────────────────────
--   QUI GAGNE QUOI :
--   · Un élève, membre ACTIF d'une classe, lit les rattachements PUBLIÉS
--     (`published_at <= now()`) des chapitres VISIBLES de sa classe, et la série
--     elle-même (titre, description, niveau, catégories).
--   · Rien d'autre : pas de rattachement programmé (date future) ni préparé
--     (NULL), pas de chapitre masqué, pas d'autre classe, pas de série du
--     professeur qui n'est rattachée nulle part. Aucune écriture élève.
--   · Professeur et admin : gèrent les rattachements (comme chapter_worksheets).
--     Le professeur ne rattache que SES séries (WITH CHECK) ; l'admin, toutes.
--   · Anon : rien (aucun droit sur la table, aucune policy).
--   QUI PERD QUOI : personne. `student_can_read_series` est ÉLARGIE par un OU :
--   la branche « évaluation publiée assignée » est recopiée telle quelle.
--
-- ── CLÉS ÉTRANGÈRES ──────────────────────────────────────────────────────────
--   · chapter_id → class_chapters : CASCADE, comme les six autres contenus.
--   · series_id → series : CASCADE, comme chapter_decks (deck) et
--     chapter_worksheets (fiche). Le rattachement seul n'a aucune valeur ; et
--     avec NO ACTION, supprimer une série depuis la page des séries échouerait
--     dès qu'un chapitre l'utilise, sans que le professeur sache où chercher.
--     Une série VERROUILLÉE (évaluation commencée) refuse déjà le DELETE par son
--     propre trigger (UBS01) : la cascade ne peut donc rien effacer de noté.
--   · (section_id, chapter_id) → chapter_sections : composite, `set null
--     (section_id)`, la MÊME garde que les autres contenus — une section d'un
--     autre chapitre est refusée par la base.
--
-- ── ADDITIVE ─────────────────────────────────────────────────────────────────
--   Une table neuve, un trigger, et une fonction remplacée par une version qui
--   accepte TOUT ce que l'ancienne acceptait. Aucune donnée touchée.
--
-- ── ROLLBACK (dans cet ordre, en une transaction) ────────────────────────────
--   begin;
--   create or replace function public.student_can_read_series(p_series_id uuid)
--   returns boolean language sql stable security definer
--   set search_path to 'public', 'pg_temp'
--   as $$
--     select exists (
--       select 1 from public.evaluations e
--       where e.series_id = p_series_id
--         and public.student_can_read_evaluation(e.id)
--     );
--   $$;
--   drop table if exists public.chapter_series;  -- emporte trigger, index, policies
--   commit;
--   (⚠️ le DROP TABLE perd les rattachements créés depuis : quels chapitres
--   pointaient vers quelles séries, leur forme, leur place et leur publication.
--   Les séries elles-mêmes sont intactes.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. La table
-- ---------------------------------------------------------------------------

create table if not exists public.chapter_series (
	id uuid primary key default gen_random_uuid(),
	chapter_id uuid not null references public.class_chapters (id) on delete cascade,
	series_id uuid not null references public.series (id) on delete cascade,

	-- Q124 (a) : la forme se choisit au rattachement. `flash` = flash-cards,
	-- `interactive` = entraînement. Jamais une évaluation : pas de note.
	form text not null default 'flash',

	display_order integer not null default 0,

	-- Le rangement dans le plan du chapitre, comme les autres contenus.
	section_id uuid,
	section_order integer not null default 0,

	-- Mise à disposition des élèves. NULL = préparé, invisible ; date future =
	-- programmé, invisible jusqu'à l'heure.
	published_at timestamptz,

	created_at timestamptz not null default now(),

	constraint chapter_series_form_check check (form in ('flash', 'interactive')),

	-- Une série ne se range qu'une fois dans un chapitre : deux entrées pour la
	-- même série donneraient deux fois le même lien.
	constraint chapter_series_chapter_id_series_id_key unique (chapter_id, series_id),

	constraint chapter_series_section_fkey
		foreign key (section_id, chapter_id)
		references public.chapter_sections (id, chapter_id)
		on delete set null (section_id)
);

comment on table public.chapter_series is
	'Séries rattachées à un chapitre de « Mon cours ». Le lien suit la série (Q125) : une modification de la série est visible. L''élève lit le rattachement publié d''un chapitre visible de sa classe, et la série par student_can_read_series.';
comment on column public.chapter_series.form is
	'Forme de lancement choisie au rattachement (Q124 a) : flash (flash-cards, défaut) ou interactive (entraînement). Sans note.';
comment on column public.chapter_series.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible. Comparé à now() par la policy (date future = programmé).';
comment on column public.chapter_series.section_id is
	'Section du chapitre qui range ce contenu. NULL = « Non classé ». Clé composite (section_id, chapter_id) : une section d''un AUTRE chapitre est refusée par la base.';

create index if not exists idx_chapter_series_chapter
	on public.chapter_series (chapter_id, display_order);
create index if not exists idx_chapter_series_section
	on public.chapter_series (section_id, section_order);
-- Pour `student_can_read_series` (recherche par série) et la cascade de
-- suppression d'une série.
create index if not exists idx_chapter_series_series
	on public.chapter_series (series_id);

-- ---------------------------------------------------------------------------
-- 2. Publier = l'heure de la base (même trigger que les autres contenus)
-- ---------------------------------------------------------------------------

create trigger published_at_horloge_base
	before update of published_at on public.chapter_series
	for each row execute function public.set_published_at_database_clock();

-- ---------------------------------------------------------------------------
-- 3. Droits et RLS
-- ---------------------------------------------------------------------------

alter table public.chapter_series enable row level security;

-- Depuis 20261001120000, une table neuve ne donne plus rien à anon ; on le
-- redit ici (double porte), et on accorde explicitement ce dont les rôles
-- connectés ont besoin — la RLS fait le tri.
revoke all on public.chapter_series from anon, public;
grant select, insert, update, delete on public.chapter_series to authenticated, service_role;

create policy "Admins can manage all chapter series"
	on public.chapter_series for all to authenticated
	using (public.is_admin()) with check (public.is_admin());

create policy "Teachers can manage series of their chapters"
	on public.chapter_series for all to authenticated
	using (
		exists (select 1 from public.class_chapters ch
			where ch.id = chapter_series.chapter_id and public.is_teacher_or_admin())
	)
	with check (
		exists (select 1 from public.class_chapters ch
			where ch.id = chapter_series.chapter_id and public.is_teacher_or_admin())
		-- On ne rattache que SA série (ou n'importe laquelle pour l'admin) : sans
		-- cette clause, rattacher puis publier rendrait lisible par les élèves une
		-- série que le professeur ne peut même pas lire (celle de l'admin).
		and exists (select 1 from public.series s
			where s.id = chapter_series.series_id
				and (s.created_by = auth.uid() or public.is_admin()))
	);

-- Chapitre visible + membre ACTIF (`is_class_student` filtre status = 'active')
-- + rattachement publié. Pas de troisième garde « distribuée » comme pour les
-- fiches ou les decks : publier le rattachement EST la mise à disposition (Q123).
create policy "Students can view series of visible chapters"
	on public.chapter_series for select to authenticated
	using (
		exists (
			select 1 from public.class_chapters ch
			where ch.id = chapter_series.chapter_id
				and ch.is_visible = true
				and public.is_class_student(ch.class_id)
		)
		and chapter_series.published_at <= now()
	);

-- ---------------------------------------------------------------------------
-- 4. La série devient lisible par le rattachement (élargissement par OU)
-- ---------------------------------------------------------------------------
-- La policy `series_select_assigned_student` appelle déjà cette fonction : on
-- n'ajoute aucune policy sur `series`. La première branche est l'ancienne
-- fonction, à l'identique. La seconde reprend EXACTEMENT les trois conditions
-- de la policy élève de `chapter_series` ci-dessus (DEFINER : lue sans RLS,
-- donc les conditions doivent y être toutes).

create or replace function public.student_can_read_series(p_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1 from public.evaluations e
		where e.series_id = p_series_id
			and public.student_can_read_evaluation(e.id)
	)
	or exists (
		select 1
		from public.chapter_series cs
		join public.class_chapters ch on ch.id = cs.chapter_id
		where cs.series_id = p_series_id
			and cs.published_at <= now()
			and ch.is_visible = true
			and public.is_class_student(ch.class_id)
	);
$$;

-- `create or replace` conserve les droits existants ; on les redit pour que la
-- migration se suffise à elle-même.
revoke execute on function public.student_can_read_series(uuid) from public, anon;
grant execute on function public.student_can_read_series(uuid) to authenticated, service_role;
