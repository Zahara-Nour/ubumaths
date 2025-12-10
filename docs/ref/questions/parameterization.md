# Systeme de Parametrisation

> Syntaxe complete pour variables, generation aleatoire, et evaluation.

---

## Vue d'ensemble

Le systeme de parametrisation permet d'ecrire des expressions dynamiques dans les templates.

**Bibliotheque** : `src/lib/shared/parameterization/`

---

## Syntaxe de base

### Tokens supportes

| Pattern           | Type       | Description                    |
| ----------------- | ---------- | ------------------------------ |
| `{{var}}`         | `variable` | Reference a une variable       |
| `{{random:spec}}` | `random`   | Generation aleatoire explicite |
| `{{spec}}`        | `random`   | Raccourci auto-detecte         |
| `{{eval:expr}}`   | `eval`     | Evaluation mathematique        |

### Detection automatique

Pour les raccourcis `{{spec}}` :

| Pattern                        | Detection        |
| ------------------------------ | ---------------- |
| Contient `..`                  | random (plage)   |
| Contient `\|` au niveau racine | random (liste)   |
| Format `n.m` (digits)          | random (decimal) |
| Nom alphanumerique             | variable         |

---

## Pipeline de resolution

La resolution s'effectue en **3 etapes sequentielles** :

```
Expression originale
        |
        v
[ETAPE 1: SUBSTITUTION]
  {{var}} -> valeur deja resolue
        |
        v
[ETAPE 2: GENERATION ALEATOIRE]
  {{random:...}} -> valeur generee
        |
        v
[ETAPE 3: EVALUATION]
  {{eval:...}} -> resultat calcule
        |
        v
Valeur finale
```

### Exemple de resolution

```typescript
// Variables definies:
{ name: 'min', expression: '1' }
{ name: 'max', expression: '10' }
{ name: 'a', expression: '{{random:{{min}}..{{max}}}}' }
{ name: 'sum', expression: '{{eval:{{a}}+5}}' }

// Resolution sequentielle:
// 1. min = '1' (literal)
// 2. max = '10' (literal)
// 3. a:
//    - Input: '{{random:{{min}}..{{max}}}}'
//    - Etape 1: '{{random:1..10}}'
//    - Etape 2: '7' (aleatoire)
//    - Etape 3: '7' (pas d'eval)
// 4. sum:
//    - Input: '{{eval:{{a}}+5}}'
//    - Etape 1: '{{eval:7+5}}'
//    - Etape 2: '{{eval:7+5}}' (pas de random)
//    - Etape 3: '12'
```

---

## Generation aleatoire

### Entiers

```
{{1..10}}           Entier de 1 a 10 inclus
{{-5..10}}          Plage avec negatifs
{{-10..-1}}         Plage entierement negative
{{2..9;±}}          Relatif: {-9..-2} U {2..9}
```

### Decimaux

```
{{2.3}}             2 chiffres avant, 3 apres (ex: 45.123)
{{1.5..9.99:0.01}}  De 1.5 a 9.99 avec step 0.01
{{0.1..0.9:0.1}}    0.1, 0.2, ..., 0.9
```

### Listes discretes

```
{{rouge|vert|bleu}}     Selection parmi liste
{{oui|non}}             Booleen textuel
{{{{x}}|{{y}}|z}}       Items avec variables
```

### Exclusions

```
{{1..10!5}}             Exclure 5
{{1..20!5,7..9}}        Exclure 5 et 7, 8, 9
{{1..10!{{a}}}}         Exclure valeur de a
{{1..10!{{a}},{{b}}}}   Exclure a et b
```

### Bornes dynamiques

```
{{{{min}}..{{max}}}}              Bornes variables
{{{{min}}..{{max}}!{{exclude}}}}  Avec exclusion variable
```

---

## Evaluation mathematique

### Syntaxe de base

```
{{eval:expression}}
{{eval:expression;modifiers}}
```

### Expressions supportees

| Expression           | Resultat            |
| -------------------- | ------------------- |
| `{{eval:3+5}}`       | `8`                 |
| `{{eval:10/4}}`      | `5/2` (fraction)    |
| `{{eval:sqrt(16)}}`  | `4`                 |
| `{{eval:sin(pi/6)}}` | `1/2`               |
| `{{eval:a+b}}`       | Somme des variables |
| `{{eval:2^10}}`      | `1024`              |

### Modifiers

| Modifier   | Alias | Description           | Exemple                       |
| ---------- | ----- | --------------------- | ----------------------------- |
| `decimal`  | `d`   | Sortie decimale       | `{{eval:1/3;d}}` → `0.333...` |
| `positive` | `+`   | Signe + pour positifs | `{{eval:5;+}}` → `+5`         |
| `bracket`  | `()`  | Parentheses negatifs  | `{{eval:-3;()}}` → `(-3)`     |

### Combinaisons de modifiers

```
{{eval:a*b;d,+}}    Decimal et signe positif
{{eval:x;+,()}}     Signe et parentheses
```

---

## Options d'affichage (DisplayOptions)

Les variables peuvent avoir des transformations d'affichage.

### Interface

```typescript
interface DisplayOptions {
	// Shuffle termes/facteurs
	shuffleTerms?: boolean; // a+b+c -> c+a+b
	shuffleFactors?: boolean; // a*b*c -> c*a*b
	shuffleTermsAndFactors?: boolean; // Les deux
	shallowShuffleTerms?: boolean; // Niveau racine seulement
	shallowShuffleFactors?: boolean; // Niveau racine seulement

	// Simplifications
	removeNullTerms?: boolean; // x+0 -> x
	removeUnnecessaryBrackets?: boolean; // (x) -> x

	// Formatage
	addSpaces?: boolean; // Espaces operateurs (defaut: true)
	keepUnnecessaryZeros?: boolean; // 3.00 au lieu de 3
}
```

