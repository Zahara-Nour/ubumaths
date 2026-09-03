-- Templates système : options d'affichage effectives via {{#if ...}}
-- ===========================================================================
--
-- Les 12 templates intégrés remplissaient {{date}}, {{class}}, {{student_name}},
-- {{title}} et {{total_points}} sans jamais lire la config de la fiche : une
-- feuille avec « Afficher la date » décochée sortait quand même avec la date.
-- Les libellés étant écrits en dur dans le Typst, il ne suffisait pas d'injecter
-- une valeur vide ; chaque fragment (libellé + valeur) est désormais encadré par
-- un conditionnel {{#if show_x}}...{{/if}} résolu par renderTemplate().
--
-- Au passage : « Evaluation » ne compilait pas du tout ([/ 20] est lu par Typst
-- comme une liste de termes, d'où « expected colon ») — le / est échappé.
--
-- Les lignes DB sont rafraîchies parce que GET /api/worksheets/[id] renvoie le
-- template stocké et que le générateur préfère ce contenu à celui du code.
-- Elles avaient dérivé : la copie en base datait d'une version antérieure du
-- fichier TS (ex. « Minimaliste » sans les #set enum/list).
--
-- Source de vérité : src/lib/typst/templates/default-templates.ts

-- Standard — Mise en page basique avec titre, informations eleve et exercices
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Standard',
  'Mise en page basique avec titre, informations eleve et exercices',
  '// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// En-tete
#align(center)[
  {{#if show_title}}#text(size: 18pt, weight: "bold")[{{title}}]{{/if}}
]

#v(0.5cm)

// Informations
#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    {{#if show_student_name}}*Nom :* #underline[#h(3cm) {{student_name}} #h(3cm)]{{/if}}
  ],
  [
    {{#if show_class}}*Classe :* {{class}}{{/if}}
  ]
)

#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    {{#if show_date}}*Date :* {{date}}{{/if}}
  ],
  [{{#if show_points}}*Total :* {{total_points}} points{{/if}}]
)

#v(0.5cm)
#line(length: 100%, stroke: 0.5pt)
#v(0.5cm)

// Consignes
#block(
  fill: rgb("#f0f0f0"),
  inset: 10pt,
  radius: 4pt,
  width: 100%
)[
  *Consignes :* {{instructions}}
]
#v(0.5cm)

// Exercices
{{exercises}}
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Evaluation — Mise en page formelle pour evaluation avec section notation
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  'Evaluation',
  'Mise en page formelle pour evaluation avec section notation',
  '// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// En-tete avec encadre
#rect(
  width: 100%,
  inset: 12pt,
  stroke: 1pt
)[
  #grid(
    columns: (1fr, auto),
    gutter: 1cm,
    [
      #text(size: 10pt)[{{school_name}}]
      #v(0.3cm)
      #text(size: 16pt, weight: "bold")[EVALUATION]
      #v(0.2cm)
      {{#if show_title}}#text(size: 14pt)[{{title}}]{{/if}}
    ],
    [
      #align(right)[
        #rect(
          width: 3cm,
          height: 2cm,
          inset: 8pt,
          stroke: 1pt
        )[
          #align(center)[
            *Note*
            #v(0.5cm)
            {{#if show_points}}#text(size: 14pt)[\/ {{total_points}}]{{/if}}
          ]
        ]
      ]
    ]
  )
]

#v(0.5cm)

// Informations eleve
#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 0.5cm,
  [{{#if show_student_name}}*Nom :* #underline[#h(2cm) {{student_name}} #h(2cm)]{{/if}}],
  [{{#if show_class}}*Classe :* {{class}}{{/if}}],
  [{{#if show_date}}*Date :* {{date}}{{/if}}]
)

#v(0.3cm)

// Duree
#align(right)[
  #text(style: "italic")[Duree : {{duration}} minutes]
]

#v(0.5cm)
#line(length: 100%, stroke: 1pt)
#v(0.5cm)

// Consignes
#block(
  fill: rgb("#fff3cd"),
  inset: 10pt,
  radius: 4pt,
  width: 100%
)[
  *Consignes :*
  - Lisez attentivement chaque exercice avant de repondre.
  - Justifiez vos reponses sauf indication contraire.
  - La presentation et la redaction sont prises en compte.
  #v(0.2cm)
  {{instructions}}
]

#v(0.5cm)

// Exercices
{{exercises}}

// Bareme en bas de page (optionnel)
#v(1cm)
#line(length: 100%, stroke: 0.5pt)
#align(center)[
  #text(size: 9pt, style: "italic")[
    Bareme indicatif - La note finale peut tenir compte de la qualite de la redaction
  ]
]
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""},{"key":"competences","type":"text","label":"Competences evaluees","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Examen — Mise en page officielle d'examen avec en-tete, consignes et ligne de signature
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'Examen',
  'Mise en page officielle d''examen avec en-tete, consignes et ligne de signature',
  '// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2cm, right: 2cm),
  header: [
    #grid(
      columns: (1fr, auto, 1fr),
      [{{school_name}}],
      [#text(weight: "bold")[EXAMEN]],
      [{{#if show_date}}#align(right)[{{date}}]{{/if}}]
    )
    #line(length: 100%, stroke: 0.5pt)
  ],
  footer: [
    #line(length: 100%, stroke: 0.5pt)
    Page #context(counter(page).display()) sur #context(counter(page).final().first())
  ]
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// Titre officiel
#align(center)[
  #rect(
    width: 80%,
    inset: 15pt,
    stroke: 2pt
  )[
    #align(center)[
      #text(size: 12pt)[{{exam_session}}]
      #v(0.3cm)
      #text(size: 18pt, weight: "bold")[{{subject}}]
      #v(0.3cm)
      {{#if show_title}}#text(size: 14pt)[{{title}}]{{/if}}
      #v(0.3cm)
      #grid(
        columns: (1fr, 1fr),
        [*Duree :* {{duration}} min],
        [*Coefficient :* {{coefficient}}]
      )
    ]
  ]
]

#v(0.5cm)

// Zone identification
#rect(
  width: 100%,
  inset: 10pt,
  stroke: 1pt
)[
  #grid(
    columns: (1fr, 1fr),
    gutter: 1cm,
    [
      *Nom :* #underline[#h(4cm)]
      #v(0.3cm)
      *Prenom :* #underline[#h(4cm)]
    ],
    [
      {{#if show_class}}*Classe :* {{class}}
      #v(0.3cm){{/if}}
      *N° candidat :* #underline[#h(3cm)]
    ]
  )
]

#v(0.5cm)

// Instructions officielles
#rect(
  width: 100%,
  inset: 12pt,
  fill: rgb("#f8f9fa"),
  stroke: 1pt
)[
  #text(weight: "bold", size: 12pt)[INSTRUCTIONS]
  #v(0.3cm)
  - L''usage de la calculatrice est autorise sauf mention contraire.
  - Aucun document n''est autorise.
  - Les reponses doivent etre redigees sur la copie d''examen.
  - Les exercices peuvent etre traites dans n''importe quel ordre.
  #v(0.2cm)
  {{instructions}}
  #v(0.3cm)
  {{#if show_points}}*Total des points :* {{total_points}}{{/if}}
]

#v(0.5cm)

// Attestation sur l''honneur
#block(
  inset: 8pt,
  stroke: (left: 3pt + rgb("#6c757d"))
)[
  #text(size: 10pt, style: "italic")[
    Je soussigne(e) atteste sur l''honneur avoir pris connaissance du reglement
    de l''examen et m''engage a le respecter.
  ]
  #v(0.3cm)
  #grid(
    columns: (1fr, 1fr),
    [Date : #underline[#h(3cm)]],
    [Signature : #underline[#h(4cm)]]
  )
]

#v(1cm)
#line(length: 100%, stroke: 1pt + rgb("#000"))
#v(0.5cm)

// Exercices
{{exercises}}
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""},{"key":"exam_session","type":"text","label":"Session d''examen","default_value":""},{"key":"subject","type":"text","label":"Matiere","default_value":"Mathematiques"},{"key":"coefficient","type":"text","label":"Coefficient","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Devoirs — Mise en page simple pour devoirs a la maison
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000004',
  'Devoirs',
  'Mise en page simple pour devoirs a la maison',
  '// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// En-tete simple
#grid(
  columns: (1fr, auto),
  [
    #text(size: 10pt)[{{school_name}}]
    #v(0.2cm)
    #text(size: 16pt, weight: "bold")[DEVOIRS]
  ],
  [
    #align(right)[
      {{#if show_class}}#text(size: 10pt)[{{class}}]
      #v(0.2cm){{/if}}
      #text(size: 10pt)[{{teacher_name}}]
    ]
  ]
)

#v(0.3cm)
#align(center)[
  {{#if show_title}}#text(size: 14pt, weight: "bold")[{{title}}]{{/if}}
]

#v(0.3cm)

// Informations importantes
#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    {{#if show_date}}#text(weight: "bold")[Date de distribution :] {{date}}{{/if}}
  ],
  [
    #rect(
      fill: rgb("#d4edda"),
      inset: 5pt,
      radius: 3pt
    )[
      #text(weight: "bold")[A rendre pour le :] {{due_date}}
    ]
  ]
)

#v(0.3cm)

// Nom de l''eleve
{{#if show_student_name}}*Nom :* #underline[#h(4cm) {{student_name}} #h(4cm)]{{/if}}

#v(0.5cm)
#line(length: 100%, stroke: 0.5pt)
#v(0.5cm)

// Consignes
#block(
  fill: rgb("#e7f3ff"),
  inset: 10pt,
  radius: 4pt,
  width: 100%
)[
  *Consignes :* {{instructions}}
]
#v(0.5cm)

// Rappels
#block(
  inset: 8pt,
  stroke: (left: 3pt + rgb("#17a2b8"))
)[
  #text(size: 10pt, style: "italic")[
    Rappel : Le travail doit etre soigne et les reponses justifiees.
    N''hesitez pas a poser des questions en classe si necessaire.
  ]
]

#v(0.5cm)

// Exercices
{{exercises}}

// Pied de page
#v(1cm)
#align(center)[
  #text(size: 9pt, style: "italic")[
    Bon travail !
  ]
]
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""},{"key":"due_date","type":"date","label":"Date de rendu","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Quiz — Format quiz rapide avec questions numerotees
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000005',
  'Quiz',
  'Format quiz rapide avec questions numerotees',
  '// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 1.5cm, bottom: 1.5cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// En-tete compact
#rect(
  width: 100%,
  inset: 10pt,
  fill: rgb("#f8f9fa"),
  stroke: 0.5pt
)[
  #grid(
    columns: (auto, 1fr, auto),
    gutter: 1cm,
    [
      #text(size: 14pt, weight: "bold")[QUIZ]
      #v(0.1cm)
      {{#if show_title}}#text(size: 12pt)[{{title}}]{{/if}}
    ],
    [
      #align(center)[
        {{#if show_student_name}}*Nom :* #underline[#h(3cm) {{student_name}} #h(3cm)]{{/if}}
      ]
    ],
    [
      #align(right)[
        {{#if show_class}}*Classe :* {{class}}
        #v(0.1cm){{/if}}
        {{#if show_date}}*Date :* {{date}}{{/if}}
      ]
    ]
  )
]

#v(0.3cm)

// Informations rapides
#grid(
  columns: (1fr, 1fr),
  [#text(style: "italic")[Duree : {{duration}} min]],
  [{{#if show_points}}#align(right)[*Total : {{total_points}} points*]{{/if}}]
)

#v(0.3cm)

// Consignes courtes
#text(size: 10pt, style: "italic")[{{instructions}}]
#v(0.3cm)

#line(length: 100%, stroke: 0.5pt)
#v(0.3cm)

// Exercices
{{exercises}}

// Zone de notation compacte
#v(0.5cm)
#align(right)[
  #rect(
    inset: 8pt,
    stroke: 1pt
  )[
    *Note :* #h(2cm) {{#if show_points}}/ {{total_points}}{{/if}}
  ]
]
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Minimaliste — Mise en page epuree et minimaliste
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000006',
  'Minimaliste',
  'Mise en page epuree et minimaliste',
  '// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// En-tete minimaliste
{{#if show_title}}#text(size: 16pt, weight: "bold")[{{title}}]{{/if}}
#h(1fr)
{{#if show_date}}#text(size: 10pt)[{{date}}]{{/if}}

#v(0.3cm)

{{#if show_student_name}}{{student_name}}{{/if}} #h(1fr) {{#if show_class}}{{class}}{{/if}}

#v(0.5cm)
#line(length: 100%, stroke: 0.3pt)
#v(0.5cm)

// Exercices
{{exercises}}
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Moderne — Design moderne avec numéros d'exercices stylisés et mise en page épurée
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000007',
  'Moderne',
  'Design moderne avec numéros d''exercices stylisés et mise en page épurée',
  '// Configuration de la page avec design moderne
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
    {{#if show_title}}#text(size: 28pt, fill: white, weight: "bold")[{{title}}]{{/if}}
    #v(0.2cm)
    #text(size: 12pt, fill: white.transparentize(30%))[{{school_name}}]
  ]

  #v(0.5cm)

  #block(inset: (x: 25pt, bottom: 20pt))[
    #grid(
      columns: (1fr, 1fr, 1fr),
      column-gutter: 1cm,
      text(fill: white)[
        {{#if show_student_name}}#text(weight: "bold", size: 9pt)[ÉLÈVE]\
        #text(size: 11pt)[{{student_name}}]{{/if}}
      ],
      text(fill: white)[
        {{#if show_class}}#text(weight: "bold", size: 9pt)[CLASSE]\
        #text(size: 11pt)[{{class}}]{{/if}}
      ],
      text(fill: white)[
        {{#if show_date}}#text(weight: "bold", size: 9pt)[DATE]\
        #text(size: 11pt)[{{date}}]{{/if}}
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

// Badges d''information
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
    #text(size: 14pt, weight: "bold")[\_\_\_\_\_{{#if show_points}} / {{total_points}}{{/if}}]
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
]',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Deux colonnes — Mise en page sur deux colonnes pour optimiser l'espace
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000008',
  'Deux colonnes',
  'Mise en page sur deux colonnes pour optimiser l''espace',
  '// Configuration page avec marges adaptées pour colonnes
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 10pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// En-tête élégant sur toute la largeur
#block(
  width: 100%,
  fill: gradient.linear(rgb("#f3f4f6"), white, angle: 90deg),
  inset: 0pt,
  below: 0pt
)[
  #block(inset: (x: 20pt, y: 15pt))[
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      [
        #text(size: 9pt, fill: rgb("#6b7280"))[{{school_name}}]
        #v(0.1cm)
        {{#if show_student_name}}#text(weight: "bold", size: 11pt)[{{student_name}}]{{/if}}
      ],
      rect(
        fill: rgb("#4f46e5"),
        radius: 6pt,
        inset: (x: 18pt, y: 10pt)
      )[
        {{#if show_title}}#text(fill: white, size: 13pt, weight: "bold")[{{title}}]{{/if}}
      ],
      [
        {{#if show_class}}#text(size: 9pt, fill: rgb("#6b7280"))[{{class}}]
        #v(0.1cm){{/if}}
        {{#if show_date}}#text(weight: "bold", size: 11pt)[{{date}}]{{/if}}
      ]
    )
  ]
]

#v(0.6cm)

// Barre d''information avec séparateur central
#grid(
  columns: (1fr, auto, 1fr),
  column-gutter: 15pt,
  align: (right, center, left),
  [
    #text(size: 9pt)[Durée : #text(weight: "bold")[{{duration}} minutes]]
  ],
  circle(radius: 3pt, fill: rgb("#9ca3af")),
  [
    {{#if show_points}}#text(size: 9pt)[Total : #text(weight: "bold")[{{total_points}} points]]{{/if}}
  ]
)

#v(0.4cm)

// Ligne de séparation décorative
#align(center)[
  #box(width: 80%, height: 1pt, fill: gradient.linear(
    white,
    rgb("#d1d5db"),
    white,
    relative: "self"
  ))
]

#v(0.4cm)

// Consignes en bloc mis en évidence
#rect(
  width: 100%,
  fill: rgb("#eff6ff"),
  stroke: rgb("#3b82f6"),
  radius: 6pt,
  inset: 12pt
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 15pt,
    text(size: 10pt, weight: "bold", fill: rgb("#1d4ed8"))[📋 Consignes :],
    text(size: 9pt)[{{instructions}}]
  )
]

#v(0.8cm)

// Titre de section
#align(center)[
  #text(size: 11pt, weight: "bold", fill: rgb("#1f2937"))[
    — Exercices —
  ]
]

#v(0.6cm)

// Contenu principal en deux colonnes
#columns(2, gutter: 20pt)[
  {{exercises}}
]

// Footer
#v(1fr)
#line(length: 100%, stroke: 0.3pt + rgb("#d1d5db"))
#v(0.3cm)
#grid(
  columns: (1fr, auto, 1fr),
  align: (left, center, right),
  text(size: 8pt, fill: rgb("#9ca3af"))[{{teacher_name}}],
  text(size: 8pt, fill: rgb("#6b7280"), style: "italic")[
    Page #context(counter(page).display())
  ],
  text(size: 8pt, fill: rgb("#9ca3af"))[{{school_name}}]
)',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Paysage — Format A4 paysage avec grille optimisée pour les exercices
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000009',
  'Paysage',
  'Format A4 paysage avec grille optimisée pour les exercices',
  '// Configuration en mode paysage
#set page(
  paper: "a4",
  flipped: true,
  margin: (top: 1.5cm, bottom: 1.5cm, left: 2cm, right: 2cm),
  header: [
    #set text(size: 9pt, fill: rgb("#6b7280"))
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      [{{school_name}}],
      [{{#if show_title}}#text(weight: "bold")[{{title}}]{{/if}}],
      [{{#if show_class}}{{class}}{{/if}}{{#if show_date}}{{#if show_class}} • {{/if}}{{date}}{{/if}}]
    )
    #line(length: 100%, stroke: 0.3pt + rgb("#d1d5db"))
  ],
  footer: [
    #line(length: 100%, stroke: 0.3pt + rgb("#d1d5db"))
    #v(0.2cm)
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      text(size: 8pt, fill: rgb("#9ca3af"))[{{teacher_name}}],
      text(size: 8pt, fill: rgb("#6b7280"))[
        #context(counter(page).display()) / #context(counter(page).final().first())
      ],
      []
    )
  ]
)

#set text(font: "New Computer Modern", size: 10pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)

// Bannière titre horizontale avec dégradé chaud
#rect(
  width: 100%,
  fill: gradient.linear(
    rgb("#f59e0b"),
    rgb("#f97316"),
    angle: 0deg
  ),
  radius: 10pt,
  inset: 0pt
)[
  #grid(
    columns: (2fr, 1fr),
    [
      #block(inset: (x: 25pt, y: 15pt))[
        {{#if show_title}}#text(size: 22pt, fill: white, weight: "bold")[{{title}}]{{/if}}
        #v(0.2cm)
        #text(size: 10pt, fill: white.transparentize(20%))[
          Feuille d''exercices{{#if show_class}} • {{class}}{{/if}}
        ]
      ]
    ],
    [
      #align(right)[
        #block(inset: (right: 20pt, y: 10pt))[
          #rect(
            fill: white.transparentize(15%),
            radius: 8pt,
            inset: 12pt
          )[
            #text(fill: rgb("#7c2d12"), size: 10pt)[
              {{#if show_student_name}}#text(weight: "bold")[Nom :]\
              {{student_name}}
              #v(0.3cm){{/if}}
              {{#if show_points}}#text(weight: "bold")[Points :] {{total_points}}{{/if}}
            ]
          ]
        ]
      ]
    ]
  )
]

#v(0.6cm)

// Bande d''information horizontale avec 4 cartes
#grid(
  columns: (1fr, 1fr, 1fr, 1fr),
  column-gutter: 12pt,
  rect(
    width: 100%,
    fill: rgb("#fef3c7"),
    inset: 10pt,
    radius: 6pt
  )[
    #align(center)[
      #text(size: 16pt)[⏰]
      #v(0.1cm)
      #text(size: 9pt, weight: "bold")[{{duration}} min]
    ]
  ],
  rect(
    width: 100%,
    fill: rgb("#dbeafe"),
    inset: 10pt,
    radius: 6pt
  )[
    #align(center)[
      #text(size: 16pt)[👩‍🏫]
      #v(0.1cm)
      #text(size: 9pt, weight: "bold")[{{teacher_name}}]
    ]
  ],
  rect(
    width: 100%,
    fill: rgb("#dcfce7"),
    inset: 10pt,
    radius: 6pt
  )[
    #align(center)[
      #text(size: 16pt)[📚]
      #v(0.1cm)
      {{#if show_class}}#text(size: 9pt, weight: "bold")[{{class}}]{{/if}}
    ]
  ],
  rect(
    width: 100%,
    fill: rgb("#fce7f3"),
    inset: 10pt,
    radius: 6pt
  )[
    #align(center)[
      #text(size: 16pt)[📅]
      #v(0.1cm)
      {{#if show_date}}#text(size: 9pt, weight: "bold")[{{date}}]{{/if}}
    ]
  ]
)

#v(0.6cm)

// Consignes dans une boîte fine horizontale
#block(
  width: 100%,
  fill: rgb("#f9fafb"),
  stroke: (y: 1pt + rgb("#d1d5db")),
  inset: (x: 15pt, y: 10pt)
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 12pt,
    text(size: 16pt)[ℹ️],
    text(size: 9pt)[#text(weight: "bold")[Consignes :] {{instructions}}]
  )
]

#v(0.8cm)

// Titre section exercices
#align(center)[
  #rect(
    fill: rgb("#f3f4f6"),
    radius: 20pt,
    inset: (x: 20pt, y: 8pt)
  )[
    #text(size: 11pt, weight: "bold", fill: rgb("#374151"))[📝 Exercices]
  ]
]

#v(0.6cm)

// Contenu des exercices en 3 colonnes pour le format paysage
#columns(3, gutter: 20pt)[
  {{exercises}}
]',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Magazine — Style magazine avec design éditorial, encadrés colorés et typographie variée
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'Magazine',
  'Style magazine avec design éditorial, encadrés colorés et typographie variée',
  '// Variables de couleur (définies avant #set page pour être accessibles dans footer)
#let accent = rgb("#e11d48")
#let accent-light = accent.lighten(85%)

// Configuration style magazine
#set page(
  paper: "a4",
  margin: (top: 1.5cm, bottom: 2cm, left: 1.8cm, right: 1.8cm),
  footer: [
    #line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
    #v(0.2cm)
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      text(size: 7pt, fill: rgb("#9ca3af"))[© {{school_name}}],
      text(size: 8pt, weight: "bold", fill: accent)[
        #context(counter(page).display())
      ],
      text(size: 7pt, fill: rgb("#9ca3af"))[chiph.re]
    )
  ]
)

#set text(font: "New Computer Modern", size: 10pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)
#set par(justify: true)

// Header magazine avec numéro d''édition
#grid(
  columns: (1fr, auto),
  [
    #text(size: 8pt, fill: rgb("#6b7280"))[{{school_name}}]
    #v(0.1cm)
    #text(size: 28pt, weight: "black", fill: accent)[MATH]
    #text(size: 28pt, weight: "light")[MAGAZINE]
    #v(0.1cm)
    #text(size: 9pt, style: "italic", fill: rgb("#6b7280"))[
      L''excellence mathématique à votre portée
    ]
  ],
  [
    #align(right)[
      #rect(
        fill: accent,
        radius: (top-left: 15pt, bottom-right: 15pt),
        inset: 12pt,
        width: 5.5cm
      )[
        #text(fill: white)[
          #text(size: 8pt)[ÉDITION]
          #v(0.1cm)
          {{#if show_class}}#text(size: 16pt, weight: "bold")[{{class}}]
          #v(0.2cm){{/if}}
          {{#if show_date}}#text(size: 9pt)[{{date}}]{{/if}}
        ]
      ]
    ]
  ]
)

#v(0.3cm)

// Ligne de séparation stylée avec dégradé
#rect(width: 100%, height: 3pt, fill: gradient.linear(
  accent,
  accent.transparentize(60%),
  white,
  relative: "self"
))

#v(0.6cm)

// Titre principal façon Une de magazine
#block(
  width: 100%,
  fill: accent-light,
  inset: 0pt
)[
  #grid(
    columns: (5pt, 1fr),
    rect(fill: accent, width: 5pt, height: 100%),
    block(inset: 18pt)[
      {{#if show_title}}#text(size: 22pt, weight: "bold")[{{title}}]{{/if}}
      #v(0.2cm)
      #text(size: 10pt, style: "italic", fill: rgb("#64748b"))[
        Par {{teacher_name}} • {{duration}} minutes{{#if show_points}} • {{total_points}} points{{/if}}
      ]
    ]
  )
]

#v(0.8cm)

// Colonnes style article avec sidebar
#grid(
  columns: (2fr, 1fr),
  column-gutter: 18pt,
  [
    // Colonne principale - Introduction
    #text(size: 11pt, weight: "bold", fill: accent)[En bref]
    #v(0.2cm)

    #rect(
      width: 100%,
      fill: rgb("#f9fafb"),
      radius: 6pt,
      inset: 12pt
    )[
      #text(size: 32pt, fill: accent, weight: "bold")[L]
      #h(-3pt)
      #text(size: 10pt)[
        es exercices d''aujourd''hui vous permettront d''explorer
        de nouveaux concepts mathématiques passionnants.
        {{instructions}}
      ]
    ]

    #v(0.6cm)

    // Citation mise en avant
    #block(
      width: 100%,
      inset: (left: 12pt, y: 8pt),
      stroke: (left: 3pt + accent)
    )[
      #text(size: 10pt, style: "italic", fill: rgb("#374151"))[
        "Les mathématiques sont la poésie des sciences"
      ]
      #v(0.1cm)
      #align(right)[
        #text(size: 8pt, fill: rgb("#6b7280"))[— Léopold Sédar Senghor]
      ]
    ]

    #v(0.8cm)

    // Zone d''exercices principale
    #text(size: 13pt, weight: "bold")[Exercices du jour]
    #line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
    #v(0.4cm)

    {{exercises}}
  ],
  [
    // Sidebar avec infos élève
    #rect(
      width: 100%,
      fill: gradient.linear(
        accent.lighten(92%),
        white,
        angle: 135deg
      ),
      radius: 10pt,
      inset: 12pt
    )[
      #text(size: 10pt, weight: "bold", fill: accent)[📌 Info Élève]
      #v(0.4cm)

      #text(size: 9pt)[
        {{#if show_student_name}}#text(weight: "bold")[Nom :]
        #v(0.1cm)
        {{student_name}}
        #v(0.3cm){{/if}}
        {{#if show_class}}#text(weight: "bold")[Classe :]
        #v(0.1cm)
        {{class}}
        #v(0.3cm){{/if}}
        {{#if show_date}}#text(weight: "bold")[Date :]
        #v(0.1cm)
        {{date}}{{/if}}
      ]
    ]

    #v(0.6cm)

    // Encadré "Le saviez-vous?"
    #rect(
      width: 100%,
      fill: rgb("#fef3c7"),
      stroke: rgb("#f59e0b"),
      radius: 10pt,
      inset: 12pt
    )[
      #text(size: 9pt, weight: "bold")[💡 Le saviez-vous ?]
      #v(0.2cm)
      #text(size: 8pt)[
        Les mathématiques sont utilisées
        dans tous les domaines : musique,
        architecture, médecine, et même
        dans les jeux vidéo !
      ]
    ]

    #v(0.6cm)

    // Score box
    #rect(
      width: 100%,
      fill: white,
      stroke: 2pt + accent,
      radius: 10pt,
      inset: 12pt
    )[
      #align(center)[
        #text(size: 9pt, fill: accent)[SCORE]
        #v(0.4cm)
        #text(size: 20pt, weight: "bold")[
          \_\_\_{{#if show_points}} / {{total_points}}{{/if}}
        ]
      ]
    ]

    #v(0.6cm)

    // Mini bloc décoratif
    #rect(
      width: 100%,
      fill: rgb("#f3f4f6"),
      radius: 6pt,
      inset: 10pt
    )[
      #align(center)[
        #text(size: 18pt)[📅]
        #v(0.1cm)
        #text(size: 8pt, weight: "bold")[
          Prochain cours
          #v(0.1cm)
          \_\_\_\_\_\_\_\_\_\_\_
        ]
      ]
    ]
  ]
)',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""},{"key":"theme_color","type":"text","label":"Couleur thème","default_value":"#e11d48"}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Scientifique — Style académique avec tableaux de données et grille de notation formelle
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  'Scientifique',
  'Style académique avec tableaux de données et grille de notation formelle',
  '// Configuration académique formelle
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2cm),
  footer: [
    #line(length: 100%, stroke: 0.3pt)
    #v(0.2cm)
    #text(size: 8pt, fill: rgb("#6b7280"))[
      Document généré par Chiphre
      #h(1fr)
      Page #context(counter(page).display()) sur #context(counter(page).final().first())
    ]
  ]
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set enum(spacing: 1.5em)
#set list(spacing: 1.5em)
#set par(justify: true)

// En-tête institutionnel
#align(center)[
  #text(size: 14pt, weight: "bold")[{{school_name}}]
  #v(0.2cm)
  #text(size: 10pt)[Département de Mathématiques]
  #v(0.1cm)
  #text(size: 9pt, style: "italic")[Année académique {{academic_year}} — Semestre {{semester}}]
]

#v(0.4cm)

// Double ligne de séparation
#line(length: 100%, stroke: 1.5pt)
#v(2pt)
#line(length: 100%, stroke: 0.5pt)

#v(0.6cm)

// Titre centré avec encadrement
#align(center)[
  #rect(
    width: 80%,
    stroke: 1pt,
    inset: 15pt
  )[
    {{#if show_title}}#text(size: 15pt, weight: "bold")[{{title}}]{{/if}}
    #v(0.2cm)
    #text(size: 11pt)[Évaluation de compétences mathématiques]
  ]
]

#v(0.8cm)

// Tableau d''identification formel
#table(
  columns: (1fr, 2fr, 1fr, 2fr),
  inset: 10pt,
  stroke: 0.5pt,
  align: (left, left, left, left),
  fill: (col, row) => if row == 0 { rgb("#f3f4f6") },

  [*Champ*], [*Valeur*], [*Champ*], [*Valeur*],
  [Nom], [{{#if show_student_name}}{{student_name}}{{/if}}], [Classe], [{{#if show_class}}{{class}}{{/if}}],
  [Date], [{{#if show_date}}{{date}}{{/if}}], [Durée], [{{duration}} minutes],
  [Professeur], [{{teacher_name}}], [Points], [{{#if show_points}}{{total_points}}{{/if}}]
)

#v(0.8cm)

// Section des objectifs pédagogiques
#text(size: 12pt, weight: "bold")[1. Objectifs pédagogiques]
#v(0.3cm)

#block(
  width: 100%,
  fill: rgb("#f8f9fa"),
  stroke: (left: 3pt + rgb("#6366f1")),
  inset: 12pt
)[
  Cette évaluation vise à mesurer les compétences suivantes :
  #v(0.2cm)
  #list(
    indent: 15pt,
    marker: text(fill: rgb("#6366f1"))[▸],
    [Résolution d''équations algébriques],
    [Application des théorèmes fondamentaux],
    [Raisonnement logique et démonstration],
    [Interprétation graphique]
  )
]

#v(0.6cm)

// Instructions dans un cadre formel
#text(size: 12pt, weight: "bold")[2. Instructions]
#v(0.3cm)

#rect(
  width: 100%,
  fill: rgb("#fffbeb"),
  stroke: 0.5pt + rgb("#d97706"),
  inset: 12pt
)[
  #text(size: 10pt)[
    {{instructions}}

    #v(0.4cm)

    *Barème de notation :*
    #table(
      columns: (2fr, 1fr),
      inset: 6pt,
      stroke: none,
      [• Exactitude de la réponse], [40%],
      [• Clarté de la démarche], [30%],
      [• Rigueur mathématique], [20%],
      [• Présentation], [10%]
    )
  ]
]

#v(0.8cm)

// Titre de section pour les exercices
#line(length: 100%, stroke: 0.5pt)
#v(0.2cm)
#text(size: 12pt, weight: "bold")[3. Exercices]
#v(0.4cm)

// Zone des exercices
{{exercises}}

#v(1.5cm)

// Grille d''évaluation (pour l''examinateur)
#text(size: 12pt, weight: "bold")[4. Grille d''évaluation]
#text(size: 9pt, style: "italic", fill: rgb("#6b7280"))[ (réservé à l''examinateur)]
#v(0.3cm)

#table(
  columns: (0.8fr, 2fr, 0.8fr, 0.8fr, 2fr),
  inset: 8pt,
  stroke: 0.5pt,
  align: (center, left, center, center, left),
  fill: (col, row) => if row == 0 { rgb("#e5e7eb") },

  [*Ex.*], [*Compétence évaluée*], [*Barème*], [*Note*], [*Observations*],
  [1], [Calcul algébrique], [/5], [], [],
  [2], [Résolution d''équations], [/5], [], [],
  [3], [Raisonnement], [/5], [], [],
  [4], [Application], [/5], [], [],
  table.cell(colspan: 2)[*Total*], [{{#if show_points}}/{{total_points}}{{/if}}], [], []
)

#v(0.8cm)

// Zone de signatures
#grid(
  columns: (1fr, 1fr),
  column-gutter: 2cm,
  [
    #line(length: 100%, stroke: 0.5pt)
    #v(0.1cm)
    #text(size: 9pt)[Signature de l''élève]
  ],
  [
    #line(length: 100%, stroke: 0.5pt)
    #v(0.1cm)
    #text(size: 9pt)[Visa du professeur]
  ]
)',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""},{"key":"academic_year","type":"text","label":"Année académique","default_value":"2024-2025"},{"key":"semester","type":"text","label":"Semestre","default_value":"1"}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

-- Fiche élève — Deux colonnes avec filet, en-tête pleine largeur, numéro d'exercice en blanc sur carré rouge
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  'Fiche élève',
  'Deux colonnes avec filet, en-tête pleine largeur, numéro d''exercice en blanc sur carré rouge',
  '// Mise en page proche du PDF de l''élève : A4 sur deux colonnes
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
    {{#if show_title}}#align(center)[#text(size: 1.5em, weight: "bold")[{{title}}]]
    #v(0.4em){{/if}}
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),
      [{{#if show_student_name}}{{student_name}}{{/if}}],
      [{{#if show_date}}#text(size: 0.9em, fill: gray)[{{date}}]{{/if}}],
      [{{#if show_class}}{{class}}{{/if}}]
    )
    #v(0.3em)
    #line(length: 100%, stroke: 0.5pt + gray)
  ]
]

// Exercices (numéros en blanc sur carré rouge)
{{exercises_badge}}
',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();
