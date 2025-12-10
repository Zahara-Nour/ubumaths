# Structure des Templates

> Architecture des templates de questions et systeme de variations.

---

## Vue d'ensemble

Un **QuestionTemplate** est la structure stockee en base de donnees. Il definit :

- Le type de question
- Une ou plusieurs **variations** (versions du meme concept)
- Des metadonnees (niveau, theme, domaine)
- Des options de validation

---

## QuestionTemplate

Interface principale (`src/lib/questions/types.ts:259-380`) :

```typescript
interface QuestionTemplate {
	// Identification
	id: string; // UUID
	type: QuestionType; // Type de question

	// Titre et description
	title: string; // Titre (supporte LaTeX)
	description?: string; // Description optionnelle

	// Contenu principal
	shared?: SharedVariationDefaults; // Defauts partages (optionnel)
	variations: QuestionVariation[]; // Minimum 1 variation

	// Instruction d'exercice
	exerciseInstruction?: string; // Ex: "Calculer", "Resoudre"

	// Options de validation
	options?: {
		allowEquivalent?: boolean; // 1/2 = 0.5
		allowDifferentForms?: boolean; // 1/2 = 2/4
		canonicalForm?: 'fraction' | 'decimal' | 'scientific';
		validator?: 'checkEquivalence' | 'checkAlgebraic' | 'checkNumeric';
		constraints?: ConstraintOptions; // Verification forme
		unitOptions?: {
			requireExactUnit?: boolean;
			tolerance?: { absolute?: number; relative?: number };
		};
	};

	precision?: PrecisionType; // Precision reponses numeriques

	// Metadata
	grades: GradeLevel[]; // Niveaux scolaires
	theme: string; // Ex: "Algebre"
	domain: string; // Ex: "Equations"
	subdomain?: string; // Ex: "Lineaires"
	level: number; // Difficulte (1-6+)
	status: 'draft' | 'published'; // Statut
	delay?: number; // Limite temps (secondes)

	// Type-specifique
	transformType?: AlgebraicTransformType; // Pour algebraic_transform
	multipleAnswers?: boolean; // Pour multiple_choice

	// Audit (generes automatiquement)
	created_at?: string;
	updated_at?: string;
	created_by?: string;
}
```

---

## QuestionVariation

Une variation represente une version du template (`types.ts:172-214`) :

```typescript
interface QuestionVariation {
	// Contenu template ({{var}}, {{random:}}, {{eval:}})
	statement: TemplateMarkdown;

	// Variables resolues dans l'ordre de declaration
	variables?: QuestionVariable[];

	// Solution attendue (reponse de reference)
	solution: string | string[];

	// Correction detaillee
	correction?: QuestionCorrection;

	// Type-specifique
	blanks?: { position: number; expectedAnswer: string }[];
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
}
```

### Champs par variation vs partages

| Champ             | Par variation    | Partage (template) |
| ----------------- | ---------------- | ------------------ |
| `statement`       | Oui              | Via shared         |
| `variables`       | Oui (fusionnees) | Via shared         |
| `solution`        | Oui              | Via shared         |
| `correction`      | Oui              | Via shared         |
| `blanks`          | Oui              | Non                |
| `choices`         | Oui              | Via shared         |
| `validationRules` | Oui              | Via shared         |
| `type`            | Non              | Oui                |
| `grades`          | Non              | Oui                |
| `theme/domain`    | Non              | Oui                |
| `level`           | Non              | Oui                |
| `options`         | Non              | Oui                |
| `precision`       | Non              | Oui                |

---

## SharedVariationDefaults

Defauts partages entre toutes les variations (`types.ts:220-244`) :

```typescript
interface SharedVariationDefaults {
	statement?: TemplateMarkdown;
	variables?: QuestionVariable[]; // FUSIONNEES (pas ecrasees)
	solution?: string | string[];
	correction?: QuestionCorrection;
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
}
```

### Regles de fusion

| Champ       | Comportement                                    |
| ----------- | ----------------------------------------------- |
| `variables` | **FUSIONNEES** - shared d'abord, puis variation |
| Autres      | **ECRASEES** - variation prioritaire sur shared |

**Exemple** :

```typescript
const template = {
	shared: {
		variables: [
			{ name: 'min', expression: '1' },
			{ name: 'max', expression: '10' }
		]
	},
	variations: [
		{
			variables: [
				{ name: 'a', expression: '{{{{min}}..{{max}}}}' },
				{ name: 'b', expression: '{{{{min}}..{{max}}}}' }
			],
			statement: '$${{a}} + {{b}} = ?$$',
			solution: '{{eval:a+b}}'
		}
	]
};

// Variables resolues dans l'ordre:
// 1. min = '1'       (de shared)
// 2. max = '10'      (de shared)
// 3. a = '7'         (de variation)
// 4. b = '3'         (de variation)
```

---

## QuestionVariable

Definition d'une variable (`types.ts:146-164`) :

```typescript
interface QuestionVariable {
	name: string; // Identifiant unique
	expression: string; // Expression a resoudre
	displayOptions?: DisplayOptions; // Options d'affichage
}
```

**Expression** : Peut contenir :

- Litteraux : `'5'`, `'rouge'`
- References : `'{{autreVar}}'`
- Random : `'{{1..10}}'`, `'{{a|b|c}}'`
- Eval : `'{{eval:a+b}}'`
- Combinaisons : `'{{eval:{{a}}+{{b}}}}'`