### Cascade de priorite

```
GLOBAL (defauts) < TEMPLATE (defaultDisplayOptions) < VARIABLE (displayOptions)
```

### Exemple d'utilisation

```typescript
{
  name: 'expression',
  expression: '{{a}}+{{b}}+{{c}}',
  displayOptions: {
    shuffleTerms: true,
    removeNullTerms: true
  }
}

// Resultat avec a=5, b=0, c=3:
// value: '5+0+3'
// displayValue: '3+5' (0 supprime, termes melanges)
```

### Utilisation dans le texte

```typescript
// Dans statement ou correction:
'Calculer: $${{expression}}$$';

// Utilise displayValue si defini, sinon value
```

---

## Fonctions mathematiques

Le Compute Engine supporte :

### Arithmetique

```
+, -, *, /, ^        Operations de base
sqrt(x)              Racine carree
abs(x)               Valeur absolue
floor(x), ceil(x)    Arrondi
round(x)             Arrondi au plus proche
mod(a, b)            Modulo
gcd(a, b)            PGCD
lcm(a, b)            PPCM
```

### Trigonometrie

```
sin(x), cos(x), tan(x)
asin(x), acos(x), atan(x)
sinh(x), cosh(x), tanh(x)
```

### Constantes

```
pi                   3.14159...
e                    2.71828...
```

### Algebre

```
expand(expr)         Developper
factor(expr)         Factoriser
simplify(expr)       Simplifier
solve(equation, x)   Resoudre
```

---

## Exemples avances

### Equation quadratique

```typescript
variables: [
  { name: 'a', expression: '{{1..5}}' },
  { name: 'b', expression: '{{1..5}}' },
  { name: 'sum', expression: '{{eval:a+b}}' },
  { name: 'product', expression: '{{eval:a*b}}' }
],
statement: 'Factoriser: $$x^2 + {{sum}}x + {{product}}$$',
solution: '(x+{{a}})(x+{{b}})'
```

### Fraction avec simplification

```typescript
variables: [
  { name: 'factor', expression: '{{2..5}}' },
  { name: 'num', expression: '{{eval:factor*{{1..4}}}}' },
  { name: 'den', expression: '{{eval:factor*{{2..6}}}}' }
],
statement: 'Simplifier: $$\\frac{{{num}}}{{{den}}}$$',
solution: '{{eval:num/den}}'  // Retourne fraction reduite
```

### Geometrie avec arrondis

```typescript
variables: [
  { name: 'r', expression: '{{1..10}}' },
  { name: 'area', expression: '{{eval:pi*r^2;d}}' }
],
statement: 'Aire du disque de rayon {{r}} cm',
solution: '{{area}}'
```

### Liste avec exclusion dynamique

```typescript
variables: [
	{ name: 'operation', expression: '{{addition|soustraction|multiplication}}' },
	{ name: 'secondOp', expression: '{{addition|soustraction|multiplication!{{operation}}}}' }
];
// secondOp sera different de operation
```

---

## Tokenizer

**Fichier** : `parser/tokenizer.ts`

```typescript
interface Token {
	type: 'variable' | 'random' | 'eval' | 'text';
	content: string;
	start: number;
	end: number;
}

function tokenize(input: string): Token[] {
	// Detecte tous les {{...}} et les classe
}
```

### Exemple de tokenisation

```typescript
tokenize('Calculer: {{a}} + {{eval:b*2}}');
// [
//   { type: 'text', content: 'Calculer: ', start: 0, end: 10 },
//   { type: 'variable', content: 'a', start: 10, end: 15 },
//   { type: 'text', content: ' + ', start: 15, end: 18 },
//   { type: 'eval', content: 'b*2', start: 18, end: 31 }
// ]
```

---

## Parsers specialises

### random-parser.ts

```typescript
type RandomSpec =
	| { type: 'integer'; min: NumberOrVariable; max: NumberOrVariable; exclusions: Exclusion[] }
	| { type: 'relative-integer'; min; max; exclusions }
	| { type: 'decimal-by-digits'; digitsBefore: number; digitsAfter: number; exclusions }
	| { type: 'decimal-range'; min; max; step: number; exclusions }
	| { type: 'discrete-list'; items: string[]; exclusions: string[] };

function parseRandomSpec(content: string): RandomSpec;
```

### eval-parser.ts

```typescript
interface ParsedEval {
	expression: string;
	modifiers: EvalModifier[];
}

function parseEvalExpressionWithModifiers(content: string): ParsedEval;
```

---

## Fichiers source

| Fichier                         | Responsabilite              |
| ------------------------------- | --------------------------- |
| `parser/tokenizer.ts`           | Detection `{{...}}`         |
| `parser/random-parser.ts`       | Parse specifications random |
| `parser/eval-parser.ts`         | Parse expressions eval      |
| `parser/variable-parser.ts`     | Parse references variables  |
| `resolver/variable-resolver.ts` | Pipeline 3 etapes           |
| `resolver/random-generator.ts`  | Generation nombres          |
| `resolver/text-resolver.ts`     | Resolution texte            |
| `display-options.ts`            | Options affichage           |
| `expression-transforms.ts`      | Transformations LaTeX       |

---

## Voir aussi

- [generation.md](generation.md) - Pipeline complet
- [templates.md](templates.md) - Structure templates
- [validation.md](validation.md) - Validation reponses
