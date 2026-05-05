# Pedagogical Arithmetic — Progress

> Source : `docs/wip/pedagogical-arithmetic-prompt.md`
> Started : 2026-05-05

## Phase 0 — Spécification TDD (terminée ✓)

### Décisions architecturales validées

**Q1** — Nommage : `pedagogical-arithmetic/` (parallèle à `pedagogical-solve/`).

**Q2** — Niveaux scolaires : 4 (`primaire | college | lycee | superieur`), avec `applicableLevels` par règle.

**Q3** — Granularité : règles fines en interne, groupement en post-processing optionnel selon `SchoolLevel`.

**Q4** — Stratégie de terminaison : `'deterministic'` (cohérent avec `pedagogical-solve/`).

**Q5** — Multi-chemins fractions : un chemin canonique par `SchoolLevel` (PGCD si simple, sinon multiplication).

**Q6** — Parser `answerFormat` : module séparé `answer-format-parser.ts`.

**Q7** — Dépendances `extractPedagogicalTarget` : import direct depuis `$lib/questions/types`.

**Q8** — Cas non-couverts : skip silencieux + délégation à `evaluate(exact)`.

**Q9** — `expressionName` : option (b), signature `extractPedagogicalTarget(instance, blank?, expressionName?)`. **TODO post-prompt** : populer `expressionName` directement dans `InstanceBlank` via `generator/assign-blank-indices.ts` pour rendre le 3e arg redondant. Refacto séparée, ~2-3h.

**Q10** — `PedagogicalTarget.structure` typée `TargetForm` (élargie depuis `RequiredForm`). Heuristiques de dérivation dans `extractPedagogicalTarget` :

1. `requiredForm` si déjà valeur `TargetForm` valide → passer tel quel
2. `answerFormat` patterns scientifiques (`'? × 10^?'`, `'10^?'`) → `'scientific'`
3. `reducedFractions: 'strict'` + contexte fraction → `'reduced-fraction'`
4. `precision` decimal + pas de fraction → `'decimal'`
5. fallback `undefined`

`PedagogicalEvaluateOptions.target` override l'extracteur. `answer-format-parser.ts` (Phase 7) utilisé aussi en Phase 2 pour les heuristiques.

**Q11** — Découpage : 1 tunnel continu avec 5-6 commits intermédiaires.

**Q12** — Cohabitation `arithmetic-steps.ts` : Option α (coexistence pure, pas de migration des callers).

**Q13** — Démos : ≥6 catégories avec ≥3 cas chacune.

**Q14** — Agents/modèles : `code-reviewer` Opus après chaque phase, `commit-manager` pour commits intermédiaires, `typescript-expert`/`debugger` Opus en cas de besoin.

### Critères d'acceptation

1. 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
2. `extractPedagogicalTarget()` testé (cascade + champs absents)
3. Pipeline opérationnel sur 4 niveaux pour basic, fractions, radicaux, scientifique
4. Support `answerFormat` extrait fragment exposant
5. Cohérence target → étapes (fraction réduite si strict, etc.)
6. ≥6 catégories de démos avec snapshots stables
7. Script CLI standalone fonctionnel
8. 0 erreur ESLint, 0 nouvelle erreur TS
9. Doc de progression écrite (ce fichier)
10. Commits via `commit-manager` (PAS de `Co-Authored-By: Claude`)

---

## Phase 1 — Infrastructure (terminée ✓)

### Sous-tâches

- [x] 1.1 Élargir `pedagogical-evaluate/types.ts` : `PedagogicalTarget.structure?: TargetForm`
- [x] 1.2 Créer structure `pedagogical-arithmetic/` (squelette)
- [x] 1.3 Types principaux dans `types.ts`
- [x] 1.4 Test d'isolation des types (compilation) — 4/4 tests
- [x] Code review : feu vert (cohérence avec `pedagogical-solve/types.ts`, améliorations vs spec)

### Décisions de design (Phase 1)

- `PedagogicalArithmeticOptions` ajoute `target?` (override), `signal?`, `timeoutMs?` (cohérence avec `PedagogicalEvaluateOptions`).
- `PedagogicalArithmeticRule.priority` documentée par convention : 200+ grouping, 100 atomic, 50 cosmetic, 10 terminal.
- `explanations` retourne `string | undefined` pour skip silencieux selon les bindings.

## Phase 2a — answer-format-parser (basique) (terminée ✓)

### Livré

- `answer-format-parser.ts` : classification haut niveau (`scientific | fraction | power | radical | plain | unknown`)
- 56 tests passent (`__tests__/answer-format-parser.test.ts`)
- Heuristiques utilisées en Phase 2b

