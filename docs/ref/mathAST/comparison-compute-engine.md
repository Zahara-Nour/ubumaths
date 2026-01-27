# Comparaison Detaillee: mathAST vs Compute Engine

Ce document compare les deux systemes de calcul symbolique utilises dans UbuMaths.

## Vue d'Ensemble

| Aspect       | mathAST                      | Compute Engine                           |
| ------------ | ---------------------------- | ---------------------------------------- |
| **Objectif** | Pedagogie, etapes explicites | CAS generaliste haute performance        |
| **Public**   | Eleves francophones          | Developpeurs, applications scientifiques |
| **Priorite** | Clarte > Performance         | Performance > Clarte                     |
| **Langue**   | Francais                     | Anglais                                  |

---

## 1. Philosophie de Conception

### mathAST: Pedagogie-First

- Etapes detaillees pour chaque transformation
- Descriptions en francais
- Classification explicite des problemes
- Transparence totale de l'algorithme

### Compute Engine: Black-Box CAS

- Simplification optimisee
- Pas d'explications intermediaires
- API fluide (`.simplify().evaluate()`)
- Performance maximale

---

## 2. Representation des Donnees

### mathAST: AST Immutable Type

```typescript
// 21 types de noeuds distincts avec readonly
interface AdditionNode {
	readonly type: 'addition';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly metadata?: NodeMetadata;
}

// Nombres stockes comme strings (preserve "3.14" vs "3.140")
interface NumberNode {
	readonly type: 'number';
	readonly value: string; // PAS number!
}
```

**Avantages**:

- Type-safety complet avec TypeScript
- Immutabilite garantie au niveau types
- Preserve le formatage original
- 50+ type guards (`isNumber()`, `isAddition()`, etc.)

### Compute Engine: BoxedExpression

```typescript
// Classe abstraite avec methodes
abstract class BoxedExpression {
	abstract readonly hash: number;
	abstract readonly json: Expression; // MathJSON
	readonly engine: ComputeEngine;

	evaluate(): BoxedExpression;
	simplify(): BoxedExpression;
	N(): BoxedExpression; // Approximation numerique
}
```

**Avantages**:

- API fluide
- Caching integre des formes canoniques
- Support natif des domaines mathematiques

### Tableau Comparatif

| Aspect            | mathAST                      | Compute Engine               |
| ----------------- | ---------------------------- | ---------------------------- |
| **Structure**     | Union discriminee TypeScript | Classes avec heritage        |
| **Mutabilite**    | Immutable (readonly)         | Immutable (par conception)   |
| **Nombres**       | Strings (exact)              | SmallInteger \| NumericValue |
| **Metadonnees**   | `NodeMetadata` optionnel     | Proprietes calculees         |
| **Serialisation** | Custom JSON                  | MathJSON standard            |

---

## 3. Parsing

### mathAST: Double Systeme

```
LaTeX Parser (parser/latex/)
├── Tokenizer avec support couleurs
├── Parser Pratt (efficace pour operateurs)
└── Parser RD (structures complexes)

Custom Parser (parser/custom/)
├── Syntaxe simplifiee: "sin(x) + 2*x"
└── Meme architecture duale
```

**Securite integree**:

- Protection contre ReDoS
- Limites de profondeur
- Validation des caracteres

### Compute Engine: Monolithique

```
LaTeX -> Tokenizer -> Parser RD -> MathJSON -> BoxedExpression
```

**Fonctionnalites**:

- Dictionnaire de symboles LaTeX
- Operateurs matchfix (`|x|`)
- Multiplication implicite automatique

### Comparaison

| Aspect            | mathAST                    | Compute Engine   |
| ----------------- | -------------------------- | ---------------- |
| **Formats**       | LaTeX + Custom             | LaTeX uniquement |
| **Taille code**   | ~2000 lignes               | ~68000 lignes    |
| **Securite**      | Explicite (options)        | Implicite        |
| **Extensibilite** | GenericFunctionConfig      | SymbolTable      |
| **Erreurs**       | Rich context + suggestions | Basic            |

---

## 4. Evaluation

### mathAST: Deux Modes

