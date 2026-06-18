---
title: API publique — module mathAST
date: 2026-06-18
version: 1.0
audience: Developpeurs consommateurs du module
---

# API publique : mathAST

Reference des 71 exports publics de `src/lib/mathAST/index.ts` (~29 modules
re-exportes). Le code et les commentaires sont en anglais ; les descriptions
pedagogiques et messages d'erreur destines a l'UI sont en francais.

Voir [`architecture.md`](./architecture.md) pour la vue d'ensemble du module
et [`pattern-matching.md`](./pattern-matching.md) pour le detail du module `pattern/`.

---

## 1. Factories — construction de noeuds

Toutes importees depuis `factory.ts`. Le namespace `MathAST` regroupe l'ensemble ;
les exports individuels permettent le tree-shaking.

### 1.1 Litteraux

```typescript
number(value: string): NumberNode
// value doit etre NON signe (pas de '-' en debut) — throw sinon
number('3')    // OK
number('3.14') // OK
number('-3')   // THROW — utiliser numericNode(-3)

variable(name: string): VariableNode
greek(letter: GreekLetter): GreekLetterNode  // 'alpha' | 'beta' | ... (22 lettres)
symbol(sym: MathSymbol): SymbolNode
hole(index: number, placeholder?: string): HoleNode  // placeholder vide pour exercice
mathConstant(c: MathConstant): MathConstantNode      // 'euler' | 'pi'
euler(): MathConstantNode    // alias mathConstant('euler')
piConstant(): MathConstantNode  // alias mathConstant('pi')
```

> **`numericNode` — factory safe pour les negatifs** (depuis `common/numeric.ts`)
>
> ```typescript
> import { numericNode } from '$lib/mathAST';
>
> numericNode(3); // → number('3')
> numericNode(-5); // → opposite(number('5'))
> numericNode('3.14'); // → number('3.14')
> numericNode('-2.5000000000'); // → opposite(number('2.5000000000'))
> ```
>
> A utiliser quand la valeur peut etre negative (parseur, generateur, eval).

### 1.2 Operations binaires

```typescript
add(left: MathNode, right: MathNode, opts?: BinaryOpOptions): AdditionNode
subtract(left: MathNode, right: MathNode, opts?: BinaryOpOptions): SubtractionNode
multiply(left: MathNode, right: MathNode, opts?: BinaryOpOptions): MultiplicationNode
// displayStyle par defaut : 'implicit'
implicitMultiply(left: MathNode, right: MathNode): MultiplicationNode
divide(n: MathNode, d: MathNode, opts?: BinaryOpOptions): DivisionNode
fraction(n: MathNode, d: MathNode): DivisionNode  // displayStyle: 'fraction'
```

### 1.3 Operations unaires

```typescript
opposite(operand: MathNode, opts?: UnaryOpOptions): OppositeNode
positive(operand: MathNode, opts?: UnaryOpOptions): PositiveNode
```

### 1.4 Fonctions

```typescript
func(name: string, args: MathNode[], opts?: FunctionMetadataOptions): FunctionNode
sin(arg: MathNode): FunctionNode
cos(arg: MathNode): FunctionNode
tan(arg: MathNode): FunctionNode
ln(arg: MathNode): FunctionNode
log(arg: MathNode, base?: MathNode): FunctionNode
exp(arg: MathNode): FunctionNode
sqrt(arg: MathNode): FunctionNode
abs(arg: MathNode): FunctionNode
derivativeFunc(name: string, order: number, args: MathNode[]): FunctionNode
inverseFunc(name: string, args: MathNode[]): FunctionNode
compose(f: MathNode, g: MathNode): CompositionNode
```

### 1.5 Structurels & relations

