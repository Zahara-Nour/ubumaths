# Integration Stepper — Progrès

> **Source du plan** : `docs/wip/integration-stepper-prompt.md`  
> **Décision architecturale** : Option 2 (pipeline pédagogique parallèle, modèle `pedagogical-differentiation/`)  
> **Démarré** : 2026-05-06  
> **Livré** : 2026-05-06 (en tunnel continu)

## Objectif

Créer un module `src/lib/mathAST/pedagogical-integration/` qui implémente un dispatcher pédagogique parallèle à `integration/integrate.ts` (intact). Réutilise les building blocks de `integration/rules.ts` (powerRule, expRule, sinRule, cosRule, lnAbsRule, tanRule) pour les calculs effectifs, mais réorchestre l'ordre, ajoute les annonces préalables, identifie les bindings (u, du, n, c) et détecte les cas spéciaux pédagogiques (formes composées u'·e^u, u'/u, u'·sin(u), u'·cos(u), u'·u^n, intégrale définie, IPP simple).

## État global

| Phase    | Status     | Commit      | Notes                                                                                                                            |
| -------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0        | ✅ Validée | —           | Q1-Q10 validées par utilisateur. **Q3 override** : IPP activée AUSSI au lycée (Tle spé)                                          |
| 1        | ✅ Livrée  | `0a4751a5d` | 14 tests : types + isolation (BaseStep + GenericTechnicalRenderer)                                                               |
| 2        | ✅ Livrée  | `e576400da` | 52 tests pipeline : primitives, linéarité, formes composées, definite, IPP, opposite                                             |
| 3        | ✅ Livrée  | `0fe7ca6c0` | 18 tests renderer : TITLES/EXPLANATIONS lycée+sup, LaTeX 2-lignes, bump primaire/college                                         |
| 4        | ✅ Livrée  | `fd6a6381b` | 26 snapshots × 7 catégories de démos + CLI standalone `scripts/pedagogical-integration-demo.ts`                                  |
| 5        | ✅ Livrée  | `4a3bf5e57` | Mode B `kind: 'integrate'` + 6 tests correction-generator + 2 fixtures + page debug 11→13                                        |
| 6        | ✅ Livrée  | `76824564e` | Quality checks + docs progress                                                                                                   |
| **V1.1** | ✅ Livrée  | `fdef883ed` | **IPP cyclique + arctan/arcsin + tabular IPP** : 25 rules (24+`apply-cyclic-ipp`), 14 tests V1.1                                 |
| **V2**   | ✅ Livrée  | (next)      | **Partial-fractions simples + arctan/arcsin général** : 27 rules (+`decompose-rational`, `apply-partial-fractions`), 13 tests V2 |

## Décisions architecturales (Phase 0 — validées)

### A. Pipeline parallèle (PAS d'instrumentation de `integrate.ts`)

L'algorithme `integrate.ts` reste **strictement intact** : rétrocompatibilité parfaite, ~12000 tests existants inchangés. Le nouveau module est totalement autonome.

### B. Réutilisation de `integration/rules.ts`

Les fonctions atomiques (powerRule, expRule, sinRule, cosRule, lnAbsRule, tanRule, arctanRule, arcsinRule, constantRule) sont **réutilisées** pour les calculs effectifs. Le pipeline pédagogique ne reimplémente pas les formules de primitives.

### C. Réutilisation de `integration/patterns.ts`