```typescript
// Mode exact - BigInt rationals
evaluate(node, bindings, { mode: 'exact' });
// sqrt(2) reste sqrt(2), 5/7 reste 5/7

// Mode decimal - JavaScript numbers
evaluate(node, bindings, { mode: 'decimal', precision: { type: 'decimal', digits: 2 } });
// sqrt(2) -> 1.41, 5/7 -> 0.71
```

**Precision configurable**:

- `decimal` - N decimales
- `significant` - N chiffres significatifs
- `tolerance` - Tolerance absolue
- `magnitude` - Puissance de 10

### Compute Engine: Deux Methodes

```typescript
// Exact
expr.evaluate(); // Preserve sqrt(2), fractions

// Numerique
expr.N(); // Convertit en floating-point
```

### Comparaison

| Aspect                  | mathAST                   | Compute Engine         |
| ----------------------- | ------------------------- | ---------------------- |
| **Arithmetique exacte** | BigInt Rationals          | Decimal.js + BigInt    |
| **Controle precision**  | Tres fin (5 modes)        | Basique                |
| **Complexes**           | ComplexNode structurel    | Natif dans BoxedNumber |
| **Unites**              | UnitNode avec conversions | Non integre            |

---

## 5. Normalisation / Canonicalisation

### mathAST: 4 Couches

```
1. Rational           - Fractions BigInt reduites
2. SimplifiedRadical  - sqrt(18) -> 3*sqrt(2)
3. AlgebraicCoefficient - Sommes de radicaux
4. NormalForm         - Polynomes rationnels canoniques
         |
         v
   Hash unique pour equivalence
```

**Phase 1** (Preprocessing): Regles radicaux
**Phase 2** (Normalization): Forme canonique polynomiale

### Compute Engine: Canonicalisation Selective

```typescript
canonicalForm(expr, forms: CanonicalOptions)
// forms: 'Number' | 'Multiply' | 'Add' | 'Power' | 'Divide' | 'Flatten' | 'Order'
```

**Proprietes utilisees**:

- `commutative` - Tri des operandes
- `associative` - Aplatissement
- `idempotent` - f(f(x)) -> f(x)
- `involution` - f(f(x)) -> x

### Comparaison

| Aspect             | mathAST                  | Compute Engine            |
| ------------------ | ------------------------ | ------------------------- |
| **Representation** | NormalForm structure     | BoxedExpression canonique |
| **Unicite**        | Garantie par hash        | Garantie par canonical    |
| **Radicaux**       | Simplification explicite | Integree                  |
| **GCD polynomes**  | Implemente               | Implemente                |
| **Determinisme**   | Total (tri canonique)    | Total                     |

---

## 6. Pattern Matching

### mathAST: Systeme Dedie

```typescript
// Types de patterns separes des MathNodes
P._('x'); // Wildcard simple
P._('x', P.isPositive()); // Avec contrainte
P.__('terms'); // Sequence 1+
P.___('terms'); // Sequence 0+
P.sum(P._('a'), P.__('rest')); // Pattern n-aire

// Contraintes composables
P._('x', P.and(P.isNumber(), P.isPositive()));
P._('x', P.or(P.isInteger(), P.isFreeOf('y')));
P._('x', P.not(P.isNegative()));
```

### Compute Engine: Wildcards dans Expressions

```typescript
// Wildcards comme strings speciaux
'_'; // Universel (pas de capture)
'_x'; // Capture nommee
'__x'; // Sequence 0+
'___x'[ // Sequence 1+
	// Pattern via MathJSON
	('Add', '_a', '_b')
];
```

### Comparaison

| Aspect                | mathAST                  | Compute Engine         |
| --------------------- | ------------------------ | ---------------------- |
| **Separation types**  | Pattern != MathNode      | Pattern = Expression   |
| **Sequence 0+**       | `P.___()`                | `__`                   |
| **Sequence 1+**       | `P.__()`                 | `___`                  |
| **Contraintes**       | Composables (and/or/not) | Inline (`:positive`)   |
| **Custom predicates** | `P.custom(fn)`           | Via condition function |
| **FreeOf**            | `P.isFreeOf('x')`        | Non natif              |
| **Commutativite**     | Auto pour Add/Mul        | Permutations completes |

---

## 7. Derivation

