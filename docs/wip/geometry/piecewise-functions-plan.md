# Plan TDD — Fonctions par morceaux dans geometry-core

**Date** : 2026-05-02
**Statut** : 📋 Plan en attente de validation utilisateur
**Décisions** : voir mémoire `dsl-piecewise-syntax.md`

---

## Phase 0 — Spécification TDD (validée)

### Comportements attendus

#### Forme piecewise (deux notations équivalentes)

```
courbe("y = { -x si x < 0, x^2 si x >= 0 }")
courbe("y = { -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }")
```

1. Premier match gagne (évaluation ordonnée)
2. Dernier morceau sans `si`/`sur` = défaut implicite
3. Conditions composées : `et`, `ou`, chaînes `a < x <= b`
4. Bornes infinies : `+infini` et `-infini` (signe obligatoire)
5. Variables réactives autorisées partout (sliders/scalaires)

#### Forme restriction de domaine (deux notations équivalentes)

```
courbe("y = x^2 avec a < x <= b")
courbe("y = x^2 sur ]a ; b]")
```

Stockage en champ `domain?` dédié sur `GeoFunction` (pas un `PiecewiseNode` à un morceau).

#### Sortie LaTeX

`\begin{cases} -x & x < 0 \\ x^2 & x \geq 0 \end{cases}` (notation symbolique standard, sans `si`/`sur`).

#### Convention `;` partout

Tout formatter d'intervalle dans le projet utilise `;` (alignement convention scolaire FR).

---

## Phase A — Migration `,` → `;` dans mathAST (préliminaire)

**Pourquoi en premier** : éviter de coder le piecewise sur un format incohérent puis tout migrer après.

**Effort estimé** : 1-2h (changement mécanique).

### A.1 — Audit complet

- **Agent** : `Explore` (Sonnet)
- **Tâche** : recenser tous les points d'**entrée** (parsers qui acceptent `]a, b[`) et de **sortie** (formatters qui produisent `]a, b[`). Distinguer les deux : seuls les points de sortie sont concernés par la migration. Si un parser attend `,`, il faut décider (accepter les deux à l'entrée pendant migration ?).

### A.2 — Modification des formatters

