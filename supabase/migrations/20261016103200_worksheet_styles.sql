-- Styles de fiche (ADR 0028, lot 3a)
-- ==============================================================================
--
-- Un style = une famille de gabarits, un par forme (fiche, réponses, corrigé,
-- fiche + corrections), et le code Typst qu'ils partagent. La fiche choisit un
-- style ; les formes suivent. Décisions de David : D3, D9
-- (docs/wip/generateur-pdf-fiches-progress.md).
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT (tranché par David, D9) :
--   - le prof et l'admin lisent les styles fournis par Chiphre (propriétaire
--     vide) : nom et description, rien de personnel. Avant, le prof ne lisait
--     pas les lignes système de `worksheet_templates` (le code en a une copie) ;
--   - chacun lit, modifie et supprime SES styles ; l'admin peut tout ;
--   - les élèves n'ont AUCUN accès à la table (le serveur leur fournira le
--     gabarit de leur fiche, lot 4), `anon` non plus.
--   Aucune donnée d'élève dans ces tables.
--
-- Le Typst des styles de Chiphre reste dans le code
-- (`src/lib/typst/templates/styles.ts`) : leur ligne ici n'existe que pour
-- qu'une fiche puisse les désigner. Mêmes identifiants que leur gabarit.
--
-- Additive : une table neuve ; deux colonnes sur `worksheet_templates` (style
-- et forme), une sur `worksheets` (style). `worksheets.style_id` reste VIDE
-- pour les fiches existantes : le code lira le style s'il est rempli, sinon le
-- gabarit. Le remplir maintenant le rendrait périmé si le code en production
-- change le gabarit d'une fiche avant le déploiement ; il le sera juste avant
-- le retrait (destructif, plus tard) de `worksheets.template_id`.
-- `worksheet_templates.style_id` reste facultatif : le code en production crée
-- des gabarits sans style.
--
-- ROLLBACK:BEGIN
-- drop trigger if exists worksheets_style_owner_check on public.worksheets;
-- drop trigger if exists worksheet_templates_style_owner_check on public.worksheet_templates;
-- drop function if exists public.worksheets_style_owner_check();
-- drop function if exists public.worksheet_templates_style_owner_check();
-- alter table public.worksheets drop column if exists style_id;
-- drop index if exists public.worksheet_templates_style_form_key;
-- alter table public.worksheet_templates drop column if exists form;
-- alter table public.worksheet_templates drop column if exists style_id;
-- drop table if exists public.worksheet_styles;
-- ROLLBACK:END

-- ---------------------------------------------------------------------------
-- 1. Table des styles
-- ---------------------------------------------------------------------------

create table public.worksheet_styles (
	id uuid primary key default gen_random_uuid(),
	-- Vide = fourni par Chiphre. Supprimer le compte supprime ses styles (RGPD) :
	-- un style de prof ne doit jamais devenir un style de Chiphre.
	owner_id uuid references public.profiles(id) on delete cascade,
	name text not null check (length(trim(name)) between 1 and 255),
	description text check (description is null or length(description) <= 2000),
	-- Code Typst commun à ses gabarits, à la place de `{{style_common}}`.
	common_typst text not null default '' check (length(common_typst) <= 200000),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.worksheet_styles is
	'Styles de fiche (ADR 0028) : famille de gabarits, un par forme. Propriétaire vide = fourni par Chiphre (Typst dans le code).';

create index idx_worksheet_styles_owner on public.worksheet_styles (owner_id);

create trigger update_worksheet_styles_updated_at
	before update on public.worksheet_styles
	for each row execute function public.update_updated_at_column();

-- Les 12 styles de Chiphre, mêmes identifiants que leur gabarit.
insert into public.worksheet_styles (id, owner_id, name, description) values
	('00000000-0000-4000-8000-000000000001', null, 'Standard', 'Mise en page basique avec titre, informations eleve et exercices'),
	('00000000-0000-4000-8000-000000000002', null, 'Contrôle', 'Mise en page formelle pour contrôle avec section notation'),
	('00000000-0000-4000-8000-000000000003', null, 'Examen', 'Mise en page officielle d''examen avec en-tete, consignes et ligne de signature'),
	('00000000-0000-4000-8000-000000000004', null, 'Devoirs', 'Mise en page simple pour devoirs a la maison'),
	('00000000-0000-4000-8000-000000000005', null, 'Quiz', 'Format quiz rapide avec questions numerotees'),
	('00000000-0000-4000-8000-000000000006', null, 'Minimaliste', 'Mise en page epuree et minimaliste'),
	('00000000-0000-4000-8000-000000000007', null, 'Moderne', 'Design moderne avec numéros d''exercices stylisés et mise en page épurée'),
	('00000000-0000-4000-8000-000000000008', null, 'Deux colonnes', 'Mise en page sur deux colonnes pour optimiser l''espace'),
	('00000000-0000-4000-8000-000000000009', null, 'Paysage', 'Format A4 paysage avec grille optimisée pour les exercices'),
	('00000000-0000-4000-8000-000000000010', null, 'Magazine', 'Style magazine avec design éditorial, encadrés colorés et typographie variée'),
	('00000000-0000-4000-8000-000000000011', null, 'Scientifique', 'Style académique avec tableaux de données et grille de notation formelle'),
	('00000000-0000-4000-8000-000000000012', null, 'Fiche élève', 'Deux colonnes avec filet, en-tête pleine largeur, numéro d''exercice sur carré ambre, sections soulignées');

-- Chaque gabarit d'un prof devient son propre style (0 en production le
-- 2026-10-14), même identifiant que le gabarit.
insert into public.worksheet_styles (id, owner_id, name, description)
select t.id, t.created_by, t.name, left(t.description, 2000)
from public.worksheet_templates t
where t.created_by is not null;

