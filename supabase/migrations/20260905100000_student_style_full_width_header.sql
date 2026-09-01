-- « Fiche élève » : en-tête pleine largeur + filet vertical entre les colonnes
-- ===========================================================================
--
-- L'en-tête (titre, nom, date, classe) était enfermé dans la première colonne :
-- il passe au-dessus des deux via `place(scope: "parent", float: true)`, et un
-- filet vertical sépare désormais les colonnes.
--
-- La ligne DB est rafraîchie parce que GET /api/worksheets/[id] renvoie le
-- template stocké quand la RLS l'autorise (compte admin), et que le générateur
-- préfère ce contenu à celui du code.
--
-- Source de vérité : src/lib/typst/templates/default-templates.ts

-- Fiche élève — Deux colonnes avec filet, en-tête pleine largeur, numéro d'exercice en blanc sur carré rouge
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  $tpl$Fiche élève$tpl$,
  $tpl$Deux colonnes avec filet, en-tête pleine largeur, numéro d'exercice en blanc sur carré rouge$tpl$,
  $tpl$// Mise en page proche du PDF de l'élève : A4 sur deux colonnes
#set page(
  paper: "a4",
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

#set text(font: "New Computer Modern", size: 10pt, lang: "fr")
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
    #align(center)[#text(size: 1.5em, weight: "bold")[{{title}}]]
    #v(0.4em)
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      [{{student_name}}],
      [#text(size: 0.9em, fill: gray)[{{date}}]],
      [{{class}}]
    )
    #v(0.3em)
    #line(length: 100%, stroke: 0.5pt + gray)
  ]
]

// Exercices (numéros en blanc sur carré rouge)
{{exercises_badge}}
$tpl$,
  $tpl$[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d'exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l'eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l'ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]$tpl$::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();
