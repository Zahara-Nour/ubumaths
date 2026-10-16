-- Style « 2 colonnes - paysage » (David, 2026-10-16)
-- ==============================================================================
--
-- Un 13e style fourni par Chiphre : « Fiche élève » en A4 paysage, pour ses
-- quatre formes (fiche, réponses, corrigé, fiche + corrections). Son Typst vit
-- dans le code (`src/lib/typst/templates/styles.ts`, ADR 0028 D9) ; ses deux
-- lignes ici n'existent que pour qu'une fiche puisse le désigner :
--   - `worksheet_styles` : cible de `worksheets.style_id` ;
--   - `worksheet_templates` : cible de `worksheets.template_id`, que l'API remplit
--     avec l'identifiant d'un style de Chiphre (même identifiant que son gabarit).
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT (tranché par David le
-- 2026-10-16) : les profs et l'admin lisent le nom et la description d'un style
-- de Chiphre de plus. Aucune donnée d'élève ; les élèves et `anon` n'ont
-- toujours aucun accès à ces tables. Aucune policy ne change.
--
-- Additive : deux insertions, à identifiant fixe.
--
-- ROLLBACK:BEGIN
-- update public.worksheets set style_id = null where style_id = '00000000-0000-4000-8000-000000000013';
-- update public.worksheets set template_id = null where template_id = '00000000-0000-4000-8000-000000000013';
-- delete from public.worksheet_templates where id = '00000000-0000-4000-8000-000000000013';
-- delete from public.worksheet_styles where id = '00000000-0000-4000-8000-000000000013';
-- ROLLBACK:END

insert into public.worksheet_styles (id, owner_id, name, description) values
	('00000000-0000-4000-8000-000000000013', null, '2 colonnes - paysage', 'Comme « Fiche élève », en A4 paysage : deux colonnes avec filet, en-tête pleine largeur, numéro d''exercice sur carré ambre, sections soulignées');

insert into public.worksheet_templates (id, name, description, template_content, placeholders, created_by, style_id, form)
values (
	'00000000-0000-4000-8000-000000000013',
	'2 colonnes - paysage',
	'Comme « Fiche élève », en A4 paysage : deux colonnes avec filet, en-tête pleine largeur, numéro d''exercice sur carré ambre, sections soulignées',
	'// Mise en page proche du PDF de l''élève : A4 paysage sur deux colonnes
#set page(
  paper: "a4",
  flipped: true,
  margin: (x: 1cm, y: 1.5cm),
  columns: 2,
  // Filet vertical entre les deux colonnes (hauteur = zone de texte)
  background: place(center + horizon, line(
    angle: 90deg,
    length: 100% - 3cm,
    stroke: 0.3pt + luma(75%)
  )),
  footer: context [
    #set align(center)
    #set text(size: 9pt, fill: gray)
    #counter(page).display("1 / 1", both: true)
  ]
)

#set text(font: "New Computer Modern", size: 10pt, lang: "{{lang}}")
#set par(justify: true)
#set heading(numbering: none)

// Espacement des listes et respiration entre exercices
#set enum(spacing: 1.5em, tight: false)
#set list(spacing: 1.5em, tight: false)
#set block(spacing: 1.8em)

// En-tête sur toute la largeur, au-dessus des deux colonnes.
// Le fond blanc masque le filet vertical derrière le bandeau.
#place(top + center, scope: "parent", float: true)[
  #block(width: 100%, fill: white, inset: (bottom: 6pt), below: 1.2em)[
    {{#if show_title}}#align(center)[#text(size: 1.5em, weight: "bold")[{{title}}]]
    #v(0.4em){{/if}}
    {{#if show_identity}}#grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      [{{#if show_student_name}}*{{label_name}} :* {{student_name}}{{/if}}],
      [{{#if show_date}}*{{label_date}} :* {{date}}{{/if}}{{#if show_due_date}}*{{label_due_date}} :* {{due_date}}{{/if}}],
      [{{#if show_class}}*{{label_class}} :* {{class}}{{/if}}]
    )
    #v(0.3em){{/if}}
    {{#if show_header_notes}}#text(size: 0.9em)[{{#if show_header_notes}}#grid(
  columns: (1fr, auto, 1fr),
  align: (left, center, right),
  [{{#if show_duration}}*{{label_duration}} :* {{duration}} {{label_minutes}}{{/if}}],
  [{{#if show_calculator}}{{calculator}}{{/if}}],
  [{{#if show_total}}*{{label_total}} :* {{total_points}} {{label_points}}{{/if}}]
){{/if}}]
    #v(0.3em){{/if}}
    #line(length: 100%, stroke: 0.5pt + gray)
  ]
]

// Exercices (numéros sur carré ambre, sections soulignées en ambre)
{{exercises_badge}}
',
	'[{"key": "title", "type": "text", "label": "Titre", "default_value": "Feuille d''exercices"}, {"key": "date", "type": "date", "label": "Date", "default_value": ""}, {"key": "class", "type": "text", "label": "Classe", "default_value": ""}, {"key": "student_name", "type": "text", "label": "Nom de l''eleve", "default_value": ""}, {"key": "exercises", "type": "dynamic", "label": "Exercices", "default_value": ""}, {"key": "total_points", "type": "text", "label": "Total des points", "default_value": ""}, {"key": "duration", "type": "text", "label": "Duree estimee", "default_value": ""}, {"key": "instructions", "type": "text", "label": "Consignes", "default_value": ""}, {"key": "school_name", "type": "text", "label": "Nom de l''ecole", "default_value": ""}, {"key": "teacher_name", "type": "text", "label": "Nom du professeur", "default_value": ""}]'::jsonb,
	null,
	'00000000-0000-4000-8000-000000000013',
	'worksheet'
);
