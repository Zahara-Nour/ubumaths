-- Migration: Add 5 advanced Typst templates
-- Templates: Modern, Two Columns, Landscape, Magazine, Scientific

-- 1. Modern Template (00000000-0000-4000-8000-000000000007)
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
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
#set par(justify: true, leading: 0.8em)

// Fonction pour créer des numéros d''exercices stylisés
#let exercise-badge(n) = {
  box(
    fill: rgb("#dc2626"),
    inset: (x: 10pt, y: 5pt),
    radius: 4pt,
    baseline: 25%,
    text(fill: white, weight: "bold", size: 11pt, [#n])
  )
}

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
        #text(weight: "bold", size: 9pt)[ÉLÈVE]\\
        #text(size: 11pt)[{{student_name}}]
      ],
      text(fill: white)[
        #text(weight: "bold", size: 9pt)[CLASSE]\\
        #text(size: 11pt)[{{class}}]
      ],
      text(fill: white)[
        #text(weight: "bold", size: 9pt)[DATE]\\
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
    #text(size: 14pt, weight: "bold")[_____ \/ {{total_points}}]
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

// Zone des exercices
{{exercises}}

// Footer moderne
#v(1fr)
#line(length: 100%, stroke: (paint: rgb("#e5e7eb"), thickness: 0.5pt, dash: "dotted"))
#v(0.3cm)
#align(center)[
  #text(size: 8pt, fill: rgb("#9ca3af"))[
    #context [Page #counter(page).display() sur #counter(page).final().first()]
  ]
]',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- 2. Two Columns Template (00000000-0000-4000-8000-000000000008)
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
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
        #text(weight: "bold", size: 11pt)[{{student_name}}]
      ],
      rect(
        fill: rgb("#4f46e5"),
        radius: 6pt,
        inset: (x: 18pt, y: 10pt)
      )[
        #text(fill: white, size: 13pt, weight: "bold")[{{title}}]
      ],
      [
        #text(size: 9pt, fill: rgb("#6b7280"))[{{class}}]
        #v(0.1cm)
        #text(weight: "bold", size: 11pt)[{{date}}]
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
    #text(size: 9pt)[Total : #text(weight: "bold")[{{total_points}} points]]
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
    #context [Page #counter(page).display()]
  ],
  text(size: 8pt, fill: rgb("#9ca3af"))[{{school_name}}]
)',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""}]'::jsonb,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- 3. Landscape Template (00000000-0000-4000-8000-000000000009)
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
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
      [#text(weight: "bold")[{{title}}]],
      [{{class}} • {{date}}]
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
        #context [Page #counter(page).display() \/ #counter(page).final().first()]
      ],
      []
    )
  ]
)

#set text(font: "New Computer Modern", size: 10pt, lang: "fr")

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
        #text(size: 22pt, fill: white, weight: "bold")[{{title}}]
        #v(0.2cm)
        #text(size: 10pt, fill: white.transparentize(20%))[
          Feuille d''exercices • {{class}}
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
              #text(weight: "bold")[Nom :]\\
              {{student_name}}
              #v(0.3cm)
              #text(weight: "bold")[Points :] {{total_points}}
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
      #text(size: 9pt, weight: "bold")[{{class}}]
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
      #text(size: 9pt, weight: "bold")[{{date}}]
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
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- 4. Magazine Template (00000000-0000-4000-8000-000000000010)
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'Magazine',
  'Style magazine avec design éditorial, encadrés colorés et typographie variée',
  '// Configuration style magazine
#set page(
  paper: "a4",
  margin: (top: 1.5cm, bottom: 2cm, left: 1.8cm, right: 1.8cm)
)

#set text(font: "New Computer Modern", size: 10pt, lang: "fr")
#set par(justify: true)

// Variables de couleur
#let accent = rgb("#e11d48")
#let accent-light = accent.lighten(85%)

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
          #text(size: 16pt, weight: "bold")[{{class}}]
          #v(0.2cm)
          #text(size: 9pt)[{{date}}]
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
  inset: 0pt,
  stroke: (left: 5pt + accent)
)[
  #block(inset: 18pt)[
    #text(size: 22pt, weight: "bold")[{{title}}]
    #v(0.2cm)
    #text(size: 10pt, style: "italic", fill: rgb("#64748b"))[
      Par {{teacher_name}} • {{duration}} minutes • {{total_points}} points
    ]
  ]
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
        #text(weight: "bold")[Nom :]
        #v(0.1cm)
        {{student_name}}
        #v(0.3cm)
        #text(weight: "bold")[Classe :]
        #v(0.1cm)
        {{class}}
        #v(0.3cm)
        #text(weight: "bold")[Date :]
        #v(0.1cm)
        {{date}}
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
          ___ \/ {{total_points}}
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
          ___________
        ]
      ]
    ]
  ]
)

// Footer style magazine
#v(1fr)
#line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
#v(0.2cm)
#grid(
  columns: (1fr, auto, 1fr),
  align: (left, center, right),
  text(size: 7pt, fill: rgb("#9ca3af"))[© {{school_name}}],
  text(size: 8pt, weight: "bold", fill: accent)[
    #context [#counter(page).display()]
  ],
  text(size: 7pt, fill: rgb("#9ca3af"))[ubumaths.fr]
)',
  '[{"key":"title","type":"text","label":"Titre","default_value":"Feuille d''exercices"},{"key":"date","type":"date","label":"Date","default_value":""},{"key":"class","type":"text","label":"Classe","default_value":""},{"key":"student_name","type":"text","label":"Nom de l''eleve","default_value":""},{"key":"exercises","type":"dynamic","label":"Exercices","default_value":""},{"key":"total_points","type":"text","label":"Total des points","default_value":""},{"key":"duration","type":"text","label":"Duree estimee","default_value":""},{"key":"instructions","type":"text","label":"Consignes","default_value":""},{"key":"school_name","type":"text","label":"Nom de l''ecole","default_value":""},{"key":"teacher_name","type":"text","label":"Nom du professeur","default_value":""},{"key":"theme_color","type":"text","label":"Couleur thème","default_value":"#e11d48"}]'::jsonb,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- 5. Scientific Template (00000000-0000-4000-8000-000000000011)
INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
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
      Document généré par UbuMaths
      #h(1fr)
      #context [Page #counter(page).display() sur #counter(page).final().first()]
    ]
  ]
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set par(justify: true)

// En-tête institutionnel
#align(center)[
  #text(size: 14pt, weight: "bold", smallcaps: true)[{{school_name}}]
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
    #text(size: 15pt, weight: "bold")[{{title}}]
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
  [Nom], [{{student_name}}], [Classe], [{{class}}],
  [Date], [{{date}}], [Durée], [{{duration}} minutes],
  [Professeur], [{{teacher_name}}], [Points], [{{total_points}}]
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
  [1], [Calcul algébrique], [\/5], [], [],
  [2], [Résolution d''équations], [\/5], [], [],
  [3], [Raisonnement], [\/5], [], [],
  [4], [Application], [\/5], [], [],
  table.cell(colspan: 2)[*Total*], [\/{{total_points}}], [], []
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
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content,
  placeholders = EXCLUDED.placeholders,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();