```typescript
delimiter(content: MathNode, opts?: DelimiterOptions): DelimiterNode
parentheses(content: MathNode): DelimiterNode  // semantic: 'grouping'
subscript(base: MathNode, sub: MathNode): SubscriptNode
superscript(base: MathNode, sup: MathNode): SuperscriptNode
power(base: MathNode, exp: MathNode): SuperscriptNode  // alias superscript

// Relations (quelques exemples parmi ~15 exports)
relation(rel: RelationType, left: MathNode, right: MathNode): RelationNode
equals(left: MathNode, right: MathNode): RelationNode
lessThan(left: MathNode, right: MathNode): RelationNode
lessThanOrEqual(left: MathNode, right: MathNode): RelationNode
// ... greaterThan, notEquals, approx, implies, iff...

// Chaines de relation (a < b < c)
relationChain(relations: RelationType[], operands: MathNode[]): RelationNode
equalsChain(operands: MathNode[]): RelationNode  // a = b = c
lessThanChain(operands: MathNode[]): RelationNode
// ... lessThanOrEqualChain, greaterThanChain, impliesChain, iffChain
```

---

## 2. Parsing & sortie

### 2.1 Parser LaTeX (`parser/`)

```typescript
// Unified API (recommandee)
parseLatex(input: string, opts?: LatexParserOptions): MathNode
parseLatexSafe(input: string, opts?: LatexParserOptions): MathNode | null
validateLatex(input: string, opts?: LatexParserOptions): boolean

// Parsers directs (usage avance)
parsePratt(input: string, opts?: LatexParserOptions): MathNode
parseRD(input: string, opts?: LatexParserOptions): MathNode
```

```typescript
// Example
import { parseLatex, toLatex } from '$lib/mathAST';

const node = parseLatex('x^2 + 3x - 5');
// → SuperscriptNode { base: variable('x'), superscript: number('2') } ...
console.log(toLatex(node)); // 'x^2+3x-5'
```

> ⚠️ **Known issue** : `parseLatex('-3y')` produit
> `multiplication(opposite(number('3')), variable('y'))` au lieu de
> `opposite(multiplication(number('3'), variable('y')))`. Numeriquement
> equivalent, structurellement different. Les analyses (`extractLinearCombination`,
> etc.) doivent gerer `opposite` enfoui.

### 2.2 Parser custom Pratt (`parser/custom/`)

```typescript
parseCustom(input: string, opts?: CustomParserOptions): MathNode
parseCustomSafe(input: string, opts?: CustomParserOptions): MathNode | null
parseCustomPratt(input: string, opts?: CustomParserOptions): MathNode
parseCustomPrattSafe(input: string, opts?: CustomParserOptions): MathNode | null
```

> ⚠️ **Known issue** : `parseCustomPratt('x^2/4')` leve une erreur (workaround :
> `'{x^2}/4'` ou `'(x^2)/4'`).

### 2.3 Generateur LaTeX (`latex-generator.ts`)

```typescript
toLatex(node: MathNode, opts?: LatexGeneratorOptions): string
// Instance avec options persistantes :
const gen = new LatexGenerator(opts);
gen.generate(node): string
```

### 2.4 Generateur custom (`custom-generator.ts`)

```typescript
toCustom(node: MathNode, opts?: CustomGeneratorOptions): string
new CustomGenerator(opts): CustomGenerator
```

### 2.5 Securite des parsers (`parser/security.ts`)

```typescript
// Caps par defaut (modifiables via LatexParserOptions.security)
DEFAULT_SECURITY_OPTIONS = {
	maxInputLength: 10000,
	maxASTDepth: 100,
	maxNodeCount: 10000
};

// Erreur lancee quand un cap est depasse
class SecurityError extends Error {
	readonly code: 'INPUT_TOO_LONG' | 'AST_TOO_DEEP' | 'AST_TOO_MANY_NODES';
}
```

---

## 3. Pattern matching (`pattern/`)

Reference complete dans [`pattern-matching.md`](./pattern-matching.md). Resume :

