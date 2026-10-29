-- ============================================================================
-- Dictionnaire : une adresse fixe par entrée (chantier seo, glossaire en pages)
-- ============================================================================
--
-- Chaque entrée du glossaire aura sa page, /glossaire/<slug>. Décision de David
-- (2026-10-29, choix A1) : l'adresse est enregistrée une fois pour toutes, à la
-- création de l'entrée ; renommer le terme ne la change pas (un lien déjà indexé
-- par Google ne casse jamais).
--
-- Règle : terme (+ sens s'il y en a un), en minuscules, accents retirés, tout ce
-- qui n'est ni lettre ni chiffre remplacé par un tiret — « base » (puissance) →
-- base-puissance, « écart interquartile » → ecart-interquartile. Collision en
-- prod mesurée le 2026-10-29 : aucune (675 entrées) ; une future collision reçoit
-- un suffixe -2, -3…
--
-- Question d'accès (David, 2026-10-29) : personne ne lit rien de nouveau. La
-- colonne suit les droits de la table : tous lisent le slug des entrées visibles,
-- l'admin seul lit celui des entrées masquées. Le slug ne s'écrit que par le
-- trigger ci-dessous (droits de l'appelant, pas SECURITY DEFINER) : ni l'admin ni
-- personne ne le choisit ou ne le modifie.
--
-- Additive. Rollback :
--   drop trigger dictionary_entries_slug on public.dictionary_entries;
--   drop function public.dictionary_entries_set_slug();
--   alter table public.dictionary_entries drop column slug;
--   drop function public.dictionary_slugify(text);

-- ============================================================================
-- 1. Règle de calcul
-- ============================================================================

create function public.dictionary_slugify(source text)
returns text
language sql
immutable
set search_path = ''
as $$
	select trim(both '-' from regexp_replace(
		replace(replace(
			translate(lower(source), 'àâäéèêëîïôöùûüÿç', 'aaaeeeeiioouuuyc'),
			'œ', 'oe'), 'æ', 'ae'),
		'[^a-z0-9]+', '-', 'g'))
$$;

comment on function public.dictionary_slugify(text) is
	'Adresse d''une entrée du dictionnaire : minuscules, sans accents, tirets.';

-- ============================================================================
-- 2. Colonne, remplie pour les entrées existantes
-- ============================================================================
-- Le trigger d'historique est coupé le temps du remplissage : sinon chaque entrée
-- recevrait une fausse version, un auteur NULL et une date de modification
-- « aujourd'hui » (le sitemap la lit).

alter table public.dictionary_entries add column slug text;

alter table public.dictionary_entries disable trigger dictionary_entries_keep_version;
update public.dictionary_entries
	set slug = public.dictionary_slugify(term || coalesce(' ' || sense, ''));
alter table public.dictionary_entries enable trigger dictionary_entries_keep_version;

alter table public.dictionary_entries
	alter column slug set not null,
	add constraint dictionary_entries_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index dictionary_entries_slug on public.dictionary_entries (slug);

-- ============================================================================
-- 3. Trigger : posé à la création, figé ensuite
-- ============================================================================
-- Droits de l'appelant : seul l'admin insère et modifie (RLS), et il lit toutes
-- les entrées, masquées comprises, pour éviter une collision. Si une collision
-- échappait quand même, l'index unique refuserait l'écriture (rien d'écrit).

create function public.dictionary_entries_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	base text;
	candidate text;
	n integer := 1;
begin
	if tg_op = 'UPDATE' then
		new.slug := old.slug;
		return new;
	end if;
	base := public.dictionary_slugify(new.term || coalesce(' ' || new.sense, ''));
	if base = '' then
		base := 'terme';
	end if;
	candidate := base;
	while exists (select 1 from public.dictionary_entries where slug = candidate) loop
		n := n + 1;
		candidate := base || '-' || n;
	end loop;
	new.slug := candidate;
	return new;
end;
$$;

revoke execute on function public.dictionary_entries_set_slug() from public, anon, authenticated;

create trigger dictionary_entries_slug
	before insert or update on public.dictionary_entries
	for each row execute function public.dictionary_entries_set_slug();