- **Agent** : direct (pas d'agent — changement local)
- **Fichiers** :
  - `src/lib/math/intervals/format.ts:121` (`formatSingleInterval` : `${lower}, ${upper}` → `${lower} ; ${upper}`)
  - `src/lib/mathAST/domain/format.ts:133` (`excludedPoints.map(...).join(', ')` → vérifier si applicable)
- **Tests** : mettre à jour les ~45 assertions dans :
  - `src/lib/math/intervals/__tests__/format.test.ts`
  - `src/lib/mathAST/domain/__tests__/format.test.ts`
  - autres tests qui assertent indirectement le format
- Audit assertion par assertion (pas de sed aveugle — les `,` peuvent être dans d'autres positions)

### A.3 — Vérification entrée parser élève

- **Fichier** : `src/lib/mathAST/domain/validation/validate-student-domain.ts`
- **Question** : si un élève saisit `]0, +∞[` au lieu de `]0 ; +∞[`, doit-il être accepté ? **Décision proposée** : accepter les deux à l'entrée (tolérance), produire `;` en sortie.

### A.4 — Code review + commit

- **Agent** : `code-reviewer` (Sonnet)
- **Commit message** : `refactor(intervals): use ';' as French interval separator`

### Document

- `docs/wip/geometry/phase-a-interval-separator-progress.md`

---

## Phase B — Restriction de domaine sur GeoFunction (quick win)

**Pourquoi avant le piecewise complet** : 70 % des cas scolaires (« tracer f sur [-2 ; 2] ») livrables vite, sans dépendre de Phase C.

### B.0 — Spec TDD

- **Agent** : direct (Opus)
- Lister 15-20 comportements (cas nominal, bornes infinies, ouvertes/fermées, variables réactives, erreurs)
- **À valider par l'utilisateur avant tests**

### B.1 — Type GeoFunction étendu

- **Agent** : `typescript-expert` (Sonnet)
- **Fichier** : `src/lib/geometry-core/types/elements.ts:731`
- Ajouter :

  ```typescript
  interface GeoFunction extends GeoElementBase {
  	// ... existant
  	domain?: GeoFunctionDomain;
  }

  interface GeoFunctionDomain {
  	lower: ScalarParam; // -infini possible via InfinityParam
  	upper: ScalarParam; // +infini possible
  	lowerType: EndpointType; // 'open' | 'closed'
  	upperType: EndpointType;
  }
  ```

- Réutilise `EndpointType` existant de `$lib/math/intervals/types.ts`

### B.2 — Parser DSL du suffixe domaine

- **Agent** : `typescript-expert` (Opus — le parser DSL est subtil)
- **Tâche** : étendre `parseEquation` (ou wrapper) dans `src/lib/geometry-core/dsl/builtins.ts:2179` pour reconnaître les suffixes :
  - `... avec <comp_chain>` → `comp_chain` peut être `a < x <= b`, `x > a`, `x <= b`
  - `... sur <interval>` → `interval` au format `]a;b[`, `[a;b]`, etc.
- Désucre vers `GeoFunctionDomain`
- Variables `a`, `b` résolues via la symbol-table en `ScalarParam`

### B.3 — createFunction propage domain

- **Agent** : direct (Sonnet)
- **Fichier** : `src/lib/geometry-core/graph/figure.ts:1750`
- Le factory `createFunction` accepte `domain?` et le propage sur l'élément
- Collecte les dépendances `dependsOn` si bornes sont des `ScalarRef`

### B.4 — Sampler restreint au domain

- **Agent** : `frontend-developer` (Sonnet) — touche au sampler/rendu
- **Fichier** : `src/lib/geometry-core/graph/figure.ts` — nouvelle fonction `computeFunctionSampling(id, viewport)` qui résout dynamiquement le domain en numérique et restreint l'échantillonnage à `viewport ∩ domain`.
- Si bornes ouvertes : ne pas inclure le point exact (epsilon vers l'intérieur).

### B.5 — Marqueurs cercles ouverts/fermés

- **Agent** : `frontend-developer` (Sonnet)
- **Fichier** : `src/lib/geometry-core/rendering/svg-primitives.ts`
- Aux bornes finies du domain, dessiner :
  - cercle plein (closed) → `<circle fill>` avec couleur de la courbe
  - cercle vide (open) → `<circle stroke fill="white">`
- Ne pas dessiner aux bornes infinies.

### B.6 — Exports TikZ/Typst

- **Agent** : direct (Sonnet)
- **Fichiers** : `export-tikz.ts:298`, `export-typst.ts`
- Restreindre les coordonnées au domain
- Marqueurs cercles : TikZ `\fill` / `\draw circle`, Typst `circle()`

### B.7 — Sérialisation round-trip

- **Agent** : direct (Sonnet)
- **Fichier** : `src/lib/geometry-core/dsl/serializer.ts:464`
- Émettre `courbe("y = ... sur ]a;b]")` ou `... avec a<x<=b` (choisir la forme la plus lisible — proposer la forme `sur` par défaut).

### B.8 — Tests E2E

- **Agent** : `test-automator` (Sonnet)
- Crée tests dans `src/lib/geometry-core/dsl/__tests__/courbe-domain.test.ts`
- Couvre : nominal, bornes ouvertes/fermées, infinies, variables réactives, sérialisation round-trip, erreurs (`a>b`, syntaxe invalide).

### B.9 — Code review + commit

- **Agent** : `code-reviewer` (Opus — feature complète)
- **Commit message** : `feat(geometry-core): domain restriction on function curves with reactive bounds`

### Document

- `docs/wip/geometry/phase-b-domain-restriction-progress.md`

---

## Phase C — `PiecewiseNode` dans mathAST

**Pourquoi C avant D** : le piecewise est un concept mathAST réutilisable (validateur de réponses élève, analyse, etc.), pas une primitive geometry-core.

### C.0 — Spec TDD

- **Agent** : direct (Opus)
- Lister 25-30 comportements (premier-match, défaut, dérivation, domaine, continuité, parsing, sérialisation)
- **À valider par l'utilisateur avant tests**

### C.1 — Type + factory + guards

- **Agent** : `typescript-expert` (Sonnet)
- **Fichiers** :
  - `src/lib/mathAST/types.ts` : ajouter `PiecewiseNode`
    ```typescript
    interface PiecewiseNode extends BaseNode {
    	type: 'piecewise';
    	pieces: PiecewisePiece[];
    	otherwise?: MathNode; // défaut implicite
    }
    interface PiecewisePiece {
    	condition: MathNode; // RelationNode | LogicalNode | RelationChain
    	value: MathNode;
    }
    ```
  - Ajouter `'piecewise'` à l'union `MathNode`
  - `factory.ts` : `piecewise(pieces, otherwise?)`
  - `guards.ts` : `isPiecewise()`
  - `transforms.ts` : visiteur récursif (descend dans pieces.condition + pieces.value + otherwise)
- **Tests** : `mathAST/__tests__/piecewise-node.test.ts`

### C.2 — Évaluation et compilation

- **Agent** : `typescript-expert` (Sonnet)
- **Fichier** : `src/lib/mathAST/eval/evaluate.ts` + `compile.ts`
- `evaluate(piecewiseNode, bindings)` :
  1. Pour chaque pièce, évaluer `condition` (booléen)
  2. Premier `true` → retourne `evaluate(piece.value, bindings)`
  3. Si aucune → `evaluate(otherwise)` ou `undefined`
- `compile(piecewiseNode)` : génère closure JS avec chaîne `if/else if/else`
- **Tests** : `mathAST/eval/__tests__/piecewise-eval.test.ts`

### C.3 — Différenciation

- **Agent** : `typescript-expert` (Sonnet)
- **Fichier** : `src/lib/mathAST/differentiation/`
- Dérive branche par branche, conditions inchangées
- Note : la différentiabilité aux raccords est traitée séparément en C.5

### C.4 — Domaine et image

- **Agent** : `typescript-expert` (Sonnet)
- **Fichier** : `src/lib/mathAST/domain/compute.ts` + `range.ts`
- `computeDomain(piecewise)` : pour chaque pièce, intersect(condition.toDomain, computeDomain(piece.value)), union de toutes
- `computeRange(piecewise, inputDomain)` : union des images sur chaque sous-domaine

### C.5 — Continuité aux raccords

- **Agent** : `typescript-expert` (Sonnet)
- **Fichier** : `src/lib/mathAST/analysis/continuity.ts`
- Aux frontières entre conditions : calculer `analyzeOneSidedLimits` gauche et droite, comparer
- Classifier : `removable`, `jump`, `infinite`, ou `continu`
- Réutilise infrastructure `LimitDirection` existante

### C.6 — Parser custom pour `{ ... si/sur ... }`

- **Agent** : `typescript-expert` (Opus — parser non trivial)
- **Fichier** : `src/lib/mathAST/parser/custom/`
- Étendre tokenizer : tokens `{`, `}`, `si`, `sur`, `et`, `ou`, `infini`, `+infini`, `-infini`, `;` comme séparateur d'intervalle
- Étendre parser : reconnaît les deux formes équivalentes, produit `PiecewiseNode` identique
- Tolérance entrée : accepte aussi `,` comme séparateur d'intervalle (cf. Phase A.3)
- **Tests** : `mathAST/parser/custom/__tests__/piecewise.test.ts` (couvre les deux formes, conditions composées, défaut, erreurs)

### C.7 — Output LaTeX et toCustom

- **Agent** : direct (Sonnet)
- **Fichiers** : `src/lib/mathAST/latex/` (output) + `src/lib/mathAST/custom-generator.ts`
- LaTeX : `\begin{cases} ${value} & ${condition} \\ ... \end{cases}` (forme symbolique)
- Custom (sortie DSL) : `{ ${value} si ${cond}, ... }` (préfère forme `si`, ou intervalle si la condition est exactement un intervalle)

### C.8 — Tests intégration mathAST

- **Agent** : `test-automator` (Sonnet)
- Tests cross-modules : parser → AST → eval, parser → AST → diff, parser → AST → domain, parser → AST → continuité, round-trip parser ↔ output

### C.9 — Code review + commit

- **Agent** : `code-reviewer` (Opus)
- **Commit message** : `feat(mathAST): native PiecewiseNode with French DSL parser`

### Document

- `docs/wip/geometry/phase-c-piecewise-node-progress.md`

---

## Phase D — Intégration piecewise dans geometry-core

**Dépend de** : Phases A, B, C livrées.

### D.0 — Spec TDD

- **Agent** : direct (Opus)
- Lister 15-20 comportements (parsing courbe, sampling avec ruptures, marqueurs, exports, sérialisation)
- **À valider par l'utilisateur avant tests**

### D.1 — Builtin courbe() délègue au parser piecewise

- **Agent** : `typescript-expert` (Sonnet)
- **Fichier** : `src/lib/geometry-core/dsl/builtins.ts:2179`
- Détecte si la RHS est un piecewise (`{ ... }` au début) → utilise le parser piecewise mathAST
- Stocke `expression: PiecewiseNode` dans `GeoFunction`

### D.2 — createFunction supporte expression piecewise

- **Agent** : direct (Sonnet)
- **Fichier** : `src/lib/geometry-core/graph/figure.ts:1750`
- `compiledFn` : compilé via `compile(piecewiseNode)` (Phase C.2)
- `derivative` / `compiledDerivative` : `differentiate(piecewiseNode)` (Phase C.3)

### D.3 — Sampler split aux ruptures + cercles

- **Agent** : `frontend-developer` (Opus — logique de rendu complexe)
- **Fichier** : nouveau ou extension de `computeFunctionSampling`
- Identifier les **points de rupture** : frontières des conditions (résoudre les bornes via `domain.toDomain` Phase C.4)
- Échantillonner par sous-intervalle
- Détecter saut au point de rupture (limite gauche ≠ limite droite) → split path
- Marqueurs cercles selon `<` (ouvert) vs `≤` (fermé)

### D.4 — Exports TikZ/Typst/SVG

- **Agent** : direct (Sonnet)
- Multi-`\draw` ou path multi-segments
- Marqueurs cercles inclus

### D.5 — Sérialisation round-trip

- **Agent** : direct (Sonnet)
- **Fichier** : `src/lib/geometry-core/dsl/serializer.ts`
- Émet `courbe("y = { ... si ... }")` (forme `si` par défaut, configurable)

### D.6 — Tests E2E

- **Agent** : `test-automator` (Sonnet)
- `src/lib/geometry-core/dsl/__tests__/courbe-piecewise.test.ts`
- Couvre : nominal, formes `si`/`sur` équivalentes, variables réactives, raccords continus/discontinus, exports, round-trip, erreurs

### D.7 — Test visuel manuel

- **Agent** : direct (Sonnet)
- Lancer `pnpm dev -- --port 5175`, créer une page de démo dans `src/routes/(public)/geometry-demo/piecewise/+page.svelte`
- Vérifier visuellement : continu, saut, cercles ouverts/fermés, sliders réactifs, dérivée
- **Important** : suivre la règle CLAUDE.md « test UI manuellement avant de déclarer done »

### D.8 — Code review + commit

- **Agent** : `code-reviewer` (Opus)
- **Commit message** : `feat(geometry-core): piecewise function curves with reactive bounds and discontinuity rendering`

### Document

- `docs/wip/geometry/phase-d-geometry-piecewise-progress.md`

---

## Phase E — Quality checks finaux (UNE seule fois en fin de plan)

- **Format** : `pnpm format "src/**/*.{ts,svelte}"` sur fichiers modifiés
- **TypeScript + Svelte** : `pnpm check:incremental`
- **Svelte autofixer** : `mcp__svelte__svelte-autofixer` sur chaque .svelte modifié
- **ESLint** : `npx eslint <fichiers modifiés>`
- **Tests complets** : `pnpm test:server src/lib/mathAST/ src/lib/geometry-core/`
- Si erreurs → `debugger` agent (Opus)

---

## Récapitulatif effort & dépendances

| Phase | Description               | Effort estimé | Bloque ?     |
| ----- | ------------------------- | ------------- | ------------ |
| A     | Migration `,` → `;`       | 1-2h          | C, D         |
| B     | Restriction de domaine    | 4-6h          | — (autonome) |
| C     | PiecewiseNode mathAST     | 12-16h        | D            |
| D     | Intégration geometry-core | 6-8h          | —            |
| E     | Quality finale            | 30min         | —            |

**Total estimé** : 24-32h.

**Stratégie de livraison** : 4 PRs/commits indépendants (un par phase A/B/C/D). Chacun apporte une valeur autonome :

- A : cohérence du formattage
- B : tracé sur intervalle (déjà très utile pédagogiquement)
- C : `\begin{cases}` parsable dans tout le projet (réutilisable validateur, analyse)
- D : feature finale visible

---

## Documents produits par ce plan

À la fin :

- `docs/wip/geometry/piecewise-functions-plan.md` (ce document)
- `docs/wip/geometry/phase-a-interval-separator-progress.md`
- `docs/wip/geometry/phase-b-domain-restriction-progress.md`
- `docs/wip/geometry/phase-c-piecewise-node-progress.md`
- `docs/wip/geometry/phase-d-geometry-piecewise-progress.md`
- Nouveau memory file `dsl-piecewise-syntax.md` (déjà créé)

---

## Questions de cadencement

1. **Validation phase par phase** ou validation globale puis exécution autonome ?
2. **On commence par Phase A maintenant** ou tu veux d'abord relire le plan / discuter d'un point ?
3. **Phase B livrée seule** suffit-elle pour un premier jalon utilisable, ou tu veux qu'on enchaîne directement sur C+D ?
