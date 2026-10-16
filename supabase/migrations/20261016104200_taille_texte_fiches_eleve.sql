-- Taille du texte des fiches, par élève (accessibilité : élèves malvoyants)
-- ========================================================================
--
-- Le PDF d'une fiche sort à la taille choisie pour l'élève : normale (10 pt),
-- grande (14 pt) ou très grande (18 pt). Le réglage vit dans sa propre table,
-- PAS dans `profiles` : un ami lit la ligne `profiles` entière (policy « Users
-- can view friends profiles », migration 20260915520000), et ce réglage dit
-- indirectement qu'un mineur a un trouble de la vue.
--
-- Question d'accès (David, 2026-10-16) :
--   * l'élève lit et modifie son propre réglage ;
--   * le professeur et l'admin lisent et modifient celui de tout élève
--     (`is_my_student`, modèle mono-professeur) ;
--   * personne d'autre : ni un autre élève (même ami, même école), ni anon.
-- Aucune ligne = taille normale. Seul un compte élève peut porter un réglage.
--
-- Qui gagne quoi : l'élève et le prof gagnent la lecture/écriture de ce seul
-- réglage. Personne ne perd d'accès. Migration additive, aucune donnée touchée.
--
-- ROLLBACK :
--   drop table if exists public.student_print_settings;

create table public.student_print_settings (
	student_id uuid primary key references public.profiles (id) on delete cascade,
	text_size text not null default 'normal'
		check (text_size in ('normal', 'large', 'x_large')),
	updated_at timestamptz not null default now()
);

comment on table public.student_print_settings is
	'Réglages d''impression des fiches propres à un élève (taille du texte). Lus et modifiés par l''élève lui-même et par le professeur/admin, personne d''autre.';
comment on column public.student_print_settings.text_size is
	'Taille du texte des PDF de fiche : normal (10 pt), large (14 pt), x_large (18 pt).';

alter table public.student_print_settings enable row level security;

revoke all on public.student_print_settings from anon;
revoke all on public.student_print_settings from authenticated;
grant select, insert, update, delete on public.student_print_settings to authenticated;
grant all on public.student_print_settings to service_role;

-- L'élève lui-même, ou le professeur/admin.
create policy "student_print_settings_select"
	on public.student_print_settings for select to authenticated
	using (student_id = (select auth.uid()) or public.is_my_student(student_id));

-- Écriture : même public, et seulement pour un compte élève (un prof ne
-- crée pas de réglage pour l'admin, un élève pas pour un autre).
create policy "student_print_settings_insert"
	on public.student_print_settings for insert to authenticated
	with check (
		(student_id = (select auth.uid()) or public.is_my_student(student_id))
		and exists (
			select 1 from public.profiles p
			where p.id = student_print_settings.student_id and p.role = 'student'
		)
	);

create policy "student_print_settings_update"
	on public.student_print_settings for update to authenticated
	using (student_id = (select auth.uid()) or public.is_my_student(student_id))
	with check (
		(student_id = (select auth.uid()) or public.is_my_student(student_id))
		and exists (
			select 1 from public.profiles p
			where p.id = student_print_settings.student_id and p.role = 'student'
		)
	);

create policy "student_print_settings_delete"
	on public.student_print_settings for delete to authenticated
	using (student_id = (select auth.uid()) or public.is_my_student(student_id));
