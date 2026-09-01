-- Template « Fiche élève » + numérotation en badge sur « Moderne »
-- ================================================================
--
-- 1. « Fiche élève » : même mise en page que le PDF téléchargé par l'élève
--    (A4 deux colonnes, numéro d'exercice en blanc sur carré rouge). La ligne
--    doit exister AVANT que l'UI ne propose le template : worksheets.template_id
--    est une FK vers worksheet_templates.
--
-- 2. « Moderne » : sa description promet des « numéros d'exercices stylisés »
--    mais son contenu appelait {{exercises}} (titres « Exercice N »). Il utilise
--    désormais {{exercises_badge}}. La ligne est rafraîchie ici parce que
--    GET /api/worksheets/[id] renvoie la ligne DB quand la RLS l'autorise
--    (compte admin) : sans cet UPDATE, l'admin continuerait de générer l'ancien
--    rendu alors que le compte prof, lui, retombe sur le contenu du code.
--
-- Comme les autres templates système : created_by = NULL.
-- Source de vérité : src/lib/typst/templates/default-templates.ts

-- Fiche élève — Deux colonnes, numéro d'exercice en blanc sur carré rouge (rendu identique au PDF de l'élève)
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  $tpl$Fiche élève$tpl$,
  $tpl$Deux colonnes, numéro d'exercice en blanc sur carré rouge (rendu identique au PDF de l'élève)$tpl$,
  $tpl$// Mise en page identique au PDF de l'élève : A4 sur deux colonnes
#set page(
  paper: "a4",
  margin: (x: 1cm, y: 1.5cm),
  columns: 2,
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

// En-tête
#align(center)[
  #text(size: 1.5em, weight: "bold")[{{title}}]
]

#align(center)[#text(size: 0.9em, fill: gray)[{{date}}]]

#v(0.3em)

{{student_name}} #h(1fr) {{class}}

#line(length: 100%, stroke: 0.5pt + gray)

#v(0.5em)

// Exercices (numéros en blanc sur carré rouge)
{{exercises_badge}}
$tpl$,
  $tpl$[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d'exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l'eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l'ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]$tpl$::jsonb,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Moderne — Design moderne avec numéros d'exercices stylisés et mise en page épurée
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000007',
  $tpl$Moderne$tpl$,
  $tpl$Design moderne avec numéros d'exercices stylisés et mise en page épurée$tpl$,
  $tpl$// Configuration de la page avec design moderne
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2cm, right: 2cm),
  background: place(
    top + right,
    dx: -1cm,
    dy: 1cm,
    rotate(45deg, text(120pt, fill: rgb(240, 240, 240), "MATHS"))
  )
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)
#set par(justify: true, leading: 0.8em)

// Header moderne avec dégradé
#rect(
  width: 100%,
  fill: gradient.linear(rgb("#1e40af"), rgb("#3b82f6"), angle: 135deg),
  radius: (bottom: 15pt),
  inset: 0pt
)[
  #block(inset: (x: 25pt, y: 20pt))[
    #text(size: 28pt, fill: white, weight: "bold")[{{title}}]
    #v(0.2cm)
    #text(size: 12pt, fill: white.transparentize(30%))[{{school_name}}]
  ]

  #v(0.5cm)

  #block(inset: (x: 25pt, bottom: 20pt))[
    #grid(
      columns: (1fr, 1fr, 1fr),
      column-gutter: 1cm,
      text(fill: white)[
        #text(weight: "bold", size: 9pt)[ÉLÈVE]\
        #text(size: 11pt)[{{student_name}}]
      ],
      text(fill: white)[
        #text(weight: "bold", size: 9pt)[CLASSE]\
        #text(size: 11pt)[{{class}}]
      ],
      text(fill: white)[
        #text(weight: "bold", size: 9pt)[DATE]\
        #text(size: 11pt)[{{date}}]
      ]
    )
  ]
]

#v(1cm)

// Section consignes avec icône stylisée
#block(
  width: 100%,
  fill: rgb("#fef3c7"),
  stroke: (left: 4pt + rgb("#f59e0b")),
  inset: (left: 20pt, y: 12pt, right: 15pt),
  radius: (right: 8pt)
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 12pt,
    text(size: 18pt)[⚡],
    [
      #text(weight: "bold", size: 11pt, fill: rgb("#92400e"))[Consignes]
      #v(0.2cm)
      #text(size: 10pt)[{{instructions}}]
    ]
  )
]

#v(0.8cm)

// Badges d'information
#grid(
  columns: (auto, auto, 1fr, auto),
  column-gutter: 12pt,
  box(
    fill: rgb("#dbeafe"),
    inset: (x: 12pt, y: 6pt),
    radius: 15pt,
    text(size: 9pt, fill: rgb("#1e40af"))[⏱ {{duration}} min]
  ),
  box(
    fill: rgb("#fce7f3"),
    inset: (x: 12pt, y: 6pt),
    radius: 15pt,
    text(size: 9pt, fill: rgb("#9d174d"))[👤 {{teacher_name}}]
  ),
  [],
  rect(
    fill: white,
    stroke: 2pt + rgb("#dc2626"),
    radius: 8pt,
    inset: (x: 15pt, y: 8pt)
  )[
    #text(size: 9pt, fill: rgb("#64748b"))[Score]
    #h(10pt)
    #text(size: 14pt, weight: "bold")[\_\_\_\_\_ / {{total_points}}]
  ]
)

#v(1.5cm)

// Séparateur décoratif
#align(center)[
  #box(width: 60%, height: 2pt, fill: gradient.linear(
    white,
    rgb("#e5e7eb"),
    white,
    relative: "self"
  ))
]

#v(1cm)

// Zone des exercices (numéros en blanc sur carré rouge)
{{exercises_badge}}

// Footer moderne
#v(1fr)
#line(length: 100%, stroke: (paint: rgb("#e5e7eb"), thickness: 0.5pt, dash: "dotted"))
#v(0.3cm)
#align(center)[
  #text(size: 8pt, fill: rgb("#9ca3af"))[
    Page #context(counter(page).display()) sur #context(counter(page).final().first())
  ]
]$tpl$,
  $tpl$[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d'exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l'eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l'ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]$tpl$::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();
