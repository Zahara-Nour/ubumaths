# Analyse du Pipeline de Normalisation mathAST

> Analyse effectuee le 2026-01-09. Code source: `src/lib/mathAST/normal/`

## Vue d'Ensemble

Le pipeline transforme un `MathNode` (AST) en une forme canonique `NormalForm`, permettant la comparaison d'equivalence algebrique.

```
MathNode (AST)
    |
[1] Pre-simplification (simplify)
    |
[2] Normalisation recursive (normalizeNode)
    |
NormalForm (canonique)
```

## Architecture des Types (Hierarchie)

### Niveau 1 : Rational (BigInt exact)

```typescript
interface Rational {
	readonly n: bigint; // Numerateur (signe ici)
	readonly d: bigint; // Denominateur (toujours > 0)
}
```

**Invariants** : Toujours reduit, d > 0, zero = `{n: 0n, d: 1n}`

### Niveau 2 : SimplifiedRadical

```typescript
interface SimplifiedRadical {
	readonly radicand: bigint; // > 1 (sinon trivial)
	readonly index: bigint; // >= 2
}
```

**Invariant** : Aucun facteur index-ieme extractible (ex: sqrt(18) -> 3\*sqrt(2))

### Niveau 3 : AlgebraicTerm

```typescript
interface AlgebraicTerm {
	readonly rational: Rational;
	readonly radicals: readonly SimplifiedRadical[];
	readonly hasImaginaryUnit?: boolean; // Support complexes
}
```

**Exemple** : `3*sqrt(2)*i` = `{rational: {n:3n,d:1n}, radicals: [sqrt(2)], hasImaginaryUnit: true}`

### Niveau 4 : AlgebraicCoefficient

```typescript
interface AlgebraicCoefficient {
	readonly terms: readonly AlgebraicTerm[]; // Somme de termes
}
```

**Exemple** : `sqrt(2) + sqrt(3)` = coefficient avec 2 AlgebraicTerms

### Niveau 5 : SymbolicFactor

```typescript
interface SymbolicFactor {
	readonly base: MathNode; // Variable, fonction, etc.
	readonly exponent: Rational; // Exposant rationnel
}
```

**Exemple** : `x^(3/2)` = `{base: Variable('x'), exponent: {n:3n, d:2n}}`

### Niveau 6 : NormalTerm

```typescript
interface NormalTerm {
	readonly coefficient: AlgebraicCoefficient;
	readonly monomial: readonly SymbolicFactor[]; // Produit de facteurs
}
```

**Exemple** : `(sqrt(2) + sqrt(3))*x^2*y` = coefficient multi-radical \* monome

### Niveau 7 : NormalForm

```typescript
interface NormalForm {
	readonly numerator: readonly NormalTerm[]; // Polynome
	readonly denominator: readonly NormalTerm[]; // Polynome
	readonly hash: string; // Hash canonique pour comparaison
}
```

## Pipeline Detaille

### Phase 1 : Pre-simplification (`rules/index.ts:simplify`)

Applique iterativement 4 ensembles de regles jusqu'a point fixe :

| Ordre | Module                   | Regles                                            |
| ----- | ------------------------ | ------------------------------------------------- |
| 1     | `simplifyArithmetic`     | 0+x=x, 1\*x=x, x^0=1, x/1=x, etc.                 |
| 2     | `simplifyPowers`         | x^a*x^b=x^(a+b), (x^a)^b=x^(ab), (xy)^n=x^n*y^n   |
| 3     | `simplifyRadicals`       | sqrt(a)\*sqrt(b)=sqrt(ab), sqrt(n^2)=n            |
| 4     | `simplifyTranscendental` | sin(0)=0, ln(1)=0, exp(0)=1, valeurs remarquables |

**Algorithme** :

- Compare hash avant/apres chaque passe
- Arrete quand hash stable (point fixe) ou max 100 iterations

### Phase 2 : Normalisation recursive (`normalize.ts:normalizeNode`)

| Type MathNode     | Traitement                               |
| ----------------- | ---------------------------------------- |
| `number`          | Parse -> Rational -> NormalTerm constant |
| `variable`        | SymbolicFactor avec exposant 1           |
| `greek`           | SymbolicFactor opaque (pi, e, etc.)      |
| `addition`        | `addNormalForms(left, right)`            |
| `subtraction`     | `subNormalForms(left, right)`            |
| `multiplication`  | `mulNormalForms(left, right)`            |
| `division`        | `divNormalForms(num, den)`               |
| `superscript`     | Cas int/rational/symbolique              |
| `function(sqrt)`  | Simplification radicale speciale         |
| `function(autre)` | Noeud opaque                             |
| `delimiter`       | Recursion sur content                    |
| autres            | Noeuds opaques (SymbolicFactor)          |

