-- Migration: Seed default worksheet templates
-- These are system templates with well-known UUIDs that are referenced in the codebase
-- They have is_public = true and created_by = NULL to mark them as system templates

-- Common placeholders JSON (reused across templates)
DO $$
DECLARE
  common_placeholders JSONB := '[
    {"key": "title", "type": "text", "label": "Titre", "default_value": "Feuille d''exercices"},
    {"key": "date", "type": "date", "label": "Date", "default_value": ""},
    {"key": "class", "type": "text", "label": "Classe", "default_value": ""},
    {"key": "student_name", "type": "text", "label": "Nom de l''eleve", "default_value": ""},
    {"key": "exercises", "type": "dynamic", "label": "Exercices", "default_value": ""},
    {"key": "total_points", "type": "text", "label": "Total des points", "default_value": ""},
    {"key": "duration", "type": "text", "label": "Duree estimee", "default_value": ""},
    {"key": "instructions", "type": "text", "label": "Consignes", "default_value": ""},
    {"key": "school_name", "type": "text", "label": "Nom de l''ecole", "default_value": ""},
    {"key": "teacher_name", "type": "text", "label": "Nom du professeur", "default_value": ""}
  ]'::JSONB;

  assessment_placeholders JSONB;
  exam_placeholders JSONB;
  homework_placeholders JSONB;
BEGIN
  -- Build specialized placeholders
  assessment_placeholders := common_placeholders || '[{"key": "competences", "type": "text", "label": "Competences evaluees", "default_value": ""}]'::JSONB;

  exam_placeholders := common_placeholders || '[
    {"key": "exam_session", "type": "text", "label": "Session d''examen", "default_value": ""},
    {"key": "subject", "type": "text", "label": "Matiere", "default_value": "Mathematiques"},
    {"key": "coefficient", "type": "text", "label": "Coefficient", "default_value": ""}
  ]'::JSONB;

  homework_placeholders := common_placeholders || '[{"key": "due_date", "type": "date", "label": "Date de rendu", "default_value": ""}]'::JSONB;

  -- Insert Standard template
  INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
  VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Standard',
    'Mise en page basique avec titre, informations eleve et exercices',
    $TPL$// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

// En-tete
#align(center)[
  #text(size: 18pt, weight: "bold")[{{title}}]
]

#v(0.5cm)

// Informations
#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    *Nom :* #underline[#h(3cm) {{student_name}} #h(3cm)]
  ],
  [
    *Classe :* {{class}}
  ]
)

#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    *Date :* {{date}}
  ],
  [
    #if "{{total_points}}" != "" [
      *Total :* {{total_points}} points
    ]
  ]
)

#v(0.5cm)
#line(length: 100%, stroke: 0.5pt)
#v(0.5cm)

// Consignes (si presentes)
#if "{{instructions}}" != "" [
  #block(
    fill: rgb("#f0f0f0"),
    inset: 10pt,
    radius: 4pt,
    width: 100%
  )[
    *Consignes :* {{instructions}}
  ]
  #v(0.5cm)
]

// Exercices
{{exercises}}
$TPL$,
    common_placeholders,
    true,
    NULL
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_content = EXCLUDED.template_content,
    placeholders = EXCLUDED.placeholders,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

  -- Insert Assessment template
  INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
  VALUES (
    '00000000-0000-4000-8000-000000000002',
    'Evaluation',
    'Mise en page formelle pour evaluation avec section notation',
    $TPL$// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

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
      #text(size: 14pt)[{{title}}]
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
            #text(size: 14pt)[/ {{total_points}}]
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
  [*Nom :* #underline[#h(2cm) {{student_name}} #h(2cm)]],
  [*Classe :* {{class}}],
  [*Date :* {{date}}]
)

#v(0.3cm)

// Duree si specifiee
#if "{{duration}}" != "" [
  #align(right)[
    #text(style: "italic")[Duree : {{duration}} minutes]
  ]
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
  #if "{{instructions}}" != "" [
    #v(0.2cm)
    {{instructions}}
  ]
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
$TPL$,
    assessment_placeholders,
    true,
    NULL
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_content = EXCLUDED.template_content,
    placeholders = EXCLUDED.placeholders,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

  -- Insert Exam template
  INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
  VALUES (
    '00000000-0000-4000-8000-000000000003',
    'Examen',
    'Mise en page officielle d''examen avec en-tete, consignes et ligne de signature',
    $TPL$// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2cm, right: 2cm),
  header: [
    #grid(
      columns: (1fr, auto, 1fr),
      [{{school_name}}],
      [#text(weight: "bold")[EXAMEN]],
      [#align(right)[{{date}}]]
    )
    #line(length: 100%, stroke: 0.5pt)
  ],
  footer: [
    #line(length: 100%, stroke: 0.5pt)
    #align(center)[Page #counter(page).display() sur #locate(loc => counter(page).final(loc).first())]
  ]
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

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
      #text(size: 14pt)[{{title}}]
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
      *Classe :* {{class}}
      #v(0.3cm)
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
  - L'usage de la calculatrice est autorise sauf mention contraire.
  - Aucun document n'est autorise.
  - Les reponses doivent etre redigees sur la copie d'examen.
  - Les exercices peuvent etre traites dans n'importe quel ordre.
  #if "{{instructions}}" != "" [
    #v(0.2cm)
    {{instructions}}
  ]
  #v(0.3cm)
  *Total des points :* {{total_points}}
]

