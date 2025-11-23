/**
 * Default Typst templates for worksheet PDF generation
 *
 * These templates use Typst markup with placeholders in {{placeholder}} format.
 * Available placeholders:
 * - {{title}} - Worksheet title
 * - {{date}} - Current date or assignment date
 * - {{class}} - Class name
 * - {{student_name}} - Student's full name
 * - {{exercises}} - Rendered exercises content
 * - {{total_points}} - Total points for the worksheet
 * - {{duration}} - Estimated duration in minutes
 * - {{instructions}} - General instructions
 * - {{school_name}} - School name
 * - {{teacher_name}} - Teacher's name
 */

import type { TemplatePlaceholder } from '$lib/types/worksheets';

export interface DefaultTemplate {
	id: string;
	name: string;
	description: string;
	type: 'worksheet' | 'assessment' | 'exam' | 'quiz' | 'homework';
	template_content: string;
	placeholders: TemplatePlaceholder[];
	is_system: boolean; // System templates cannot be deleted
}

/**
 * Common placeholders used across templates
 */
export const COMMON_PLACEHOLDERS: TemplatePlaceholder[] = [
	{ key: 'title', type: 'text', label: 'Titre', default_value: "Feuille d'exercices" },
	{ key: 'date', type: 'date', label: 'Date', default_value: '' },
	{ key: 'class', type: 'text', label: 'Classe', default_value: '' },
	{ key: 'student_name', type: 'text', label: "Nom de l'eleve", default_value: '' },
	{ key: 'exercises', type: 'dynamic', label: 'Exercices', default_value: '' },
	{ key: 'total_points', type: 'text', label: 'Total des points', default_value: '' },
	{ key: 'duration', type: 'text', label: 'Duree estimee', default_value: '' },
	{ key: 'instructions', type: 'text', label: 'Consignes', default_value: '' },
	{ key: 'school_name', type: 'text', label: "Nom de l'ecole", default_value: '' },
	{ key: 'teacher_name', type: 'text', label: 'Nom du professeur', default_value: '' }
];

/**
 * Standard worksheet template
 * Basic layout with title, student info, and exercises
 */
export const STANDARD_TEMPLATE: DefaultTemplate = {
	id: 'standard',
	name: 'Standard',
	description: 'Mise en page basique avec titre, informations eleve et exercices',
	type: 'worksheet',
	is_system: true,
	placeholders: COMMON_PLACEHOLDERS,
	template_content: `// Configuration de la page
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
`
};

/**
 * Assessment template
 * Formal evaluation layout with grading section
 */
export const ASSESSMENT_TEMPLATE: DefaultTemplate = {
	id: 'assessment',
	name: 'Evaluation',
	description: 'Mise en page formelle pour evaluation avec section notation',
	type: 'assessment',
	is_system: true,
	placeholders: [
		...COMMON_PLACEHOLDERS,
		{ key: 'competences', type: 'text', label: 'Competences evaluees', default_value: '' }
	],
	template_content: `// Configuration de la page
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
`
};

/**
 * Exam template
 * Official exam layout with header, instructions, and signature line
 */
export const EXAM_TEMPLATE: DefaultTemplate = {
	id: 'exam',
	name: 'Examen',
	description: "Mise en page officielle d'examen avec en-tete, consignes et ligne de signature",
	type: 'exam',
	is_system: true,
	placeholders: [
		...COMMON_PLACEHOLDERS,
		{ key: 'exam_session', type: 'text', label: "Session d'examen", default_value: '' },
		{ key: 'subject', type: 'text', label: 'Matiere', default_value: 'Mathematiques' },
		{ key: 'coefficient', type: 'text', label: 'Coefficient', default_value: '' }
	],
	template_content: `// Configuration de la page
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
`
};

/**
 * Homework template
 * Simple homework assignment layout
 */
export const HOMEWORK_TEMPLATE: DefaultTemplate = {
	id: 'homework',
	name: 'Devoirs',
	description: 'Mise en page simple pour devoirs a la maison',
	type: 'homework',
	is_system: true,
	placeholders: [
		...COMMON_PLACEHOLDERS,
		{ key: 'due_date', type: 'date', label: 'Date de rendu', default_value: '' }
	],
	template_content: `// Configuration de la page
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
`
};

/**
 * Quiz template
 * Quick quiz format with numbered questions
 */
export const QUIZ_TEMPLATE: DefaultTemplate = {
	id: 'quiz',
	name: 'Quiz',
	description: 'Format quiz rapide avec questions numerotees',
	type: 'quiz',
	is_system: true,
	placeholders: COMMON_PLACEHOLDERS,
	template_content: `// Configuration de la page
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
`
};

/**
 * Minimal template
 * Clean, minimalist layout
 */
export const MINIMAL_TEMPLATE: DefaultTemplate = {
	id: 'minimal',
	name: 'Minimaliste',
	description: 'Mise en page epuree et minimaliste',
	type: 'worksheet',
	is_system: true,
	placeholders: COMMON_PLACEHOLDERS,
	template_content: `// Configuration de la page
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
`
};

/**
 * All default templates
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
	STANDARD_TEMPLATE,
	ASSESSMENT_TEMPLATE,
	EXAM_TEMPLATE,
	HOMEWORK_TEMPLATE,
	QUIZ_TEMPLATE,
	MINIMAL_TEMPLATE
];

/**
 * Get template by ID
 */
export function getDefaultTemplate(id: string): DefaultTemplate | undefined {
	return DEFAULT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by type
 */
export function getDefaultTemplatesByType(type: string): DefaultTemplate[] {
	return DEFAULT_TEMPLATES.filter((t) => t.type === type);
}

/**
 * Sample data for template preview
 */
export const SAMPLE_PREVIEW_DATA = {
	title: 'Equations du premier degre',
	date: new Date().toLocaleDateString('fr-FR'),
	class: '3eme B',
	student_name: 'Jean DUPONT',
	total_points: '20',
	duration: '45',
	instructions: 'Repondez a toutes les questions. La calculatrice est autorisee.',
	school_name: 'College Victor Hugo',
	teacher_name: 'Mme Martin',
	due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
	exam_session: 'Session 2025',
	subject: 'Mathematiques',
	coefficient: '4',
	competences: 'Resoudre une equation, Modeliser un probleme',
	exercises: `*Exercice 1* (5 points)

Resoudre les equations suivantes :

a) $2x + 5 = 11$

b) $3x - 7 = 2x + 4$

#v(1cm)

*Exercice 2* (5 points)

Un rectangle a un perimetre de 36 cm. Sa longueur est le triple de sa largeur.
Calculer les dimensions de ce rectangle.

#v(1cm)

*Exercice 3* (10 points)

Dans un cinema, le prix d'une place adulte est 12 euros et le prix d'une place enfant est 8 euros.
Une famille de 5 personnes paie 48 euros au total.
Combien y a-t-il d'adultes et d'enfants dans cette famille ?`
};

/**
 * Replace placeholders in template content with actual values
 */
export function renderTemplate(templateContent: string, data: Record<string, string>): string {
	let result = templateContent;
	for (const [key, value] of Object.entries(data)) {
		const placeholder = `{{${key}}}`;
		result = result.split(placeholder).join(value);
	}
	return result;
}
