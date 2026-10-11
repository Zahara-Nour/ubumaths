-- ==============================================================================
-- « Afficher sur Google » : exercises.search_indexed
-- ==============================================================================
--
-- Décision de David : un exercice public n'apparaît sur Google (sitemap, pas de
-- balise noindex) que si son auteur coche une case DISTINCTE de « public ».
-- Cette migration pose la colonne et sa règle ; le formulaire, le sitemap et la
-- balise noindex viendront dans une PR suivante, après `db:types`.
--
-- QUESTION D'ACCÈS (tranchée par David) : PERSONNE ne gagne d'accès, personne
-- n'en perd. Un exercice public est déjà lisible par qui a son lien ; la colonne
-- suit les droits existants de la ligne (aucune policy, aucun GRANT ne change) :
--   - lecture : les policies SELECT de `exercises` (auteur, élève affecté,
--     exercice public) ;
--   - écriture : « Teachers can update own exercises » — seul l'auteur, prof.
-- Aucun privilège de colonne sur `exercises` : les GRANT sont au niveau de la
-- table, la nouvelle colonne y est donc couverte d'office.
--
-- RÈGLE : un exercice privé ne peut pas être affiché sur Google
-- (CHECK `exercises_search_indexed_requires_public`, code 23514). Dépublier un
-- exercice affiché sur Google exige de décocher Google dans la même mise à jour.
--
-- Additive : colonne NOT NULL avec défaut `false` (toutes les lignes existantes
-- valent `false`, donc respectent la contrainte), aucune donnée perdue.
--
-- Preuve : tests/integration/exercices-afficher-sur-google.test.ts.
--
-- ROLLBACK :
--   alter table public.exercises
--     drop constraint if exists exercises_search_indexed_requires_public;
--   alter table public.exercises drop column if exists search_indexed;
-- ==============================================================================

alter table public.exercises
	add column search_indexed boolean not null default false;

alter table public.exercises
	add constraint exercises_search_indexed_requires_public
	check (not search_indexed or is_public);

comment on column public.exercises.search_indexed is
	'« Afficher sur Google » : l''auteur autorise l''indexation de cet exercice public '
	'(sitemap, pas de balise noindex). Faux par défaut. Exige is_public '
	'(contrainte exercises_search_indexed_requires_public).';

comment on constraint exercises_search_indexed_requires_public on public.exercises is
	'Un exercice privé ne peut pas être affiché sur Google ; dépublier exige de '
	'décocher search_indexed dans la même mise à jour.';
