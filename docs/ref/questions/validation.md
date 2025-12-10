# Validation et Evaluation

> Regles de validation, contraintes de forme, et precision numerique.

---

## Vue d'ensemble

Le systeme de validation verifie que la reponse de l'eleve est :

1. **Mathematiquement correcte** (equivalence)
2. **Bien formatee** (contraintes de forme)
3. **Dans les limites de precision** (numerique)

---

## Architecture de validation

```
Reponse eleve
      |
      v
[1. CONTRAINTES DE FORME]
  Espaces, parentheses, zeros...
      |
      v
[2. PRECISION NUMERIQUE]
  Decimales, chiffres significatifs...
      |
      v
[3. REGLES DYNAMIQUES]
  diviseur, multiple, plage...
      |
      v
[4. EQUIVALENCE MATHEMATIQUE]
  Via Compute Engine
      |
      v
Resultat validation
```

---

## 1. Contraintes de forme

**Fichier** : `src/lib/questions/constraint-validators.ts`

### Validateurs disponibles

| Contrainte         | Description                           | Exemple violation  |
| ------------------ | ------------------------------------- | ------------------ |
| `spaces`           | Espacement chiffres (format francais) | `12345` → `12 345` |
| `products`         | Multiplication implicite vs explicite | `2×x` → `2x`       |
| `brackets`         | Parentheses inutiles                  | `(5)` → `5`        |
| `zeros`            | Zeros inutiles                        | `01`, `1.0`        |
| `form`             | Forme exacte requise                  | `x+1` ≠ `1+x`      |
| `nullTerms`        | Termes nuls                           | `x+0` → `x`        |
| `factorOne`        | Facteur 1                             | `1x` → `x`         |
| `factorZero`       | Facteur 0                             | `0*x` → `0`        |
| `signs`            | Signes superflus                      | `+x`, `--5`        |
| `reducedFractions` | Fractions reduites                    | `2/4` → `1/2`      |

### Modes de contrainte

```typescript
type ConstraintMode = 'strict' | 'warn' | 'off';
```

| Mode     | Comportement    | Score          |
| -------- | --------------- | -------------- |
| `strict` | Reponse refusee | 0 points       |
| `warn`   | Avertissement   | Credit partiel |
| `off`    | Ignore          | Score normal   |

### Configuration

```typescript
interface ConstraintOptions {
	spaces?: ConstraintMode;
	products?: ConstraintMode;
	brackets?: ConstraintMode;
	zeros?: ConstraintMode;
	form?: ConstraintMode;
	nullTerms?: ConstraintMode;
	factorOne?: ConstraintMode;
	factorZero?: ConstraintMode;
	signs?: ConstraintMode;
	reducedFractions?: ConstraintMode;

	// Options speciales
	allowBracketsInFirstNegativeTerm?: boolean; // (-5)+3 autorise
}
```

### Exemple d'utilisation

```typescript
const template = {
	type: 'algebraic_transform',
	options: {
		constraints: {
			brackets: 'strict', // Pas de parentheses inutiles
			reducedFractions: 'warn', // Avertissement si non reduit
			spaces: 'off' // Ignore l'espacement
		}
	}
	// ...
};
```

---

## 2. Precision numerique

**Types de precision** (`src/lib/questions/types.ts:103-112`) :

### none (exacte)

```typescript
precision: {
	type: 'none';
}
```

La valeur doit etre mathematiquement exacte.

### decimal

```typescript
precision: { type: 'decimal', digits: 2 }
```

N decimales apres la virgule.

**Exemple** : `3.14` (2 decimales) pour π

### significant

```typescript
precision: { type: 'significant', digits: 3 }
```

N chiffres significatifs.

**Exemple** : `3.14` (3 sig) pour π

### magnitude

```typescript
precision: { type: 'magnitude', digits: 1 }
```

Ordre de grandeur.

**Exemple** : `1000` ou `10^3` pour 1234

### tolerance

```typescript
// Tolerance absolue
precision: {
  type: 'tolerance',
  tolerance: 0.01,
  mode: 'absolute'
}
// Accepte ±0.01 de la valeur exacte

// Tolerance relative
precision: {
  type: 'tolerance',
  tolerance: 0.05,
  mode: 'relative'
}
// Accepte ±5% de la valeur exacte
```

---

## 3. Regles de validation dynamiques

**Fichier** : `src/lib/questions/validation-rule-evaluator.ts`

Pour les questions ou la reponse correcte depend des valeurs generees.

### Types de regles

```typescript
type ValidationRule =
	| DivisorRule
	| MultipleRule
	| RangeRule
	| EquationRootRule
	| EquivalenceRule
	| PredicateRule
	| CustomExpressionRule;
```

### DivisorRule

La reponse doit diviser un nombre.

```typescript
{
  type: 'divisor',
  dividend: '{{n}}'
}
```

**Cas d'usage** : "Donner un diviseur de 24"

### MultipleRule

La reponse doit etre un multiple.

```typescript
{
  type: 'multiple',
  base: '{{b}}'
}
```

**Cas d'usage** : "Donner un multiple de 7"

### RangeRule

La reponse doit etre dans une plage.

```typescript
{
  type: 'range',
  min: '1',
  max: '{{max}}',
  inclusive: true
}
```

**Cas d'usage** : "Donner un entier entre 1 et 100"

### EquationRootRule

La reponse doit etre racine d'une equation.

```typescript
{
  type: 'equation_root',
  equation: 'x^2 - {{sum}}*x + {{product}} = 0'
}
```

**Cas d'usage** : "Donner une solution de l'equation"

### EquivalenceRule

La reponse doit etre equivalente a une expression.

```typescript
{
  type: 'equivalence',
  expression: '{{target}}'
}
```

