-- Rattacher des fiches à un chapitre de « Mon cours »
-- ====================================================
--
-- Le besoin, formulé par David : « je mets mes ressources dans Mon cours en
-- avance et je distribue au fur et à mesure ». Aujourd'hui la page d'un
-- chapitre affiche TOUTES les fiches de la classe, pas les siennes — il n'y
-- avait aucun lien entre un chapitre et une fiche.
--
-- `chapter_documents` et `chapter_exercises` existent déjà et font exactement
-- ça pour les documents et les exercices. Cette table est leur troisième sœur,
-- calquée sur `chapter_exercises`.
--
-- RATTACHER N'EST PAS DISTRIBUER, et c'est tout l'intérêt du geste : le
-- professeur prépare son chapitre avant le cours, puis distribue quand il veut.
-- La policy de l'élève l'impose donc structurellement — elle exige
-- `student_has_worksheet_access`, la même fonction qui garde la fiche
-- elle-même. Une fiche rattachée mais pas distribuée reste INVISIBLE : l'élève
-- ne voit même pas le lien. Sans cette condition, la jonction deviendrait un
-- canal de distribution parallèle, et le professeur perdrait la préparation à
-- l'avance qu'il demande.
--
-- Accès : un élève de la classe pourra voir qu'une fiche appartient à un
-- chapitre VISIBLE de SA classe, et uniquement si cette fiche lui a déjà été
-- distribuée — donc rien qu'il ne puisse déjà lire. Le professeur et l'admin
-- gèrent les liens, comme pour les documents et les exercices. Personne d'autre
-- ne voit quoi que ce soit.
--
-- Rollback :
--   drop table if exists public.chapter_worksheets;

create table if not exists public.chapter_worksheets (
	id uuid primary key default gen_random_uuid(),
	chapter_id uuid not null references public.class_chapters (id) on delete cascade,
	worksheet_id uuid not null references public.worksheets (id) on delete cascade,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	-- Une fiche ne se rattache qu'une fois au même chapitre. Contrainte nommée
	-- pour que `on conflict` puisse la viser explicitement.
	constraint chapter_worksheets_chapter_id_worksheet_id_key unique (chapter_id, worksheet_id)
);

comment on table public.chapter_worksheets is
	'Fiches rattachées à un chapitre de « Mon cours ». Rattacher ne distribue pas : la policy de l''élève exige student_has_worksheet_access, donc une fiche préparée à l''avance reste invisible jusqu''à sa distribution.';

-- L'ordre d'affichage est lu à chaque ouverture de chapitre ; l'index couvre le
-- tri sans tri.
create index if not exists idx_chapter_worksheets_chapter_order
	on public.chapter_worksheets (chapter_id, display_order);

-- Pour retrouver les chapitres d'une fiche, et pour que la cascade de
-- suppression d'une fiche n'ait pas à balayer la table.
create index if not exists idx_chapter_worksheets_worksheet
	on public.chapter_worksheets (worksheet_id);

alter table public.chapter_worksheets enable row level security;

-- Les trois policies sont copiées de `chapter_exercises`, à une condition près
-- (voir l'en-tête) sur celle de l'élève.
create policy "Admins can manage all chapter worksheets"
	on public.chapter_worksheets
	for all
	to authenticated
	using (is_admin())
	with check (is_admin());

create policy "Teachers can manage worksheets of their chapters"
	on public.chapter_worksheets
	for all
	to authenticated
	using (
		exists (
			select 1
			from public.class_chapters ch
			where ch.id = chapter_worksheets.chapter_id
				and is_teacher_or_admin()
		)
	)
	with check (
		exists (
			select 1
			from public.class_chapters ch
			where ch.id = chapter_worksheets.chapter_id
				and is_teacher_or_admin()
		)
	);

create policy "Students can view worksheets of visible chapters"
	on public.chapter_worksheets
	for select
	to authenticated
	using (
		exists (
			select 1
			from public.class_chapters ch
			where ch.id = chapter_worksheets.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		-- Rattacher n'est pas distribuer : sans ceci, l'élève verrait le lien
		-- vers une fiche que le professeur n'a pas encore donnée.
		and student_has_worksheet_access(chapter_worksheets.worksheet_id)
	);