```typescript
// Builder de patterns
import { P, tryMatch } from '$lib/mathAST';

// Construire un pattern : x + constante
const pat = P.add(P.wildcard('x'), P.num());

// Tester et extraire les bindings
const result = tryMatch(node, pat);
// result = null si pas de correspondance
// result = { bindings: { x: <MathNode> } } si OK

// Verifier sans extraire
import { matches } from '$lib/mathAST';
matches(node, pat): boolean

// Appliquer une regle de transformation
import { createRule, applyRule } from '$lib/mathAST';
const rule = createRule(pattern, replacement);
applyRule(node, rule): MathNode | null

// Jeux de regles inclus
arithmeticRules   // a+0=a, a*1=a, ...
powerRules        // x^0=1, x^1=x, ...
simplifyRules     // jeu complet de simplification
```

---

## 4. Normalisation et simplification

### 4.1 `normalize` — forme normale rationnelle

```typescript
import { normalize } from '$lib/mathAST';

// NormalForm : representation canonique CAS (coefficients rationnels, etc.)
normalize(node: MathNode, ctx?: NormalizeContext): NormalForm

// Helpers
isZeroExpression(node: MathNode): boolean
isOneExpression(node: MathNode): boolean
normalizeWithSteps(node, ctx): { result: NormalForm; steps: ... }
```

`NormalizeContext` accepte `recorder`, `verbosity`, `abortChecker` (timeout
cooperatif via `AbortSignal`). Passer `timeoutMs` sur des entrees non fiables.

### 4.2 `simplify` — reduction par regles

```typescript
import { simplify } from '$lib/mathAST';

simplify(node: MathNode, opts?: SimplifyOptions): SimplifyResult
// SimplifyResult = { result: MathNode; steps: SimplifyStep[]; cost: number }

computeCost(node: MathNode): number
cheapest(a: MathNode, b: MathNode): MathNode  // retourne le moins couteux des deux
```

### 4.3 `areEquivalent`

```typescript
import { areEquivalent } from '$lib/mathAST';

areEquivalent(a: MathNode, b: MathNode): boolean
// Ex : areEquivalent(parseLatex('x+1'), parseLatex('1+x')) → true
```

---

## 5. Evaluation et substitution (`eval/`)

```typescript
import { evaluate, substitute, compile, createSafeEvaluator } from '$lib/mathAST';

// Evaluation numerique
evaluate(node: MathNode, bindings: EvalBindings, opts?: EvalOptions): EvalResult
// EvalBindings = Record<string, number | MathNode>

// Substitution symbolique
substitute(node: MathNode, bindings: Record<string, MathNode>): MathNode

// Compilation en fonction JS (plus rapide pour appels repetes)
compile(node: MathNode, variables: string[]): CompiledFn
// CompiledFn = (...values: number[]) => number

// Evaluateur safe avec validation Zod incluse
createSafeEvaluator(node: MathNode): (bindings: unknown) => EvalResult

// Analyse des variables
getVariables(node: MathNode): string[]
hasVariable(node: MathNode, name: string): boolean
getMissingBindings(node: MathNode, bindings: EvalBindings): string[]
```

```typescript
// Example : evaluer 2x + 3 en x = 5
const expr = parseLatex('2x + 3');
const { value } = evaluate(expr, { x: 5 });
// value = 13

// Compiler pour la generation de courbe
const fn = compile(expr, ['x']);
const points = Array.from({ length: 100 }, (_, i) => ({ x: i, y: fn(i) }));
```

---

## 6. Calcul symbolique

### 6.1 Derivation (`differentiation/`)

```typescript
import { differentiate, differentiateN } from '$lib/mathAST';

differentiate(node: MathNode, variable: string, opts?: DifferentiationOptions): MathNode
differentiateN(node: MathNode, variable: string, n: number): MathNode  // ordre n

// Erreur si la forme n'est pas derivable
class DifferentiationError extends Error {}
```

### 6.2 Integration (`integration/`)

```typescript
import { integrate, integrateDefinite, numericIntegrate } from '$lib/mathAST';

integrate(node: MathNode, variable: string, opts?: IntegrateOptions): IntegrateResult
integrateDefinite(node: MathNode, variable: string, a: MathNode, b: MathNode, opts?): DefiniteIntegrateResult
numericIntegrate(node: MathNode, variable: string, a: number, b: number, opts?): NumericResult

// Integrateurs disponibles
basicIntegrator      // regles de base (polynomes, exp, sin/cos...)
uSubstitutionIntegrator
selectIntegrator(node, variable): Integrator
```