**Cas d'usage** : Verification algebrique

### PredicateRule

La reponse doit satisfaire un predicat.

```typescript
{
  type: 'predicate',
  predicate: 'isPrime'
}
```

**Predicats disponibles** :

| Predicat      | Description    |
| ------------- | -------------- |
| `isPrime`     | Nombre premier |
| `isComposite` | Nombre compose |
| `isEven`      | Nombre pair    |
| `isOdd`       | Nombre impair  |
| `isPositive`  | Positif strict |
| `isNegative`  | Negatif strict |
| `isInteger`   | Entier         |

### CustomExpressionRule

Expression booleenne personnalisee.

```typescript
{
  type: 'custom_expression',
  expression: '{{answer}} > {{min}} && {{answer}} < {{max}}'
}
```

---

## 4. Equivalence mathematique

**Fichier** : `src/lib/questions/compute-engine/wrapper.ts`

### Fonctions principales

```typescript
// Verification equivalence
function areEquivalent(latex1: string, latex2: string): boolean;

// Evaluation expression
function evaluateExpression(latex: string): number | string;

// Simplification
function simplifyExpression(latex: string): string;

// Validation syntaxe
function isValidLatex(latex: string): boolean;
```

### Modes de validation

Via `options.validator` :

| Validator          | Description                       |
| ------------------ | --------------------------------- |
| `checkEquivalence` | Equivalence mathematique complete |
| `checkAlgebraic`   | Equivalence algebrique            |
| `checkNumeric`     | Comparaison numerique             |

### Options d'equivalence

```typescript
options: {
  allowEquivalent: true,      // 1/2 = 0.5
  allowDifferentForms: true,  // 1/2 = 2/4
  canonicalForm: 'fraction'   // Force forme canonique
}
```

---

## Validation des templates

**Fichier** : `src/lib/questions/validators/template-validator.ts`

### Validations effectuees

```typescript
function validateTemplate(template: QuestionTemplate): string[] {
	const errors: string[] = [];

	// Au moins une variation
	if (!template.variations?.length) {
		errors.push('Au moins une variation requise');
	}

	template.variations.forEach((variation, index) => {
		// Statement requis
		if (!variation.statement) {
			errors.push(`Variation ${index}: statement requis`);
		}

		// Solution requise
		if (!variation.solution) {
			errors.push(`Variation ${index}: solution requise`);
		}

		// Type-specifique
		if (template.type === 'multiple_choice' && !variation.choices?.length) {
			errors.push(`Variation ${index}: choices requis pour multiple_choice`);
		}

		if (template.type === 'fill_in_blanks' && !variation.blanks?.length) {
			errors.push(`Variation ${index}: blanks requis pour fill_in_blanks`);
		}
	});

	return errors;
}
```

### Detection des cycles

```typescript
function detectCircularDependencies(variables: QuestionVariable[]): {
	valid: boolean;
	cycle?: string[];
} {
	// Construit graphe de dependances
	// Detecte cycles via DFS
}
```

**Exemple de cycle** :

```typescript
variables: [
	{ name: 'a', expression: '{{b}}' },
	{ name: 'b', expression: '{{c}}' },
	{ name: 'c', expression: '{{a}}' } // CYCLE!
];
// Erreur: "Dependance circulaire: a -> b -> c -> a"
```

---

## Resultat de validation

```typescript
interface ValidationResult {
	correct: boolean; // Mathematiquement correct
	formCorrect: boolean; // Forme correcte
	constraintViolations: ConstraintViolation[];
	score: number; // 0 a 1
	feedback?: string; // Message pour l'eleve
}

interface ConstraintViolation {
	constraint: string; // Nom contrainte
	message: string; // Message explicatif
	mode: ConstraintMode; // strict/warn/off
}
```

---

## Exemples complets

### Question avec contraintes strictes

```typescript
{
  type: 'numerical_exact',
  options: {
    constraints: {
      spaces: 'strict',
      reducedFractions: 'strict'
    }
  },
  variations: [{
    statement: 'Simplifier: $$\\frac{4}{8}$$',
    solution: '\\frac{1}{2}'
  }]
}
// Reponses:
// "1/2" -> correct
// "2/4" -> incorrect (non reduit, mode strict)
// "0.5" -> correct (equivalent)
```

### Question avec regles dynamiques

```typescript
{
  type: 'numerical_exact',
  variations: [{
    statement: 'Donner un nombre premier entre 10 et {{max}}',
    variables: [
      { name: 'max', expression: '{{30..50}}' }
    ],
    solution: 'dynamic',  // Pas de solution fixe
    validationRules: [
      { type: 'predicate', predicate: 'isPrime' },
      { type: 'range', min: '10', max: '{{max}}', inclusive: true }
    ]
  }]
}
// Toute reponse premiere entre 10 et max est acceptee
```

### Question avec precision

```typescript
{
  type: 'numerical_decimal',
  precision: { type: 'decimal', digits: 3 },
  variations: [{
    statement: 'Calculer $$\\sqrt{2}$$ a 3 decimales',
    solution: '1.414'
  }]
}
// "1.414" -> correct
// "1.41" -> incorrect (pas assez de decimales)
// "1.4142" -> correct (plus precis accepte)
```

---

## Fichiers source

| Fichier                            | Responsabilite           |
| ---------------------------------- | ------------------------ |
| `constraint-validators.ts`         | 10 contraintes de forme  |
| `validation-rule-evaluator.ts`     | 7 regles dynamiques      |
| `validators/template-validator.ts` | Validation structure     |
| `compute-engine/wrapper.ts`        | Equivalence mathematique |

---

## Voir aussi

- [types.md](types.md) - Types de questions
- [generation.md](generation.md) - Pipeline generation
- [components.md](components.md) - Composants UI
