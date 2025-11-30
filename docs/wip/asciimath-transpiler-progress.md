# ASCIIMath Transpiler - Document de Progression

## Statut Global

| Phase | Description               | Statut       |
| ----- | ------------------------- | ------------ |
| 1     | Infrastructure Adaptation | ✅ COMPLETED |
| 2     | Tokenizer + tests         | ✅ COMPLETED |
| 3     | Parser + tests            | ✅ COMPLETED |
| 4     | Generator + tests         | ✅ COMPLETED |
| 5     | Integration + tests       | ✅ COMPLETED |
| 6     | Code Review               | ✅ APPROVED  |

**TRANSPILEUR COMPLET ET PRÊT À L'USAGE**

---

## Phase 1: Foundation - Infrastructure Adaptation

**Statut**: COMPLETED

### Modifications effectuées

#### 1. types.ts - Ajouts pour valeur absolue

- Ajout du token `PIPE` (|) dans `TokenType` pour délimiter les valeurs absolues
- Ajout du token `:` dans les commentaires de `OPERATOR`
- Création de l'interface `AbsNode` pour représenter les valeurs absolues dans l'AST
- Ajout de `AbsNode` à l'union `ASTNode`

#### 2. symbols.ts - Nettoyage et nouveaux mappings

- Changement du mapping de `*` : `\cdot` → `\times`
- Ajout des symboles de comparaison manquants:
  - `~~` → `\approx`
  - `-=` → `\equiv`
  - `~` → `\sim`
  - Conservation de `prop` → `\propto`
- Suppression des symboles ensemblistes inutilisés (notin, subset, supset, cap, cup, in)
- Suppression des symboles logiques inutilisés (therefore, because, forall, exists, and, or, not)
- Conservation de : oo, +-, -+, times, cdot, div, flèches, <<, >>, <=, >=, !=

#### 3. tokenizer.ts - Support pour | et :

- Ajout du case `|` dans le switch → token `PIPE`
- Ajout du case `:` dans le switch → token `OPERATOR`

### Tests mis à jour

- `__tests__/tokenizer.test.ts` (82 tests, tous passants)
  - Ajout de tests pour le token `PIPE` (2 tests)
  - Ajout de tests pour l'opérateur `:` (2 tests)
  - Vérification que `*` est toujours tokenizé comme `SYMBOL` (2 tests)
  - Mise à jour des tests pour les nouveaux symboles de comparaison (3 tests)
  - Suppression des tests pour symboles retirés

### Décisions techniques

- `*` mappé sur `\times` au lieu de `\cdot` (alignement avec conventions mathématiques standard)
- Symboles ordonnés par longueur décroissante pour éviter conflits (`~~` avant `~`, `-=` avant `-`)
- Token `PIPE` distinct de `OPERATOR` pour faciliter le parsing des valeurs absolues
- Opérateur `:` nécessaire pour futurs usages (ex: intervalles, ensembles, etc.)

---

## Phase 2: Tokenizer

**Statut**: COMPLETED

### Fichiers créés/modifiés

- `src/lib/transpilers/asciimath-to-latex/tokenizer.ts` (332 lignes)
  - Classe Tokenizer avec toutes les méthodes
  - Support pour PIPE et : operator

- `src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts` (524 lignes)
  - 82 tests, tous passants
  - Couverture complète des cas d'usage

### Prochaines étapes

1. ~~Parser implementation (phase 3)~~ COMPLETED
2. Emitter implementation (phase 4)

---

## Phase 3: Parser

**Statut**: COMPLETED

### Fichiers créés/modifiés

- `src/lib/transpilers/asciimath-to-latex/parser.ts` (495 lignes)
  - Classe Parser avec parsing récursif descendant
  - Support complet de la grammaire ASCIIMath
  - Gestion de la précédence des opérateurs
  - Support des scripts combinés (x_i^2)
  - Restriction du moins unaire après opérateurs binaires

- `src/lib/transpilers/asciimath-to-latex/__tests__/parser.test.ts` (1,298 lignes)
  - 126 tests, tous passants
  - Couverture complète des cas d'usage
  - Tests de la précédence et associativité
  - Tests d'erreur

### Fonctionnalités clés

