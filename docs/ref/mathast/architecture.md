---
title: Architecture du module mathAST
date: 2026-06-18
version: 1.0
audience: Developpeurs nouveaux dans la codebase et mainteneurs experimentes
---

# Reference d'architecture : module mathAST

## Resume executif

Le module `mathAST` (430 fichiers sources / 282 fichiers de tests, 12 614 cas Vitest,
152 430 lignes de source) est le **moteur CAS (Computer Algebra System)** d'UbuMaths.
Il gere :

1. **Representation symbolique** : union discriminee `MathNode` (28 variantes, `types.ts`)
2. **Parsing & sortie** : LaTeX ↔ syntaxe custom ↔ pretty-print
3. **Calcul CAS** : normalisation, simplification, derivation, integration, resolution, domaines, signes, variations
4. **Paliers pedagogiques** : generation d'etapes de correction pas-a-pas pour les eleves
5. **Pattern matching** : moteur de remplacement symbolique structure (module `pattern/`)

Le module a des **frontieres strictes** :

- **A l'interieur** : tout le calcul symbolique, les parsers, les generateurs de LaTeX/custom
- **A l'exterieur** : composants UI, persistance, authentification, logique metier des questions

Il n'a **pas de dependance DB**. C'est une bibliotheque de calcul pure.

---

## Vue d'ensemble : 28 variantes de MathNode

Toutes definies dans `src/lib/mathAST/types.ts:720-748`. Union discriminee
sur `readonly type: string`, avec `BaseNode` en racine commune (`type`, `metadata?`).

| Famille             | Variantes (`type`)                                                                   |
| ------------------- | ------------------------------------------------------------------------------------ |
| Litteraux           | `number`, `variable`, `greek`, `symbol`, `hole`, `constant`                          |
| Operations binaires | `addition`, `subtraction`, `multiplication`, `division`                              |
| Operations unaires  | `opposite`, `positive`                                                               |
| Fonction            | `function`                                                                           |
| Structurels         | `delimiter`, `subscript`, `superscript`                                              |
| Relation            | `relation`                                                                           |
| Divers              | `unit`, `matrix`, `composition`, `complex`                                           |
| Etendus             | `infinity`, `signed-zero`, `limit`, `boolean`, `logical`, `logical-not`, `piecewise` |

```
MathNode (discriminated union, types.ts:720)
├── LiteralNode    : number | variable | greek | symbol | hole | constant
├── BinaryOpNode   : addition | subtraction | multiplication | division
├── UnaryOpNode    : opposite | positive
├── FunctionNode   : function (name, args[], power?, derivativeOrder?)
├── StructuralNode : delimiter | subscript | superscript
└── ...autres     : relation | unit | matrix | complex | piecewise | ...
```

> **Immutabilite** : tous les champs sont `readonly` au niveau type. Aucun
> `Object.freeze` n'est appele au runtime — la garantie est **par convention**,
> pas par le moteur JS. Ne pas muter les noeuds directement.

---

## 33 sous-modules : cartographie par famille

### Representation & coeur (racine + 6 sous-dossiers)

| Fichier / dossier           | Contenu                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `types.ts`                  | 28 variantes `MathNode`, types utilitaires                                                                     |
| `factory.ts` (2 025 LOC)    | Fonctions de construction de tous les noeuds                                                                   |
| `flatten.ts`                | `flattenSumShallow/Deep`, `flattenProductShallow/Deep`, `unflattenSum/Product` — cf. invariants                |
| `guards.ts`                 | ~50 type guards (`isNumber`, `isOpposite`, `isRelationChain`...) + exhaustivite via `const _exhaustive: never` |
| `visitor.ts`                | `visitAST` / `transformAST` — traversee structuree                                                             |
| `exp.ts`                    | Wrapper fluent `Exp`                                                                                           |
| `equivalence.ts`            | `areEquivalent`                                                                                                |
| `transforms.ts` (1 624 LOC) | `mapNode`, `mapNodeTopDown`, `findNodes`, `replaceNode`, `cloneNode`...                                        |
| `common/` (13 fichiers)     | `numeric.ts` (`numericNode`), `step-renderer-base`, helpers partages                                           |
| `numtype/` (13 fichiers)    | Systeme de types numeriques (`INTEGER_TYPE`, `inferType`, descriptions FR)                                     |
| `matrix/` (5 fichiers)      | Operations matricielles (`matrixAdd`, `determinant`, `inverse`...)                                             |
| `dimensional/` (4 fichiers) | Analyse dimensionnelle (unites)                                                                                |
| `units/` (8 fichiers)       | Systeme d'unites (`parseOrThrow`, types `Unit`)                                                                |
| `cache/` (2 fichiers)       | `ParseCache` LRU (exportee, **non cablee** aux parsers par defaut)                                             |