Le matching/extraction complet sera ajouté en Phase 7.

## Phase 2b — extractPedagogicalTarget (terminée ✓)

### Livré

- `target-extractor.ts` avec signature `extractPedagogicalTarget(instance, blank?, expressionName?)`
- Cascade : `blank > instance` (variation/shared déjà mergées par le générateur)
- Filtre strict-cosmetics (5 clés : reducedFractions, signs, nullTerms, factorOne, zeros)
- Heuristiques de dérivation `TargetForm` :
  1. `requiredForm` string membre de `TargetForm` → pass-through (drop `{ pattern }`)
  2. `answerFormat` scientifique → `'scientific'` (override fraction)
  3. `reducedFractions: 'strict'` + contexte fraction (requiredForm OU answerFormat) → `'reduced-fraction'`
  4. `precision.type === 'decimal'` + pas de fraction → `'decimal'`
  5. fallback `undefined`
- 27 tests passent (`__tests__/target-extractor.test.ts`)

### TODO post-prompt (refacto séparée ~2-3h)

Populer `expressionName` directement dans `InstanceBlank` via
`generator/assign-blank-indices.ts`. Une fois fait, le 3e argument
`expressionName` devient redondant (déductible depuis `blank`).

## Phase 3 — Règles niveau 1 : basic operations (terminée ✓)

### Livré

- `pedagogical-rules/basic-operations.ts` — 10 règles :
  - **Atomiques (priority 100)** : `evaluateBinary{Add, Sub, Mul, Div}` — évaluation exacte de `number ⊕ number` (la contrainte `:number` matche aussi les opposés).
  - **Groupement (priority 200, college+)** : `groupMultiplicationsInAddition` — dans une somme avec ≥2 multiplications numériques, les évalue toutes en une étape (pédagogie de regroupement).
  - **Trivial (priority 50)** : `simplify{Add, Sub}Zero`, `simplify{Mul, Div}One`, `simplifyMulZero` — `x+0`, `x-0`, `x*1`, `x/1`, `x*0`.
- `pedagogical-rules/index.ts` — `loadPedagogicalRules({ schoolLevel, targetForm? })` filtre par niveau et appendra les terminaux des phases ultérieures.
- 32 tests passent (`__tests__/basic-operations.test.ts`)
- 0 régression sur 12086 tests `mathAST`

### Décisions design (Phase 3)

- **Évaluation via factory + `evaluate(exact)`** : la replacement function reconstruit l'AST `add(a,b)` puis appelle `evaluate(exact)`. Pas d'optimisation prématurée (pas de cas spéciaux pour les entiers vs fractions).
- **Pattern `:number` accepte les opposés** (`-3`) : on profite de la sémantique du parser de patterns. Pas besoin de canonicalisation préalable.
- **Groupement = `P._('s', P.custom(...))` + replacement custom** : le pattern matche tout nœud, la condition checke `flattenSumShallow(node)` pour ≥2 multiplications, le replacement re-flatten / évalue chaque multiplication / unflatten.
- **`evaluateBinaryDiv` a une condition `b≠0`** explicite (la pattern ne peut pas l'exprimer en `:number`).

### Fichiers à créer

```
src/lib/mathAST/pedagogical-arithmetic/
├── types.ts                      # Types spécifiques
├── pipeline.ts                   # Orchestrateur (Phase 8)
├── target-extractor.ts           # extractPedagogicalTarget() (Phase 2b)
├── answer-format-parser.ts       # Parser answerFormat (Phase 2a + Phase 7)
├── renderer.ts                   # PedagogicalArithmeticRenderer (Phase 8)
├── pedagogical-rules/
│   ├── index.ts                  # loadPedagogicalRules + exports (Phase 8)
│   ├── basic-operations.ts       # Phase 3
│   ├── fractions.ts              # Phase 4
│   ├── radicals.ts               # Phase 5
│   ├── powers.ts                 # Phase 6
│   └── scientific-notation.ts    # Phase 6
├── demo-helpers.ts               # presentExpression (Phase 9)
├── demo-cases/
│   ├── basic.ts, fractions.ts, radicals.ts, scientific.ts,
│   ├── target-form-scenarios.ts, answer-format-scenarios.ts (Phase 9)
│   └── index.ts
└── __tests__/
    ├── target-extractor.test.ts
    ├── pipeline.test.ts
    ├── answer-format-parser.test.ts
    ├── pedagogical-arithmetic-demo.test.ts
    └── __snapshots__/
```

---

## Phases ultérieures

(Documentées au fur et à mesure de la livraison.)