### 6.3 Resolution (`solve/`)

```typescript
import { solve, solveEquation } from '$lib/mathAST';

solve(equation: RelationNode, opts?: SolveOptions): SolveResult
solveEquation(equation: RelationNode, variable?: string): SolveResult
// SolveResult = { solutions: MathNode[]; steps: SolveStep[]; status: SolutionStatus }

// Utilitaires
classifyEquation(eq: RelationNode): ClassificationResult
detectVariable(eq: RelationNode): string | null
getPolynomialDegree(node: MathNode, variable: string): number | null

// Solveurs individuels
linearSolver    // ax + b = 0
quadraticSolver // ax^2 + bx + c = 0
transcendentalSolver

class SolveError extends Error {}
```

### 6.4 Domaine de definition (`domain/`)

```typescript
import { computeDomain, formatDomainFull } from '$lib/mathAST';

computeDomain(node: MathNode, variable: string, opts?: ComputeDomainOptions): DomainResult
formatDomainFull(domain: Domain): string  // ex : "]-∞ ; 0[ ∪ ]0 ; +∞["

// Factories de domaines
emptyDomain(): EmptySet
universalDomain(): UniversalSet
intervalDomain(a: Endpoint, b: Endpoint): IntervalSet
positiveReals(): IntervalSet
nonNegativeReals(): IntervalSet

// Algebre de domaines
domainIntersect(a: Domain, b: Domain): Domain
domainUnion(a: Domain, b: Domain): Domain
domainComplement(d: Domain): Domain
```

### 6.5 Analyse de signe (`sign/`)

```typescript
import { analyzeSign, formatSignTable } from '$lib/mathAST';

analyzeSign(node: MathNode, variable: string, opts?: SignAnalysisOptions): SignAnalysisResult
formatSignTable(result: SignAnalysisResult): string
// SignAnalysisResult = { zeros: ZeroInfo[]; intervals: SignedInterval[]; ... }
```

### 6.6 Variations (`variations/`)

```typescript
import { computeVariations, formatVariationTable } from '$lib/mathAST';

computeVariations(node: MathNode, variable: string, opts?: VariationOptions): VariationResult
formatVariationTable(result: VariationResult): string
findCriticalPoints(node: MathNode, variable: string): CriticalPointInfo[]
findExtrema(result: VariationResult): ExtremumInfo[]
```

---

## 7. Paliers pedagogiques

### 7.1 `generateEquationSteps` — point d'entree unifie

```typescript
import { generateEquationSteps } from '$lib/mathAST';
// (re-exporte depuis pedagogical-solve/index.ts)

generateEquationSteps(
  equation: RelationNode,          // relation '=' entre deux MathNode
  options: EquationStepsOptions
): EquationStep[]

interface EquationStepsOptions {
  readonly level: SchoolLevel;             // 'primaire' | 'college' | 'lycee' | 'superieur'
  readonly includeSubSteps?: boolean;
  readonly variable?: string;              // auto-detecte si absent
}

// Le dispatcher bumpe automatiquement les niveaux insuffisants :
// lineaire : 'primaire' → 'college'
// quadratique : 'primaire' | 'college' → 'lycee'
```

```typescript
// Example : resoudre 2x + 4 = 10 au niveau college
import { parseLatex, generateEquationSteps } from '$lib/mathAST';

const eq = parseLatex('2x + 4 = 10') as RelationNode;
const steps = generateEquationSteps(eq, { level: 'college' });
steps.forEach((s) => console.log(`Etape ${s.index}: ${s.description} → ${s.expression}`));
// Etape 1: Soustraire 4 des deux membres → 2x = 6
// Etape 2: Diviser par 2 les deux membres → x = 3
```

### 7.2 Solveurs specifiques