-- ---------------------------------------------------------------------------
-- 2. Gabarits : style et forme
-- ---------------------------------------------------------------------------

alter table public.worksheet_templates
	add column style_id uuid references public.worksheet_styles(id) on delete cascade,
	add column form text not null default 'worksheet'
		check (form in ('worksheet', 'answers', 'correction', 'worksheet_with_corrections'));

-- Un seul gabarit par (style, forme).
create unique index worksheet_templates_style_form_key
	on public.worksheet_templates (style_id, form);

-- Les gabarits existants sont la forme « fiche » du style de même identifiant.
-- (En local, le seed insère les gabarits système APRÈS les migrations :
-- `supabase/seed/worksheet_system_templates.sql` refait ce rattachement.)
update public.worksheet_templates t
set style_id = t.id
where t.style_id is null
	and exists (select 1 from public.worksheet_styles s where s.id = t.id);

-- ---------------------------------------------------------------------------
-- 3. Fiches : style choisi (vide = gabarit, puis style par défaut)
-- ---------------------------------------------------------------------------

alter table public.worksheets
	add column style_id uuid references public.worksheet_styles(id) on delete set null;

create index idx_worksheets_style on public.worksheets (style_id);

-- ---------------------------------------------------------------------------
-- 4. Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.worksheet_styles from anon, authenticated;
grant select, insert, delete on public.worksheet_styles to authenticated;
-- UPDATE colonne par colonne : ni `id`, ni `owner_id`, ni les dates.
grant update (name, description, common_typst) on public.worksheet_styles to authenticated;

alter table public.worksheet_styles enable row level security;

create policy "Teachers read Chiphre styles and their own"
	on public.worksheet_styles for select
	to authenticated
	using (
		(select public.is_teacher_or_admin())
		and (owner_id is null or owner_id = (select auth.uid()))
	);

create policy "Teachers create their own styles"
	on public.worksheet_styles for insert
	to authenticated
	with check ((select public.is_teacher_or_admin()) and owner_id = (select auth.uid()));

create policy "Teachers update their own styles"
	on public.worksheet_styles for update
	to authenticated
	using ((select public.is_teacher_or_admin()) and owner_id = (select auth.uid()))
	with check ((select public.is_teacher_or_admin()) and owner_id = (select auth.uid()));

create policy "Teachers delete their own styles"
	on public.worksheet_styles for delete
	to authenticated
	using ((select public.is_teacher_or_admin()) and owner_id = (select auth.uid()));

create policy "Admins manage all styles"
	on public.worksheet_styles for all
	to authenticated
	using ((select public.is_admin()))
	with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 5. Rattachement à un style : seulement à un style permis
-- ---------------------------------------------------------------------------
--
-- Une clé étrangère se vérifie hors RLS : sans ces triggers, un prof pourrait
-- rattacher sa fiche ou son gabarit au style d'un autre (connu par son UUID),
-- ou son gabarit à un style de Chiphre (et y prendre la place d'une forme).
-- SECURITY INVOKER : la lecture du style passe par la RLS de l'appelant ; un
-- style qu'il ne lit pas est refusé comme un style qui n'existe pas.
-- Migrations, seed et `service_role` (hors `anon` / `authenticated`) passent.

create function public.worksheet_templates_style_owner_check()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
	if new.style_id is null
		or coalesce(auth.role(), '') not in ('anon', 'authenticated')
		or public.is_admin() then
		return new;
	end if;
	-- Un gabarit ne rejoint que le style de son auteur (jamais un style de Chiphre).
	if not exists (
		select 1 from public.worksheet_styles s
		where s.id = new.style_id and s.owner_id = new.created_by
	) then
		raise exception 'Style refusé : un gabarit ne rejoint qu''un style de son auteur.'
			using errcode = 'insufficient_privilege';
	end if;
	return new;
end;
$$;

create trigger worksheet_templates_style_owner_check
	before insert or update of style_id, form, created_by on public.worksheet_templates
	for each row execute function public.worksheet_templates_style_owner_check();

create function public.worksheets_style_owner_check()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
	if new.style_id is null
		or coalesce(auth.role(), '') not in ('anon', 'authenticated')
		or public.is_admin() then
		return new;
	end if;
	-- Une fiche prend un style de Chiphre, ou un style de l'auteur de la fiche.
	if not exists (
		select 1 from public.worksheet_styles s
		where s.id = new.style_id and (s.owner_id is null or s.owner_id = new.created_by)
	) then
		raise exception 'Style refusé : la fiche prend un style de Chiphre ou de son auteur.'
			using errcode = 'insufficient_privilege';
	end if;
	return new;
end;
$$;

create trigger worksheets_style_owner_check
	before insert or update of style_id, created_by on public.worksheets
	for each row execute function public.worksheets_style_owner_check();

revoke execute on function public.worksheet_templates_style_owner_check() from public, anon;
revoke execute on function public.worksheets_style_owner_check() from public, anon;
