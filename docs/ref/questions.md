# Systeme de Questions - Documentation Technique

Ce document decrit l'architecture complete du systeme de questions mathematiques d'UbuMaths, incluant les types de questions, la generation d'instances, la parametrisation, et la validation des reponses.

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
   - [Architecture en couches](#11-architecture-en-couches)
   - [Flux de donnees](#12-flux-de-donnees)
2. [Types de questions](#2-types-de-questions)
   - [Questions numeriques](#21-questions-numeriques)
   - [Questions algebriques](#22-questions-algebriques)
   - [Questions a choix multiples](#23-questions-a-choix-multiples)
   - [Questions a trous](#24-questions-a-trous)
3. [Structure des templates](#3-structure-des-templates)
   - [QuestionTemplate](#31-questiontemplate)
   - [QuestionVariation](#32-questionvariation)
   - [SharedVariationDefaults](#33-sharedvariationdefaults)
4. [Pipeline de generation](#4-pipeline-de-generation)
   - [Etapes de resolution](#41-etapes-de-resolution)
   - [Resolution des variables](#42-resolution-des-variables)
   - [Resolution du contenu](#43-resolution-du-contenu)
5. [Systeme de parametrisation](#5-systeme-de-parametrisation)
   - [Tokenisation](#51-tokenisation)
   - [Parsers specialises](#52-parsers-specialises)
   - [Resolution 3 etapes](#53-resolution-3-etapes)
6. [Validation et evaluation](#6-validation-et-evaluation)
   - [Regles de validation dynamiques](#61-regles-de-validation-dynamiques)
   - [Contraintes de forme](#62-contraintes-de-forme)
   - [Precision numerique](#63-precision-numerique)
7. [Systeme de correction](#7-systeme-de-correction)
8. [Base de donnees](#8-base-de-donnees)
9. [API Endpoints](#9-api-endpoints)
10. [Fichiers sources](#10-fichiers-sources)

---

## 1. Vue d'ensemble

Le systeme de questions permet de creer des templates de questions mathematiques parametrees, generer des instances avec des valeurs aleatoires, et valider les reponses des eleves.

### 1.1 Architecture en couches

```
┌─────────────────────────────────────────────────────────────┐
│  INTERFACE UTILISATEUR                                      │
│  ├─ FlashCard.svelte         Affichage interactif          │
│  ├─ QuestionCard.svelte      Affichage simple              │
│  └─ QuestionTemplateForm     Creation/edition templates    │
├─────────────────────────────────────────────────────────────┤
│  LOGIQUE METIER                                             │
│  ├─ instance-generator.ts    Orchestrateur principal       │
│  ├─ variable-resolver.ts     Pipeline 3 etapes             │
│  ├─ random-generator.ts      Generation aleatoire seedee   │
│  ├─ content-resolver.ts      Resolution markdown           │
│  └─ choice-shuffler.ts       Melange Fisher-Yates          │
├─────────────────────────────────────────────────────────────┤
│  VALIDATION & EVALUATION                                    │
│  ├─ template-validator.ts    Validation structure          │
│  ├─ validation-rule-evaluator.ts  Validation dynamique     │
│  └─ constraint-validators.ts Verification forme            │
├─────────────────────────────────────────────────────────────┤
│  BIBLIOTHEQUE PARTAGEE (parameterization/)                  │
│  ├─ tokenizer.ts             Detection {{...}}             │
│  ├─ random-parser.ts         Specs aleatoires              │
│  ├─ eval-parser.ts           Expressions mathematiques     │
│  └─ variable-parser.ts       References variables          │
├─────────────────────────────────────────────────────────────┤
│  BASE DE DONNEES (Supabase)                                 │
│  └─ question_templates       Stockage JSONB                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Flux de donnees

```
QuestionTemplate (base de donnees)
         │
         ▼
[1. VALIDATION]              validateTemplate()
         │
         ▼
[2. SELECTION VARIATION]     Index aleatoire ou seed
         │
         ▼
[3. FUSION DEFAUTS]          shared + variation
         │
         ▼
[4. DETECTION CYCLES]        Dependances circulaires
         │
         ▼
[5. RESOLUTION VARIABLES]    Pipeline 3 etapes
         │
         ▼
[6. RESOLUTION CONTENU]      Markdown → valeurs
         │
         ▼
[7. TRAITEMENT TYPE]         Melange choix, blancs
         │
         ▼
QuestionInstance (JSON pour affichage)
```

---

## 2. Types de questions

Le systeme supporte 7 types de questions, definis dans `src/lib/questions/types.ts:67-74`.

### 2.1 Questions numeriques

| Type                  | Description                | Exemple reponse |
| --------------------- | -------------------------- | --------------- |
| `numerical_exact`     | Valeur numerique exacte    | `42`            |
| `numerical_decimal`   | Approximation decimale     | `3.14`          |
| `numerical_rounded`   | Valeur arrondie            | `3.1`           |
| `numerical_with_unit` | Valeur avec unite physique | `5 m/s`         |

**Configuration precision** (lignes 103-112) :

```typescript
type PrecisionType =
	| { type: 'none' } // Valeur exacte requise
	| { type: 'decimal'; digits: number } // 2 decimales
	| { type: 'significant'; digits: number } // 3 chiffres significatifs
	| { type: 'magnitude'; digits: number } // Ordre de grandeur
	| {
			type: 'tolerance';
			tolerance: number; // ±0.01 ou ±1%
			mode: 'absolute' | 'relative';
	  };
```

### 2.2 Questions algebriques

**Type** : `algebraic_transform`

**Transformations disponibles** (ligne 79) :

```typescript
type AlgebraicTransformType = 'factor' | 'expand' | 'simplify' | 'solve';
```

- `factor` : Factoriser une expression
- `expand` : Developper une expression
- `simplify` : Simplifier une expression
- `solve` : Resoudre une equation

### 2.3 Questions a choix multiples

**Type** : `multiple_choice`

**Structure des choix** (lignes 197-203) :

```typescript
choices?: {
  content: TemplateMarkdown;  // Contenu du choix (peut contenir {{var}})
  isCorrect: boolean;         // Si ce choix est correct
}[];
```

**Options** :

- `multipleAnswers: boolean` - Permet plusieurs reponses correctes

**Melange automatique** : Les choix sont melanges avec Fisher-Yates (preservant l'index original pour validation).

### 2.4 Questions a trous

**Type** : `fill_in_blanks`

**Structure des blancs** (lignes 187-194) :

```typescript
blanks?: {
  position: number;        // Position dans l'enonce
  expectedAnswer: string;  // Reponse attendue (peut contenir {{var}})
}[];
```

---

## 3. Structure des templates

### 3.1 QuestionTemplate

Interface principale stockee en base de donnees (lignes 259-380) :

```typescript
interface QuestionTemplate {
	// Identification
	id: string; // UUID
	type: QuestionType; // Type de question

	// Titre et description
	title: string; // Titre (supporte LaTeX)
	description?: string; // Description optionnelle

	// Contenu principal
	shared?: SharedVariationDefaults; // Defauts partages
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
			// Pour numerical_with_unit
			requireExactUnit?: boolean;
			tolerance?: { absolute?: number; relative?: number };
		};
	};

	precision?: PrecisionType; // Precision reponses numeriques

	// Metadata
	grades: GradeLevel[]; // Niveaux scolaires
	theme: string; // Ex: "Algebre", "Geometrie"
	domain: string; // Ex: "Equations"
	subdomain?: string; // Ex: "Lineaires"
	level: number; // Difficulte (1-6+)
	status: 'draft' | 'published'; // Statut
	delay?: number; // Limite temps (secondes)

	// Type-specifique
	transformType?: AlgebraicTransformType; // Pour algebraic_transform
	multipleAnswers?: boolean; // Pour multiple_choice

	// Audit
	created_at?: string;
	updated_at?: string;
	created_by?: string;
}
```

### 3.2 QuestionVariation

Une variation represente une version de la question (lignes 172-214) :

```typescript
interface QuestionVariation {
	// Contenu template ({{var}}, {{random:}}, {{eval:}})
	statement: TemplateMarkdown;

	// Variables resolues dans l'ordre
	variables?: QuestionVariable[];

	// Reponse(s) attendue(s) - valeurs texte
	answer: string | string[];

	// Correction detaillee
	correction?: QuestionCorrection;

	// Type-specifique
	blanks?: { position: number; expectedAnswer: string }[];
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[]; // Validation dynamique
}
```

### 3.3 SharedVariationDefaults

Defauts partages entre toutes les variations (lignes 220-244) :

```typescript
interface SharedVariationDefaults {
	statement?: TemplateMarkdown; // Enonce partage
	variables?: QuestionVariable[]; // Variables partagees (fusionnees)
	answer?: string | string[]; // Reponse partagee
	correction?: QuestionCorrection; // Correction partagee
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
}
```

**Regles de fusion** :

- `variables` : **FUSIONNEES** (partagees d'abord, puis variation)
- Autres champs : **ECRASEES** (variation prioritaire)

---

## 4. Pipeline de generation

Le fichier `instance-generator.ts` orchestre la generation complete.

### 4.1 Etapes de resolution

```typescript
function generateInstance(template: QuestionTemplate, seed?: number): GenerationResult {
  // 1. Validation structure
  const errors = validateTemplate(template);
  if (errors.length > 0) return { success: false, errors };

  // 2. Selection variation (deterministe avec seed)
  const variationIndex = seed !== undefined
    ? Math.abs(seed) % template.variations.length
    : Math.floor(Math.random() * template.variations.length);

  // 3. Fusion defauts
  const resolved = resolveVariationWithShared(template.shared, selectedVariation);

  // 4. Detection dependances circulaires
  if (resolved.variables) {
    const result = detectCircularDependencies(resolved.variables);
    if (!result.valid) return { success: false, errors: [...] };
  }

  // 5. Resolution variables (3 etapes)
  const resolvedVariables = resolveVariables(resolved.variables || [], seed);

  // 6. Resolution contenu
  const statement = resolveMarkdownContent(resolved.statement, resolvedVariables, seed);
  const answer = resolveAnswer(resolved.answer, resolvedVariables, seed);

  // 7. Traitement type-specifique
  if (type === 'multiple_choice') {
    choices = resolveChoices(...);
    shuffledChoices = shuffleChoices(choices, seed);
  }

  return { success: true, instance };
}
```

### 4.2 Resolution des variables

Fichier : `variable-resolver.ts` (shared/parameterization/)

**Pipeline 3 etapes** :

```
ETAPE 1 : SUBSTITUTION VARIABLES
  {{autreVar}} → Recherche valeur resolue → valeur

ETAPE 2 : GENERATION ALEATOIRE
  {{random:1..10}} → Genere entier 1-10
  {{2.3}}          → Genere decimal X.XXX
  {{a|b|c}}        → Selectionne item liste

ETAPE 3 : EVALUATION MATHEMATIQUE
  {{eval:{{a}} + {{b}}}} → Substitue variables → parse → calcule
```

**Exemple complet** :

```typescript
// Definition
variables: [
	{ name: 'min', expression: '1' },
	{ name: 'max', expression: '10' },
	{ name: 'a', expression: '{{random:{{min}}..{{max}}}}' },
	{ name: 'b', expression: '{{random:{{min}}..{{max}}!{{a}}}}' },
	{ name: 'sum', expression: '{{eval:a+b}}' }
];

// Resolution (seed: 42)
// 1. min = '1' (literal)
// 2. max = '10' (literal)
// 3. a = '7' (random 1..10 avec seed)
// 4. b = '3' (random 1..10 excluant 7)
// 5. sum = '10' (eval: 7+3)
```

### 4.3 Resolution du contenu

Fichier : `content-resolver.ts`

```typescript
function resolveMarkdownContent(
	markdown: TemplateMarkdown,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): ResolvedMarkdown {
	// 1. Resoudre variables, random, eval
	let resolved = resolveVariableExpression(markdown, resolvedVariables, seed);

	// 2. Resoudre references couleurs
	resolved = resolveColorReferences(resolved, seed);

	return resolvedMarkdown(resolved);
}
```

---

## 5. Systeme de parametrisation

La bibliotheque `shared/parameterization/` fournit un systeme de templates generique.

### 5.1 Tokenisation

Fichier : `tokenizer.ts`

**Syntaxe supportee** :

| Pattern           | Type       | Description                    |
| ----------------- | ---------- | ------------------------------ |
| `{{var}}`         | `variable` | Reference variable             |
| `{{random:spec}}` | `random`   | Generation aleatoire explicite |
| `{{spec}}`        | `random`   | Raccourci (auto-detecte)       |
| `{{eval:expr}}`   | `eval`     | Expression mathematique        |

**Detection automatique** pour raccourcis :

- Contient `..` (double point) → random
- Contient `|` au niveau racine → random (liste discrete)
- Format `n.m` (digits) → random
- Nom alphanumerique simple → variable

### 5.2 Parsers specialises

#### random-parser.ts

**Formats supportes** :

```
ENTIERS
{{1..10}}                  Entier 1 a 10
{{-5..10}}                 Negatif a positif
{{-10..-1}}                Plage negative
{{2..9;±}}                 Relatif (union {-9..-2} U {2..9})

DECIMAUX
{{2.3}}                    2 chiffres avant, 3 apres
{{1..1.6}}                 Decimal avec step auto (0.1)
{{0.5..9.99:0.01}}         Step explicite

LISTES
{{rouge|vert|bleu}}        Liste discrete
{{{{x}}|{{y}}|z}}          Items avec variables

EXCLUSIONS
{{1..10!5}}                Exclure 5
{{1..20!5,7..9}}           Exclure 5 et 7-9
{{1..10!{{a}}}}            Exclure valeur variable

BORNES VARIABLES
{{{{min}}..{{max}}}}       Bornes dynamiques
```

**Structure RandomSpec** :

```typescript
type RandomSpec =
	| { type: 'integer'; min: NumberOrVariable; max: NumberOrVariable; exclusions: Exclusion[] }
	| { type: 'relative-integer'; min; max; exclusions }
	| { type: 'decimal-by-digits'; digitsBefore; digitsAfter; exclusions }
	| { type: 'decimal-range'; min; max; step: number; exclusions }
	| { type: 'discrete-list'; items: string[]; exclusions: string[] };
```

#### eval-parser.ts

**Syntaxe** : `{{eval:expression;modifiers}}`

**Modifiers disponibles** :

| Modifier     | Alias | Description                     |
| ------------ | ----- | ------------------------------- |
| `decimal`    | `d`   | Forcer sortie decimale          |
| `positive`   | `+`   | Ajouter signe + pour positifs   |
| `bracket`    | `()`  | Parentheses autour des negatifs |
| `derivative` | `'`   | Derivee (non implemente)        |

**Exemples** :

```
{{eval:1/3;d}}      → "0.333..."
{{eval:5;+}}        → "+5"
{{eval:-3;()}}      → "(-3)"
{{eval:a*b;d,+}}    → "+15" (si a*b = 15)
```

### 5.3 Resolution 3 etapes

Fichier : `resolver/variable-resolver.ts`

```typescript
function resolveExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed?: number
): string {
	let result = expression;

	// ETAPE 1: Remplacer {{var}} par valeurs
	const varTokens = tokenize(result).filter((t) => t.type === 'variable');
	for (const token of varTokens.reverse()) {
		const varName = parseVariableReference(token.content);
		const resolved = alreadyResolved.find((v) => v.name === varName);
		result = result.slice(0, token.start) + resolved.value + result.slice(token.end);
	}

	// ETAPE 2: Generer {{random:...}}
	const randomTokens = tokenize(result).filter((t) => t.type === 'random');
	for (const token of randomTokens.reverse()) {
		const spec = parseRandomSpec(token.content);
		const generated = generateRandomNumber(spec, alreadyResolved, seed);
		result = result.slice(0, token.start) + String(generated) + result.slice(token.end);
	}

	// ETAPE 3: Evaluer {{eval:...}}
	const evalTokens = tokenize(result).filter((t) => t.type === 'eval');
	for (const token of evalTokens.reverse()) {
		const parsed = parseEvalExpressionWithModifiers(token.content);
		// Substituer variables dans l'expression
		// Evaluer avec ComputeEngine
		const value = evaluateWithModifiers(resolvedExpr, parsed.modifiers);
		result = result.slice(0, token.start) + value + result.slice(token.end);
	}

	return result;
}
```

---

## 6. Validation et evaluation

### 6.1 Regles de validation dynamiques

Fichier : `validation-rule-evaluator.ts`

Pour les questions ou la reponse correcte depend des variables generees.

**7 types de regles** (lignes 648-655) :

```typescript
type ValidationRule =
	| DivisorRule // answer divise dividend
	| MultipleRule // answer multiple de base
	| RangeRule // answer dans [min, max]
	| EquationRootRule // answer racine de l'equation
	| EquivalenceRule // answer equivalent a expression
	| PredicateRule // answer satisfait predicat
	| CustomExpressionRule; // Expression personnalisee
```

**Exemples d'utilisation** :

```typescript
// Diviseur
{ type: 'divisor', dividend: '{{n}}' }
// L'eleve doit donner un diviseur de n

// Predicat
{ type: 'predicate', predicate: 'isPrime' }
// La reponse doit etre un nombre premier

// Plage
{ type: 'range', min: '1', max: '{{max}}', inclusive: true }
// La reponse doit etre dans [1, max]

// Racine d'equation
{ type: 'equation_root', equation: 'x^2 - {{sum}}*x + {{product}} = 0' }
// La reponse doit etre une racine
```

**Predicats disponibles** (ligne 726-734) :

- `isPrime` : Nombre premier
- `isComposite` : Nombre compose
- `isEven` : Nombre pair
- `isOdd` : Nombre impair
- `isPositive` : Nombre positif
- `isNegative` : Nombre negatif
- `isInteger` : Nombre entier

### 6.2 Contraintes de forme

Fichier : `constraint-validators.ts`

Verifie que la reponse mathematiquement correcte est ecrite dans la forme attendue.

**5 validateurs** :

| Contrainte | Description                           | Exemple violation  |
| ---------- | ------------------------------------- | ------------------ |
| `spaces`   | Espacement chiffres (format francais) | `12345` → `12 345` |
| `products` | Multiplication implicite vs explicite | `2×x` → `2x`       |
| `brackets` | Parentheses inutiles                  | `(5)` → `5`        |
| `zeros`    | Zeros inutiles                        | `01`, `1.0`        |
| `form`     | Forme exacte requise                  | `x+1` ≠ `1+x`      |

**Modes de contrainte** :

```typescript
type ConstraintMode = 'strict' | 'warn' | 'off';

// strict: bad_form (0 points)
// warn: unoptimal_form (credit partiel)
// off: ignore
```

**Configuration** :

```typescript
interface ConstraintOptions {
	spaces?: ConstraintMode;
	products?: ConstraintMode;
	brackets?: ConstraintMode;
	zeros?: ConstraintMode;
	form?: ConstraintMode;
	allowBracketsInFirstNegativeTerm?: boolean; // (-5)+3 autorise
}
```

### 6.3 Precision numerique

**Types de precision** (lignes 103-112) :

| Type          | Description                | Exemple      |
| ------------- | -------------------------- | ------------ |
| `none`        | Valeur exacte requise      | 3.14159...   |
| `decimal`     | N decimales                | 3.14 (2 dec) |
| `significant` | N chiffres significatifs   | 3.14 (3 sig) |
| `magnitude`   | Ordre de grandeur          | 10^3         |
| `tolerance`   | Tolerance absolue/relative | ±0.01 ou ±1% |

---

## 7. Systeme de correction

**Structure QuestionCorrection** (lignes 615-622) :

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

**Resolution** : Tous les `{{variables}}` sont resolus avec les valeurs generees.

**Exemple** :

```typescript
correction: {
  feedback: {
    correct: "Excellent !",
    incorrect: "La reponse etait $${{eval:a+b}}$$"
  },
  steps: [
    "On pose l'operation: $${{a}} + {{b}}$$",
    "On calcule: $${{a}} + {{b}} = {{eval:a+b}}$$",
    "Donc la reponse est $${{eval:a+b}}$$"
  ]
}
```

---

## 8. Base de donnees

**Table** : `question_templates` (migration 070)

**Schema principal** :

```sql
CREATE TABLE question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type
  type TEXT NOT NULL CHECK (type IN (
    'numerical_exact', 'numerical_decimal', 'numerical_rounded',
    'algebraic_transform', 'fill_in_blanks', 'multiple_choice'
  )),

  -- Contenu (JSONB)
  statement JSONB NOT NULL,
  variables JSONB,
  answer JSONB NOT NULL,

  -- Validation
  options JSONB,
  precision JSONB,

  -- Metadata
  grades TEXT[] NOT NULL,
  delay INTEGER,
  correction JSONB,

  -- Type-specifique
  transform_type TEXT,
  blanks JSONB,
  choices JSONB,
  multiple_answers BOOLEAN,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

**Index** :

- `type` : Recherche par type
- `grades` (GIN) : Recherche par niveau
- `created_by` : Templates par auteur
- `created_at DESC` : Tri chronologique

**RLS Policies** :

- Admins : Acces complet
- Teachers : Lecture seule

---

## 9. API Endpoints

**Base** : `/api/questions/`

| Methode | Endpoint          | Description            |
| ------- | ----------------- | ---------------------- |
| GET     | `/templates`      | Liste paginee          |
| POST    | `/templates`      | Creer template         |
| GET     | `/templates/[id]` | Obtenir un template    |
| PUT     | `/templates/[id]` | Mettre a jour          |
| DELETE  | `/templates/[id]` | Supprimer              |
| GET     | `/templates/all`  | Tous (sans pagination) |
| POST    | `/generate/[id]`  | Generer instance       |
| GET     | `/categories`     | Liste categories       |
| GET     | `/categories/all` | Toutes categories      |

**Generation d'instance** :

```typescript
// POST /api/questions/generate/[id]
// Body: { seed?: number }
// Response: GenerationResult

type GenerationResult =
	| { success: true; instance: QuestionInstance }
	| { success: false; errors: string[] };
```

---

## 10. Fichiers sources

### Coeur du systeme

| Fichier                                             | Lignes | Description          |
| --------------------------------------------------- | ------ | -------------------- |
| `src/lib/questions/types.ts`                        | 750    | Definitions de types |
| `src/lib/questions/generator/instance-generator.ts` | 312    | Orchestrateur        |
| `src/lib/questions/generator/variable-resolver.ts`  | 106    | Wrapper resolution   |
| `src/lib/questions/generator/content-resolver.ts`   | 84     | Resolution markdown  |
| `src/lib/questions/generator/choice-shuffler.ts`    | 77     | Melange Fisher-Yates |

### Validation

| Fichier                                              | Description          |
| ---------------------------------------------------- | -------------------- |
| `src/lib/questions/validators/template-validator.ts` | Validation structure |
| `src/lib/questions/validation-rule-evaluator.ts`     | Regles dynamiques    |
| `src/lib/questions/constraint-validators.ts`         | Contraintes forme    |

### Bibliotheque partagee

| Fichier                                                            | Description                       |
| ------------------------------------------------------------------ | --------------------------------- |
| `src/lib/shared/parameterization/types.ts`                         | Types Token, Variable, RandomSpec |
| `src/lib/shared/parameterization/parser/tokenizer.ts`              | Extraction tokens                 |
| `src/lib/shared/parameterization/parser/random-parser.ts`          | Parse {{random:}}                 |
| `src/lib/shared/parameterization/parser/eval-parser.ts`            | Parse {{eval:}}                   |
| `src/lib/shared/parameterization/parser/variable-parser.ts`        | Parse {{var}}                     |
| `src/lib/shared/parameterization/resolver/variable-resolver.ts`    | Pipeline 3 etapes                 |
| `src/lib/shared/parameterization/resolver/random-generator.ts`     | Generation aleatoire              |
| `src/lib/shared/parameterization/validator/circular-dependency.ts` | Detection cycles                  |

### Compute Engine

| Fichier                                       | Description           |
| --------------------------------------------- | --------------------- |
| `src/lib/questions/compute-engine/wrapper.ts` | Interface MathLive CE |

### Base de donnees

| Fichier                                                 | Description |
| ------------------------------------------------------- | ----------- |
| `supabase/migrations/070_create_question_templates.sql` | Schema      |

---

## Annexes

### A. QuestionInstance (structure generee)

```typescript
interface QuestionInstance {
	templateId: string;
	type: QuestionType;

	// Contenu resolu
	statement: ResolvedMarkdown;
	resolvedVariables?: ResolvedVariable[];
	answer: string | string[];

	// Metadata (copie template)
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

### B. Exemple complet de template

```typescript
const template: QuestionTemplate = {
	id: crypto.randomUUID(),
	type: 'numerical_exact',
	title: 'Addition simple',
	description: 'Calculer la somme de deux entiers',

	shared: {
		variables: [
			{ name: 'min', expression: '1' },
			{ name: 'max', expression: '10' }
		]
	},

	variations: [
		{
			statement: 'Calculer : $${{a}} + {{b}}$$',
			variables: [
				{ name: 'a', expression: '{{random:{{min}}..{{max}}}}' },
				{ name: 'b', expression: '{{random:{{min}}..{{max}}!{{a}}}}' }
			],
			answer: '{{eval:a+b}}',
			correction: {
				feedback: {
					correct: 'Bravo !',
					incorrect: 'La reponse etait {{eval:a+b}}'
				},
				steps: ['On additionne {{a}} et {{b}}', '{{a}} + {{b}} = {{eval:a+b}}']
			}
		}
	],

	exerciseInstruction: 'Calculer',
	grades: ['6', '5'],
	theme: 'Arithmetique',
	domain: 'Addition',
	level: 1,
	status: 'published',
	delay: 30
};
```

### C. Generation avec seed

```typescript
// Generation deterministe
const result1 = generateInstance(template, 42);
const result2 = generateInstance(template, 42);
// result1 et result2 sont identiques

// Generation aleatoire
const result3 = generateInstance(template);
// Valeurs differentes a chaque appel
```

---

**Voir aussi** :

- [docs/ref/markdown.md](markdown.md) - Syntaxe markdown et templates
- [docs/claude/database.md](../claude/database.md) - Guide Supabase