### Parsing & sortie

| Fichier / dossier             | Entrees / sorties                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `parser/` (18 src + 18 tests) | LaTeX → `MathNode` ; deux parsers : Pratt (`parser-pratt.ts`) + RD (`parser-rd.ts`) |
| `parser/custom/`              | Syntaxe custom Pratt → `MathNode`                                                   |
| `parser/security.ts`          | `SecurityError`, caps (maxInputLength 10000, maxASTDepth 100, maxNodeCount 10000)   |
| `latex-generator.ts`          | `LatexGenerator`, `toLatex` — `MathNode` → LaTeX                                    |
| `custom-generator.ts`         | `CustomGenerator`, `toCustom` — `MathNode` → syntaxe custom                         |
| `pretty-print.ts`             | `prettyPrint` — affichage debug                                                     |
| `cosmetic-transforms.ts`      | Transformations cosmetiques (display options, `convertOptions`)                     |

### Calcul CAS

| Dossier                         | Fonction principale                                           | Taille indicative            |
| ------------------------------- | ------------------------------------------------------------- | ---------------------------- |
| `normal/` (19 fichiers)         | `normalize` — forme normale rationnelle                       | `normalize.ts` = 4 210 LOC   |
| `simplify/` (6 fichiers)        | `simplify` — reduction par regles                             | 171 regles                   |
| `differentiation/` (4 fichiers) | `differentiate`, `differentiateN`                             |                              |
| `integration/` (17 fichiers)    | `integrate`, `integrateDefinite`, `numericIntegrate`          |                              |
| `limits/` (14 fichiers)         | (calcul de limites, interne)                                  | `composition.ts` = 1 635 LOC |
| `solve/` (18 fichiers)          | `solve`, `solveEquation` — lineaire/quadratique/transcendant  |                              |
| `eval/` (11 fichiers)           | `evaluate`, `substitute`, `compile`, `createSafeEvaluator`    |                              |
| `analysis/` (18 fichiers)       | Classification, continuite, polynomes, structures algebriques |                              |
| `sign/` (14 fichiers)           | `analyzeSign`, tableaux de signes                             |                              |
| `variations/` (8 fichiers)      | `computeVariations`, extrema, intervalles de monotonie        |                              |
| `taylor/` (3 fichiers)          | Developpements de Taylor                                      |                              |
| `domain/` (25 fichiers)         | `computeDomain`, `formatDomainFull`                           |                              |
| `transform/` (4 fichiers)       | Transformations symboliques supplementaires                   |                              |

### Paliers pedagogiques (generation d'etapes)

Les modules `pedagogical-*` sont la couche la plus directement liee aux eleves.
Ils generent des **sequences d'etapes numerotees** (type `CalculationStep` /
`EquationStep`) avec descriptions en francais, adaptees a un `SchoolLevel`
(`'primaire' | 'college' | 'lycee' | 'superieur'`).

| Dossier                                      | Couvre                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| `pedagogical-arithmetic/` (19 fichiers)      | Calculs arithmetiques pas-a-pas                             |
| `pedagogical-differentiation/` (14 fichiers) | Derivation guidee                                           |
| `pedagogical-domain/` (14 fichiers)          | Calcul de domaine step-by-step                              |
| `pedagogical-evaluate/` (1 fichier)          | Evaluation numerique pedagogique                            |
| `pedagogical-integration/` (15 fichiers)     | Integration guidee                                          |
| `pedagogical-limits/` (17 fichiers)          | Calcul de limites pedagogique                               |
| `pedagogical-simplify/` (18 fichiers)        | Simplification guidee                                       |
| `pedagogical-solve/` (28 fichiers)           | Resolution d'equations (lineaire + quadratique)             |
| `step-generator/` (3 fichiers)               | `CalculationStep`, `StepGenerationResult`, `DEFAULT_CONFIG` |