`findProportionalityConstant(expr1, expr2)` — détection « expr1 = c·expr2 pour c constante » — utilisée massivement pour les détecteurs de formes composées (u' · f(u) avec rebalancing).

### D. Réutilisation de `differentiate()` (algorithmique)

Pour calculer u'(x) lors de la détection de formes composées (u'·e^u, u'/u, etc.), le pipeline appelle `differentiate(u, { variable })` du module algorithmique. Évite la réécriture de la dérivation symbolique.

### E. Steps arborescentes avec `subSteps`

Calque de `pedagogical-differentiation/`. L'élève voit l'identification structurelle (règle parent annoncée) PUIS le détail pas-à-pas (sub-steps).

### F. Cas spéciaux pédagogiques (priorisés AVANT règles générales)

| Pattern                                  | Règle pédagogique                          | Au lieu de          |
| ---------------------------------------- | ------------------------------------------ | ------------------- |
| `c` (constante)                          | `apply-constant-rule`                      | u-substitution      |
| `x^n`                                    | `apply-power-rule`                         | composite-power     |
| `1/x`                                    | `apply-known-primitive`                    | composite-ln        |
| `e^x`, `sin(x)`, `cos(x)`, `tan(x)`      | `apply-known-primitive`                    | u-sub               |
| `u' · e^u`                               | `apply-composite-exp`                      | u-substitution      |
| `u' / u`                                 | `apply-composite-ln`                       | u-substitution      |
| `u' · sin(u)`                            | `apply-composite-sin`                      | u-substitution      |
| `u' · cos(u)`                            | `apply-composite-cos`                      | u-substitution      |
| `u' · u^n`                               | `apply-composite-power`                    | u-substitution      |
| Forme « bare » (ex: `sin(2x)`, `e^(2x)`) | composite avec rebalancing implicit `1/u'` | u-sub explicite     |
| `c · f(x)`                               | `extract-constant`                         | linéarité générique |
| `-f(x)` (opposite)                       | `extract-constant` (c=-1)                  | branche dédiée      |
| Polynôme × {ln,exp,sin,cos}              | IPP simple                                 | u-substitution      |

### G. Niveaux scolaires

`lycee + superieur` actifs. `primaire + college` bumpés à `lycee` (l'intégration n'est pas au programme avant la Terminale). Type-level via `IntegrationSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`.

### H. Q3 override — IPP activée au lycée (Tle spé)

`STRATEGIES_INTEGRATION.lycee.enablePartsSimple = true`. L'utilisateur a confirmé que l'IPP fait partie du programme Tle spé maths 2025. La stratégie supérieur a aussi `enablePartsSimple: true` (sans changement).

### I. Mode B intégré (`kind: 'integrate'`)

Étendu dans ce prompt. Cohérent avec `correction-integration` qui a déjà livré `arithmetic`, `linear-equation`, `quadratic-equation`, `differentiate`, et les inéquations.

### J. Pas de u-substitution explicite en V1

Branche supprimée du dispatcher (le code prouvait qu'elle ne serait jamais atteinte vu que les composite-detectors couvrent déjà tous les cas standards Tle). Les 4 rules `identify-substitution` / `compute-du` / `apply-substitution` / `substitute-back` restent dans le type union pour V2.

## Fichiers livrés

### Module `pedagogical-integration/`

- `types.ts` — `PedagogicalIntegrationRule` (24 noms), `PedagogicalIntegrationStep extends BaseStep`, `Result`, `Options`, `IntegrationBindings`, `IntegrationSchoolLevel`, `STRATEGIES_INTEGRATION`, `PedagogicalIntegrationNotImplemented`
- `_helpers.ts` — `DispatchContext`, `buildStep`, détecteurs de formes composées (`tryDetectCompositeExp/Ln/Sin/Cos/Power`), détecteur IPP (`tryDetectParts`), prédicats structurels, `flattenSum` n-aire
- `pipeline.ts` — `generatePedagogicalIntegrationSteps` point d'entrée, dispatcher récursif (constant → power → 1/x → known-primitive → composite-{exp,ln,sin,cos,power} → linearity → opposite → extract-constant → IPP → throw NotImplemented), gestion intégrale définie via trio FTC
- `descriptions-fr.ts` — `TITLES` (lycée + superieur) + `EXPLANATIONS` (lycée complet) + `getDefaultDescription()`
- `renderer.ts` — `PedagogicalIntegrationRenderer` avec LaTeX 2-lignes (intégrale en haut bleue, primitive en bas), formats spéciaux pour `substitute-bounds`, `apply-fundamental-theorem`, `simplify-bounds-result`, `add-constant`, `identify-integrand`
- `index.ts` — barrel public
- `demo-helpers.ts` — `presentIntegral(testCase, format)` pour snapshots et CLI, option `format: 'latex' | 'custom'`
- `demo-cases/` — 7 catégories : usuelles, polynomial, linearite, forme-composee-ln, forme-composee-exp, definie, parts-simple

### Tests

- `__tests__/types.test.ts` — 14 tests (compatibilité BaseStep, subSteps, definite field, options, IntegrationSchoolLevel exclude, strategies, error class, exhaustivité union via Exclude)
- `__tests__/pipeline.test.ts` — 52 tests (basics, linéarité, extraction constante, formes composées 5 kinds, definite, IPP, strategy diff, notImplemented, abort, invariants step)
- `__tests__/renderer.test.ts` — 18 tests (titres lycée vs sup, explanations gating, recursion subSteps, primaire/college bump, formats LaTeX par rule kind)
- `__tests__/pedagogical-integration-demo.test.ts` — 26 snapshots × 4 (level × verbosity)
- **Total module** : 110 tests verts

### Intégration Mode B

- `src/lib/questions/types.ts` — extension `GeneratedSteps` avec `kind: 'integrate'`, champ `definite?`
- `src/lib/questions/template-schema.ts` — schémas Zod (lax + strict) avec discriminator étendu
- `src/lib/questions/generator/correction-generator.ts` — case `integrate` dispatchant vers le pipeline (parse intégrande + bornes, bump primaire/college → lycee, catch NotImplemented)
- `src/lib/questions/generator/correction-generator.test.ts` — 6 nouveaux tests (indéfini, definite avec FTC trio, substitution variables intégrande+bornes, bump primaire→lycée, intégrande non parsable, V1 scope refusal)
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` — 2 fixtures end-to-end (`integrateIndefiniteDemo` ∫(3x²+2x+1) dx + `integrateDefiniteDemo` ∫_0^1 e^x dx)
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` — 2 nouveaux tests snapshot

### Outils de test

- `scripts/pedagogical-integration-demo.ts` — CLI standalone avec format custom (défaut, lisible terminal) + cleanup LaTeX résiduel + ANSI bold-blue sur TTY
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` — page debug étendue avec les 2 nouvelles fixtures intégration (11 → 13 fixtures)

## Tests cumulés

| Suite                                      | Tests      |
| ------------------------------------------ | ---------- |
| Module `pedagogical-integration`           | 110        |
| `correction-generator.test.ts` (intégrate) | 6 (sur 36) |
| `generated-steps-demo.test.ts` (intégrate) | 2 (sur 17) |
| **Spécifiques au feature**                 | **118**    |
| Régression mathAST + questions adjacentes  | 945+       |

## Code review (post-Phase 1)

- ✅ **Blocker 1** corrigé : commentaire de header de `types.ts` rectifié pour décrire honnêtement les 9 noms de rules partagés entre `PedagogicalIntegrationRule` et `IntegrationRule` algorithmique
- ✅ **Blocker 2** corrigé : exhaustivité du test `rule union` renforcée via `Exclude<Union, ListedSubset> extends never` (compile-time guard)
- ✅ **Should-fix 3** : doc `variable?` optional dans `Options` (note expliquant la divergence avec différentiation)
- ✅ **Should-fix 5** : test `throw/catch instanceof` pour `PedagogicalIntegrationNotImplemented`

## Code review (post-Phase 2)

- ✅ **Blocker 1** corrigé : `>` → `>=` dans le garde de récursion `currentDepth >= maxRecursionDepth`
- ✅ **Blocker 2** corrigé : suppression de la branche u-substitution morte (V2 — composite path couvre déjà tous les cas standards Tle)
- ⚠ **Should-fix** non corrigés (V1.1+) :
  - `isPolynomialOf` accepte `x*x` (multiplication implicite). Sans bug actuel mais friable si l'ordre de matching IPP change.
  - `opposite` rendu via `extract-constant` c=-1 plutôt que rule `negation` dédiée (asymétrie pédagogique avec `pedagogical-differentiation`).
  - `substituteVariable` ne couvre pas `matrix`/`vector`/`set-notation` — documentation manquante.

## V1.1 — IPP cyclique, arctan/arcsin, tabular IPP

Trois extensions livrées dans le tunnel V1.1 :

### A. IPP cyclique (`∫e^(αx)·sin(βx) dx`, `∫e^(αx)·cos(βx) dx`)

Cas iconique du programme Tle spé maths. Nouvelle rule pédagogique
`apply-cyclic-ipp` (24 → 25 rules dans le union). Détection upfront via
`isCyclicIppPattern` (multiplication d'un facteur exp et d'un facteur
sin/cos, à travers un éventuel `opposite`). Résolution algébrique :
`I·(1 - c₁·k₂) = u₀v₀ - c₁·u₁v₁` où c₁ est le signe de f₁ après IPP1
et k₂ la constante de proportionnalité de v₁·du₁ par rapport à
l'intégrand original.

Stratégie : `enableCyclicParts: true` aux deux niveaux (lycée Tle spé +
supérieur). 5 tests dédiés.

### B. arctan / arcsin (supérieur uniquement)

`∫1/(1+x²) dx → arctan(x)` et `∫1/√(1-x²) dx → arcsin(x)` via
`apply-known-primitive` (rule existante). Détection structurelle stricte
(forme « unitaire » uniquement — `1/(a²+x²)` et `1/√(a²-x²)` réservés à
V2). Stratégie : `enableInverseTrig: true` au supérieur uniquement, lycée
continue à `throw NotImplemented` (statu quo). 5 tests dédiés.

### C. Tabular IPP audit + fix

`∫xⁿ·eˣ dx` pour n=3, 4, 5 fonctionne désormais. Cause racine du blocage :
default `maxRecursionDepth = 5` insuffisant — chaque IPP consume ~2 niveaux
de profondeur (un pour intégrer dv, un pour intégrer vDu) et les
`extract-constant` en cascade ajoutent encore. **Fix** : default bumpé à
`10` (couvre confortablement n ≤ 5). 4 tests dédiés.

## V2 — Partial-fractions + arctan/arcsin général

Deux extensions livrées dans le tunnel V2 :

### A. Partial-fractions simples (lycée Tle spé option + supérieur)

`∫P(x)/Q(x) dx` où Q est quadratique avec **deux racines réelles distinctes
rationnelles** (Δ > 0) et `deg(P) < 2`. Décomposition en éléments simples
via la « méthode des racines » :

```
P(r₁) / (aQ · (r₁ - r₂)) = A,    P(r₂) / (aQ · (r₂ - r₁)) = B
∫ P/Q dx = A·ln|x-r₁| + B·ln|x-r₂|
```

Deux nouvelles rules : `decompose-rational` (étape algébrique) +
`apply-partial-fractions` (intégration des éléments simples). Détecteur
`tryDetectPartialFractions` : pré-traitement via `normalize/denormalize`
pour expandre `(x-1)(x+1) → x²-1`, puis `extractQuadraticCoefficients`
de `solve/solvers/quadratic.ts` pour extraire (a, b, c) numériques.
Filtre `isRationalLike` (heuristique 1/d avec d ≤ 1000) pour rejeter les
racines irrationnelles. Stratégie : `enablePartialFractions: true` aux
deux niveaux. Cas refusés : Δ ≤ 0, deg(P) ≥ 2, racines irrationnelles,
cancellation (catché par composite-ln en amont).

### B. arctan/arcsin général (a ≠ 1)

Étendu à `1/(c+x²) → (1/a)·arctan(x/a)` et `1/√(c-x²) → arcsin(x/a)`
avec `a = √c` (a > 0 réel). `arctanRule` / `arcsinRule` de
`integration/rules.ts` gèrent déjà les deux cas (unit a=1 et général).
Stratégie : `enableInverseTrig: true` au supérieur uniquement. 6 tests
V2 dédiés.

## Limitations connues V2

1. **Partial-fractions racines répétées** (`1/(x-1)²`) — V2.1 ou V3.
2. **Partial-fractions deg(P) ≥ deg(Q)** (nécessite division euclidienne
   préalable) — V2.1.
3. **Partial-fractions racines irrationnelles** — rejetées par
   `isRationalLike` (rendu trop lourd pédagogiquement avec `√Δ`).
4. **Partial-fractions Q degré ≥ 3** (3+ facteurs linéaires) — V2.1.
5. **Partial-fractions facteur quadratique irréductible** (mène à arctan)
   — V2.2.
6. **trig-substitution** (`∫√(1-x²) dx` etc.) — supérieur avancé, hors V2.
7. **Intégrales impropres**, **fonctions par morceaux**, **intégrales
   paramétriques** — hors scope.
8. **`1·x²` literally** : ne trigger pas `extract-constant` (c=1 rejeté).
   Cas pathologique en pratique.
9. **Constantes paramétriques** (`∫(ax+b) dx` où a,b sont des paramètres)
   — V2.1 (analogue quadratic V2).

## Pistes d'amélioration (V2)

- Ajouter rule `negation` dédiée (au lieu de `extract-constant` c=-1).
- Implémenter u-substitution explicite (4 narrative steps + intégration via fallback algorithmique).
- Implémenter partial-fractions pédagogique (décomposition + intégration de chaque terme).
- Implémenter arctan/arcsin via `apply-known-primitive` étendu.
- IPP tabulaire (template multi-pass).
- Constantes paramétriques (analogue quadratic V2).

## Documents à produire (rappel)

- ✅ Cette doc : `docs/wip/integration-stepper-progress.md`
- ✅ Update `docs/wip/pedagogical-steppers-mvp-progress.md` (entrée « Stepper pédagogique pour intégration »)
- ✅ Update `docs/wip/correction-integration-progress.md` (extension `kind: 'integrate'`, fixtures 12→14)

## Documents de référence

- `docs/wip/integration-stepper-prompt.md` — source du plan, Q1-Q10, 13 anti-patterns
- `docs/wip/differentiation-stepper-progress.md` — modèle direct de cette doc
- `docs/wip/pedagogical-steppers-mvp-progress.md` — vue d'ensemble des steppers livrés
- `docs/wip/correction-integration-progress.md` — détail architecture Mode B
- `docs/wip/quadratic-stepper-progress.md` — autre exemple (V1+V1.1, dispatcher, helpers refacto)
- `docs/wip/pedagogical-rational-inequality-progress.md` — exemple récent (multi-fractions V2)
