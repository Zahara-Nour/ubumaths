-- =============================================================================
-- L'heure de publication est posée par la BASE, pas par Node
-- =============================================================================
--
-- Le bug (mesuré) : `setContentPublication` écrivait `published_at` avec
-- l'horloge de Node, alors que les policies élève comparent
-- `published_at <= now()` avec l'horloge de Postgres. Dès que Node avance sur la
-- base (~35 ms suffisent), le contenu « publié » reste invisible à l'élève tant
-- que dure l'avance — et le professeur croit avoir publié.
--
-- Décision de David (Q43 = A) : supprimer la cause. Publier, c'est « maintenant »
-- (il n'existe pas de publication programmée) ; ce « maintenant » est celui de la
-- base, le même que celui de la policy.
--
-- Question d'accès (tranchée) : personne ne gagne ni ne perd de lecture. Le
-- contenu devient visible à l'instant exact de la base, au lieu d'un instant
-- décalé de l'avance de Node.
--
-- Périmètre : les cinq tables dont une policy élève compare `published_at` à
-- `now()` (inventaire `pg_policies` du 2026-10-01). `worksheets.published_at`
-- n'en fait pas partie : aucune policy ne le compare à `now()`.
--
-- Ce que fait le trigger, sur UPDATE de `published_at` seulement :
--   * publier (NULL -> date)           : la date devient now() de la base ;
--   * republier (date -> autre date)   : idem, comme le code le faisait déjà ;
--   * dépublier (date -> NULL)         : inchangé ;
--   * même valeur réécrite             : inchangé (rien n'a été publié) ;
--   * UPDATE qui ne touche pas la colonne : le trigger ne se déclenche pas.
--
-- Pourquoi pas INSERT : aucun code n'insère un `published_at` non NULL (le
-- rattachement naît « préparé »), et les tests d'intégration qui gardent
-- `<= now()` contre une date FUTURE posent cette date à l'insertion. Les
-- écraser à l'insertion rendrait ces gardes vertes pour une mauvaise raison.
--
-- Aucune policy, aucun GRANT : SECURITY INVOKER, le trigger ne fait que
-- réécrire la ligne que l'appelant avait déjà le droit d'écrire.
--
-- ROLLBACK :
--   drop trigger if exists published_at_horloge_base on public.chapter_documents;
--   drop trigger if exists published_at_horloge_base on public.chapter_exercises;
--   drop trigger if exists published_at_horloge_base on public.chapter_worksheets;
--   drop trigger if exists published_at_horloge_base on public.chapter_checklist_items;
--   drop trigger if exists published_at_horloge_base on public.chapter_decks;
--   drop function if exists public.set_published_at_database_clock();
-- =============================================================================

create or replace function public.set_published_at_database_clock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
	-- Publier ou republier : la base pose son propre « maintenant », celui-là
	-- même que la policy élève compare. Dépublier (NULL) passe tel quel.
	if new.published_at is not null
		and new.published_at is distinct from old.published_at then
		new.published_at := now();
	end if;
	return new;
end;
$$;

comment on function public.set_published_at_database_clock() is
	'Publier = now() de la base : la policy élève compare published_at <= now(), '
	'une date posée par Node en avance rendait le contenu invisible.';

-- Une fonction trigger n'a rien à faire appelée directement.
revoke execute on function public.set_published_at_database_clock() from public, anon, authenticated;

create trigger published_at_horloge_base
	before update of published_at on public.chapter_documents
	for each row execute function public.set_published_at_database_clock();

create trigger published_at_horloge_base
	before update of published_at on public.chapter_exercises
	for each row execute function public.set_published_at_database_clock();

create trigger published_at_horloge_base
	before update of published_at on public.chapter_worksheets
	for each row execute function public.set_published_at_database_clock();

create trigger published_at_horloge_base
	before update of published_at on public.chapter_checklist_items
	for each row execute function public.set_published_at_database_clock();

create trigger published_at_horloge_base
	before update of published_at on public.chapter_decks
	for each row execute function public.set_published_at_database_clock();
