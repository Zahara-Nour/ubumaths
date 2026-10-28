-- ============================================================================
-- Verdicts de relecture des modèles de questions (chantier revue-modeles)
-- ============================================================================
--
-- La page /dev/modeles montre tous les modèles en base ; David y pose un verdict
-- par modèle (« validé » ou « à revoir ») avec un commentaire. Un seul verdict
-- par modèle : le suivant remplace le précédent (décidé le 2026-10-28).
--
-- Accès tranché par David (2026-10-28) : lecture ET écriture par l'admin seul
-- (is_admin() ; le prof élevé passe par le client de l'admin). Aucun élève, aucun
-- prof, aucun visiteur. Aucun accès en lecture nouveau pour quiconque d'autre.
--
-- Additive. Rollback :
--   drop table public.question_template_reviews;
--   drop function public.question_template_reviews_stamp();

-- ============================================================================
-- 1. Table
-- ============================================================================

create table public.question_template_reviews (
	template_id uuid primary key references public.question_templates (id) on delete cascade,
	verdict text not null check (verdict in ('valide', 'a_revoir')),
	comment text not null default '' check (length(comment) <= 4000),
	reviewed_at timestamptz not null default now(),
	reviewed_by uuid references auth.users (id) on delete set null
);

comment on table public.question_template_reviews is
	'Verdict de relecture d''un modèle de questions (validé / à revoir + commentaire), un par modèle. Admin seul.';

-- ============================================================================
-- 2. Auteur et date posés par la base
-- ============================================================================
-- Depuis l'appli (auth.uid() connu), l'auteur et la date viennent de la base,
-- jamais de l'appelant. Le script de reprise des verdicts des artefacts tourne
-- en service_role (auth.uid() nul) : il garde la date d'origine qu'il fournit.

create function public.question_template_reviews_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if auth.uid() is not null then
		new.reviewed_at := now();
		new.reviewed_by := auth.uid();
	end if;
	return new;
end;
$$;

create trigger question_template_reviews_stamp
	before insert or update on public.question_template_reviews
	for each row execute function public.question_template_reviews_stamp();

revoke execute on function public.question_template_reviews_stamp() from public, anon, authenticated;

-- ============================================================================
-- 3. Droits de table
-- ============================================================================
-- Les privilèges par défaut donnent tout à anon et authenticated : on repart de
-- zéro. anon : rien (42501). authenticated : filtré par la RLS (admin seul).

revoke all on public.question_template_reviews from anon, authenticated;
grant select, insert, update, delete on public.question_template_reviews to authenticated;

-- ============================================================================
-- 4. RLS
-- ============================================================================

alter table public.question_template_reviews enable row level security;

create policy "Admins can read template reviews"
	on public.question_template_reviews for select
	to authenticated
	using ((select public.is_admin()));

create policy "Admins can insert template reviews"
	on public.question_template_reviews for insert
	to authenticated
	with check ((select public.is_admin()));

create policy "Admins can update template reviews"
	on public.question_template_reviews for update
	to authenticated
	using ((select public.is_admin()))
	with check ((select public.is_admin()));

create policy "Admins can delete template reviews"
	on public.question_template_reviews for delete
	to authenticated
	using ((select public.is_admin()));