### Phase 3 : Arithmetique sur NormalForm

**Addition** :

```
(a/b) + (c/d) = (ad + bc) / bd
```

**Soustraction** : Via `addNormalForms(a, negNormalForm(b))`

**Multiplication** :

```
(a/b) * (c/d) = ac / bd
```

**Division** :

```
(a/b) / (c/d) = ad / bc
```

**Puissance** :

- n=0 -> ONE_NORMAL_FORM
- n=1 -> identite
- sinon : `powPolynomial` avec exponentiation rapide (square-and-multiply)

### Phase 4 : Reduction des fractions

1. **GCD monomes** : Extrait le facteur monome commun
2. **Simplification rationnelle** : Si num/den simples, divise coefficients
3. **Calcul hash canonique**

## Systeme de Tri Canonique (`compare.ts`)

### Ordre des Radicals

```
Tri par (index ASC, radicand ASC)
sqrt(2) < sqrt(3) < sqrt(5) < cbrt(2) < cbrt(3)
```

### Ordre des AlgebraicTerms

1. Reels avant imaginaires
2. Moins de radicaux d'abord (purs rationnels en premier)
3. Lexicographique sur radicaux
4. Par coefficient rationnel

### Ordre des SymbolicFactors

1. Par type : greek < variable < function < autres
2. Alphabetique sur nom
3. Par exposant

### Ordre des NormalTerms (gradue lexicographique)

1. Par degre total du monome (DESC - plus haut d'abord)
2. Lexicographique sur facteurs
3. Par coefficient

## Support des Nombres Complexes

Le champ `hasImaginaryUnit?: boolean` dans `AlgebraicTerm` permet :

- Representation de `3i`, `sqrt(2)*i`, etc.
- Multiplication : `i * i = -1` (ligne 286-293 de `algebraic.ts`)
- Signature separee pour empecher la combinaison `3 + 3i` en un seul terme

## Fonctionnalites Pedagogiques (`step-recorder.ts`)

```typescript
const { result, steps } = simplifyWithSteps(ast);
// steps contient NormalizationStep[] avec rule, description (FR), before, after
```

Descriptions en francais pour affichage educatif.

## Ecarts Documentation vs Code

### Non documente

1. **Support complexe** (`hasImaginaryUnit`) - Present dans le code
2. **Regles transcendantales** - Simplification trig, log, exp
3. **`simplifyOnce` et `simplifyOnceWithSteps`** - Exportes mais non documentes
4. **Composition de fonctions** (`type: 'composition'`)

### Limitations non documentees

1. **Exposants rationnels generaux** : Seuls entiers positifs pour puissances de polynomes
2. **GCD polynomial complet** : Seul le GCD monome est implemente

## Exemple de Flux

```
Input: parseLatex("(x+1)^2 - x^2")
    |
MathNode (AST)
    |
simplify() [pre-simplification]
    |
normalizeNode() [recursif]
    | subtraction
    -> normalizeNode((x+1)^2)
        -> powNormalForm(normalize(x+1), 2)
        -> mulPolynomials([x,1], [x,1]) = [x^2+2x+1]
    -> normalizeNode(x^2)
        -> [x^2]
    -> subNormalForms([x^2+2x+1], [x^2])
    -> collectLikeTerms -> [2x+1]
    |
NormalForm {
    numerator: [NormalTerm(2,x), NormalTerm(1,[])],
    denominator: [ONE_TERM],
    hash: "2*V(x)+1"
}
```

## Performance

- **Normalisation** : O(n log n) pour n termes (tri)
- **Comparaison** : O(n) sur formes normalisees
- **Exponentiation** : O(log n) via square-and-multiply
- **Arithmetique BigInt** : Exacte, pas de problemes flottants

## Fichiers Sources

| Fichier                   | Responsabilite                     |
| ------------------------- | ---------------------------------- |
| `types.ts`                | Definitions de types               |
| `normalize.ts`            | Algorithme principal               |
| `denormalize.ts`          | NormalForm -> MathNode             |
| `polynomial.ts`           | Operations sur polynomes           |
| `monomial.ts`             | Operations sur monomes             |
| `term.ts`                 | Operations sur NormalTerm          |
| `algebraic.ts`            | Coefficients algebriques           |
| `radical.ts`              | Simplification radicaux            |
| `rational.ts`             | Arithmetique BigInt                |
| `hash.ts`                 | Hashing canonique                  |
| `compare.ts`              | Comparaison et tri                 |
| `step-recorder.ts`        | Enregistrement etapes pedagogiques |
| `rules/arithmetic.ts`     | Regles arithmetiques               |
| `rules/powers.ts`         | Regles puissances                  |
| `rules/radicals.ts`       | Regles radicaux                    |
| `rules/transcendental.ts` | Regles transcendantes              |
