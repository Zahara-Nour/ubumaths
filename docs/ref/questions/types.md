# Types de Questions

> Les 7 types de questions supportes par le systeme.

---

## Vue d'ensemble

Le systeme supporte 7 types de questions, definis dans `src/lib/questions/types.ts:67-74` :

```typescript
type QuestionType =
	| 'numerical_exact'
	| 'numerical_decimal'
	| 'numerical_rounded'
	| 'numerical_with_unit'
	| 'algebraic_transform'
	| 'multiple_choice'
	| 'fill_in_blanks';
```

---

## 1. Questions numeriques

### 1.1 `numerical_exact`

Valeur numerique exacte requise.

**Cas d'usage** : Operations simples, calculs entiers

```typescript
{
  type: 'numerical_exact',
  variations: [{
    statement: 'Calculer : $${{a}} \\times {{b}}$$',
    variables: [
      { name: 'a', expression: '{{2..9}}' },
      { name: 'b', expression: '{{2..9}}' }
    ],
    solution: '{{eval:a*b}}'
  }]
}
```

**Validation** : Comparaison mathematique exacte (via Compute Engine)

---

### 1.2 `numerical_decimal`

Approximation decimale avec precision specifiee.

**Cas d'usage** : Resultats irrationnels, approximations

```typescript
{
  type: 'numerical_decimal',
  precision: { type: 'decimal', digits: 2 },
  variations: [{
    statement: 'Calculer $$\\sqrt{{{n}}}$$ a 2 decimales pres',
    variables: [
      { name: 'n', expression: '{{2..20}}' }
    ],
    solution: '{{eval:sqrt(n);d}}'
  }]
}
```

**Configuration precision** :

```typescript
type PrecisionType =
	| { type: 'none' } // Exacte
	| { type: 'decimal'; digits: number } // N decimales
	| { type: 'significant'; digits: number } // N chiffres significatifs
	| { type: 'magnitude'; digits: number } // Ordre de grandeur
	| { type: 'tolerance'; tolerance: number; mode: 'absolute' | 'relative' };
```

---

### 1.3 `numerical_rounded`

Valeur arrondie selon precision.

**Cas d'usage** : Arrondis explicites, estimations

```typescript
{
  type: 'numerical_rounded',
  precision: { type: 'decimal', digits: 1 },
  variations: [{
    statement: 'Arrondir $${{n}}$$ au dixieme',
    variables: [
      { name: 'n', expression: '{{1.00..9.99:0.01}}' }
    ],
    solution: '{{eval:round(n*10)/10}}'
  }]
}
```

---

### 1.4 `numerical_with_unit`

Valeur numerique avec unite physique.

**Cas d'usage** : Physique, conversions unites

```typescript
{
  type: 'numerical_with_unit',
  options: {
    unitOptions: {
      requireExactUnit: true,
      tolerance: { relative: 0.01 }
    }
  },
  variations: [{
    statement: 'Convertir $${{km}}$$ km en metres',
    variables: [
      { name: 'km', expression: '{{1..10}}' }
    ],
    solution: '{{eval:km*1000}} m'
  }]
}
```

**Options unites** :

```typescript
unitOptions?: {
  requireExactUnit?: boolean;   // Unite exacte requise
  tolerance?: {
    absolute?: number;          // Tolerance absolue
    relative?: number;          // Tolerance relative (%)
  }
}
```

---

## 2. Questions algebriques

### 2.1 `algebraic_transform`

Transformation algebrique d'expression.

**Transformations disponibles** :

```typescript
type AlgebraicTransformType = 'factor' | 'expand' | 'simplify' | 'solve';
```

| Transform  | Description | Exemple                    |
| ---------- | ----------- | -------------------------- |
| `factor`   | Factoriser  | `x^2 - 4` → `(x-2)(x+2)`   |
| `expand`   | Developper  | `(x+1)^2` → `x^2 + 2x + 1` |
| `simplify` | Simplifier  | `2x + 3x` → `5x`           |
| `solve`    | Resoudre    | `2x + 4 = 0` → `x = -2`    |

**Exemple factorisation** :