#v(0.5cm)

// Attestation sur l'honneur
#block(
  inset: 8pt,
  stroke: (left: 3pt + rgb("#6c757d"))
)[
  #text(size: 10pt, style: "italic")[
    Je soussigne(e) atteste sur l'honneur avoir pris connaissance du reglement
    de l'examen et m'engage a le respecter.
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
$TPL$,
    exam_placeholders,
    true,
    NULL
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_content = EXCLUDED.template_content,
    placeholders = EXCLUDED.placeholders,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

  -- Insert Homework template
  INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
  VALUES (
    '00000000-0000-4000-8000-000000000004',
    'Devoirs',
    'Mise en page simple pour devoirs a la maison',
    $TPL$// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

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
      #text(size: 10pt)[{{class}}]
      #v(0.2cm)
      #text(size: 10pt)[{{teacher_name}}]
    ]
  ]
)

#v(0.3cm)
#align(center)[
  #text(size: 14pt, weight: "bold")[{{title}}]
]

#v(0.3cm)

// Informations importantes
#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    #text(weight: "bold")[Date de distribution :] {{date}}
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

// Nom de l'eleve
*Nom :* #underline[#h(4cm) {{student_name}} #h(4cm)]

#v(0.5cm)
#line(length: 100%, stroke: 0.5pt)
#v(0.5cm)

// Consignes
#if "{{instructions}}" != "" [
  #block(
    fill: rgb("#e7f3ff"),
    inset: 10pt,
    radius: 4pt,
    width: 100%
  )[
    *Consignes :* {{instructions}}
  ]
  #v(0.5cm)
]

// Rappels
#block(
  inset: 8pt,
  stroke: (left: 3pt + rgb("#17a2b8"))
)[
  #text(size: 10pt, style: "italic")[
    Rappel : Le travail doit etre soigne et les reponses justifiees.
    N'hesitez pas a poser des questions en classe si necessaire.
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
$TPL$,
    homework_placeholders,
    true,
    NULL
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_content = EXCLUDED.template_content,
    placeholders = EXCLUDED.placeholders,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

  -- Insert Quiz template
  INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
  VALUES (
    '00000000-0000-4000-8000-000000000005',
    'Quiz',
    'Format quiz rapide avec questions numerotees',
    $TPL$// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 1.5cm, bottom: 1.5cm, left: 1.5cm, right: 1.5cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

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
      #text(size: 12pt)[{{title}}]
    ],
    [
      #align(center)[
        *Nom :* #underline[#h(3cm) {{student_name}} #h(3cm)]
      ]
    ],
    [
      #align(right)[
        *Classe :* {{class}}
        #v(0.1cm)
        *Date :* {{date}}
      ]
    ]
  )
]

#v(0.3cm)

// Informations rapides
#grid(
  columns: (1fr, 1fr),
  [
    #if "{{duration}}" != "" [
      #text(style: "italic")[Duree : {{duration}} min]
    ]
  ],
  [
    #align(right)[
      #if "{{total_points}}" != "" [
        *Total : {{total_points}} points*
      ]
    ]
  ]
)

#v(0.3cm)

// Consignes courtes
#if "{{instructions}}" != "" [
  #text(size: 10pt, style: "italic")[{{instructions}}]
  #v(0.3cm)
]

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
    *Note :* #h(2cm) / {{total_points}}
  ]
]
$TPL$,
    common_placeholders,
    true,
    NULL
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_content = EXCLUDED.template_content,
    placeholders = EXCLUDED.placeholders,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

  -- Insert Minimal template
  INSERT INTO public.worksheet_templates (id, name, description, template_content, placeholders, is_public, created_by)
  VALUES (
    '00000000-0000-4000-8000-000000000006',
    'Minimaliste',
    'Mise en page epuree et minimaliste',
    $TPL$// Configuration de la page
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm)
)

#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

// En-tete minimaliste
#text(size: 16pt, weight: "bold")[{{title}}]
#h(1fr)
#text(size: 10pt)[{{date}}]

#v(0.3cm)

{{student_name}} #h(1fr) {{class}}

#v(0.5cm)
#line(length: 100%, stroke: 0.3pt)
#v(0.5cm)

// Exercices
{{exercises}}
$TPL$,
    common_placeholders,
    true,
    NULL
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_content = EXCLUDED.template_content,
    placeholders = EXCLUDED.placeholders,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

END $$;

-- Add comment to document these are system templates
COMMENT ON TABLE public.worksheet_templates IS 'Worksheet templates for PDF generation. System templates have UUIDs starting with 00000000-0000-4000-8000- and created_by = NULL.';