1. **Grammaire EBNF complète implémentée**
   - expression → relation → additive → multiplicative → fraction → power → unary → atom
   - Précédence correcte des opérateurs
   - Associativité gauche pour fractions: a/b/c = (a/b)/c
   - Associativité droite pour puissances: x^2^3 = x^(2^3)

2. **Règles spéciales**
   - Moins unaire autorisé uniquement au début ou après (, [, {, |
   - Scripts combinés: x_i^2 et x^2_i → SubSupNode
   - Gestion des fonctions: sqrt, sin, cos, tan, log, ln, exp, abs, root

3. **Gestion d'erreurs**
   - ParseError avec position et token
   - Messages d'erreur clairs
   - Validation des délimiteurs

### Tests

```
✓ 126 tests passants (100%)
  - 16 tests atoms (nombres, identifiants, grecs, symboles, templates)
  - 13 tests groups (parenthèses, crochets, accolades, nested)
  - 5 tests absolute value
  - 13 tests functions
  - 11 tests binary operators
  - 7 tests fractions
  - 15 tests power/subscript
  - 11 tests relations
  - 12 tests unary minus
  - 8 tests complex expressions
  - 7 tests error handling
  - 8 tests edge cases
```

### Intégration vérifiée

Exemples testés avec succès:

- `x^2+y^2` → BinaryOp
- `(-b+sqrt(b^2-4*a*c))/(2*a)` → Fraction
- `sin(theta)^2+cos(theta)^2=1` → BinaryOp
- `x_i^2` → SubSup
- `|x+y|` → Abs
- `{{a}}*x+{{b}}` → BinaryOp avec templates

### Prochaines étapes

1. ~~Emitter implementation (phase 4)~~ COMPLETED (renamed to Generator)
2. Integration tests (phase 5)

---

## Phase 4: LaTeX Generator

**Statut**: COMPLETED

### Fichiers créés/modifiés

- `src/lib/transpilers/asciimath-to-latex/generator.ts` (258 lignes)
  - Classe LatexGenerator pour convertir AST → LaTeX
  - Mapping complet de tous les types de noeuds AST
  - Préservation des templates {{...}}
  - Support de tous les opérateurs, fonctions et symboles

- `src/lib/transpilers/asciimath-to-latex/__tests__/generator.test.ts` (671 lignes)
  - 56 tests, tous passants
  - Couverture complète des transformations
  - Tests de cas complexes (formule quadratique, identités trigo)

### Fonctionnalités implémentées

1. **Mapping des noeuds AST**
   - Literals: nombres, identifiants, grecques, symboles
   - Templates: préservation exacte de {{...}}
   - Groups: {}, (), [], ||
   - Opérations binaires: +, -, \times, \div, relations
   - Opérations unaires: -x, +x
   - Fractions: \frac{numerator}{denominator}
   - Scripts: ^{}, \_{}, combined
   - Fonctions: sqrt, sin, cos, tan, log, ln, exp, abs
   - Racines: \sqrt[n]{radicand}

2. **Mapping des opérateurs**
   - `*` → `\times` (avec espaces)
   - `:` → `\div` (avec espaces)
   - `<=`, `>=`, `!=` → `\leq`, `\geq`, `\neq`
   - `~~`, `-=`, `~` → `\approx`, `\equiv`, `\sim`
   - Flèches: `->`, `=>`, `<->`, `<=>`

3. **Gestion spéciale**
   - Templates comptés dans `templatesPreserved`
   - Parenthèses LaTeX: `\left(...\right)`
   - Fonctions trigonométriques: `\sin\left(x\right)`
   - Valeur absolue: `\left|...\right|`
   - Espaces autour de `\times` et `\div`

### Tests

```
✓ 56 tests passants (100%)
  - 9 tests literals (nombres, identifiants, grecs, symboles)
  - 3 tests templates (préservation, comptage)
  - 5 tests groups (curly braces, parenthèses, brackets, abs)
  - 11 tests binary operations (+, -, *, :, =, <, >, <=, >=, !=, ~~, -=)
  - 2 tests unary operations (-, +)
  - 4 tests fractions (simple, numeric, nested, complex)
  - 4 tests scripts (^, _, combined, nested)
  - 8 tests functions (sqrt, sin, cos, tan, log, ln, exp, abs, unknown)
  - 2 tests root (nth root, with expression)
  - 4 tests complex expressions (quadratic, trig identity, templates, greek)
  - 4 tests edge cases (deeply nested, mixed groups, operators, reset count)
```

### Exemples validés

| Input AST       | Output LaTeX           |
| --------------- | ---------------------- |
| `x^2`           | `x^{2}`                |
| `a/b`           | `\frac{a}{b}`          |
| `sin(x)`        | `\sin\left(x\right)`   |
| `sqrt(x)`       | `\sqrt{x}`             |
| `root(3)(x)`    | `\sqrt[3]{x}`          |
| `{{a}}*x+{{b}}` | `{{a}} \times x+{{b}}` |
| `\|x\|`         | `\left\|x\right\|`     |
| `alpha+beta`    | `\alpha+\beta`         |
| `x<=5`          | `x\leq5`               |
| `a*b:c`         | `a \times b \div c`    |

### Prochaines étapes

1. ~~Intégration complète (phase 5): créer transpile() et tests end-to-end~~ COMPLETED
2. Migration de l'API existante (phase 6)

---

## Phase 5: Integration & Public API

**Statut**: COMPLETED

### Fichiers créés/modifiés

- `src/lib/transpilers/asciimath-to-latex/index.ts` (94 lignes)
  - Fonction principale `transpile(input: string): TranspileResult`
  - Re-exports de tous les composants (Tokenizer, Parser, LatexGenerator)
  - Re-exports de tous les types (Token, ASTNode, TranspileResult, etc.)
  - Re-exports des utilitaires de symboles (GREEK_LETTERS, SYMBOLS, FUNCTIONS, helpers)
  - Gestion complète des erreurs avec ParseError

- `src/lib/transpilers/asciimath-to-latex/__tests__/index.test.ts` (412 lignes)
  - 62 tests end-to-end, tous passants
  - Tests de la chaîne complète: string → Tokenizer → Parser → Generator → string
  - Couverture de tous les cas d'usage réels

### Fonctionnalités de l'API publique

```typescript
import { transpile } from '$lib/transpilers/asciimath-to-latex';

const result = transpile('x^2+y^2');
// {
//   success: true,
//   latex: 'x^{2}+y^{2}',
//   templatesPreserved: 0
// }

const error = transpile('(x+1');
// {
//   success: false,
//   latex: '',
//   error: 'Expected )',
//   templatesPreserved: 0
// }
```

### Tests d'intégration

```
✓ 62 tests passants (100%)
  - 4 tests simple expressions
  - 7 tests operators (*, :, /, +, -, =, comparisons)
  - 5 tests delimiters ((), [], {}, ||, nested)
  - 5 tests functions (sqrt, root, sin, cos, tan, log, ln, exp, abs)
  - 5 tests scripts (^, _, combined, nested, complex)
  - 4 tests fractions (simple, nested, left-associative, with operations)
  - 4 tests templates (preservation, counting, in expressions)
  - 6 tests complex expressions (quadratic, trig, sum, polynomial)
  - 4 tests unary minus (start, parentheses, error, in fraction)
  - 3 tests whitespace handling
  - 6 tests error handling (empty, unclosed delimiters, mismatched)
  - 5 tests re-exports (Tokenizer, Parser, ParseError, Generator, symbols)
  - 4 tests real-world UbuMaths examples
```

### Exemples validés

| Input ASCIIMath | Output LaTeX                                | Notes                      |
| --------------- | ------------------------------------------- | -------------------------- |
| `x^2+y^2`       | `x^{2}+y^{2}`                               | Puissances simples         |
| `a*b:c`         | `a \times b \div c`                         | Opérateurs custom          |
| `sqrt(x^2-4)`   | `\sqrt{x^{2}-4}`                            | Fonction sqrt              |
| `root(3)(8)`    | `\sqrt[3]{8}`                               | Racine n-ième              |
| `sin(theta)^2`  | `\sin\left(\theta\right)^{2}`               | Fonctions trigo            |
| `(a+b)/(c+d)`   | `\frac{\left(a+b\right)}{\left(c+d\right)}` | Fractions avec parenthèses |
| `x_i^2`         | `x_{i}^{2}`                                 | Scripts combinés           |
| `{{a}}*x+{{b}}` | `{{a}} \times x+{{b}}`                      | Templates préservés        |
| `\|x+y\|`       | `\left\|x+y\right\|`                        | Valeur absolue             |
| `alpha<=beta`   | `\alpha\leq\beta`                           | Grec + comparaison         |

### Comportements notés

1. **Parenthèses préservées**: `(x+1)` → `\left(x+1\right)` (correct pour clarté)
2. **Groupes doubles**: `x^{n+1}` → `x^{{n+1}}` (groupe ASCIIMath préservé)
3. **Identifiants vs fonctions**: `f(x)` n'est PAS reconnu comme fonction call (utiliser multiplication explicite)
4. **Virgules non supportées**: `,` n'est pas un opérateur reconnu

### Exports disponibles

```typescript
// Main function
export { transpile };

// Components
export { Tokenizer, Parser, ParseError, LatexGenerator };

// Types
export type {
	Token,
	TokenType,
	ASTNode,
	TranspileResult,
	TranspileOptions,
	NumberNode,
	IdentifierNode,
	GreekNode,
	SymbolNode,
	TemplateNode,
	AbsNode,
	GroupNode,
	ParenNode,
	BinaryOpNode,
	UnaryOpNode,
	FractionNode,
	SuperscriptNode,
	SubscriptNode,
	SubSupNode,
	FunctionNode,
	RootNode,
	GenerateResult
};

// Symbols
export {
	GREEK_LETTERS,
	SYMBOLS,
	FUNCTIONS,
	isGreekLetter,
	isFunction,
	isSymbol,
	getGreekLatex,
	getSymbolLatex,
	getSymbolKeys
};
```

---

## Phase 6: Code Review

**Statut**: APPROVED

### Verdict

Le code a été reviewé et approuvé. Tous les critères sont satisfaits :

- ✅ Conformité à la spec (opérateurs, délimiteurs, règles spéciales)
- ✅ Qualité du code (pas de `any`, TypeScript strict)
- ✅ Tests exhaustifs (326 tests, 100% pass rate)
- ✅ Gestion d'erreurs robuste (ParseError avec position)
- ✅ Documentation complète

### Issues mineures identifiés (non-bloquants)

1. Pas de tests unitaires dédiés pour `symbols.ts` (testé indirectement)
2. Espacement inconsistant autour des opérateurs LaTeX (cosmétique)
3. Templates mal fermés non détectés par le tokenizer (erreur levée au parser)

Ces issues sont mineurs et n'empêchent pas la mise en production.

---

## Fichiers modifiés dans cette session

### Phase 1 & 2

1. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/types.ts`
2. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/symbols.ts`
3. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/tokenizer.ts`
4. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts`

### Phase 3 (Parser)

5. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/parser.ts` (CREATED)
6. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/__tests__/parser.test.ts` (CREATED)

### Phase 4 (Generator)

7. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/generator.ts` (CREATED)
8. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/__tests__/generator.test.ts` (CREATED)

### Phase 5 (Integration)

9. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/index.ts` (UPDATED)
10. `/Users/david/Coding/js/ubumaths/src/lib/transpilers/asciimath-to-latex/__tests__/index.test.ts` (CREATED)

## Tests

- Tokenizer: 82/82 tests passants (100%)
- Parser: 126/126 tests passants (100%)
- Generator: 56/56 tests passants (100%)
- Integration: 62/62 tests passants (100%)
- **TOTAL: 326/326 tests passants (100%)**
- Type checking: OK pour tous les fichiers modifiés

## Reprise après crash

En cas de crash, vérifier:

1. Ce document pour connaître la phase en cours (**Phase 5 COMPLETED**)
2. Les fichiers listés ci-dessus pour les modifications effectuées
3. Lancer les tests:
   ```bash
   pnpm test:unit src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts -- --run
   pnpm test:unit src/lib/transpilers/asciimath-to-latex/__tests__/parser.test.ts -- --run
   pnpm test:unit src/lib/transpilers/asciimath-to-latex/__tests__/generator.test.ts -- --run
   pnpm test:unit src/lib/transpilers/asciimath-to-latex/__tests__/index.test.ts -- --run
   ```
4. Tester l'API publique:
   ```typescript
   import { transpile } from '$lib/transpilers/asciimath-to-latex';
   const result = transpile('x^2+y^2');
   console.log(result.latex); // x^{2}+y^{2}
   ```
5. Documents de détail:
   - `docs/wip/tokenizer-implementation.md` (Phase 2)
   - `docs/wip/asciimath-parser-progress.md` (Phase 3)