```typescript
import { generateLinearEquationSteps, generateQuadraticEquationSteps } from '$lib/mathAST';
// (modules pedagogical-solve/linear.ts + quadratic.ts)

generateLinearEquationSteps(eq: RelationNode, opts: LinearEquationStepsOptions): EquationStep[]
generateQuadraticEquationSteps(eq: RelationNode, opts: QuadraticEquationStepsOptions): EquationStep[]
```

### 7.3 `SchoolLevel` et `CalculationStep`

```typescript
type SchoolLevel = 'primaire' | 'college' | 'lycee' | 'superieur';

interface CalculationStep {
	readonly index: number; // 1-indexe
	readonly description: string; // en francais
	readonly expression: string; // LaTeX
	readonly explanation?: string; // detail pedagogique
	readonly ast?: MathNode;
	readonly subSteps?: readonly CalculationStep[];
}
```

---

## 8. Flatten / Unflatten (`flatten.ts`)

Utilitaires bas niveau pour l'analyse structurelle. Utilises par `normal/`,
`solve/`, `analysis/` et le pattern matching.

```typescript
import { flattenSumShallow, flattenProductShallow, unflattenSum, unflattenProduct } from '$lib/mathAST';

// FlatSum = readonly SignedTerm[]  (SignedTerm = { sign: '+' | '-', term: MathNode })
flattenSumShallow(node: MathNode): FlatSum
flattenSumDeep(node: MathNode): DeepFlatSumResult

// FlatProduct = readonly StyledFactor[]
// StyledFactor = { style: MultiplicationDisplayStyle, factor: MathNode }
// Le premier facteur a toujours style: 'implicit'
flattenProductShallow(node: MathNode): FlatProduct
flattenProductDeep(node: MathNode): DeepFlatProductResult

// Reconstruction (idempotente avec flatten)
unflattenSum(terms: FlatSum): MathNode
unflattenProduct(factors: FlatProduct): MathNode

// Chaines de relation
flattenRelationChain(node: RelationNode): FlatRelationChain
unflattenRelationChain(chain: FlatRelationChain): RelationNode
```

> **Rappel invariant** : `flattenSumShallow` s'arrete aux `delimiter` —
> le contenu d'un delimiter n'est jamais aplati dans la somme englobante.

---

## 9. Type guards (`guards.ts`)

```typescript
// Category guards
isLiteralNode(node: MathNode): node is LiteralNode
isBinaryOperationNode(node: MathNode): node is BinaryOperationNode
isUnaryOperationNode(node: MathNode): node is UnaryOperationNode

// Individual guards (quelques exemples)
isNumber(node: MathNode): node is NumberNode
isVariable(node: MathNode): node is VariableNode
isOpposite(node: MathNode): node is OppositeNode
isAddition(node: MathNode): node is AdditionNode
isMultiplication(node: MathNode): node is MultiplicationNode
isRelation(node: MathNode): node is RelationNode
isDelimiter(node: MathNode): node is DelimiterNode
isFraction(node: MathNode): boolean  // division avec displayStyle 'fraction'
isImplicitMultiplication(node: MathNode): boolean
isRelationChain(node: MathNode): boolean
isLeaf(node: MathNode): boolean
```

---

## 10. Cache de parsing (`cache/`)

`ParseCache` est une primitive **opt-in** — elle n'est pas cablee aux parsers par
defaut. A utiliser dans les boucles de generation de questions.

```typescript
import { ParseCache } from '$lib/mathAST';

const cache = new ParseCache({ maxSize: 200 });
// cache.get(key): MathNode | undefined
// cache.set(key, node): void
// cache.getStats(): CacheStats
```

---

## Pour aller plus loin

- **Architecture & invariants** : [`architecture.md`](./architecture.md)
- **Pattern matching (reference complete)** : [`pattern-matching.md`](./pattern-matching.md)
- **Vocabulaire** : [`glossaire.md`](./glossaire.md)
- **Agent metier** : `mathast-expert` — a privilegier pour toute modification dans `src/lib/mathAST/`

---

**Derniere mise a jour** : 2026-06-18 | **Version** : 1.0
