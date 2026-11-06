-- Cahier de texte : conversion des contenus HTML hérités en ubumark
-- =================================================================
--
-- Chantier cahier-ubumark, PR 2 (décision de David du 2026-11-06, Q1).
-- Depuis la PR 1 (#2435), le cahier s'écrit en ubumark ; la lecture accepte
-- encore l'HTML de TipTap (`isLegacyHtmlContent`). Cette migration convertit
-- les lignes restées en HTML, pour que la PR 3 retire la lecture HTML.
--
-- ⚠️ À appliquer APRÈS le `deploy:prod` qui livre la PR 1 : l'ancien code lit
-- le contenu en HTML et n'afficherait pas les sauts de paragraphe d'ubumark.
--
-- Accès : aucun changement (mêmes colonnes, mêmes policies, mêmes lecteurs).
--
-- Conversion (état de la prod au 2026-11-06 : 2 séances, 2 travaux, que des
-- `<p>` autour de références `[[worksheet:…|…]]`) :
--   - paragraphes vides `<p></p>` retirés (seule perte : des lignes vides) ;
--   - `</p><p>` → ligne vide (deux paragraphes ubumark) ;
--   - `<p>` de tête et `</p>` de queue retirés.
--
-- Garde : seule une ligne faite UNIQUEMENT de `<p>` et de texte sans caractère
-- qu'ubumark lirait autrement (`<`, `&`, `*`, `_`, `$`, `` ` ``, `\`, `#`, hors
-- des références) est convertie. Si une ligne en HTML reste après coup, la
-- migration échoue : on regarde la ligne au lieu de la deviner.
--
-- Les triggers `updated_at` sont coupés : une conversion de format n'est pas
-- une modification par le prof.
--
-- Rollback (les 4 lignes de prod, valeurs d'avant relevées le 2026-11-06) :
--   alter table public.class_journal_entries disable trigger update_journal_entries_updated_at;
--   alter table public.journal_entry_homework disable trigger update_journal_entry_homework_updated_at;
--   update public.class_journal_entries set lesson_content = '<p>[[worksheet:8443f4b7-1d0b-4035-9852-6ac06b63e89f|Evaluation : Produit scalaire]]</p><p></p><p>[[worksheet:8443f4b7-1d0b-4035-9852-6ac06b63e89f#2,4,5|Evaluation : Produit scalaire — ex. 2, 4 et 5]]</p><p></p>' where id = '9e9e75aa-9730-46ef-a480-518479aca702';
--   update public.class_journal_entries set lesson_content = '<p>[[worksheet:664fee6b-c9d0-4406-a9eb-9e0655c2b1ac#3|Avant de commencer les fonctions polynômes du second degré — ex. 3]]</p>' where id = '5e44b047-fdbf-4ceb-bfbc-70b7d5684dd8';
--   update public.journal_entry_homework set content = '<p>[[worksheet:664fee6b-c9d0-4406-a9eb-9e0655c2b1ac#4|Avant de commencer les fonctions polynômes du second degré — ex. 4]]</p><p></p>' where id = 'abd84575-c06e-41c5-b4e8-3fb7381618b8';
--   update public.journal_entry_homework set content = '<p>[[worksheet:664fee6b-c9d0-4406-a9eb-9e0655c2b1ac#6|Avant de commencer les fonctions polynômes du second degré — ex. 6]]</p>' where id = '77c58e2c-d3d6-4745-8d3e-9314673d847e';
--   alter table public.class_journal_entries enable trigger update_journal_entries_updated_at;
--   alter table public.journal_entry_homework enable trigger update_journal_entry_homework_updated_at;

begin;

-- Fonctions de travail, retirées en fin de migration.
create function pg_temp.journal_html_convertible(c text) returns boolean
language sql immutable as $$
	select c ~ '^\s*<p>'
		and regexp_replace(
			regexp_replace(c, '</?p>', '', 'g'),
			'\[\[[^\]]*\]\]', '', 'g'
		) !~ '[<&*_$`\\#]'
$$;

create function pg_temp.journal_html_to_ubumark(c text) returns text
language sql immutable as $$
	select btrim(
		regexp_replace(
			regexp_replace(
				regexp_replace(c, '<p>\s*</p>', '', 'g'),
				'</p>\s*<p>', E'\n\n', 'g'
			),
			'^\s*<p>|</p>\s*$', '', 'g'
		),
		E' \n'
	)
$$;

alter table public.class_journal_entries disable trigger update_journal_entries_updated_at;
alter table public.journal_entry_homework disable trigger update_journal_entry_homework_updated_at;

update public.class_journal_entries
set lesson_content = pg_temp.journal_html_to_ubumark(lesson_content)
where pg_temp.journal_html_convertible(lesson_content);

update public.journal_entry_homework
set content = pg_temp.journal_html_to_ubumark(content)
where pg_temp.journal_html_convertible(content);

alter table public.class_journal_entries enable trigger update_journal_entries_updated_at;
alter table public.journal_entry_homework enable trigger update_journal_entry_homework_updated_at;

-- Même reconnaissance que `isLegacyHtmlContent` (src/lib/journal/content.ts).
do $$
declare
	reste integer;
begin
	select count(*) into reste from (
		select lesson_content as c from public.class_journal_entries
		union all
		select content from public.journal_entry_homework
	) t
	where t.c ~* '^\s*<(p|h[1-6]|ul|ol|li|blockquote|pre|table|div|hr|img|span)\M';
	if reste > 0 then
		raise exception 'cahier-ubumark : % contenu(s) encore en HTML, non convertible(s) sans regarder', reste;
	end if;
end $$;

commit;