> ⚠️ Les couches pedagogiques sont **sous-testees** par rapport au CAS :
> `sign/` (14:3), `variations/` (8:2), `pedagogical-simplify/` (18:6),
> `pedagogical-solve/` (28:13). Or ce sont elles qui pilotent les corrections
> affichees aux eleves — risque de regression silencieuse.

### Pattern matching

`pattern/` (18 src + 12 tests) — moteur de remplacement symbolique : `P` (builder),
`tryMatch`, `parsePattern`, regles (`arithmeticRules`, `simplifyRules`...).
**Reference complete** : [`docs/ref/mathast/pattern-matching.md`](./pattern-matching.md).

### CLI

`cli/` (45 src + 26 tests) — outil interactif `pnpm math` (`cli/cli.ts`) +
`CompletionProvider` pour l'autocompletion.

---

## Pipeline : du texte au resultat pedagogique

```
ENTREE (LaTeX ou syntaxe custom)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  PARSING                                                  │
│  parseLatex(input)  /  parseCustom(input)                │
│  Securite : maxInputLength=10000 (pre-parse)              │
│  Securite : checkASTSecurity post-parse (depth/nodes)     │
└──────────────────────────┬────────────────────────────────┘
                           │  MathNode
                           ▼
┌───────────────────────────────────────────────────────────┐
│  NORMALISATION / SIMPLIFICATION                           │
│  normalize(node, ctx?)  →  NormalForm  (forme normale)    │
│  simplify(node)         →  SimplifyResult                 │
│  areEquivalent(a, b)    →  boolean                        │
│  Pattern matching transverse (P / tryMatch) à chaque     │
│  couche qui en a besoin                                   │
└──────────────────────────┬────────────────────────────────┘
                           │  MathNode (simplifie)
                           ▼
┌───────────────────────────────────────────────────────────┐
│  CALCUL CAS (selon besoin)                                │
│  differentiate / integrate / solve / computeDomain /      │
│  analyzeSign / computeVariations ...                      │
└──────────────────────────┬────────────────────────────────┘
                           │  MathNode ou type specifique
                           ▼
┌───────────────────────────────────────────────────────────┐
│  PALIERS PEDAGOGIQUES                                     │
│  generateEquationSteps(eq, { level: 'college' })          │
│  generateLinearEquationSteps / generateQuadraticEquationSteps│
│  → EquationStep[] avec descriptions FR                    │
└──────────────────────────┬────────────────────────────────┘
                           │  steps[]
                           ▼
┌───────────────────────────────────────────────────────────┐
│  SORTIE                                                   │
│  toLatex(node)   toCustom(node)   prettyPrint(node)       │
└───────────────────────────────────────────────────────────┘
```

**Pattern matching transverse** : le module `pattern/` n'est pas une etape
sequentielle mais une **primitive traversale** utilisee par `normal/`,
`simplify/`, `solve/` et d'autres. `P.sum(P.num(), P.wildcard('x'))` produit un
`Pattern` ; `tryMatch(node, pattern)` renvoie `MatchResult | null`.

---

## Invariants structurels (a connaitre avant de modifier le code)

Ces invariants ne sont **pas appliques par le systeme de types** mais par convention
dans tout le code. Les violer introduit des bugs difficiles a debugger.

### 1. Interdiction des nombres signes dans `number()`

```typescript
// factory.ts:255-269
number('-3'); // THROW — valeur negative interdite
number('3'); // OK
opposite(number('3')); // forme canonique pour -3
numericNode(-3); // helper safe : produit opposite(number('3'))
numericNode(3); // produit number('3')
```

`isMinusOne` (`guards.ts:768`) ne reconnait que `opposite(number('1'))`, jamais
`number('-1')` (qui ne devrait pas exister).

### 2. Delimiteurs = frontieres intangibles de flatten