### mathAST

```typescript
differentiate(parseLatex('sin(x^2)'), 'x');
// -> cos(x^2) * 2x

// 31 fonctions supportees
// Chain rule implicite via recursion
// Simplification optionnelle inline
```

**Fonctions supportees**: sin, cos, tan, arcsin, arccos, arctan, sinh, cosh, tanh, asinh, acosh, atanh, exp, ln, log, sqrt, polynomes

### Compute Engine

```typescript
ce.parse('\\sin(x^2)').differentiate('x');

// 40+ fonctions + fonctions speciales
// Bessel, Gamma, Erf, Lambert W...
// Fallback symbolique: D(f, x)
```

### Comparaison

| Fonction            | mathAST | Compute Engine              |
| ------------------- | ------- | --------------------------- |
| Polynomes           | Oui     | Oui                         |
| Trig/InvTrig        | Oui     | Oui                         |
| Hyperboliques       | Oui     | Oui                         |
| Exp/Log             | Oui     | Oui                         |
| Fonctions speciales | Non     | Oui (Bessel, Gamma, Erf...) |
| Etapes pedagogiques | Non     | Non                         |

---

## 8. Integration

### mathAST: 5 Techniques avec Etapes

| Priorite | Technique                | Applicable A                                |
| -------- | ------------------------ | ------------------------------------------- |
| 0        | **Basic Rules**          | Puissances, constantes, trig, exp, ln       |
| 10       | **U-Substitution**       | Chain rule (fonctions composees)            |
| 20       | **Integration by Parts** | Produits (selection LIATE)                  |
| 30       | **Partial Fractions**    | Fonctions rationnelles P(x)/Q(x)            |
| 40       | **Trig Substitution**    | sqrt(a^2-x^2), sqrt(a^2+x^2), sqrt(x^2-a^2) |

**+ Integration numerique** (Simpson adaptatif)
**+ Etapes en francais** avec verbosite configurable

### Compute Engine: 34 Regles de Patterns

```typescript
// Uniquement formes lineaires ax+b
integral((ax+b)^n) -> (ax+b)^(n+1) / (a(n+1))
integral(sin(ax+b)) -> -cos(ax+b) / a
// etc.

// PAS de: u-substitution, parts, fractions partielles
```

### Comparaison

| Technique               | mathAST        | Compute Engine |
| ----------------------- | -------------- | -------------- |
| Regles de base          | Oui            | Oui            |
| U-Substitution          | Oui            | Limite         |
| Integration par parties | Oui            | Non            |
| Fractions partielles    | Oui            | Non            |
| Substitution trig       | Oui            | Non            |
| Numerique               | Oui (Simpson)  | Non            |
| Etapes pedagogiques     | Oui (Francais) | Non            |

**mathAST a une integration beaucoup plus complete.**

---

## 9. Resolution d'Equations

### mathAST: Classification -> Strategie -> Solveur

```typescript
// Classification automatique
classifyEquation('2x + 3 = 7'); // -> 'linear'
classifyEquation('x^2 - 4 = 0'); // -> 'quadratic'

// Solveurs specialises
linearSolver; // ax + b = 0
quadraticSolver; // ax^2 + bx + c = 0 (formule, discriminant)
polynomialSolver; // Cardano pour cubiques
transcendentalSolver; // exp, ln (limite)
```

**Etapes enregistrees** avec descriptions en francais.

### Compute Engine: Simplification Generale

```typescript
// Pas de solve() dedie
// Utilise simplify() et manipulation symbolique
expr.simplify();

// Equivalence
expr1.isEqual(expr2);
```

### Comparaison

| Aspect              | mathAST                | Compute Engine |
| ------------------- | ---------------------- | -------------- |
| Lineaire            | Oui (etapes)           | Via simplify   |
| Quadratique         | Oui (discriminant)     | Via simplify   |
| Cubique             | Oui (Cardano)          | Non specialise |
| Transcendantal      | Limite                 | Via simplify   |
| Etapes pedagogiques | Oui (Francais)         | Non            |
| Complexes           | Detecte mais "no real" | Complet        |

---

## 10. Fonctionnalites Uniques

### Uniquement mathAST