---

## QuestionCorrection

Feedback et etapes de correction (`types.ts:615-622`) :

```typescript
interface QuestionCorrection {
	feedback?: {
		correct?: TemplateMarkdown; // "Bravo !"
		incorrect?: TemplateMarkdown; // "La reponse etait {{solution}}"
		partial?: TemplateMarkdown; // "Presque correct..."
	};
	steps?: TemplateMarkdown[]; // Etapes detaillees
}
```

**Exemple** :

```typescript
correction: {
  feedback: {
    correct: "Excellent !",
    incorrect: "La reponse etait $${{eval:a+b}}$$"
  },
  steps: [
    "On pose l'operation: $${{a}} + {{b}}$$",
    "On calcule: $${{a}} + {{b}} = {{eval:a+b}}$$"
  ]
}
```

---

## Systeme de variations

### Pourquoi des variations ?

Les variations permettent de regrouper des questions similaires :

- Meme concept, differentes formulations
- Differentes operations (addition → soustraction → multiplication)
- Differents cas (discriminant positif, nul, negatif)

### Selection d'une variation

La selection est **deterministe** basee sur le seed :

```typescript
const variationIndex = Math.abs(seed) % template.variations.length;
```

| Seed | Variations | Index selectionne |
| ---- | ---------- | ----------------- |
| 0    | 4          | 0                 |
| 1    | 4          | 1                 |
| 2    | 4          | 2                 |
| 3    | 4          | 3                 |
| 4    | 4          | 0 (cycle)         |
| 100  | 4          | 0                 |

### Exemple multi-variations

```typescript
{
  type: 'numerical_exact',
  title: 'Operations basiques',

  shared: {
    variables: [
      { name: 'a', expression: '{{2..9}}' },
      { name: 'b', expression: '{{2..9!{{a}}}}' }
    ]
  },

  variations: [
    {
      statement: 'Calculer : $${{a}} + {{b}}$$',
      solution: '{{eval:a+b}}'
    },
    {
      statement: 'Calculer : $${{a}} - {{b}}$$',
      variables: [
        { name: 'a', expression: '{{5..15}}' },  // Override pour a > b
        { name: 'b', expression: '{{1..{{a}}-1}}' }
      ],
      solution: '{{eval:a-b}}'
    },
    {
      statement: 'Calculer : $${{a}} \\times {{b}}$$',
      solution: '{{eval:a*b}}'
    },
    {
      statement: 'Calculer : $${{dividend}} \\div {{b}}$$',
      variables: [
        { name: 'dividend', expression: '{{eval:a*b}}' }
      ],
      solution: '{{a}}'  // a*b / b = a
    }
  ],

  grades: ['6'],
  theme: 'Arithmetique',
  domain: 'Operations',
  level: 1,
  status: 'published'
}
```

---

## QuestionInstance

Structure generee a l'execution (`types.ts:390-440`) :

```typescript
interface QuestionInstance {
	templateId: string;
	type: QuestionType;

	// Contenu resolu
	statement: ResolvedMarkdown; // Variables remplacees
	resolvedVariables?: ResolvedVariable[];
	solution: string | string[];

	// Metadata (copie du template)
	title?: string;
	description?: string;
	exerciseInstruction?: string;
	options?: QuestionTemplate['options'];
	precision?: PrecisionType;
	grades: GradeLevel[];
	theme: string;
	domain: string;
	level: number;
	delay?: number;

	// Correction resolue
	correction?: ResolvedCorrection;

	// Type-specifique resolu
	transformType?: AlgebraicTransformType;
	blanks?: { position: number; expectedAnswer: string }[];
	choices?: { content: ResolvedMarkdown; isCorrect: boolean }[];
	shuffledChoices?: { content: ResolvedMarkdown; originalIndex: number }[];
	validationRules?: ValidationRule[];

	// Generation
	generatedAt: string;
	seed?: number;
	selectedVariationIndex?: number;
}
```

### Differences Template vs Instance

| Aspect   | Template        | Instance           |
| -------- | --------------- | ------------------ |
| Contenu  | `{{variables}}` | Valeurs resolues   |
| Stockage | Base de donnees | Memoire/runtime    |
| Duree    | Permanent       | Ephemere (session) |
| Choix    | Ordre original  | Melanges           |

---

## Bonnes pratiques

### DO

```typescript
// Grouper variations conceptuellement liees
variations: [
	{ statement: 'Addition...', solution: '{{eval:a+b}}' },
	{ statement: 'Soustraction...', solution: '{{eval:a-b}}' }
];

// Utiliser shared pour variables communes
shared: {
	variables: [{ name: 'min', expression: '1' }];
}

// Inclure corrections pedagogiques
correction: {
	steps: ['Etape 1...', 'Etape 2...'];
}
```

### DON'T

```typescript
// NE PAS melanger concepts non lies
variations: [
	{ statement: 'Addition...' },
	{ statement: 'Geometrie cercle...' } // Concept different !
];

// NE PAS referencer variables d'autres variations
variations: [
	{ variables: [{ name: 'x', expression: '5' }], statement: '...' },
	{ statement: '{{x}}' } // ERREUR: x n'existe pas ici
];
```

---

## Voir aussi

- [generation.md](generation.md) - Pipeline de generation
- [parameterization.md](parameterization.md) - Syntaxe variables
- [validation.md](validation.md) - Regles validation