`flattenSumShallow` et `flattenProductShallow` **s'arretent** aux noeuds
`delimiter` (`flatten.ts:7-8,123-130`). Un `delimiter(addition(a, b))` n'est
**pas** aplati dans la somme parente. C'est le mecanisme qui distingue `a+(b+c)`
de `a+b+c` dans l'analyse structurelle.

### 3. flatten/unflatten left-assoc + porteur de style

`unflattenSum` reconstruit `((a-b)+c)` (associativite gauche).
Dans `FlatProduct`, le premier `StyledFactor` a toujours `style: 'implicit'` ;
les suivants portent le `displayStyle` de l'operateur `×` qui les precede
(`flatten.ts:534-616`). Le round-trip `flatten → unflatten` est idempotent.

`addition/subtraction/opposite/positive` ne survivent jamais a
`flattenSumShallow` ; `multiplication` ne survit jamais a
`flattenProductShallow` (post-condition garantie par le module).

### 4. Chaines de relation left-nested

`relation('<', relation('<', a, b), c)` represente `a < b < c`.
`unflattenRelationChain` valide que `relations.length === operands.length - 1`.

### 5. Immutabilite par convention (pas par runtime freeze)

Aucun `Object.freeze` n'est appele. La garantie est portee par les champs
`readonly` TypeScript. **Ne jamais muter** un noeud apres construction ;
utiliser `mapNode` ou les factories pour produire de nouveaux noeuds.

### 6. Drift factory (dette connue)

~91 litteraux `{ type: '...' }` construits hors factory dans `solve/`,
`analysis/`, `limits/` (`transcendental.ts:177`, `structures.ts:599,621,695`).
Ces sites contournent le sign-guard de `number()`. Ne pas reproduire ce pattern.

---

## Robustesse et securite

Surface reelle limitee (pas de DB, pas de reseau, pas de `eval` JS).

| Garde                    | Valeur par defaut        | Fichier                                   |
| ------------------------ | ------------------------ | ----------------------------------------- |
| `maxInputLength`         | 10 000 caracteres        | `parser/security.ts`                      |
| `maxASTDepth`            | 100                      | `parser/security.ts` (verifie POST-parse) |
| `maxNodeCount`           | 10 000                   | `parser/security.ts` (verifie POST-parse) |
| `MAX_EVAL_DEPTH`         | 100                      | `eval/evaluate.ts:431`                    |
| Puissance entiere        | abs(exp) <= 1 000        | `eval/evaluate.ts`                        |
| `maxIterations` simplify | borne fixpoint           | `rewriting-engine.ts`                     |
| Timeout CAS              | **opt-in** (`timeoutMs`) | `common/abort.ts`                         |

> ⚠️ Le cap de profondeur AST est verifie **apres** construction — une entree
> imbriquee ~5 000 niveaux (sous le cap de 10 000 chars) peut provoquer un
> `RangeError` (stack overflow) avant le check. Impact : crash synchrone du
> parse, pas d'execution de code arbitraire. Voir
> [`docs/ref/mathast/code-quality.md`](./code-quality.md) pour les details.

---

## Points d'entree cles

```
src/lib/mathAST/
├── index.ts                    71 exports publics (point d'entree unique)
├── types.ts:720               MathNode — l'union discriminee principale
├── factory.ts:255             number() — sign-guard
├── flatten.ts:7               commentaire delimiter-as-boundary
├── parser/security.ts         SecurityError + ParserSecurityOptions
├── normal/normalize.ts:1478   normalize(node, ctx?)
├── pedagogical-solve/index.ts generateEquationSteps(eq, options)
└── step-generator/types.ts    CalculationStep, SchoolLevel
```

---

## Pour aller plus loin

- **Surface publique complete** : [`docs/ref/mathast/api.md`](./api.md)
- **Pattern matching** : [`docs/ref/mathast/pattern-matching.md`](./pattern-matching.md) (reference riche existante)
- **Vocabulaire CAS** : [`docs/ref/mathast/glossaire.md`](./glossaire.md)
- **Decisions de design** : [`docs/ref/mathast/mathAST-vs-poincare.md`](./mathAST-vs-poincare.md)
- **Agent metier** : `mathast-expert` (voir `.claude/agents/README.md`)

---

**Derniere mise a jour** : 2026-06-18 | **Version** : 1.0