```typescript
{
  type: 'algebraic_transform',
  transformType: 'factor',
  variations: [{
    statement: 'Factoriser : $$x^2 + {{sum}}x + {{product}}$$',
    variables: [
      { name: 'a', expression: '{{1..5}}' },
      { name: 'b', expression: '{{1..5}}' },
      { name: 'sum', expression: '{{eval:a+b}}' },
      { name: 'product', expression: '{{eval:a*b}}' }
    ],
    solution: '(x+{{a}})(x+{{b}})'
  }]
}
```

**Validation** : Equivalence algebrique via Compute Engine

---

## 3. Questions a choix multiples

### 3.1 `multiple_choice`

Selection parmi des choix proposes.

**Structure** :

```typescript
{
  type: 'multiple_choice',
  multipleAnswers: false,  // ou true pour multi-select
  variations: [{
    statement: 'Quel est le resultat de $${{a}} + {{b}}$$ ?',
    variables: [
      { name: 'a', expression: '{{1..10}}' },
      { name: 'b', expression: '{{1..10}}' },
      { name: 'correct', expression: '{{eval:a+b}}' },
      { name: 'wrong1', expression: '{{eval:a+b+1}}' },
      { name: 'wrong2', expression: '{{eval:a+b-1}}' },
      { name: 'wrong3', expression: '{{eval:a*b}}' }
    ],
    solution: '{{correct}}',
    choices: [
      { content: '$${{correct}}$$', isCorrect: true },
      { content: '$${{wrong1}}$$', isCorrect: false },
      { content: '$${{wrong2}}$$', isCorrect: false },
      { content: '$${{wrong3}}$$', isCorrect: false }
    ]
  }]
}
```

**Caracteristiques** :

- Les choix sont melanges automatiquement (Fisher-Yates)
- L'index original est preserve pour validation
- Support multi-selection (`multipleAnswers: true`)
- Contenu supporte LaTeX et variables

---

## 4. Questions a trous

### 4.1 `fill_in_blanks`

Enonce avec zones de saisie inline.

**Syntaxe** : Utiliser `____` pour marquer les blancs

```typescript
{
  type: 'fill_in_blanks',
  variations: [{
    statement: 'Completer : $${{a}} + ____ = {{sum}}$$',
    variables: [
      { name: 'a', expression: '{{1..10}}' },
      { name: 'b', expression: '{{1..10}}' },
      { name: 'sum', expression: '{{eval:a+b}}' }
    ],
    blanks: [
      { position: 0, expectedAnswer: '{{b}}' }
    ],
    solution: '{{b}}'
  }]
}
```

**Multi-blancs** :

```typescript
{
  statement: '____ + ____ = {{sum}}',
  blanks: [
    { position: 0, expectedAnswer: '{{a}}' },
    { position: 1, expectedAnswer: '{{b}}' }
  ],
  solution: ['{{a}}', '{{b}}']
}
```

**Caracteristiques** :

- Chaque `____` est remplace par un champ MathField
- Position 0-indexed de gauche a droite
- Validation par blank individuel
- Support LaTeX dans expectedAnswer

---

## Tableau recapitulatif

| Type                  | Reponse        | Validation     | Cas d'usage                  |
| --------------------- | -------------- | -------------- | ---------------------------- |
| `numerical_exact`     | Nombre         | Exacte         | Calculs entiers              |
| `numerical_decimal`   | Decimal        | Precision      | Racines, divisions           |
| `numerical_rounded`   | Arrondi        | Precision      | Arrondis                     |
| `numerical_with_unit` | Nombre + unite | Unite + valeur | Physique                     |
| `algebraic_transform` | Expression     | Equivalence    | Factorisation, developpement |
| `multiple_choice`     | Selection      | Index          | QCM                          |
| `fill_in_blanks`      | Texte(s)       | Par position   | Completions                  |

---

## Composants associes

| Type                  | Input Component              |
| --------------------- | ---------------------------- |
| `numerical_*`         | `NumericalInput.svelte`      |
| `algebraic_transform` | `NumericalInput.svelte`      |
| `multiple_choice`     | `MultipleChoiceInput.svelte` |
| `fill_in_blanks`      | `FillBlanksInput.svelte`     |

---

## Voir aussi

- [templates.md](templates.md) - Structure des templates
- [validation.md](validation.md) - Regles de validation
- [components.md](components.md) - Composants UI