| Fonctionnalite              | Description                                      |
| --------------------------- | ------------------------------------------------ |
| **Tableaux de signes**      | `analyzeSign()` - intervalles avec signes        |
| **Tableaux de variations**  | `computeVariations()` - monotonie, extrema       |
| **Domaine de definition**   | `computeDomain()` - R\\{0}, [0,+inf), etc.       |
| **Limites**                 | `evaluateLimit()` - L'Hopital, squeeze theorem   |
| **Series de Taylor**        | `expand()` - developpements                      |
| **Operations matricielles** | `determinant()`, `inverse()`, `matrixMultiply()` |
| **Unites physiques**        | `UnitNode` avec conversions                      |
| **verifyForm()**            | Validation de forme pour exercices               |
| **CLI REPL**                | Interface interactive complete                   |
| **Descriptions francaises** | Toutes les regles decrites en francais           |

### Uniquement Compute Engine

| Fonctionnalite            | Description                         |
| ------------------------- | ----------------------------------- |
| **Fonctions speciales**   | Bessel, Gamma, Erf, Zeta, Beta...   |
| **Systeme de types math** | integer c rational c real c complex |
| **Evaluation paresseuse** | Collections infinies (Range, Sum)   |
| **Scope/Bindings**        | Gestion des portees de variables    |
| **MathJSON standard**     | Format d'echange standardise        |

---

## 11. Resume Comparatif

```
                    mathAST                 Compute Engine
                    -------                 --------------
Pedagogie           ############  (10/10)   ##            (2/10)
Type Safety         ############  (10/10)   ######        (6/10)
Integration         ############  (10/10)   ####          (4/10)
Derivation          ########      (8/10)    ############  (10/10)
Pattern Matching    ############  (10/10)   ########      (8/10)
Resolution Eq.      ########      (8/10)    ######        (6/10)
Fonc. Speciales     ##            (2/10)    ############  (10/10)
Performance         ######        (6/10)    ############  (10/10)
Documentation       ############  (10/10)   ########      (8/10)
```

---

## 12. Quand Utiliser Quoi

| Cas d'usage                         | Recommandation                       |
| ----------------------------------- | ------------------------------------ |
| Exercices avec etapes detaillees    | **mathAST**                          |
| Validation reponse eleve (forme)    | **mathAST** (`verifyForm`)           |
| Tableaux de signes/variations       | **mathAST** (seul a le faire)        |
| Integrales avec technique expliquee | **mathAST**                          |
| Calcul avec fonctions speciales     | **Compute Engine**                   |
| Verification equivalence algebrique | **Compute Engine** (`areEquivalent`) |
| Evaluation numerique rapide         | **Compute Engine**                   |
| Developpement de nouvelles regles   | **mathAST** (plus simple)            |

---

## 13. Integration dans UbuMaths

UbuMaths utilise les deux systemes de maniere complementaire:

### mathAST (Principal)

- Affichage des etapes de resolution
- Validation de forme (`verifyForm`)
- Tableaux de signes et variations
- Calcul de domaines
- Interface CLI/REPL

### Compute Engine (Fallback)

- `areEquivalent()` pour valider les reponses
- `evaluateExpression()` pour calculs numeriques
- `simplifyExpression()` pour simplification generale

### Wrapper (`src/lib/math/compute-engine/wrapper.ts`)

```typescript
// API simplifiee pour UbuMaths
evaluateExpression(latex: string): number | string
simplifyExpression(latex: string): string
areEquivalent(latex1: string, latex2: string): boolean
isValidLatex(latex: string): boolean
```

---

## Conclusion

**mathAST** et **Compute Engine** sont complementaires:

- **mathAST** = CAS **pedagogique** optimise pour l'enseignement des mathematiques en francais, avec des fonctionnalites uniques (variations, signes, domaines) et des etapes explicites.

- **Compute Engine** = CAS **generaliste** puissant pour le calcul symbolique avance et les fonctions speciales, mais sans dimension pedagogique.

Cette architecture hybride permet a UbuMaths d'offrir:

1. **Guidance etudiante** via les etapes detaillees de mathAST
2. **Robustesse** via la simplification complete de CE
3. **Validation** en comparant les resultats des deux systemes
