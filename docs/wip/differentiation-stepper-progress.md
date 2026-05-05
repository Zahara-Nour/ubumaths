# Differentiation Stepper — Progrès

> **Source du plan** : `docs/wip/differentiation-stepper-prompt.md` > **Décision architecturale** : Option 2 (pipeline pédagogique parallèle, modèle `pedagogical-arithmetic/`)
> **Démarré** : 2026-05-05

## Objectif

Créer un module `src/lib/mathAST/pedagogical-differentiation/` qui implémente un dispatcher pédagogique parallèle à `differentiate.ts` (intact). Réutilise les building blocks de `differentiation/rules.ts` pour les calculs effectifs, mais réorchestre l'ordre, ajoute les annonces préalables, identifie les bindings (u, v, n) et détecte les cas spéciaux pédagogiques (c·f, x^n entier, 1/x, √x, etc.).

## État global

| Phase  | Status          | Commit      | Notes                                                                                                                                |
| ------ | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0      | ✅ Spec validée | —           | Option 2 confirmée par l'utilisateur                                                                                                 |
| 1      | ✅ Livrée       | `f9fb1a3a0` | 38 tests : types + pipeline + renderer (skeleton + triviaux top-level)                                                               |
| 2a     | ✅ Livrée       | `f9fb1a3a0` | sum, difference, negation, linear-coefficient, sum-with-constant, diff-with-constant, passthrough (positive/delimiter)               |
| 2b     | ✅ Livrée       | `f9fb1a3a0` | power-natural, power-constant-exp, power-constant-base, general-power, sqrt, derivative-of-sqrt                                      |
| 2c     | ✅ Livrée       | `f9fb1a3a0` | product (general), quotient, inverse, derivative-of-inverse                                                                          |
| 2d     | ✅ Livrée       | `f9fb1a3a0` | sin, cos, tan, arcsin, arccos, arctan (chaîne intégrée)                                                                              |
| 2e     | ✅ Livrée       | `f9fb1a3a0` | exp, ln, log (base-aware)                                                                                                            |
| 2f     | ✅ Livrée       | `f9fb1a3a0` | sinh, cosh, tanh, asinh, acosh, atanh                                                                                                |
| 3      | ✅ Livrée       | `f9fb1a3a0` | Renderer LaTeX 2-lignes aligné (`\begin{aligned}`)                                                                                   |
| 4      | ✅ Livrée       | `f9fb1a3a0` | LYCEE_EXPLANATIONS pour les 34 règles + SUPERIEUR_TITLES complets                                                                    |
| 5      | ✅ Livrée       | `f9fb1a3a0` | 6 catégories de démos × 36 cas snapshot (polynomial, trig, exp, log, product-quotient, composition)                                  |
| 6      | ✅ Livrée       | `b1a33b567` | `kind: 'differentiate'` dans GeneratedSteps + Zod (lax + strict) + correction-generator + 7 nouveaux tests                           |
| 7      | ✅ Livrée       | `b1a33b567` | 2 fixtures end-to-end : polynomial 1_SPE + composition T_SPE, snapshots verts                                                        |
| 8      | ✅ Livrée       | `b1a33b567` | ESLint clean, `pnpm check:incremental` clean (0 nouvelle erreur), 0 régression                                                       |
| **9**  | ✅ Livrée       | `98ddcc50e` | **Fix blockers** issus du code review : `FunctionNode.power` (ex: `\sin^2(x)`) + top-level transparent wrappers (`+x`, `(x)`)        |
| **10** | ✅ Livrée       | `ac4e2b2f8` | **Fix should-fix** issus du code review : `dependsOnDiffVariable` pour subscripted vars + skip `linear-coefficient` quand c=0 ou c=1 |

## Décisions architecturales (Phase 0 — validées)

### A. Pipeline parallèle (PAS d'instrumentation de `differentiate.ts`)

L'algorithme `differentiate.ts` reste **strictement intact** : rétrocompatibilité parfaite, ~12000 tests existants inchangés. Le nouveau module est totalement autonome.

### B. Réutilisation de `differentiation/rules.ts`

Les 26 fonctions exportées par `rules.ts` (productRule, sumRule, sinRule, etc.) sont **réutilisées** pour les calculs effectifs. Le pipeline pédagogique ne reimplémente pas la dérivation symbolique.

### C. Steps arborescentes avec `subSteps`

Calque de `pedagogical-arithmetic/`. L'élève voit l'identification structurelle (règle parent annoncée) PUIS le détail pas-à-pas (sub-steps).

### D. Bindings explicites par règle

Captures structurelles (u, v, n, f, g) injectées dans chaque step pour permettre des descriptions contextuelles ("Avec u = ... et v = ...").

### E. Cas spéciaux pédagogiques (priorisés AVANT règles générales)

| Pattern                  | Règle pédagogique                          | Au lieu de                     |
| ------------------------ | ------------------------------------------ | ------------------------------ |
| `c · f(x)` (c constante) | `linear-coefficient`                       | productRule                    |
| `f(x) ± c`               | `sum-with-constant` / `diff-with-constant` | sumRule + step constant        |
| `x^n` (n entier ≥ 2)     | `power-natural`                            | powerRuleConstantExp générique |
| `1/f(x)`                 | `inverse` (-f'/f²)                         | quotientRule                   |
| `1/x`                    | `derivative-of-inverse`                    | inverse + variable             |
| `√x`                     | `derivative-of-sqrt`                       | sqrtRule sans chaîne           |

### F. Niveaux scolaires

`lycee + superieur` actifs. `primaire + college` bumpés à `lycee` (la dérivation n'est pas au programme avant la 1ère).

### G. Notation Lagrange `f'(x)` (Leibniz V2+)

### H. Skip triviaux non top-level

`(c)' = 0` et `(x)' = 1` skippés sauf si l'expression top-level est elle-même une constante/variable.

### I. Mode B intégré (`kind: 'differentiate'`)

Étendu dans ce prompt. Cohérent avec `correction-integration` qui a livré `arithmetic` + `linear-equation`.

### J. Pas de pattern engine (récursif structurel)

Différence avec `pedagogical-arithmetic/` : la différentiation est récursive structurelle (visite par `node.type`), pas pattern-based. Plus naturel et plus simple à maintenir.

### K. Pas de `PedagogicalDifferentiationRule` objet

Différence avec `pedagogical-arithmetic/` : pas d'objet `Rule` agrégeant pattern + descriptions. Le dispatcher dans `pipeline.ts` est lui-même la "règle". Descriptions centralisées dans `descriptions-fr.ts` (modèle proche de `solve/`).

## Fichiers livrés

### Module `pedagogical-differentiation/`

- `types.ts` — `PedagogicalDifferentiationRule` (34 noms), `PedagogicalDifferentiationStep extends BaseStep`, `Result`, `Options`, `DifferentiationBindings`, `TRIVIAL_RULES`
- `descriptions-fr.ts` — `TITLES` (lycee + superieur) + `EXPLANATIONS` (lycee complet, 34 règles) + `getDefaultDescription()`
- `pipeline.ts` — dispatcher pédagogique récursif structurel pour 14 types de nodes (addition, subtraction, multiplication, division, opposite, positive, delimiter, superscript, function avec sub-dispatch sur 18 noms de fonctions)
- `renderer.ts` — `PedagogicalDifferentiationRenderer` avec LaTeX 2-lignes aligné, lookup TITLES + EXPLANATIONS, bump primaire/college → lycee, recursion subSteps
- `index.ts` — barrel public
- `demo-helpers.ts` — `presentExpression()` pour snapshots et CLI, format multi-niveau × verbosity
- `demo-cases/` — 6 catégories : polynomial, trigonometric, exponential, logarithm, product-quotient, composition

### Tests

- `__tests__/types.test.ts` — 6 tests
- `__tests__/pipeline.test.ts` — 82 tests (triviaux + 6 phases × règles + 12 régressions code-review)
- `__tests__/renderer.test.ts` — 14 tests
- `__tests__/pedagogical-differentiation-demo.test.ts` — 38 snapshots (36 originaux + `\sin^2(x)` + `\cos^3(x)`)
- **Total module** : 140 tests verts

### Intégration Mode B

- `src/lib/questions/types.ts` — extension `GeneratedSteps` avec `kind: 'differentiate'`
- `src/lib/questions/template-schema.ts` — schémas Zod (lax + strict) avec discriminator étendu
- `src/lib/questions/generator/correction-generator.ts` — case `differentiate` dispatchant vers le pipeline
- `src/lib/questions/generator/correction-generator.test.ts` — 7 nouveaux tests (polynôme, variables, override, fallback)
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` — 2 fixtures end-to-end (polynomial 1_SPE + composition T_SPE)
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` — 2 nouveaux tests snapshot

### Score final

- 140 tests module + 23 tests correction-generator + 7 tests generated-steps-demo = **170 tests verts spécifiques au feature**
- 0 régression : suites adjacentes (mathAST/differentiation, pedagogical-arithmetic, pedagogical-solve) passent inchangées
- ESLint : clean
- `pnpm check:incremental` : clean (0 nouvelle erreur, les 9 erreurs résiduelles sont dans `slides/demo` et `extern/`, pré-existantes et filtrées)

## Code review (post-livraison initiale)

Un code review `code-reviewer` (Opus) a été lancé après les commits `f9fb1a3a0` et `b1a33b567`. Quatre items remontés, tous corrigés.

### Blockers (commit `98ddcc50e`)

1. **`\sin^2(x)` produisait une dérivée fausse** — Le parser produit `function('sin', [x], power: 2)` (NOT un superscript de fonction). Le dispatcher `dispatchUnaryFunction` ignorait `node.power` et émettait `(\sin^2(x))' = \cos(x)` (mathématiquement faux, pédagogiquement nocif). **Fix** : détecter `node.power !== undefined` dans `dispatchFunction` et rerouter via `dispatchSuperscript` avec une fonction sans `power` comme base. Bonus : refus explicite des fonctions inverses (`f^{-1}`) et dérivées (`f'`).

2. **`(+x)` et `((x))` retournaient `steps: []`** — Les passthrough wrappers (`positive`, `delimiter`) ne synthétisaient pas de step au top-level pour un input non-trivial structurel mais trivial après unwrap. Le consommateur UI recevait un panneau vide. **Fix** : `unwrapTransparent()` au début de `generatePedagogicalDifferentiationSteps()` strip les wrappers avant la classification trivial. Le step émis préserve le node original sur `before`/`globalBefore`.

### Should-fix (commit `ac4e2b2f8`)

3. **`(x_1 + x)' → sum` général au lieu de `sum-with-constant`** — `containsVariable(x_1, 'x') === true` (recurse dans le base du subscript), même si `(x_1)' = 0` par convention. **Fix** : nouveau helper `dependsOnDiffVariable()` qui distingue : nœud trivial atomique → dépend ssi c'est exactement la variable de dérivation ; nœud non-trivial → fallback sur `containsVariable`. Utilisé dans les 5 dispatchers binaires (sum, difference, multiplication, division, superscript).

4. **`linear-coefficient` avec `c=0` ou `c=1`** — produisait des labels absurdes ("On sort la constante 0", "On sort la constante 1"). **Fix** : court-circuit dans `dispatchMultiplication` quand `isZero(constantPart) || isOne(constantPart)` → fallthrough vers un step `product` simple.

### Régressions ajoutées

12 tests dans `__tests__/pipeline.test.ts` :

- 4 sur `FunctionNode.power` : `\sin^2(x)`, `\cos^3(x)`, `\sin^{-1}(x)` refusé, `f'(x)` refusé
- 3 sur top-level wrappers : `(+x)`, `((x))`, `+5`
- 5 sur `dependsOnDiffVariable` + `linear-coefficient` dégénéré : `x_1 + x`, `x \cdot y`, `0 \cdot x^2`, `1 \cdot x^2`, `2 \cdot x^2` (contrôle)

2 démos snapshot ajoutées dans `demo-cases/composition.ts` : `\sin^2(x)`, `\cos^3(x)`.

## Documents de référence

- `docs/wip/differentiation-stepper-prompt.md` — plan complet
- `src/lib/mathAST/pedagogical-arithmetic/` — modèle de référence direct
- `src/lib/mathAST/differentiation/rules.ts` — building blocks réutilisés

## Limitations connues V1 (raffinements post-V1)

- **Pas de constant-folding final** : `(2x+3x)' = 2 + 3` (et non `5`). `simplifiedAdd` n'agrège pas les littéraux. Pédagogiquement acceptable (le prof écrit aussi les étapes intermédiaires) mais un post-traitement de fold pourrait être ajouté.
- **`f/c` (numérateur variable, dénominateur constant)** : passe par la règle `quotient` générique. Un cas spécial `linear-coefficient` avec `c = 1/c_node` serait plus pédagogique mais demande de construire un node `1/c` (out of scope V1).
- **Notation Leibniz `df/dx`** : reportée. V1 utilise Lagrange `f'(x)` partout.
- **Niveaux primaire/college** : bumpés à `lycee` (la dérivation n'est pas au programme avant la 1ère).
- **Highlight context dans le renderer** : `globalBefore` n'est pas utilisé pour colorier le sous-arbre dans son contexte parent. Le `\textcolor{blue}{(before)'}` actuel reste local. Refacto possible quand `pedagogical-arithmetic/colorFragmentsInExpression` sera exposé publiquement.
- **Fonctions inverses (`f^{-1}`) et dérivées (`f'(x)` au sens d'argument déjà-dérivé)** : refusées explicitement avec `PedagogicalDifferentiationNotImplemented` (Mode A fallback côté correction-generator).
- **Inverse hyperboliques** : le parser LaTeX ne reconnaît pas `\arcsinh`/`\operatorname{argsh}` ; le dispatcher fonctionne quand on construit le node manuellement via `func('asinh', [...])`.
- **Subscripts dans expressions composées** (ex: `(x_1)^2`) : `dependsOnDiffVariable` peut sur-rapporter via le fallback `containsVariable`, donnant un label `general-power` au lieu d'une trivialisation. Mathématiquement correct, pédagogiquement sub-optimal. Cas marginal.

## Pistes d'amélioration

1. **Post-traitement numeric fold** : appliquer `evaluate(node, { mode: 'exact' })` ciblé sur les sous-arbres de la dérivée pour transformer `2 + 3` en `5` sans toucher aux symboles.
2. **Cas spécial `f/c`** : détecter constante au dénominateur et router vers `linear-coefficient` avec construction `divide(1, c)`.
3. **Highlight contextuel** : exposer `colorFragmentsInExpression` du module arithmétique et l'utiliser dans le renderer.
4. **Notation Leibniz** : ajouter une option `notation: 'lagrange' | 'leibniz'` au renderer.
5. **Niveau collège (terminales STMG, exposé léger)** : ajouter un set partiel de TITLES/EXPLANATIONS pour les cas simples (puissance, somme, produit).
6. **Variante de `containsVariable` excluant les subscripts** : pour fixer le cas marginal `(x_1)^n` sans toucher au helper global (qui est utilisé partout).
